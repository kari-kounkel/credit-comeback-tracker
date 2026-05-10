// ════════════════════════════════════════════════════════════════
// Bank CSV helpers
// Hand-rolled — no PapaParse / no dependency. Handles quoted fields
// with embedded commas and escaped quotes. Plenty for any bank export
// I've ever seen.
// ════════════════════════════════════════════════════════════════

/**
 * Parse a CSV string into { headers, rows } where rows is array of arrays.
 * - Strips a UTF-8 BOM if present
 * - Handles "quoted, with comma" and "quoted ""quote"" inside" fields
 * - Tolerates \r\n, \n, and trailing blank lines
 */
export function parseCsv(text) {
  if (!text) return { headers: [], rows: [] };
  // Strip BOM
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

  const rows = [];
  let cur = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        cur.push(field); field = "";
      } else if (c === '\n' || c === '\r') {
        cur.push(field); field = "";
        if (cur.length > 1 || cur[0] !== "") rows.push(cur);
        cur = [];
        // Skip the \n if we just hit \r\n
        if (c === '\r' && text[i + 1] === '\n') i++;
      } else {
        field += c;
      }
    }
  }
  // Final field / row
  if (field !== "" || cur.length > 0) {
    cur.push(field);
    if (cur.length > 1 || cur[0] !== "") rows.push(cur);
  }

  if (!rows.length) return { headers: [], rows: [] };
  const headers = rows[0].map(h => h.trim());
  return { headers, rows: rows.slice(1) };
}

/**
 * Auto-detect which CSV columns map to date / description / amount, based
 * on common header names. Returns a mapping object compatible with
 * bank_csv_mappings shape; null fields mean "user must pick".
 */
export function autoDetectMapping(headers) {
  const lower = headers.map(h => h.toLowerCase());
  const find = (...patterns) => {
    for (const p of patterns) {
      const idx = lower.findIndex(h => h === p || h.includes(p));
      if (idx >= 0) return headers[idx];
    }
    return null;
  };

  const colDate        = find("posted date", "transaction date", "date", "post date");
  const colDescription = find("description", "memo", "name", "merchant", "details", "payee");
  const colAmount      = find("amount");
  const colDebit       = find("debit", "withdrawal");
  const colCredit      = find("credit", "deposit");

  const amount_mode = colAmount ? "single" : (colDebit && colCredit ? "split" : "single");

  return {
    col_date: colDate,
    col_description: colDescription,
    col_amount: amount_mode === "single" ? colAmount : null,
    col_debit:  amount_mode === "split" ? colDebit  : null,
    col_credit: amount_mode === "split" ? colCredit : null,
    amount_mode,
    date_format: "MM/DD/YYYY",
  };
}

/**
 * Apply a mapping to a parsed CSV row → normalized transaction object
 *   { txn_date, description, amount, raw_data }
 * Returns null if the row can't be parsed (missing required fields).
 */
export function rowToTransaction(headers, row, mapping) {
  const get = (colName) => {
    if (!colName) return "";
    const idx = headers.indexOf(colName);
    if (idx < 0) return "";
    return (row[idx] || "").trim();
  };

  const dateStr = get(mapping.col_date);
  const description = get(mapping.col_description);
  if (!dateStr || !description) return null;

  let amount = 0;
  if (mapping.amount_mode === "split") {
    const debit  = parseAmount(get(mapping.col_debit));
    const credit = parseAmount(get(mapping.col_credit));
    // debit = money out (expense), credit = money in (income)
    amount = -Math.abs(debit) + credit;
    if (debit === 0 && credit === 0) return null;
  } else {
    amount = parseAmount(get(mapping.col_amount));
    if (amount === 0) return null;
  }

  const txn_date = parseDate(dateStr, mapping.date_format);
  if (!txn_date) return null;

  // Build raw_data preserving every column from this row
  const raw_data = {};
  headers.forEach((h, i) => { raw_data[h] = row[i] || ""; });

  return { txn_date, description, amount, raw_data };
}

function parseAmount(str) {
  if (!str) return 0;
  // Remove $, commas, parentheses (which often denote negatives in bank exports)
  let cleaned = String(str).replace(/[$,]/g, "").trim();
  let negative = false;
  if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
    negative = true;
    cleaned = cleaned.slice(1, -1);
  }
  const n = parseFloat(cleaned);
  if (isNaN(n)) return 0;
  return negative ? -Math.abs(n) : n;
}

function parseDate(str, format) {
  // Try a handful of common formats. Returns ISO YYYY-MM-DD or null.
  if (!str) return null;
  // Normalize separators
  const s = String(str).trim().replace(/-/g, "/").replace(/\./g, "/");
  const parts = s.split("/").map(p => p.trim());
  if (parts.length !== 3) {
    // Try ISO YYYY-MM-DD style with no normalization needed
    const m = String(str).trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
    return null;
  }
  // Decide order from format hint
  let yIdx, mIdx, dIdx;
  if (format === "DD/MM/YYYY")      { dIdx = 0; mIdx = 1; yIdx = 2; }
  else if (format === "YYYY/MM/DD") { yIdx = 0; mIdx = 1; dIdx = 2; }
  else                              { mIdx = 0; dIdx = 1; yIdx = 2; }  // default MM/DD/YYYY

  let y = parts[yIdx], m = parts[mIdx], d = parts[dIdx];
  if (y.length === 2) y = "20" + y;
  if (!/^\d{4}$/.test(y) || !/^\d{1,2}$/.test(m) || !/^\d{1,2}$/.test(d)) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}
function pad(n) { return String(n).padStart(2, "0"); }

/**
 * Generate a deterministic hash for dedupe. Uses Web Crypto SubtleCrypto.digest.
 * Returns hex string.
 */
export async function txnHash({ txn_date, description, amount, source }) {
  const input = `${txn_date}|${description.toLowerCase().trim()}|${amount.toFixed(2)}|${source || ""}`;
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Suggest a category for a transaction based on existing bills the user
 * already has saved. Returns { category, bill_match } or { category: null, bill_match: null }.
 *
 * @param {string} description — transaction description
 * @param {Object} stateBills  — state.bills (the keyed-by-month object)
 */
export function suggestCategory(description, stateBills) {
  if (!stateBills) return { category: null, bill_match: null };
  const desc = description.toLowerCase();
  // Walk every bill across every month, look for a name match
  for (const monthIdx of Object.keys(stateBills)) {
    const bills = stateBills[monthIdx] || [];
    for (const b of bills) {
      if (!b.name) continue;
      const billName = b.name.toLowerCase();
      // Match if first word of bill name appears in description
      const firstWord = billName.split(/\s+/)[0];
      if (firstWord && firstWord.length >= 3 && desc.includes(firstWord)) {
        return { category: b.category || "Other", bill_match: b.name };
      }
    }
  }
  return { category: null, bill_match: null };
}
