import { useState } from "react";
import { supabase } from "../supabaseClient";
import { THEMES, CATEGORIES, CAT_EMOJIS } from "../constants";
import { INCOME_TYPES, INCOME_EMOJIS } from "./AddIncomeModal";
import { applyRules } from "../bankCsv";

const MATCH_LABELS = {
  contains: "contains",
  starts_with: "starts with",
  exact: "is exactly",
};

/**
 * CategorizationRulesPanel — collapsible section inside TransactionsTab.
 * Manages public.categorization_rules for the current user. Lets the user
 * Add / Edit / Delete rules, and run "Re-apply rules to all transactions"
 * which walks the whole bank_transactions table and updates categories
 * based on the current rule set.
 *
 * Props:
 *   user           — current user
 *   theme          — color theme key
 *   rules          — array of categorization_rules rows
 *   transactions   — all bank_transactions for this user (for the re-apply count)
 *   onChanged()    — invoked after any change so parent can re-fetch
 */
export default function CategorizationRulesPanel({ user, theme, rules, transactions, onChanged }) {
  const t = THEMES[theme] || THEMES.dark;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);   // null | { ...rule } | { id: null, ... } for new
  const [busy, setBusy] = useState(false);
  const [reapplyResult, setReapplyResult] = useState(null);

  const startNew = () => setEditing({ id: null, pattern: "", match_mode: "contains", category: "", bill_match: "", priority: 0 });

  const saveRule = async () => {
    if (!editing.pattern.trim() || !editing.category.trim()) return;
    setBusy(true);
    const payload = {
      user_id: user.id,
      pattern: editing.pattern.trim(),
      match_mode: editing.match_mode,
      category: editing.category,
      bill_match: editing.bill_match?.trim() || null,
      priority: parseInt(editing.priority) || 0,
      updated_at: new Date().toISOString(),
    };
    let res;
    if (editing.id) {
      res = await supabase.from("categorization_rules").update(payload).eq("id", editing.id);
    } else {
      res = await supabase.from("categorization_rules").insert(payload);
    }
    setBusy(false);
    if (res.error) { alert("Save failed: " + res.error.message); return; }
    setEditing(null);
    onChanged?.();
  };

  const deleteRule = async (id) => {
    if (!confirm("Delete this rule?")) return;
    const { error } = await supabase.from("categorization_rules").delete().eq("id", id);
    if (error) { alert("Delete failed: " + error.message); return; }
    onChanged?.();
  };

  const reapplyToAll = async () => {
    if (!confirm(`Re-categorize all ${transactions.length} transactions using your ${rules.length} rule(s)? Existing categories will be overwritten only when a rule matches — anything not matched by a rule stays as-is.`)) return;
    setBusy(true);
    setReapplyResult(null);
    let updated = 0;
    // Walk every txn locally (sorted-rule logic lives in applyRules), and
    // batch updates so we don't fire 500 individual round trips.
    const toUpdate = [];
    for (const tx of transactions) {
      const hit = applyRules(tx.description, rules);
      if (hit && (hit.category !== tx.category || (hit.bill_match || null) !== (tx.bill_match || null))) {
        toUpdate.push({ id: tx.id, category: hit.category, bill_match: hit.bill_match || null });
      }
    }
    // Supabase doesn't have a true bulk-update-by-id endpoint; do them in chunks of 50 in parallel
    const CHUNK = 50;
    for (let i = 0; i < toUpdate.length; i += CHUNK) {
      const slice = toUpdate.slice(i, i + CHUNK);
      await Promise.all(slice.map(u =>
        supabase.from("bank_transactions").update({ category: u.category, bill_match: u.bill_match }).eq("id", u.id)
      ));
      updated += slice.length;
    }
    setBusy(false);
    setReapplyResult({ scanned: transactions.length, updated });
    onChanged?.();
  };

  return (
    <div style={{
      background: t.cardBg, border: "1px solid " + t.cardBorder,
      borderRadius: 12, marginBottom: 18, overflow: "hidden",
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", padding: "12px 16px", border: "none",
          background: "transparent", cursor: "pointer",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontFamily: "'DM Sans',sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>📐</span>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>Auto-categorization rules</div>
            <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
              {rules.length === 0
                ? "No rules yet — add patterns so future imports auto-categorize"
                : `${rules.length} rule${rules.length === 1 ? "" : "s"} saved · applied on every import`}
            </div>
          </div>
        </div>
        <span style={{ color: t.textMuted, fontSize: 13 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid " + t.cardBorder }}>
          {/* List of existing rules */}
          {rules.length > 0 && (
            <div style={{ marginTop: 14 }}>
              {rules.slice().sort((a, b) => (b.priority || 0) - (a.priority || 0)).map(r => {
                const isIncome = INCOME_TYPES.includes(r.category);
                const emoji = isIncome ? INCOME_EMOJIS[r.category] : CAT_EMOJIS[r.category];
                return (
                  <div key={r.id} style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    gap: 12, alignItems: "center",
                    padding: "8px 0",
                    borderBottom: "1px dashed " + t.cardBorder,
                    fontSize: 13,
                  }}>
                    <div>
                      <span style={{ color: t.textMuted }}>If description {MATCH_LABELS[r.match_mode]} </span>
                      <code style={{ background: t.rowHover, padding: "1px 6px", borderRadius: 4, fontSize: 12, color: t.text }}>{r.pattern}</code>
                      <span style={{ color: t.textMuted }}> → </span>
                      <strong style={{ color: t.gold }}>{emoji} {r.category}</strong>
                      {r.bill_match && <span style={{ color: t.textMuted, fontSize: 11 }}> · matches bill: {r.bill_match}</span>}
                      {r.priority !== 0 && <span style={{ color: t.textFaint, fontSize: 10, marginLeft: 6 }}>priority {r.priority}</span>}
                    </div>
                    <button onClick={() => setEditing({ ...r })} style={btnGhost(t)}>Edit</button>
                    <button onClick={() => deleteRule(r.id)} style={btnDanger(t)}>✕</button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add rule + Re-apply */}
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <button onClick={startNew} style={btnPrimary(t)}>+ Add rule</button>
            {rules.length > 0 && transactions.length > 0 && (
              <button onClick={reapplyToAll} disabled={busy} style={btnSecondary(t)}>
                {busy ? "Re-applying…" : `↻ Re-apply rules to ${transactions.length} transactions`}
              </button>
            )}
          </div>

          {reapplyResult && (
            <div style={{
              marginTop: 12, padding: 10,
              background: t.green + "18", color: t.green,
              border: "1px solid " + t.green + "44", borderRadius: 8,
              fontSize: 12,
            }}>
              ✓ Scanned {reapplyResult.scanned} transactions · updated <strong>{reapplyResult.updated}</strong>.
            </div>
          )}
        </div>
      )}

      {editing && (
        <RuleEditModal
          rule={editing}
          theme={theme}
          busy={busy}
          onChange={setEditing}
          onSave={saveRule}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// ─── Add/Edit modal ─────────────────────────────────────────────────────
function RuleEditModal({ rule, theme, busy, onChange, onSave, onClose }) {
  const t = THEMES[theme] || THEMES.dark;
  const inputStyle = {
    width: "100%", padding: "8px 10px",
    background: t.inputBg, border: "1px solid " + t.inputBorder,
    borderRadius: 7, color: t.inputText, fontSize: 13,
    fontFamily: "'DM Sans',sans-serif", outline: "none",
    boxSizing: "border-box",
  };
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: 20 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: t.modalBg, border: "1px solid " + t.headerBorder, borderRadius: 16, padding: 28, maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <h3 style={{ color: t.gold, fontFamily: "'Playfair Display',serif", fontSize: 20, margin: "0 0 4px" }}>
          {rule.id ? "Edit rule" : "New rule"}
        </h3>
        <p style={{ fontSize: 12, color: t.textMuted, margin: "0 0 18px" }}>
          A rule maps any matching transaction description to a category — runs on every import + when you click Re-apply.
        </p>

        <Field t={t} label="When description">
          <select value={rule.match_mode} onChange={(e) => onChange({ ...rule, match_mode: e.target.value })} style={inputStyle}>
            <option value="contains">contains</option>
            <option value="starts_with">starts with</option>
            <option value="exact">is exactly</option>
          </select>
        </Field>

        <Field t={t} label="Pattern">
          <input
            value={rule.pattern}
            onChange={(e) => onChange({ ...rule, pattern: e.target.value })}
            placeholder="e.g., STARBUCKS  or  PP*ADOBE"
            style={inputStyle}
          />
        </Field>

        <Field t={t} label="Then assign category">
          <select value={rule.category} onChange={(e) => onChange({ ...rule, category: e.target.value })} style={inputStyle}>
            <option value="">— pick a category —</option>
            <optgroup label="💸 Expense">
              {CATEGORIES.map(c => <option key={c} value={c}>{CAT_EMOJIS[c]} {c}</option>)}
            </optgroup>
            <optgroup label="💰 Income">
              {INCOME_TYPES.map(c => <option key={c} value={c}>{INCOME_EMOJIS[c]} {c}</option>)}
            </optgroup>
          </select>
        </Field>

        <Field t={t} label="Match to specific bill (optional)">
          <input
            value={rule.bill_match || ""}
            onChange={(e) => onChange({ ...rule, bill_match: e.target.value })}
            placeholder="exact bill name from your Bills & Budget tab — or leave blank"
            style={inputStyle}
          />
        </Field>

        <Field t={t} label="Priority (higher wins when multiple rules match)">
          <input
            type="number"
            value={rule.priority}
            onChange={(e) => onChange({ ...rule, priority: e.target.value })}
            placeholder="0"
            style={inputStyle}
          />
        </Field>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={onClose} style={btnSecondary(t)} disabled={busy}>Cancel</button>
          <button onClick={onSave} disabled={busy || !rule.pattern.trim() || !rule.category} style={{ ...btnPrimary(t), flex: 1 }}>
            {busy ? "Saving…" : (rule.id ? "Save changes" : "Add rule")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ t, label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  );
}

const btnPrimary = (t) => ({
  padding: "8px 16px", borderRadius: 7, border: "none",
  background: "linear-gradient(135deg," + t.gold + "," + t.goldDark + ")",
  color: t.btnText, fontSize: 12, fontWeight: 700, cursor: "pointer",
  fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap",
});
const btnSecondary = (t) => ({
  padding: "8px 14px", borderRadius: 7,
  border: "1px solid " + t.cardBorder, background: "transparent",
  color: t.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer",
  fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap",
});
const btnGhost = (t) => ({
  padding: "5px 12px", borderRadius: 6,
  border: "1px solid " + t.cardBorder, background: "transparent",
  color: t.textMuted, fontSize: 11, cursor: "pointer",
  fontFamily: "'DM Sans',sans-serif",
});
const btnDanger = (t) => ({
  padding: "5px 10px", borderRadius: 6,
  border: "1px solid " + t.red + "33", background: t.red + "11",
  color: t.red, fontSize: 11, cursor: "pointer",
  fontFamily: "'DM Sans',sans-serif",
});
