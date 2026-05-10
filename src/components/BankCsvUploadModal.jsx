import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { THEMES } from "../constants";
import { parseCsv, autoDetectMapping, rowToTransaction, txnHash, suggestCategory, txnDateToMonthIndex, applyTxnToBill, detectDateFormat, applyRules } from "../bankCsv";
import { CALENDAR_START_YEAR, CALENDAR_LENGTH } from "../constants";

/**
 * BankCsvUploadModal — three-step flow:
 *   1. Drop a CSV (or paste it). We parse it.
 *   2. Confirm/edit the column mapping (auto-detected when possible).
 *      Optionally save the mapping under a bank-name label for next time.
 *   3. Preview rows + run import (dedupes via hash).
 *
 * Props:
 *   user, theme, onClose, onImported(count)
 *   stateBills    — current state.bills (used to suggest categories)
 *   savedMappings — array of bank_csv_mappings rows for this user
 */
export default function BankCsvUploadModal({ user, theme, onClose, onImported, stateBills, savedMappings = [], rules = [], update }) {
  const t = THEMES[theme] || THEMES.dark;
  const [step, setStep] = useState(1);     // 1 = upload, 2 = map, 3 = preview/import
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [bankName, setBankName] = useState("");
  const [savedMappingId, setSavedMappingId] = useState("");
  const [mapping, setMapping] = useState({
    col_date: null, col_description: null, col_amount: null,
    col_debit: null, col_credit: null,
    amount_mode: "single", date_format: "MM/DD/YYYY",
  });
  const [saveMapping, setSaveMapping] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState("");
  const [importResult, setImportResult] = useState(null);
  const [err, setErr] = useState(null);
  const fileInputRef = useRef(null);

  // Step 1: file picked → parse
  const handleFile = async (file) => {
    setErr(null);
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (!parsed.headers.length) throw new Error("Couldn't read any columns from this file.");
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setBankName(file.name.replace(/\.[^.]+$/, ""));   // default to file name without extension
      const auto = autoDetectMapping(parsed.headers);
      // Sniff the actual date format from the first row so the dropdown
      // lands on the right value (ISO vs US vs European).
      if (auto.col_date && parsed.rows.length > 0) {
        const dateColIdx = parsed.headers.indexOf(auto.col_date);
        const sample = dateColIdx >= 0 ? parsed.rows[0][dateColIdx] : "";
        auto.date_format = detectDateFormat(sample);
      }
      setMapping(auto);
      setStep(2);
    } catch (e) {
      setErr("Couldn't parse CSV: " + e.message);
    }
  };

  // Apply a saved mapping when user picks one
  const applySavedMapping = (id) => {
    setSavedMappingId(id);
    if (!id) return;
    const m = savedMappings.find(s => s.id === id);
    if (!m) return;
    setMapping({
      col_date: m.col_date, col_description: m.col_description,
      col_amount: m.col_amount, col_debit: m.col_debit, col_credit: m.col_credit,
      amount_mode: m.amount_mode, date_format: m.date_format || "MM/DD/YYYY",
    });
    setBankName(m.bank_name);
  };

  // Compute the preview transactions from current mapping
  const previewTxns = step === 3 ? buildPreview(headers, rows, mapping, stateBills, bankName, rules) : [];

  const runImport = async () => {
    setImporting(true);
    setImportProgress("Preparing rows…");
    setErr(null);
    setImportResult(null);
    try {
      // Step 1 — parse + categorize all rows (sync, no awaits).
      // Rules win first (user-defined patterns); fall back to bill-name match.
      const partials = [];
      for (const r of rows) {
        const txn = rowToTransaction(headers, r, mapping);
        if (!txn) continue;
        const ruleHit = applyRules(txn.description, rules);
        const sug = ruleHit || suggestCategory(txn.description, stateBills);
        partials.push({ ...txn, sug });
      }
      if (!partials.length) throw new Error("Nothing to import — check the mapping looks right.");

      // Step 2 — hash IN PARALLEL (was sequential — much faster for large files).
      // Note: hash uses (date|description|amount|source) — does NOT include category.
      // So if you re-categorize a row and re-import, it still dedupes correctly.
      setImportProgress(`Hashing ${partials.length} rows…`);
      const hashes = await Promise.all(
        partials.map(p => txnHash({ txn_date: p.txn_date, description: p.description, amount: p.amount, source: bankName }))
      );
      const built = partials.map((p, i) => ({
        user_id: user.id,
        txn_date: p.txn_date,
        description: p.description,
        amount: p.amount,
        category: p.sug.category,
        bill_match: p.sug.bill_match,
        source: bankName,
        raw_data: p.raw_data,
        hash: hashes[i],
      }));

      // Step 3 — upsert in BATCHES of 100. Single 500-row request can stall.
      const BATCH = 100;
      let totalInserted = 0;
      for (let i = 0; i < built.length; i += BATCH) {
        const chunk = built.slice(i, i + BATCH);
        setImportProgress(`Saving rows ${i + 1}–${Math.min(i + BATCH, built.length)} of ${built.length}…`);
        const { data, error } = await supabase
          .from("bank_transactions")
          .upsert(chunk, { onConflict: "user_id,hash", ignoreDuplicates: true })
          .select("id");
        if (error) throw error;
        totalInserted += (data?.length || 0);
      }

      // Save the mapping for next time, if requested
      if (saveMapping && bankName.trim()) {
        await supabase.from("bank_csv_mappings").upsert({
          user_id: user.id,
          bank_name: bankName.trim(),
          col_date: mapping.col_date,
          col_description: mapping.col_description,
          col_amount: mapping.col_amount,
          col_debit: mapping.col_debit,
          col_credit: mapping.col_credit,
          amount_mode: mapping.amount_mode,
          date_format: mapping.date_format,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,bank_name" });
      }

      const inserted = totalInserted;
      const skipped = built.length - inserted;

      // ── AUTO-APPLY MATCHED TRANSACTIONS TO THEIR BILLS ──
      // For every transaction we just imported that has a bill_match, look up
      // the bill in the same month and update its actual (or push to entries[]
      // for Variable). One single update() call so we re-render once.
      let applied = 0;
      if (update) {
        const matchedTxns = built.filter(b => b.bill_match);
        if (matchedTxns.length) {
          update((s) => {
            for (const txn of matchedTxns) {
              const monthIdx = txnDateToMonthIndex(txn.txn_date, CALENDAR_START_YEAR, CALENDAR_LENGTH);
              if (applyTxnToBill(s, txn, monthIdx)) applied++;
            }
          });
        }
      }

      setImportResult({ attempted: built.length, inserted, skipped, applied });
      if (onImported) onImported(inserted);
    } catch (e) {
      setErr("Import failed: " + e.message);
    } finally {
      setImporting(false);
      setImportProgress("");
    }
  };

  const inputStyle = {
    width: "100%", padding: "8px 10px",
    background: t.inputBg, border: "1px solid " + t.inputBorder,
    borderRadius: 7, color: t.inputText, fontSize: 13,
    fontFamily: "'DM Sans',sans-serif", outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: t.modalBg, border: "1px solid " + t.headerBorder,
          borderRadius: 16, padding: 28, maxWidth: 720, width: "100%",
          maxHeight: "92vh", overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, gap: 12 }}>
          <div>
            <h3 style={{ color: t.gold, fontFamily: "'Playfair Display',serif", fontSize: 20, margin: "0 0 4px" }}>
              📤 Upload Bank CSV
            </h3>
            <div style={{ fontSize: 12, color: t.textMuted }}>
              Step {step} of 3 · {step === 1 ? "Choose file" : step === 2 ? "Confirm columns" : "Preview &amp; import"}
            </div>
          </div>
          <button onClick={onClose} style={btnGhost(t)}>✕</button>
        </div>

        {err && (
          <div style={{ padding: 10, background: t.red + "22", color: t.red, borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
            {err}
          </div>
        )}

        {/* ── STEP 1: file picker ── */}
        {step === 1 && (
          <div>
            <p style={{ color: t.textMuted, fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
              Export a CSV from your bank's online portal (most banks have a "Download" or "Export" option on the transactions page) and drop it here. The file never leaves your browser unencrypted.
            </p>
            <div
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: "2px dashed " + t.cardBorder,
                borderRadius: 12, padding: "40px 20px", textAlign: "center",
                cursor: "pointer", background: t.rowHover,
                transition: "border-color 0.15s",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>📥</div>
              <div style={{ fontSize: 14, color: t.text, marginBottom: 4 }}>
                <strong>Drop your CSV here</strong> or click to choose
              </div>
              <div style={{ fontSize: 11, color: t.textMuted }}>Most banks let you download CSV from their transactions page</div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
        )}

        {/* ── STEP 2: column mapper ── */}
        {step === 2 && (
          <div>
            {savedMappings.length > 0 && (
              <div style={{ marginBottom: 16, padding: 12, background: t.gold + "10", border: "1px solid " + t.gold + "33", borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                  Use a saved bank mapping
                </div>
                <select value={savedMappingId} onChange={(e) => applySavedMapping(e.target.value)} style={inputStyle}>
                  <option value="">— pick a saved mapping —</option>
                  {savedMappings.map(m => (
                    <option key={m.id} value={m.id}>{m.bank_name}</option>
                  ))}
                </select>
              </div>
            )}

            <Field t={t} label="Bank name (so we remember this layout)">
              <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g., Wells Fargo Checking" style={inputStyle} />
            </Field>

            <Field t={t} label="Date column">
              <select value={mapping.col_date || ""} onChange={(e) => setMapping(m => ({ ...m, col_date: e.target.value || null }))} style={inputStyle}>
                <option value="">— pick a column —</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </Field>

            <Field t={t} label="Date format">
              <select value={mapping.date_format} onChange={(e) => setMapping(m => ({ ...m, date_format: e.target.value }))} style={inputStyle}>
                <option value="MM/DD/YYYY">MM/DD/YYYY (US — 04/15/2026)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (15/04/2026)</option>
                <option value="YYYY/MM/DD">YYYY/MM/DD (2026/04/15)</option>
              </select>
            </Field>

            <Field t={t} label="Description column">
              <select value={mapping.col_description || ""} onChange={(e) => setMapping(m => ({ ...m, col_description: e.target.value || null }))} style={inputStyle}>
                <option value="">— pick a column —</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </Field>

            <Field t={t} label="How are amounts shown?">
              <select value={mapping.amount_mode} onChange={(e) => setMapping(m => ({ ...m, amount_mode: e.target.value }))} style={inputStyle}>
                <option value="single">Single column (negative = expense)</option>
                <option value="split">Two columns (Debit + Credit)</option>
              </select>
            </Field>

            {mapping.amount_mode === "single" ? (
              <Field t={t} label="Amount column">
                <select value={mapping.col_amount || ""} onChange={(e) => setMapping(m => ({ ...m, col_amount: e.target.value || null }))} style={inputStyle}>
                  <option value="">— pick a column —</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </Field>
            ) : (
              <>
                <Field t={t} label="Debit (money out) column">
                  <select value={mapping.col_debit || ""} onChange={(e) => setMapping(m => ({ ...m, col_debit: e.target.value || null }))} style={inputStyle}>
                    <option value="">— pick a column —</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </Field>
                <Field t={t} label="Credit (money in) column">
                  <select value={mapping.col_credit || ""} onChange={(e) => setMapping(m => ({ ...m, col_credit: e.target.value || null }))} style={inputStyle}>
                    <option value="">— pick a column —</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </Field>
              </>
            )}

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: t.textMuted, marginTop: 14 }}>
              <input type="checkbox" checked={saveMapping} onChange={(e) => setSaveMapping(e.target.checked)} style={{ accentColor: t.gold }} />
              Remember this mapping for future <strong style={{ color: t.text }}>{bankName || "this bank"}</strong> uploads
            </label>

            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button onClick={() => setStep(1)} style={btnSecondary(t)}>← Back</button>
              <button
                onClick={() => {
                  // Validate required mapping pieces
                  const ok = mapping.col_date && mapping.col_description &&
                    (mapping.amount_mode === "single" ? mapping.col_amount : (mapping.col_debit && mapping.col_credit));
                  if (!ok) { setErr("Pick a date, description, and amount column to continue."); return; }
                  setErr(null); setStep(3);
                }}
                style={{ ...btnPrimary(t), flex: 1 }}
              >Preview rows →</button>
            </div>
          </div>
        )}

        {/* ── STEP 3: preview + import ── */}
        {step === 3 && (
          <div>
            <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 10, lineHeight: 1.6 }}>
              <strong style={{ color: t.text }}>{previewTxns.length}</strong> of <strong style={{ color: t.text }}>{rows.length}</strong> rows parsed from your CSV
              {previewTxns.length < rows.length && (
                <span style={{ color: t.gold }}> · {rows.length - previewTxns.length} skipped (likely missing date or amount)</span>
              )}
              <br />
              Showing first {Math.min(previewTxns.length, 8)} below · source: <strong style={{ color: t.text }}>{bankName}</strong>
            </div>
            {previewTxns.length === 0 && (
              <div style={{
                padding: 16, background: t.red + "12", color: t.red,
                border: "1px solid " + t.red + "44", borderRadius: 8,
                fontSize: 13, lineHeight: 1.6, marginBottom: 16,
              }}>
                ⚠️ Couldn't parse any rows with this mapping. Most common cause: the <strong>date format</strong> doesn't match what's actually in the file. Click <strong>← Back to mapping</strong> and try a different date format option (the dropdown below the date column).
              </div>
            )}
            <div style={{ background: t.cardBg, border: "1px solid " + t.cardBorder, borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    {["Date", "Description", "Amount", "Suggested category"].map(h => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: t.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, borderBottom: "1px solid " + t.cardBorder, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewTxns.slice(0, 8).map((p, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid " + t.cardBorder }}>
                      <td style={{ padding: "6px 10px", color: t.textMuted, fontFamily: "'DM Mono',monospace" }}>{p.txn_date}</td>
                      <td style={{ padding: "6px 10px", color: t.text }}>{p.description}</td>
                      <td style={{ padding: "6px 10px", color: p.amount < 0 ? t.red : t.green, fontFamily: "'DM Mono',monospace", textAlign: "right" }}>
                        {p.amount < 0 ? "−" : "+"}${Math.abs(p.amount).toFixed(2)}
                      </td>
                      <td style={{ padding: "6px 10px", color: p.category ? t.gold : t.textFaint, fontSize: 11 }}>
                        {p.category || "(uncategorized)"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {importResult && (
              <div style={{ padding: 12, background: t.green + "18", border: "1px solid " + t.green + "44", color: t.green, borderRadius: 8, fontSize: 13, marginBottom: 12, lineHeight: 1.6 }}>
                ✓ Imported <strong>{importResult.inserted}</strong> new transactions
                {importResult.skipped > 0 && ` · skipped ${importResult.skipped} duplicates`}
                {importResult.applied > 0 && (
                  <>
                    <br />
                    ↗ Auto-applied <strong>{importResult.applied}</strong> to your existing bills (Bills &amp; Budget will reflect the new actuals).
                  </>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(2)} style={btnSecondary(t)} disabled={importing}>← Back to mapping</button>
              {!importResult ? (
                <div style={{ flex: 1 }}>
                  <button onClick={runImport} disabled={importing || previewTxns.length === 0} style={{ ...btnPrimary(t), width: "100%", opacity: previewTxns.length === 0 ? 0.5 : 1 }}>
                    {importing ? "Importing…" : `Import all ${previewTxns.length} transactions`}
                  </button>
                  {importing && importProgress && (
                    <div style={{ marginTop: 6, fontSize: 11, color: t.textMuted, textAlign: "center" }}>{importProgress}</div>
                  )}
                </div>
              ) : (
                <button onClick={onClose} style={{ ...btnPrimary(t), flex: 1 }}>Done</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function buildPreview(headers, rows, mapping, stateBills, source, rules = []) {
  // Walk EVERY row so the count we show is real, not a preview cap.
  // We only render the first 8 in the table below, but the count tells
  // the user what the actual import would process.
  const out = [];
  for (const r of rows) {
    const txn = rowToTransaction(headers, r, mapping);
    if (!txn) continue;
    const ruleHit = applyRules(txn.description, rules);
    const sug = ruleHit || suggestCategory(txn.description, stateBills);
    out.push({ ...txn, category: sug.category, fromRule: !!ruleHit });
  }
  return out;
}

function Field({ t, label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  );
}

const btnPrimary = (t) => ({
  padding: "10px 18px", borderRadius: 8, border: "none",
  background: "linear-gradient(135deg," + t.gold + "," + t.goldDark + ")",
  color: t.btnText, fontSize: 13, fontWeight: 700, cursor: "pointer",
  fontFamily: "'DM Sans',sans-serif",
});
const btnSecondary = (t) => ({
  padding: "10px 14px", borderRadius: 8,
  border: "1px solid " + t.cardBorder, background: "transparent",
  color: t.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer",
  fontFamily: "'DM Sans',sans-serif",
});
const btnGhost = (t) => ({
  padding: "4px 10px", borderRadius: 6,
  border: "1px solid " + t.cardBorder, background: "transparent",
  color: t.textMuted, fontSize: 12, cursor: "pointer",
  fontFamily: "'DM Sans',sans-serif",
});
