import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const T = {
  navy:   "#1B3A5C",
  gold:   "#C9A84C",
  light:  "#EFF4FA",
  cream:  "#FDFAF5",
  gray:   "#888888",
  lgray:  "#F5F5F5",
  border: "#D8D0C0",
};

const styles = {
  page: { fontFamily: "'Georgia', serif", background: T.cream, minHeight: "100vh", padding: "0 0 80px" },
  topBar: { background: T.navy, padding: "0", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(0,0,0,0.2)" },
  tabRow: { display: "flex", overflowX: "auto", scrollbarWidth: "none" },
  tab: (active) => ({
    padding: "14px 20px", cursor: "pointer", whiteSpace: "nowrap",
    fontSize: 13, fontFamily: "'Arial', sans-serif",
    fontWeight: active ? 700 : 400,
    color: active ? T.gold : "rgba(255,255,255,0.6)",
    background: "none", border: "none",
    borderBottom: active ? `3px solid ${T.gold}` : "3px solid transparent",
    transition: "all 0.2s", letterSpacing: "0.04em",
  }),
  section: { maxWidth: 800, margin: "0 auto", padding: "32px 20px 0" },
  sectionHeader: { background: T.navy, color: "#fff", padding: "12px 20px", borderRadius: "10px 10px 0 0", borderBottom: `3px solid ${T.gold}`, marginBottom: 0 },
  sectionTitle: { margin: 0, fontSize: 16, fontFamily: "'Arial', sans-serif", fontWeight: 700, letterSpacing: "0.06em" },
  sectionBody: { background: "#fff", border: `1px solid ${T.border}`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: "20px", marginBottom: 28 },
  instruction: { fontSize: 13, color: "#666", fontStyle: "italic", fontFamily: "'Arial', sans-serif", marginBottom: 16 },
  label: { fontSize: 12, fontWeight: 700, color: T.navy, fontFamily: "'Arial', sans-serif", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 },
  input: { width: "100%", padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 14, fontFamily: "'Arial', sans-serif", background: T.lgray, boxSizing: "border-box", outline: "none" },
  saveBtn: { background: T.navy, color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontFamily: "'Arial', sans-serif", fontWeight: 600, cursor: "pointer", marginTop: 16 },
  addBtn: { background: "none", border: `1.5px dashed ${T.gold}`, borderRadius: 6, padding: "8px 16px", fontSize: 13, fontFamily: "'Arial', sans-serif", color: T.gold, cursor: "pointer", marginTop: 8, width: "100%" },
  toast: (show) => ({ position: "fixed", bottom: 24, left: "50%", transform: show ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(20px)", opacity: show ? 1 : 0, background: T.navy, color: T.gold, padding: "10px 24px", borderRadius: 20, fontSize: 14, fontFamily: "'Arial', sans-serif", fontWeight: 600, pointerEvents: "none", transition: "all 0.3s ease", zIndex: 9999, whiteSpace: "nowrap" }),
};

function Field({ label, value, onChange, placeholder = "", type = "text", flex = 1 }) {
  return (
    <div style={{ flex, minWidth: 100 }}>
      <div style={styles.label}>{label}</div>
      <input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={styles.input}
        onFocus={(e) => (e.target.style.borderColor = T.gold)} onBlur={(e) => (e.target.style.borderColor = T.border)} />
    </div>
  );
}

function ScoreBox({ bureau, value, onChange }) {
  return (
    <div style={{ flex: 1, textAlign: "center", minWidth: 100 }}>
      <div style={styles.label}>{bureau}</div>
      <input type="number" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="000"
        style={{ ...styles.input, textAlign: "center", fontSize: 28, fontWeight: 700, color: T.navy, padding: "12px 8px" }}
        onFocus={(e) => (e.target.style.borderColor = T.gold)} onBlur={(e) => (e.target.style.borderColor = T.border)} />
    </div>
  );
}

function TableGrid({ columns, rows, onChange, onAddRow }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "'Arial', sans-serif" }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ background: T.navy, color: "#fff", padding: "8px 10px", textAlign: "left", fontSize: 11, letterSpacing: "0.06em", fontWeight: 700, whiteSpace: "nowrap", width: col.width || "auto" }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 0 ? "#fff" : T.lgray }}>
              {columns.map((col) => (
                <td key={col.key} style={{ padding: "4px 6px", borderBottom: `1px solid ${T.border}` }}>
                  {col.type === "check" ? (
                    <input type="checkbox" checked={!!row[col.key]} onChange={(e) => onChange(ri, col.key, e.target.checked)} style={{ accentColor: T.gold, width: 16, height: 16 }} />
                  ) : (
                    <input type={col.type || "text"} value={row[col.key] || ""} onChange={(e) => onChange(ri, col.key, e.target.value)} placeholder={col.placeholder || ""}
                      style={{ ...styles.input, background: "transparent", border: "none", padding: "4px 2px", fontSize: 13, borderBottom: "1px solid transparent" }}
                      onFocus={(e) => (e.target.style.borderBottomColor = T.gold)} onBlur={(e) => (e.target.style.borderBottomColor = "transparent")} />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {onAddRow && <button onClick={onAddRow} style={styles.addBtn}>+ Add Row</button>}
    </div>
  );
}

const emptyDebt = () => ({ creditor: "", balance: "", rate: "", minimum: "", paying: "", order: "" });
const emptyNegItem = () => ({ item: "", priority: "", action: "", status: "" });
const emptyDispute = () => ({ item: "", bureau: "", sent: "", followup: "", response: "", result: "" });
const emptyMail = () => ({ date: "", sentTo: "", tracking: "", delivered: false });
const emptyWin = () => ({ date: "", win: "", felt: "" });

const DEFAULT_DATA = {
  scores: { equifax: "", experian: "", transunion: "", datePulled: "" },
  creditItems: Array(8).fill(null).map(() => ({ creditor: "", amount: "", type: "", date: "", bureau: "" })),
  negItems: Array(8).fill(null).map(emptyNegItem),
  disputes: Array(8).fill(null).map(emptyDispute),
  mailings: Array(8).fill(null).map(emptyMail),
  disputeResults: Array(8).fill(null).map(() => ({ item: "", bureau: "", result: "", date: "", next: "" })),
  scoreChanges: [
    { label: "Before Disputes", eq: "", ex: "", tu: "" },
    { label: "After Round 1",   eq: "", ex: "", tu: "" },
    { label: "After Round 2",   eq: "", ex: "", tu: "" },
    { label: "After Round 3",   eq: "", ex: "", tu: "" },
  ],
  debts: Array(8).fill(null).map(emptyDebt),
  debtTracker: Array(8).fill(null).map(() => ({ debt: "", starting: "", current: "", paidOff: false, date: "" })),
  budget: {
    month: "",
    income: [
      { source: "Paycheck 1", expected: "", actual: "" },
      { source: "Paycheck 2", expected: "", actual: "" },
      { source: "Side Income", expected: "", actual: "" },
      { source: "Other", expected: "", actual: "" },
    ],
    fixed: [
      { expense: "Rent / Mortgage", budgeted: "", actual: "" },
      { expense: "Utilities", budgeted: "", actual: "" },
      { expense: "Phone", budgeted: "", actual: "" },
      { expense: "Internet", budgeted: "", actual: "" },
      { expense: "Car Payment", budgeted: "", actual: "" },
      { expense: "Insurance", budgeted: "", actual: "" },
      { expense: "Childcare", budgeted: "", actual: "" },
      { expense: "Subscriptions", budgeted: "", actual: "" },
    ],
    variable: [
      { expense: "Groceries", budgeted: "", actual: "" },
      { expense: "Gas / Transportation", budgeted: "", actual: "" },
      { expense: "Dining Out", budgeted: "", actual: "" },
      { expense: "Personal Care", budgeted: "", actual: "" },
      { expense: "Clothing", budgeted: "", actual: "" },
      { expense: "Medical", budgeted: "", actual: "" },
      { expense: "Entertainment", budgeted: "", actual: "" },
      { expense: "Miscellaneous", budgeted: "", actual: "" },
    ],
    savings: [
      { category: "Freedom Fund", budgeted: "", actual: "" },
      { category: "Extra Debt Payment", budgeted: "", actual: "" },
      { category: "Other Goal", budgeted: "", actual: "" },
    ],
  },
  monitoring: Array(13).fill(null).map((_, i) => ({ month: i === 0 ? "Start" : `Month ${i}`, eq: "", ex: "", tu: "", notes: "" })),
  wins: Array(10).fill(null).map(emptyWin),
};

const TABS = [
  { id: "clarify", label: "① Clarify" },
  { id: "audit",   label: "② Audit" },
  { id: "debts",   label: "③ Debts" },
  { id: "budget",  label: "③ Budget" },
  { id: "sustain", label: "④ Sustain" },
];

export default function WorkbookPages({ userId }) {
  const [activeTab, setActiveTab] = useState("clarify");
  const [data, setData] = useState(DEFAULT_DATA);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    supabase.from("workbook_data").select("data").eq("user_id", userId).single()
      .then(({ data: row }) => {
        if (row?.data) setData({ ...DEFAULT_DATA, ...row.data });
        setLoading(false);
      });
  }, [userId]);

  function update(path, value) {
    setData((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split(".");
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  }

  function updateRow(section, rowIdx, field, value) {
    setData((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      next[section][rowIdx][field] = value;
      return next;
    });
  }

  function addRow(section, factory) {
    setData((prev) => ({ ...prev, [section]: [...prev[section], factory()] }));
  }

  function updateBudgetRow(category, rowIdx, field, value) {
    setData((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      next.budget[category][rowIdx][field] = value;
      return next;
    });
  }

  async function save() {
    if (!userId) return;
    setSaving(true);
    await supabase.from("workbook_data").upsert({ user_id: userId, data, updated_at: new Date().toISOString() });
    setSaving(false);
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  }

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: T.navy, fontFamily: "'Arial', sans-serif" }}>Loading your workbook...</div>;

  const BudgetTable = ({ category, rows, label, instruction }) => (
    <>
      <div style={styles.sectionHeader}><p style={styles.sectionTitle}>{label}</p></div>
      <div style={styles.sectionBody}>
        {instruction && <p style={styles.instruction}>{instruction}</p>}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "'Arial', sans-serif" }}>
          <thead><tr>{["SOURCE/EXPENSE", "EXPECTED/BUDGETED", "ACTUAL"].map((h) => <th key={h} style={{ background: T.navy, color: "#fff", padding: "8px 10px", fontSize: 11, letterSpacing: "0.06em", fontWeight: 700, textAlign: "left" }}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} style={{ background: ri % 2 === 0 ? "#fff" : T.lgray }}>
                <td style={{ padding: "6px 8px", borderBottom: `1px solid ${T.border}`, fontWeight: 600, color: T.navy }}>{row.source || row.expense || row.category}</td>
                {[Object.keys(row)[1], Object.keys(row)[2]].map((k) => (
                  <td key={k} style={{ padding: "4px 6px", borderBottom: `1px solid ${T.border}` }}>
                    <input type="text" value={row[k] || ""} onChange={(e) => updateBudgetRow(category, ri, k, e.target.value)} placeholder="$"
                      style={{ ...styles.input, background: "transparent", border: "none", borderBottom: "1px solid transparent" }}
                      onFocus={(e) => (e.target.style.borderBottomColor = T.gold)} onBlur={(e) => (e.target.style.borderBottomColor = "transparent")} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  const tabContent = {
    clarify: (
      <div style={styles.section}>
        <div style={styles.sectionHeader}><p style={styles.sectionTitle}>CREDIT SCORES</p></div>
        <div style={styles.sectionBody}>
          <p style={styles.instruction}>Pull your reports at AnnualCreditReport.com — free, no credit card. Record your starting scores below.</p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <ScoreBox bureau="EQUIFAX" value={data.scores.equifax} onChange={(v) => update("scores.equifax", v)} />
            <ScoreBox bureau="EXPERIAN" value={data.scores.experian} onChange={(v) => update("scores.experian", v)} />
            <ScoreBox bureau="TRANSUNION" value={data.scores.transunion} onChange={(v) => update("scores.transunion", v)} />
          </div>
          <div style={{ marginTop: 16 }}>
            <Field label="Date Pulled" value={data.scores.datePulled} onChange={(v) => update("scores.datePulled", v)} type="date" flex="0 0 200px" />
          </div>
        </div>
        <div style={styles.sectionHeader}><p style={styles.sectionTitle}>CREDIT REPORT REVIEW WORKSHEET</p></div>
        <div style={styles.sectionBody}>
          <p style={styles.instruction}>List everything hurting your score. Creditors, collections, late payments — get it all down.</p>
          <TableGrid
            columns={[{ key: "creditor", label: "Creditor", width: "25%" }, { key: "amount", label: "Amount", width: "15%", placeholder: "$" }, { key: "type", label: "Type", width: "20%", placeholder: "Collection, Late..." }, { key: "date", label: "Date", width: "20%", type: "date" }, { key: "bureau", label: "Bureau", width: "20%", placeholder: "EQ / EX / TU" }]}
            rows={data.creditItems} onChange={(ri, field, val) => updateRow("creditItems", ri, field, val)}
            onAddRow={() => addRow("creditItems", () => ({ creditor: "", amount: "", type: "", date: "", bureau: "" }))} />
        </div>
        <div style={styles.sectionHeader}><p style={styles.sectionTitle}>NEGATIVE ITEMS PRIORITY WORKSHEET</p></div>
        <div style={styles.sectionBody}>
          <p style={styles.instruction}>Rank items by impact and likelihood of removal. Start with the ones that'll move your score the most.</p>
          <TableGrid
            columns={[{ key: "item", label: "Item / Creditor", width: "35%" }, { key: "priority", label: "Priority (1–10)", width: "20%", placeholder: "1 = highest" }, { key: "action", label: "Action", width: "25%", placeholder: "Dispute, Goodwill..." }, { key: "status", label: "Status", width: "20%", placeholder: "Not Started..." }]}
            rows={data.negItems} onChange={(ri, field, val) => updateRow("negItems", ri, field, val)} onAddRow={() => addRow("negItems", emptyNegItem)} />
        </div>
        <button style={styles.saveBtn} onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Section 1"}</button>
      </div>
    ),
    audit: (
      <div style={styles.section}>
        <div style={styles.sectionHeader}><p style={styles.sectionTitle}>DISPUTE TRACKING LOG</p></div>
        <div style={styles.sectionBody}>
          <p style={styles.instruction}>Log every dispute you send. This is your paper trail — protect it like a court document.</p>
          <TableGrid
            columns={[{ key: "item", label: "Item", width: "20%" }, { key: "bureau", label: "Bureau", width: "12%", placeholder: "EQ/EX/TU" }, { key: "sent", label: "Date Sent", width: "15%", type: "date" }, { key: "followup", label: "30-Day Follow", width: "15%", type: "date" }, { key: "response", label: "Response", width: "20%", placeholder: "Deleted, Verified..." }, { key: "result", label: "Result", width: "18%", placeholder: "Win / Still fighting" }]}
            rows={data.disputes} onChange={(ri, field, val) => updateRow("disputes", ri, field, val)} onAddRow={() => addRow("disputes", emptyDispute)} />
        </div>
        <div style={styles.sectionHeader}><p style={styles.sectionTitle}>CERTIFIED MAIL TRACKING LOG</p></div>
        <div style={styles.sectionBody}>
          <p style={styles.instruction}>Every dispute goes certified mail, return receipt. Log your tracking numbers here.</p>
          <TableGrid
            columns={[{ key: "date", label: "Date Sent", width: "18%", type: "date" }, { key: "sentTo", label: "Sent To", width: "30%" }, { key: "tracking", label: "Tracking #", width: "34%" }, { key: "delivered", label: "Delivered ✓", width: "18%", type: "check" }]}
            rows={data.mailings} onChange={(ri, field, val) => updateRow("mailings", ri, field, val)} onAddRow={() => addRow("mailings", emptyMail)} />
        </div>
        <div style={styles.sectionHeader}><p style={styles.sectionTitle}>DISPUTE RESULTS TRACKER</p></div>
        <div style={styles.sectionBody}>
          <p style={styles.instruction}>When responses come back, log them here. Every deletion is a win worth recording.</p>
          <TableGrid
            columns={[{ key: "item", label: "Item", width: "22%" }, { key: "bureau", label: "Bureau", width: "12%" }, { key: "result", label: "Result", width: "22%", placeholder: "Deleted / Verified..." }, { key: "date", label: "Date", width: "16%", type: "date" }, { key: "next", label: "Next Step", width: "28%", placeholder: "Goodwill letter, appeal..." }]}
            rows={data.disputeResults} onChange={(ri, field, val) => updateRow("disputeResults", ri, field, val)}
            onAddRow={() => addRow("disputeResults", () => ({ item: "", bureau: "", result: "", date: "", next: "" }))} />
          <div style={{ marginTop: 24, marginBottom: 8 }}><div style={styles.label}>Score Changes After Disputes</div></div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "'Arial', sans-serif" }}>
            <thead><tr>{["", "EQUIFAX", "EXPERIAN", "TRANSUNION"].map((h) => <th key={h} style={{ background: T.navy, color: "#fff", padding: "8px 10px", fontSize: 11, letterSpacing: "0.06em", fontWeight: 700 }}>{h}</th>)}</tr></thead>
            <tbody>
              {data.scoreChanges.map((row, ri) => (
                <tr key={ri} style={{ background: ri % 2 === 0 ? "#fff" : T.lgray }}>
                  <td style={{ padding: "8px 10px", fontWeight: 600, color: T.navy, fontSize: 13, borderBottom: `1px solid ${T.border}` }}>{row.label}</td>
                  {["eq", "ex", "tu"].map((k) => (
                    <td key={k} style={{ padding: "4px 6px", borderBottom: `1px solid ${T.border}` }}>
                      <input type="number" value={data.scoreChanges[ri][k] || ""} onChange={(e) => { setData((prev) => { const next = JSON.parse(JSON.stringify(prev)); next.scoreChanges[ri][k] = e.target.value; return next; }); }} placeholder="000"
                        style={{ ...styles.input, background: "transparent", border: "none", textAlign: "center", fontSize: 14, fontWeight: 700, borderBottom: "1px solid transparent" }}
                        onFocus={(e) => (e.target.style.borderBottomColor = T.gold)} onBlur={(e) => (e.target.style.borderBottomColor = "transparent")} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button style={styles.saveBtn} onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Section 2"}</button>
      </div>
    ),
    debts: (
      <div style={styles.section}>
        <div style={styles.sectionHeader}><p style={styles.sectionTitle}>MY CURRENT DEBTS & BALANCES</p></div>
        <div style={styles.sectionBody}>
          <p style={styles.instruction}>List all debts smallest to largest balance. This is your snowball starting line.</p>
          <TableGrid
            columns={[{ key: "creditor", label: "Creditor", width: "25%" }, { key: "balance", label: "Balance", width: "15%", placeholder: "$" }, { key: "rate", label: "Rate %", width: "13%", placeholder: "%" }, { key: "minimum", label: "Min. Payment", width: "17%", placeholder: "$" }, { key: "paying", label: "Currently Paying", width: "17%", placeholder: "$" }, { key: "order", label: "Order", width: "13%", placeholder: "1,2,3..." }]}
            rows={data.debts} onChange={(ri, field, val) => updateRow("debts", ri, field, val)} onAddRow={() => addRow("debts", emptyDebt)} />
        </div>
        <div style={styles.sectionHeader}><p style={styles.sectionTitle}>DEBT PAYOFF TRACKER</p></div>
        <div style={styles.sectionBody}>
          <p style={styles.instruction}>Track your progress as balances shrink. Every zero is a victory worth celebrating.</p>
          <TableGrid
            columns={[{ key: "debt", label: "Debt / Creditor", width: "28%" }, { key: "starting", label: "Starting Balance", width: "20%", placeholder: "$" }, { key: "current", label: "Current Balance", width: "20%", placeholder: "$" }, { key: "paidOff", label: "Paid Off ✓", width: "16%", type: "check" }, { key: "date", label: "Date Paid", width: "16%", type: "date" }]}
            rows={data.debtTracker} onChange={(ri, field, val) => updateRow("debtTracker", ri, field, val)}
            onAddRow={() => addRow("debtTracker", () => ({ debt: "", starting: "", current: "", paidOff: false, date: "" }))} />
        </div>
        <button style={styles.saveBtn} onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Debts"}</button>
      </div>
    ),
    budget: (
      <div style={styles.section}>
        <div style={{ marginBottom: 20 }}>
          <Field label="Month / Year" value={data.budget.month} onChange={(v) => update("budget.month", v)} placeholder="e.g. March 2026" flex="0 0 220px" />
        </div>
        <BudgetTable category="income" rows={data.budget.income} label="INCOME" />
        <BudgetTable category="fixed" rows={data.budget.fixed} label="FIXED EXPENSES" instruction="Same every month — rent, insurance, car payment, subscriptions." />
        <BudgetTable category="variable" rows={data.budget.variable} label="VARIABLE EXPENSES" instruction="These change month to month — groceries, gas, dining, fun money." />
        <BudgetTable category="savings" rows={data.budget.savings} label="SAVINGS & DEBT PAYDOWN" />
        <button style={styles.saveBtn} onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Budget"}</button>
      </div>
    ),
    sustain: (
      <div style={styles.section}>
        <div style={styles.sectionHeader}><p style={styles.sectionTitle}>12-MONTH CREDIT MONITORING LOG</p></div>
        <div style={styles.sectionBody}>
          <p style={styles.instruction}>Check your scores monthly. Watch the numbers move. This is proof you're working.</p>
          <TableGrid
            columns={[{ key: "month", label: "Month", width: "18%" }, { key: "eq", label: "Equifax", width: "18%", placeholder: "000" }, { key: "ex", label: "Experian", width: "18%", placeholder: "000" }, { key: "tu", label: "TransUnion", width: "18%", placeholder: "000" }, { key: "notes", label: "Notes", width: "28%" }]}
            rows={data.monitoring} onChange={(ri, field, val) => updateRow("monitoring", ri, field, val)} />
        </div>
        <div style={styles.sectionHeader}><p style={styles.sectionTitle}>WINS & MILESTONES TRACKER</p></div>
        <div style={styles.sectionBody}>
          <p style={styles.instruction}>Document every win — no matter how small. When this gets hard, you'll come back here and remember who you are.</p>
          <TableGrid
            columns={[{ key: "date", label: "Date", width: "18%", type: "date" }, { key: "win", label: "Win / Milestone", width: "50%" }, { key: "felt", label: "How I Felt", width: "32%" }]}
            rows={data.wins} onChange={(ri, field, val) => updateRow("wins", ri, field, val)} onAddRow={() => addRow("wins", emptyWin)} />
        </div>
        <button style={styles.saveBtn} onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Section 4"}</button>
      </div>
    ),
  };

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <div style={styles.tabRow}>
          {TABS.map((t) => (
            <button key={t.id} style={styles.tab(activeTab === t.id)} onClick={() => setActiveTab(t.id)}>{t.label}</button>
          ))}
        </div>
      </div>
      {tabContent[activeTab]}
      <div style={styles.toast(toast)}>✓ Saved</div>
    </div>
  );
}
