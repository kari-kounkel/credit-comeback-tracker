import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { THEMES, CATEGORIES, CAT_EMOJIS } from "../constants";
import BankCsvUploadModal from "./BankCsvUploadModal";

const fmtMoney = (n) => {
  const abs = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (n < 0 ? "−$" : "+$") + abs;
};
const monthLabel = (yyyy_mm) => {
  const [y, m] = yyyy_mm.split("-");
  const d = new Date(parseInt(y), parseInt(m) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

/**
 * TransactionsTab — sits inside Money.
 * Shows imported bank transactions grouped by month (newest first).
 * Each row has an inline category dropdown.
 */
export default function TransactionsTab({ user, theme, state, update }) {
  const t = THEMES[theme] || THEMES.dark;
  const [transactions, setTransactions] = useState([]);
  const [savedMappings, setSavedMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [filter, setFilter] = useState("all"); // all | uncategorized
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const [txns, maps] = await Promise.all([
      supabase.from("bank_transactions").select("*").eq("user_id", user.id).order("txn_date", { ascending: false }),
      supabase.from("bank_csv_mappings").select("*").eq("user_id", user.id).order("bank_name"),
    ]);
    setTransactions(txns.data || []);
    setSavedMappings(maps.data || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const updateCategory = async (id, category) => {
    setTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, category } : tx));
    await supabase.from("bank_transactions").update({ category }).eq("id", id);
  };

  const deleteTxn = async (id) => {
    if (!confirm("Delete this transaction?")) return;
    await supabase.from("bank_transactions").delete().eq("id", id);
    setTransactions(prev => prev.filter(tx => tx.id !== id));
  };

  const visible = transactions.filter(tx => {
    if (filter === "uncategorized" && tx.category) return false;
    if (search && !tx.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group by YYYY-MM
  const groups = visible.reduce((acc, tx) => {
    const key = tx.txn_date.slice(0, 7);
    (acc[key] = acc[key] || []).push(tx);
    return acc;
  }, {});
  const groupKeys = Object.keys(groups).sort().reverse();

  // Top stats
  const totalIn  = visible.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0);
  const totalOut = visible.filter(tx => tx.amount < 0).reduce((s, tx) => s + tx.amount, 0);
  const uncatCount = transactions.filter(tx => !tx.category).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ color: t.gold, fontFamily: "'Playfair Display',serif", fontSize: 22, margin: "0 0 4px" }}>🏦 Transactions</h2>
          <p style={{ color: t.textMuted, fontSize: 12, margin: 0 }}>
            Import your bank's CSV export, then categorize what came in and what went out.
          </p>
        </div>
        <button onClick={() => setShowUpload(true)} style={btnPrimary(t)}>📤 Upload Bank CSV</button>
      </div>

      {/* Top stats */}
      {transactions.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 18 }}>
          {[
            { label: "Transactions", value: transactions.length.toLocaleString(), color: t.text },
            { label: "Money in",     value: fmtMoney(totalIn),  color: t.green },
            { label: "Money out",    value: fmtMoney(totalOut), color: t.red },
            { label: "Uncategorized", value: uncatCount.toLocaleString(), color: uncatCount > 0 ? t.gold : t.textMuted },
          ].map(s => (
            <div key={s.label} style={{ background: t.cardBg, border: "1px solid " + t.cardBorder, borderRadius: 10, padding: 14, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 17, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      {transactions.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search description…"
            style={{
              flex: "1 1 240px", padding: "8px 12px",
              background: t.inputBg, border: "1px solid " + t.inputBorder,
              borderRadius: 7, color: t.inputText, fontSize: 13,
              fontFamily: "'DM Sans',sans-serif", outline: "none",
            }}
          />
          <div style={{ display: "flex", gap: 4, padding: 3, borderRadius: 999, border: "1px solid " + t.cardBorder, background: t.cardBg }}>
            {[
              ["all", "All"],
              ["uncategorized", "Uncategorized" + (uncatCount > 0 ? ` · ${uncatCount}` : "")],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                style={{
                  padding: "5px 14px", borderRadius: 999, border: "none",
                  background: filter === id ? t.gold + "33" : "transparent",
                  color: filter === id ? t.gold : t.textMuted,
                  fontSize: 12, fontWeight: filter === id ? 700 : 500,
                  cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
                }}
              >{label}</button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && transactions.length === 0 && (
        <div style={{
          background: t.cardBg, border: "1px dashed " + t.cardBorder, borderRadius: 12,
          padding: 40, textAlign: "center",
        }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🏦</div>
          <div style={{ fontSize: 15, color: t.text, fontWeight: 700, marginBottom: 6 }}>No transactions imported yet</div>
          <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.6, maxWidth: 480, margin: "0 auto 16px" }}>
            Most banks let you download your transactions as a CSV from their online portal. Drop that file here and we'll match what we can to your existing bills.
          </div>
          <button onClick={() => setShowUpload(true)} style={btnPrimary(t)}>📤 Upload your first CSV</button>
        </div>
      )}

      {loading && transactions.length === 0 && (
        <div style={{ padding: 30, textAlign: "center", color: t.textMuted }}>Loading transactions…</div>
      )}

      {/* Transactions grouped by month */}
      {groupKeys.map(key => {
        const list = groups[key];
        const monthIn  = list.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0);
        const monthOut = list.filter(tx => tx.amount < 0).reduce((s, tx) => s + tx.amount, 0);
        return (
          <div key={key} style={{ marginBottom: 18 }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "baseline",
              marginBottom: 6, padding: "0 4px",
            }}>
              <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, color: t.gold, margin: 0 }}>
                {monthLabel(key)} <span style={{ fontSize: 11, color: t.textMuted, fontFamily: "'DM Sans',sans-serif" }}>· {list.length} txns</span>
              </h3>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12 }}>
                <span style={{ color: t.green }}>{fmtMoney(monthIn)}</span>
                <span style={{ color: t.textMuted, margin: "0 6px" }}>·</span>
                <span style={{ color: t.red }}>{fmtMoney(monthOut)}</span>
              </div>
            </div>
            <div style={{ background: t.cardBg, border: "1px solid " + t.cardBorder, borderRadius: 10, overflow: "hidden" }}>
              {list.map((tx, i) => (
                <div
                  key={tx.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "78px 1fr 110px 160px 28px",
                    gap: 10, alignItems: "center",
                    padding: "10px 14px",
                    borderBottom: i < list.length - 1 ? "1px solid " + t.cardBorder : "none",
                  }}
                >
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: t.textMuted }}>
                    {tx.txn_date.slice(5)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: t.text }}>{tx.description}</div>
                    <div style={{ fontSize: 10, color: t.textFaint, marginTop: 2, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      {tx.source && <span>{tx.source}</span>}
                      {tx.bill_match && (
                        <span style={{
                          padding: "1px 6px", borderRadius: 4,
                          background: t.green + "22", color: t.green,
                          fontWeight: 600, letterSpacing: 0.3,
                        }}>↗ applied to {tx.bill_match}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: tx.amount < 0 ? t.red : t.green, textAlign: "right", fontWeight: 600 }}>
                    {fmtMoney(tx.amount)}
                  </div>
                  <select
                    value={tx.category || ""}
                    onChange={(e) => updateCategory(tx.id, e.target.value || null)}
                    style={{
                      padding: "5px 8px", fontSize: 12,
                      background: tx.category ? t.gold + "12" : t.inputBg,
                      border: "1px solid " + (tx.category ? t.gold + "55" : t.inputBorder),
                      borderRadius: 6, color: tx.category ? t.gold : t.textMuted,
                      fontFamily: "'DM Sans',sans-serif", outline: "none", cursor: "pointer",
                    }}
                  >
                    <option value="">— uncategorized —</option>
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{CAT_EMOJIS[c]} {c}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => deleteTxn(tx.id)}
                    title="Delete this transaction"
                    style={{
                      padding: "4px 8px", borderRadius: 5, border: "1px solid " + t.cardBorder,
                      background: "transparent", color: t.textFaint, fontSize: 11, cursor: "pointer",
                      fontFamily: "'DM Sans',sans-serif",
                    }}
                  >✕</button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {showUpload && (
        <BankCsvUploadModal
          user={user}
          theme={theme}
          stateBills={state.bills}
          savedMappings={savedMappings}
          update={update}
          onClose={() => setShowUpload(false)}
          onImported={() => { load(); }}
        />
      )}
    </div>
  );
}

const btnPrimary = (t) => ({
  padding: "10px 18px", borderRadius: 8, border: "none",
  background: "linear-gradient(135deg," + t.gold + "," + t.goldDark + ")",
  color: t.btnText, fontSize: 13, fontWeight: 700, cursor: "pointer",
  fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap",
});
