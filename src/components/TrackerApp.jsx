import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../supabaseClient";
import { THEMES, MONTHS, STATUSES, STATUS_LABELS, STATUS_COLORS, CAT_EMOJIS, MILESTONES, SAVINGS_GOAL, THEME_KEY, WORKBOOK_URL, JOTFORM_URL } from "../constants";
import { fmt, groupByCategory, saveLocal } from "../helpers";
import { NumCell, DayCell, ProgressBar, SidebarNote } from "./SharedUI";
import AddExpenseModal from "./AddExpenseModal";
import AddIncomeModal, { INCOME_EMOJIS } from "./AddIncomeModal";
import WorkbookPages from "./WorkbookPages";

export default function TrackerApp({ user, initialData, onSave, onLogout, theme, setTheme, isDemo = false, adminEmails = [] }) {
  const isAdmin = adminEmails.includes(user?.email);
  const t = THEMES[theme] || THEMES.dark;
  const [state, setState] = useState(initialData);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [billView, setBillView] = useState("category"); // "category" or "ladder"
  const [syncStatus, setSyncStatus] = useState("saved");
  const saveTimer = useRef(null);

  const update = useCallback((fn) => {
    setState((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      fn(copy);
      return copy;
    });
  }, []);

  // Auto-save debounced
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSyncStatus("saving");
      saveLocal(state);
      try { await onSave(state); setSyncStatus("saved"); }
      catch (e) { console.error("Sync error:", e); setSyncStatus("error"); }
    }, 1000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [state, onSave]);

  // Derived values
  const bills = state.bills[currentMonth] || [];
  const incomeItems = state.income[currentMonth] || [];
  const totalIncome = incomeItems.reduce((s, i) => s + (i.amount || 0), 0);
  const totalBudgeted = bills.reduce((s, b) => s + (b.budgeted || 0), 0);
  const totalActual = bills.reduce((s, b) => s + (b.actual || 0), 0);
  const remaining = totalIncome - totalActual;
  const totalSaved = state.savings.reduce((s, v) => s + (v || 0), 0);
  const score = state.creditScores[currentMonth] || 0;
  const paidCount = bills.filter((b) => b.status === "paid").length;
  const currentMilestone = [...MILESTONES].reverse().find((m) => score >= m.score);
  const grouped = groupByCategory(bills);

  const addExpense = ({ name, category, budgeted: amt, dueDay, months: selectedMonths }) => {
    update((s) => {
      selectedMonths.forEach((on, m) => {
        if (on) s.bills[m].push({ name, category, budgeted: amt, actual: 0, dueDay, status: "unpaid" });
      });
    });
  };

  const addIncome = ({ name, type, amount: amt, months: selectedMonths }) => {
    update((s) => {
      selectedMonths.forEach((on, m) => {
        if (on) s.income[m].push({ name, type, amount: amt });
      });
    });
  };

  const removeIncome = (idx) => { update((s) => { s.income[currentMonth].splice(idx, 1); }); };

  const removeExpense = (idx) => { update((s) => { s.bills[currentMonth].splice(idx, 1); }); };

  const cycleStatus = (i) => {
    update((s) => {
      const cur = s.bills[currentMonth][i].status;
      s.bills[currentMonth][i].status = STATUSES[(STATUSES.indexOf(cur) + 1) % STATUSES.length];
    });
  };

  // Print Report
  const printReport = () => {
    const totalBud = bills.reduce((s, b) => s + (b.budgeted || 0), 0);
    const totalAct = bills.reduce((s, b) => s + (b.actual || 0), 0);
    const sc = state.creditScores[currentMonth] || "Not entered";
    const saved = state.savings[currentMonth] || 0;
    const totalSavedAll = state.savings.reduce((s, v) => s + (v || 0), 0);
    const w = window.open("", "", "width=800,height=900");
    w.document.write(`<!DOCTYPE html><html><head><title>Credit Comeback Report - ${MONTHS[currentMonth]}</title>
    <style>body{font-family:Georgia,serif;padding:40px;color:#222;max-width:700px;margin:0 auto;}
    h1{color:#B8860B;border-bottom:2px solid #B8860B;padding-bottom:8px;}h2{color:#B8860B;margin-top:28px;font-size:18px;}
    table{width:100%;border-collapse:collapse;margin:12px 0;}th,td{padding:8px 12px;border:1px solid #ddd;text-align:right;font-size:13px;}
    th{background:#f5f0e0;text-align:left;font-weight:bold;}td:first-child{text-align:left;}
    .summary{display:flex;justify-content:space-between;gap:20px;margin:16px 0;}.summary div{flex:1;padding:16px;background:#f9f6ee;border-radius:8px;text-align:center;}
    .summary .label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;}.summary .value{font-size:22px;font-weight:bold;color:#B8860B;margin-top:4px;}
    .green{color:#228B22;}.red{color:#DC143C;}.footer{margin-top:40px;text-align:center;font-size:11px;color:#999;border-top:1px solid #ddd;padding-top:16px;}
    @media print{body{padding:20px;}}</style></head><body>
    <h1>The Credit Comeback Tracker</h1>
    <p style="color:#888;font-style:italic;">Monthly Report — ${MONTHS[currentMonth]} ${new Date().getFullYear()}</p>
    <div class="summary">
      <div><div class="label">Monthly Income</div><div class="value">${fmt(totalIncome)}</div></div>
      <div><div class="label">Total Spent</div><div class="value">${fmt(totalAct)}</div></div>
      <div><div class="label">Remaining</div><div class="value" style="color:${totalIncome - totalAct >= 0 ? "#228B22" : "#DC143C"}">${totalIncome - totalAct >= 0 ? "+" : ""}${(totalIncome - totalAct).toFixed(2)}</div></div>
    </div>
    <h2>Bills & Budget</h2>
    <table><thead><tr><th>Expense</th><th>Category</th><th>Due</th><th>Budgeted</th><th>Actual</th><th>Status</th></tr></thead><tbody>
    ${bills.map((b) => `<tr><td>${b.name}</td><td>${b.category || "Other"}</td><td>${b.dueDay || "—"}</td><td>${fmt(b.budgeted)}</td><td>${fmt(b.actual)}</td><td>${STATUS_LABELS[b.status]}</td></tr>`).join("")}
    </tbody></table>
    <div class="summary">
      <div><div class="label">Credit Score</div><div class="value">${sc}</div></div>
      <div><div class="label">Saved This Month</div><div class="value">${fmt(saved)}</div></div>
      <div><div class="label">Total Saved (YTD)</div><div class="value">${fmt(totalSavedAll)} / $20,000</div></div>
    </div>
    <div class="footer">Credit Comeback Kit™ is the proprietary intellectual property of CARES Consulting, Inc. &amp; Kari Hoglund Kounkel.<br/>© 2025–2026. All rights reserved. Unauthorized use, duplication, hosting, or distribution is strictly prohibited.<br/><em>Now go be brilliant.</em></div>
    </body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div style={{ minHeight: "100vh", background: t.bg, fontFamily: "'DM Sans',sans-serif", color: t.text }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet" />

      {/* DEMO MODE BANNER */}
      {isDemo && (
        <div style={{
          background: "#C9A84C",
          padding: "8px 20px",
          textAlign: "center",
          fontSize: 13,
          fontWeight: 700,
          color: "#1B3A5C",
          letterSpacing: 0.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
        }}>
          <span>🎓 DEMO MODE — Nothing here is saved. Click freely. Show off.</span>
          <button
            onClick={onLogout}
            style={{
              padding: "3px 14px", borderRadius: 6, border: "1px solid #1B3A5C44",
              background: "#1B3A5C22", color: "#1B3A5C", fontSize: 11,
              fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif"
            }}
          >✕ Exit Demo</button>
        </div>
      )}

      {/* SYNC BAR */}
      <div style={{ background: syncStatus === "saving" ? t.gold + "22" : syncStatus === "error" ? t.red + "22" : t.green + "14", padding: "4px 20px", textAlign: "center", fontSize: 11, color: syncStatus === "saving" ? t.gold : syncStatus === "error" ? t.red : t.green, borderBottom: "1px solid " + t.cardBorder, transition: "all 0.3s" }}>
        {syncStatus === "saving" ? "☁️ Saving..." : syncStatus === "error" ? "⚠️ Sync error — data saved locally" : "☁️ Synced to your account"}
      </div>

      {/* HEADER */}
      <div style={{ background: t.headerBg, borderBottom: "1px solid " + t.headerBorder, padding: "24px 20px 16px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 800, color: t.gold, margin: 0, letterSpacing: "-0.5px" }}>The Credit Comeback Tracker</h1>
              <p style={{ color: t.textMuted, fontSize: 12, margin: "2px 0 0", fontStyle: "italic" }}>Budget · Pay · Save · Rebuild — One month at a time.</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: t.textMuted, letterSpacing: 1, textTransform: "uppercase" }}>Save $20K Goal</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 20, color: totalSaved >= SAVINGS_GOAL ? t.green : t.gold, fontWeight: 700 }}>{fmt(totalSaved)} <span style={{ fontSize: 12, color: t.textMuted }}>/ $20,000</span></div>
              <div style={{ marginTop: 6, width: 200, marginLeft: "auto" }}><ProgressBar current={totalSaved} goal={SAVINGS_GOAL} color={t.green} theme={theme} /></div>
              <div style={{ marginTop: 8, display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <button onClick={() => { const next = theme === "dark" ? "light" : "dark"; setTheme(next); localStorage.setItem(THEME_KEY, next); }} style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid " + t.cardBorder, background: "transparent", color: t.textMuted, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                  {theme === "dark" ? "☀ Cream" : "🌙 Brown"}
                </button>
                <button onClick={onLogout} style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid " + t.cardBorder, background: "transparent", color: t.textMuted, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Sign Out</button>
              </div>
            </div>
          </div>

          {/* Months */}
          <div style={{ display: "flex", gap: 4, marginTop: 16, flexWrap: "wrap" }}>
            {MONTHS.map((m, i) => (
              <button key={m} onClick={() => setCurrentMonth(i)} style={{ padding: "5px 10px", borderRadius: 8, border: currentMonth === i ? "1px solid " + t.gold : "1px solid " + t.cardBorder, background: currentMonth === i ? t.gold + "33" : t.cardBg, color: currentMonth === i ? t.gold : t.textMuted, fontSize: 12, fontWeight: currentMonth === i ? 700 : 500, cursor: "pointer", transition: "all 0.2s", fontFamily: "'DM Sans',sans-serif" }}>{m}</button>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginTop: 12, borderBottom: "1px solid " + t.cardBorder, overflowX: "auto" }}>
            {[
              ["dashboard", "📊", "Dashboard"],
              ["bills", "📋", "Bills & Budget"],
              ["tank", "🏦", "Holding Tank"],
              ["credit", "⭐", "Credit Score"],
              ["savings", "💰", "Savings"],
              ["workbook", "📓", "Workbook"],
              ...(isAdmin && !isDemo ? [["admin", "🔐", "Admin"]] : []),
            ].map(([id, icon, label]) => (
              <button key={id} onClick={() => setActiveTab(id)} style={{ padding: "8px 16px", border: "none", borderBottom: activeTab === id ? "2px solid " + t.gold : "2px solid transparent", background: "transparent", color: activeTab === id ? t.gold : t.textMuted, fontSize: 13, fontWeight: activeTab === id ? 600 : 400, cursor: "pointer", transition: "all 0.2s", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>{icon} {label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: 20 }}>

        {/* DASHBOARD */}
        {activeTab === "dashboard" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Monthly Income", value: fmt(totalIncome), color: t.gold },
                { label: "Total Budgeted", value: fmt(totalBudgeted), color: t.textMuted },
                { label: "Total Spent", value: fmt(totalActual), color: t.text },
                { label: "Remaining", value: (remaining >= 0 ? "+" : "−") + fmt(Math.abs(remaining)), color: remaining >= 0 ? t.green : t.red },
              ].map((s) => (
                <div key={s.label} style={{ background: t.cardBg, border: "1px solid " + t.cardBorder, borderRadius: 12, padding: 16, textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Income */}
            <div style={{ background: t.cardBg, border: "1px solid " + t.cardBorder, borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ color: t.gold, fontSize: 14, fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>{"💰"} {MONTHS[currentMonth]} Income</h3>
                <button onClick={() => setShowAddIncome(true)} style={{ padding: "6px 16px", borderRadius: 8, border: "none", background: "linear-gradient(135deg," + t.gold + "," + t.goldDark + ")", color: t.btnText, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>+ Add Income</button>
              </div>
              {incomeItems.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px", color: t.textMuted, fontSize: 13 }}>
                  No income sources for {MONTHS[currentMonth]}. Tap + Add Income to get started.
                </div>
              ) : (
                incomeItems.map((src, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < incomeItems.length - 1 ? "1px solid " + t.cardBorder : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                      <span style={{ fontSize: 14 }}>{INCOME_EMOJIS[src.type] || "💰"}</span>
                      <div>
                        <div style={{ fontSize: 13, color: t.text }}>{src.name}</div>
                        <div style={{ fontSize: 10, color: t.textMuted }}>{src.type || ""}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <NumCell value={src.amount} onChange={(v) => update((s) => { s.income[currentMonth][i].amount = v; })} theme={theme} />
                      <button onClick={() => { if (confirm('Remove "' + src.name + '" from ' + MONTHS[currentMonth] + '?')) removeIncome(i); }} style={{ cursor: "pointer", color: t.red, fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "1px solid " + t.red + "33", background: t.red + "11", fontFamily: "'DM Sans',sans-serif", fontWeight: 600 }}>{"✕"}</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Payment Status */}
            <div style={{ background: t.cardBg, border: "1px solid " + t.cardBorder, borderRadius: 12, padding: 20 }}>
              <h3 style={{ color: t.gold, fontSize: 14, fontWeight: 700, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 1 }}>{"📋"} {MONTHS[currentMonth]} Payment Status</h3>
              <p style={{ color: t.textMuted, fontSize: 12, margin: "0 0 12px" }}>Tap status to cycle: Unpaid {"→"} Upcoming {"→"} Partial {"→"} Paid</p>
              {bills.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 20px", color: t.textMuted }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{"📝"}</div>
                  <div style={{ fontSize: 14, marginBottom: 4 }}>No expenses yet for {MONTHS[currentMonth]}</div>
                  <div style={{ fontSize: 12, color: t.textFaint }}>Go to the Bills & Budget tab to add your first expense!</div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 8 }}>
                  {bills.map((b, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: t.rowHover, borderRadius: 8, border: "1px solid " + t.cardBorder }}>
                      <span style={{ fontSize: 13, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: 8 }}>{b.name}</span>
                      <span onClick={() => cycleStatus(i)} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", background: STATUS_COLORS[b.status] + "22", color: STATUS_COLORS[b.status], border: "1px solid " + STATUS_COLORS[b.status] + "44", whiteSpace: "nowrap", transition: "all 0.2s" }}>{STATUS_LABELS[b.status]}</span>
                    </div>
                  ))}
                </div>
              )}
              {bills.length > 0 && <div style={{ marginTop: 12, fontSize: 13, color: t.textMuted }}>{paidCount} of {bills.length} paid{paidCount === bills.length && bills.length > 0 ? " — 🎉 All bills paid this month!" : ""}</div>}
            </div>

            <SidebarNote theme={theme}>The dashboard is your cockpit. Not the kind where you white-knuckle the controls — the kind where you sip your coffee and watch the gauges move in the right direction. If the "Remaining" number is green, you're winning. If it's red, you're not broken — you're informed. And informed is the first step out of chaos.</SidebarNote>
          </>
        )}

        {/* BILLS TAB */}
        {activeTab === "bills" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <h2 style={{ color: t.gold, fontFamily: "'Playfair Display',serif", fontSize: 20, margin: 0 }}>{MONTHS[currentMonth]} — {billView === "ladder" ? "Bill Ladder" : "Bills & Budget"}</h2>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid " + t.cardBorder }}>
                  <button onClick={() => setBillView("category")} style={{ padding: "6px 12px", border: "none", background: billView === "category" ? t.gold + "33" : "transparent", color: billView === "category" ? t.gold : t.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>By Category</button>
                  <button onClick={() => setBillView("ladder")} style={{ padding: "6px 12px", border: "none", borderLeft: "1px solid " + t.cardBorder, background: billView === "ladder" ? t.gold + "33" : "transparent", color: billView === "ladder" ? t.gold : t.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Bill Ladder</button>
                </div>
                <button onClick={() => setShowAddExpense(true)} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg," + t.gold + "," + t.goldDark + ")", color: t.btnText, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>+ Add Expense</button>
              </div>
            </div>

            {/* Tip */}
            <div style={{ padding: "10px 16px", background: t.gold + "11", border: "1px solid " + t.gold + "33", borderRadius: 10, marginBottom: 16, fontSize: 12, color: t.gold, lineHeight: 1.5, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <span>{"💡"} <strong>Make it yours:</strong> Add your actual bills using + Add Expense. Set the amount once and it fills across all selected months. You can override any individual month later.</span>
              {bills.length > 0 && (
                <button onClick={() => { if (confirm("⚠️ THIS WILL DELETE ALL BILLS — PAST, PRESENT, AND FUTURE.\n\nEvery month will be wiped clean. You'll start completely fresh.\n\nAre you sure?")) update((s) => { for (let m = 0; m < 12; m++) s.bills[m] = []; }); }}
                  style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid " + t.red + "33", background: t.red + "11", color: t.red, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontWeight: 600, whiteSpace: "nowrap" }}>Clear All Bills</button>
              )}
            </div>

            {bills.length === 0 ? (
              <div style={{ background: t.cardBg, border: "1px solid " + t.cardBorder, borderRadius: 12, padding: "40px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>{"🧾"}</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: t.text, marginBottom: 8 }}>Start Building Your Budget</div>
                <div style={{ fontSize: 13, color: t.textMuted, maxWidth: 400, margin: "0 auto 20px", lineHeight: 1.6 }}>
                  Tap <strong>+ Add Expense</strong> to add your bills. Here are some common ones:
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 500, margin: "0 auto" }}>
                  {["Rent/Mortgage", "Electric", "Water", "Internet", "Car Payment", "Car Insurance", "Phone", "Netflix", "Groceries", "Gas", "Credit Card"].map((ex) => (
                    <span key={ex} style={{ padding: "4px 12px", borderRadius: 20, background: t.gold + "15", color: t.gold, fontSize: 12, border: "1px solid " + t.gold + "33" }}>{ex}</span>
                  ))}
                </div>
              </div>
            ) : billView === "ladder" ? (
              /* ── BILL LADDER VIEW ── sorted by due date */
              <>
                <div style={{ padding: "10px 16px", background: t.gold + "11", border: "1px solid " + t.gold + "33", borderRadius: 10, marginBottom: 16, fontSize: 12, color: t.gold, lineHeight: 1.5 }}>
                  {"🪜"} <strong>Bill Ladder:</strong> Your bills in the order they hit — sorted by due date. Pay from top to bottom using last month's income from your Holding Tank.
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Due", "Expense", "Category", "Budgeted", "Actual", "Diff", "Status", ""].map((h) => (
                          <th key={h} style={{ padding: "8px 10px", textAlign: h === "Expense" || h === "Category" ? "left" : "center", fontSize: 10, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1, borderBottom: "1px solid " + t.cardBorder, fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...bills].map((b, origIdx) => ({ ...b, _idx: origIdx })).sort((a, b) => (a.dueDay || 99) - (b.dueDay || 99)).map((b, sortedIdx, arr) => {
                        const diff = (b.budgeted || 0) - (b.actual || 0);
                        const prevDay = sortedIdx > 0 ? arr[sortedIdx - 1].dueDay : null;
                        const showDivider = prevDay !== null && b.dueDay !== prevDay;
                        return (
                          <tr key={b._idx} style={{ borderBottom: "1px solid " + t.cardBorder, borderTop: showDivider ? "2px solid " + t.gold + "33" : "none" }}>
                            <td style={{ padding: "10px", textAlign: "center", fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 700, color: t.gold }}>{b.dueDay || "—"}</td>
                            <td style={{ padding: "10px", fontSize: 13, color: t.text }}>{b.name}</td>
                            <td style={{ padding: "10px", fontSize: 11, color: t.textMuted }}>{CAT_EMOJIS[b.category] || "📦"} {b.category || "Other"}</td>
                            <td style={{ padding: "10px", textAlign: "center" }}><NumCell value={b.budgeted} onChange={(v) => update((s) => { s.bills[currentMonth][b._idx].budgeted = v; })} theme={theme} /></td>
                            <td style={{ padding: "10px", textAlign: "center" }}><NumCell value={b.actual} onChange={(v) => update((s) => { s.bills[currentMonth][b._idx].actual = v; })} theme={theme} /></td>
                            <td style={{ padding: "10px", textAlign: "center", fontFamily: "'DM Mono',monospace", fontSize: 13, color: diff >= 0 ? t.green : t.red }}>{diff >= 0 ? "+" : "−"}{fmt(Math.abs(diff))}</td>
                            <td style={{ padding: "10px", textAlign: "center" }}>
                              <span onClick={() => cycleStatus(b._idx)} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", background: STATUS_COLORS[b.status] + "22", color: STATUS_COLORS[b.status], border: "1px solid " + STATUS_COLORS[b.status] + "44" }}>{STATUS_LABELS[b.status]}</span>
                            </td>
                            <td style={{ padding: "10px", textAlign: "center" }}>
                              <button onClick={() => { if (confirm('Remove "' + b.name + '"?')) removeExpense(b._idx); }} style={{ cursor: "pointer", color: t.red, fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "1px solid " + t.red + "33", background: t.red + "11", fontFamily: "'DM Sans',sans-serif", fontWeight: 600 }}>{"✕"}</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Running total by due date */}
                {(() => {
                  const sorted = [...bills].sort((a, b) => (a.dueDay || 99) - (b.dueDay || 99));
                  let runningTotal = totalIncome;
                  const rows = [];
                  let currentDay = null;
                  sorted.forEach((b) => {
                    if (b.dueDay !== currentDay) {
                      currentDay = b.dueDay;
                    }
                    runningTotal -= (b.budgeted || 0);
                  });
                  return null;
                })()}
              </>
            ) : (
              /* ── CATEGORY VIEW ── grouped by category */
              Object.entries(grouped).map(([cat, items]) => (
                <div key={cat} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "8px 0", borderBottom: "1px solid " + t.cardBorder }}>
                    <span style={{ fontSize: 18 }}>{CAT_EMOJIS[cat] || "📦"}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: t.gold, textTransform: "uppercase", letterSpacing: 1 }}>{cat}</span>
                    <span style={{ fontSize: 12, color: t.textMuted }}>({items.length})</span>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          {["Expense", "Due", "Budgeted", "Actual", "Diff", "Status", ""].map((h) => (
                            <th key={h} style={{ padding: "8px 10px", textAlign: h === "Expense" ? "left" : "center", fontSize: 10, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1, borderBottom: "1px solid " + t.cardBorder, fontWeight: 600 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((b) => {
                          const diff = (b.budgeted || 0) - (b.actual || 0);
                          return (
                            <tr key={b._idx} style={{ borderBottom: "1px solid " + t.cardBorder }}>
                              <td style={{ padding: "10px", fontSize: 13, color: t.text }}>{b.name}</td>
                              <td style={{ padding: "10px", textAlign: "center" }}><DayCell value={b.dueDay} onChange={(v) => update((s) => { s.bills[currentMonth][b._idx].dueDay = v; })} theme={theme} /></td>
                              <td style={{ padding: "10px", textAlign: "center" }}><NumCell value={b.budgeted} onChange={(v) => update((s) => { s.bills[currentMonth][b._idx].budgeted = v; })} theme={theme} /></td>
                              <td style={{ padding: "10px", textAlign: "center" }}><NumCell value={b.actual} onChange={(v) => update((s) => { s.bills[currentMonth][b._idx].actual = v; })} theme={theme} /></td>
                              <td style={{ padding: "10px", textAlign: "center", fontFamily: "'DM Mono',monospace", fontSize: 13, color: diff >= 0 ? t.green : t.red }}>{diff >= 0 ? "+" : "−"}{fmt(Math.abs(diff))}</td>
                              <td style={{ padding: "10px", textAlign: "center" }}>
                                <span onClick={() => cycleStatus(b._idx)} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", background: STATUS_COLORS[b.status] + "22", color: STATUS_COLORS[b.status], border: "1px solid " + STATUS_COLORS[b.status] + "44" }}>{STATUS_LABELS[b.status]}</span>
                              </td>
                              <td style={{ padding: "10px", textAlign: "center" }}>
                                <button onClick={() => { if (confirm('Remove "' + b.name + '"?')) removeExpense(b._idx); }} style={{ cursor: "pointer", color: t.red, fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "1px solid " + t.red + "33", background: t.red + "11", fontFamily: "'DM Sans',sans-serif", fontWeight: 600 }}>{"✕"}</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}

            {bills.length > 0 && (
              <div style={{ background: t.cardBg, border: "1px solid " + t.cardBorder, borderRadius: 12, padding: 16, display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 12 }}>
                {[
                  { label: "Total Budgeted", value: fmt(totalBudgeted), color: t.gold },
                  { label: "Total Spent", value: fmt(totalActual), color: t.text },
                  { label: "Difference", value: (totalBudgeted - totalActual >= 0 ? "+" : "−") + fmt(Math.abs(totalBudgeted - totalActual)), color: totalBudgeted - totalActual >= 0 ? t.green : t.red },
                ].map((s) => (
                  <div key={s.label} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
            )}

            <SidebarNote theme={theme}>Your bills are not your enemy. They're the receipts of the life you're building. The budget column is your plan. The actual column is what happened. The difference between those two? That's where your power lives. Even $3 of awareness beats $300 of denial.</SidebarNote>
          </>
        )}

        {/* HOLDING TANK TAB */}
        {activeTab === "tank" && (
          <>
            <h2 style={{ color: t.gold, fontFamily: "'Playfair Display',serif", fontSize: 20, margin: "0 0 8px" }}>{"🏦"} Holding Tank Ledger</h2>
            <p style={{ color: t.textMuted, fontSize: 13, margin: "0 0 20px", lineHeight: 1.6 }}>The two-book system: last month's income pays this month's bills. Your Holding Tank is where money sits between earning it and spending it.</p>

            {/* How it works */}
            <div style={{ padding: "16px 20px", background: t.gold + "11", border: "1px solid " + t.gold + "33", borderRadius: 12, marginBottom: 20, fontSize: 13, color: t.gold, lineHeight: 1.8 }}>
              <strong>How the Holding Tank works:</strong>
              <div style={{ marginTop: 8, color: t.textMuted }}>
                <span style={{ color: t.gold }}>1.</span> You earn income this month (say {MONTHS[currentMonth]}). It goes into the Tank.{" "}
                <span style={{ color: t.gold }}>2.</span> On the 1st of next month, you start paying bills from the Tank using your Bill Ladder.{" "}
                <span style={{ color: t.gold }}>3.</span> Whatever is left after all bills = your breathing room.
              </div>
            </div>

            {/* Tank overview cards */}
            {(() => {
              const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
              const prevIncomeItems = state.income[prevMonth] || [];
              const prevIncome = prevIncomeItems.reduce((s, i) => s + (i.amount || 0), 0);
              const prevBills = (state.bills[prevMonth] || []);
              const prevTotalBudgeted = prevBills.reduce((s, b) => s + (b.budgeted || 0), 0);

              const tankDeposit = prevIncome; // Last month's income
              const thisMonthBills = bills.reduce((s, b) => s + (b.budgeted || 0), 0);
              const thisMonthPaid = bills.reduce((s, b) => s + (b.actual || 0), 0);
              const tankRemaining = tankDeposit - thisMonthPaid;
              const tankProjected = tankDeposit - thisMonthBills;

              return (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 20 }}>
                    {[
                      { label: MONTHS[prevMonth] + " Income (Deposited)", value: fmt(tankDeposit), color: t.gold },
                      { label: MONTHS[currentMonth] + " Bills (Budgeted)", value: fmt(thisMonthBills), color: t.textMuted },
                      { label: "Spent So Far", value: fmt(thisMonthPaid), color: t.text },
                      { label: "Tank Remaining", value: (tankRemaining >= 0 ? "+" : "−") + fmt(Math.abs(tankRemaining)), color: tankRemaining >= 0 ? t.green : t.red },
                    ].map((s) => (
                      <div key={s.label} style={{ background: t.cardBg, border: "1px solid " + t.cardBorder, borderRadius: 12, padding: 16, textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{s.label}</div>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Tank progress bar */}
                  <div style={{ background: t.cardBg, border: "1px solid " + t.cardBorder, borderRadius: 12, padding: 20, marginBottom: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: t.textMuted }}>Tank Depletion</span>
                      <span style={{ fontSize: 12, color: t.textMuted }}>{tankDeposit > 0 ? Math.round((thisMonthPaid / tankDeposit) * 100) : 0}% deployed</span>
                    </div>
                    <div style={{ width: "100%", background: t.cardBorder, borderRadius: 8, height: 16, overflow: "hidden", position: "relative" }}>
                      <div style={{ width: (tankDeposit > 0 ? Math.min((thisMonthBills / tankDeposit) * 100, 100) : 0) + "%", height: "100%", background: t.gold + "33", borderRadius: 8, position: "absolute" }} />
                      <div style={{ width: (tankDeposit > 0 ? Math.min((thisMonthPaid / tankDeposit) * 100, 100) : 0) + "%", height: "100%", background: thisMonthPaid > tankDeposit ? t.red : t.green, borderRadius: 8, position: "absolute", transition: "width 0.5s ease" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11 }}>
                      <span style={{ color: t.green }}>{"●"} Paid</span>
                      <span style={{ color: t.gold }}>{"●"} Budgeted</span>
                    </div>
                  </div>

                  {/* Bill deployment list — ladder order */}
                  <div style={{ background: t.cardBg, border: "1px solid " + t.cardBorder, borderRadius: 12, padding: 20 }}>
                    <h3 style={{ color: t.gold, fontSize: 14, fontWeight: 700, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: 1 }}>{MONTHS[currentMonth]} Bill Deployment</h3>
                    {bills.length === 0 ? (
                      <div style={{ textAlign: "center", padding: 20, color: t.textMuted, fontSize: 13 }}>No bills yet. Add expenses in the Bills & Budget tab.</div>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            {["Due", "Expense", "Budgeted", "Paid", "Status", "Tank After"].map((h) => (
                              <th key={h} style={{ padding: "8px 10px", textAlign: h === "Expense" ? "left" : "center", fontSize: 10, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1, borderBottom: "1px solid " + t.cardBorder, fontWeight: 600 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            let runningTank = tankDeposit;
                            return [...bills].map((b, i) => ({ ...b, _idx: i })).sort((a, b) => (a.dueDay || 99) - (b.dueDay || 99)).map((b) => {
                              runningTank -= (b.actual || 0);
                              return (
                                <tr key={b._idx} style={{ borderBottom: "1px solid " + t.cardBorder }}>
                                  <td style={{ padding: "10px", textAlign: "center", fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 700, color: t.gold }}>{b.dueDay || "—"}</td>
                                  <td style={{ padding: "10px", fontSize: 13, color: t.text }}>{b.name}</td>
                                  <td style={{ padding: "10px", textAlign: "center", fontFamily: "'DM Mono',monospace", fontSize: 13, color: t.textMuted }}>{fmt(b.budgeted || 0)}</td>
                                  <td style={{ padding: "10px", textAlign: "center", fontFamily: "'DM Mono',monospace", fontSize: 13, color: b.actual ? t.text : t.textFaint }}>{b.actual ? fmt(b.actual) : "—"}</td>
                                  <td style={{ padding: "10px", textAlign: "center" }}>
                                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: STATUS_COLORS[b.status] + "22", color: STATUS_COLORS[b.status], border: "1px solid " + STATUS_COLORS[b.status] + "44" }}>{STATUS_LABELS[b.status]}</span>
                                  </td>
                                  <td style={{ padding: "10px", textAlign: "center", fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: runningTank >= 0 ? t.green : t.red }}>{runningTank >= 0 ? "+" : "−"}{fmt(Math.abs(runningTank))}</td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    )}
                  </div>
                </>
              );
            })()}

            <SidebarNote theme={theme}>The Holding Tank is the difference between "I hope I can cover this" and "I already did." When you stop spending money the same month you earn it, something shifts in your chest. You stop chasing. You start choosing. That's not budgeting — that's sovereignty over your own dollar bills.</SidebarNote>
          </>
        )}

        {/* CREDIT SCORE TAB */}
        {activeTab === "credit" && (
          <>
            <h2 style={{ color: t.gold, fontFamily: "'Playfair Display',serif", fontSize: 20, margin: "0 0 20px" }}>{"⭐"} Credit Score Tracker</h2>

            {/* Current Score */}
            <div style={{ background: t.gold + "18", border: "1px solid " + t.gold + "33", borderRadius: 16, padding: 28, textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{MONTHS[currentMonth]} Credit Score</div>
              <NumCell value={score} onChange={(v) => update((s) => { s.creditScores[currentMonth] = v; })} prefix="" placeholder="Enter score" theme={theme} />
              {currentMilestone && <div style={{ marginTop: 12, fontSize: 16 }}>{currentMilestone.emoji} <span style={{ color: t.gold, fontWeight: 600 }}>{currentMilestone.label}</span></div>}
            </div>

            {/* Workbook Promo */}
            <div style={{ background: t.green + "12", border: "1px solid " + t.green + "33", borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: t.text, marginBottom: 6 }}>{"📘"} Want the full strategy behind the numbers?</div>
              <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.6, marginBottom: 12 }}>
                <strong>The Credit Comeback Kit</strong> walks you through everything step by step — from understanding your credit report to building a payoff plan that actually sticks. 100+ pages of real talk, real strategy.
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <a href={WORKBOOK_URL} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", padding: "10px 24px", borderRadius: 8, background: "linear-gradient(135deg," + t.gold + "," + t.goldDark + ")", color: t.btnText, fontSize: 14, fontWeight: 700, textDecoration: "none", fontFamily: "'DM Sans',sans-serif" }}>Get the Kit — $9.99</a>
                <span style={{ fontSize: 12, color: t.gold, fontStyle: "italic" }}>Launch price through March 31</span>
              </div>
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid " + t.cardBorder }}>
                <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.6 }}>
                  {"💛"} <strong>Cost shouldn't stop your comeback.</strong>{" "}
                  <a href={JOTFORM_URL} target="_blank" rel="noopener noreferrer" style={{ color: t.gold, textDecoration: "underline" }}>Reach out</a> and we'll figure it out together.
                </div>
              </div>
            </div>

            {/* Milestones */}
            <div style={{ background: t.cardBg, border: "1px solid " + t.cardBorder, borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <h3 style={{ color: t.gold, fontSize: 14, fontWeight: 700, margin: "0 0 16px", textTransform: "uppercase", letterSpacing: 1 }}>{"🎯"} Milestones</h3>
              {MILESTONES.map((m) => (
                <div key={m.score} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", opacity: score >= m.score ? 1 : 0.4 }}>
                  <span style={{ fontSize: 20 }}>{m.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: score >= m.score ? t.text : t.textMuted }}>{m.label}</div>
                    <ProgressBar current={Math.min(score, m.score)} goal={m.score} color={score >= m.score ? t.green : t.gold} height={4} theme={theme} />
                  </div>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: score >= m.score ? t.green : t.textMuted }}>{m.score}</span>
                </div>
              ))}
            </div>

            {/* Score History */}
            <div style={{ background: t.cardBg, border: "1px solid " + t.cardBorder, borderRadius: 12, padding: 20 }}>
              <h3 style={{ color: t.gold, fontSize: 14, fontWeight: 700, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: 1 }}>{"📈"} Score History</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(80px,1fr))", gap: 8 }}>
                {MONTHS.map((m, i) => (
                  <div key={m} style={{ textAlign: "center", padding: 8, borderRadius: 8, background: i === currentMonth ? t.gold + "18" : "transparent", border: i === currentMonth ? "1px solid " + t.gold + "33" : "1px solid transparent" }}>
                    <div style={{ fontSize: 11, color: i === currentMonth ? t.gold : t.textMuted, marginBottom: 4 }}>{m}</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, fontWeight: 700, color: state.creditScores[i] ? t.text : t.textFaint }}>{state.creditScores[i] || "—"}</div>
                  </div>
                ))}
              </div>
            </div>

            <SidebarNote theme={theme}>Your credit score is not your identity. It's a number on a screen that changes when you change. Every on-time payment is a tiny act of defiance against the version of you that thought this couldn't be fixed. You're not climbing a ladder — you're building one. Rung by rung. Month by month.</SidebarNote>
          </>
        )}

        {/* SAVINGS TAB */}
        {activeTab === "savings" && (
          <>
            <h2 style={{ color: t.gold, fontFamily: "'Playfair Display',serif", fontSize: 20, margin: "0 0 20px" }}>{"🏦"} Savings Tracker</h2>

            <div style={{ background: t.green + "18", border: "1px solid " + t.green + "33", borderRadius: 16, padding: 28, textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Total Saved</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 36, fontWeight: 700, color: totalSaved >= SAVINGS_GOAL ? t.green : t.gold }}>{fmt(totalSaved)}</div>
              <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 12 }}>of {fmt(SAVINGS_GOAL)} goal ({Math.round((totalSaved / SAVINGS_GOAL) * 100)}%)</div>
              <div style={{ maxWidth: 400, margin: "0 auto" }}><ProgressBar current={totalSaved} goal={SAVINGS_GOAL} color={t.green} height={12} theme={theme} /></div>
            </div>

            <div style={{ background: t.cardBg, border: "1px solid " + t.cardBorder, borderRadius: 12, padding: 20 }}>
              <h3 style={{ color: t.gold, fontSize: 14, fontWeight: 700, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: 1 }}>Monthly Savings</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 12 }}>
                {MONTHS.map((m, i) => (
                  <div key={m} style={{ padding: 12, borderRadius: 10, background: i === currentMonth ? t.gold + "18" : t.rowHover, border: i === currentMonth ? "1px solid " + t.gold + "33" : "1px solid " + t.cardBorder, textAlign: "center" }}>
                    <div style={{ fontSize: 12, color: i === currentMonth ? t.gold : t.textMuted, fontWeight: i === currentMonth ? 700 : 400, marginBottom: 6 }}>{m}</div>
                    <NumCell value={state.savings[i]} onChange={(v) => update((s) => { s.savings[i] = v; })} theme={theme} />
                  </div>
                ))}
              </div>
            </div>

            <SidebarNote theme={theme}>Savings doesn't start with a windfall. It starts with the $13 you didn't spend at the drive-through. It shows up in the $47 you didn't spend on things that don't love you back. Enter what you saved each month. Watch the green bar move. That bar is your future arguing with your past — and winning.</SidebarNote>
          </>
        )}

        {/* ADMIN TAB */}
        {activeTab === "workbook" && (
          <WorkbookPages userId={user?.id} />
        )}

        {activeTab === "admin" && isAdmin && !isDemo && (
          <AdminTab theme={theme} t={t} user={user} />
        )}

        {/* FOOTER */}
        <div style={{ marginTop: 40, textAlign: "center", padding: 20, borderTop: "1px solid " + t.cardBorder }}>
          <button onClick={printReport} style={{ padding: "10px 24px", borderRadius: 8, border: "1px solid " + t.gold + "44", background: t.gold + "15", color: t.gold, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", marginBottom: 16 }}>{"🖨️"} Print {MONTHS[currentMonth]} Report</button>
          <div style={{ fontFamily: "'Playfair Display',serif", color: t.gold, fontSize: 14, marginBottom: 4 }}>The Credit Comeback Tracker</div>
          <div style={{ marginTop: 8 }}>
            <a href={WORKBOOK_URL} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: t.gold, textDecoration: "none", fontStyle: "italic" }}>{"📘"} Get The Credit Comeback Kit — $9.99</a>
          </div>
          <div style={{ marginTop: 12, fontSize: 10, color: t.textFaint, lineHeight: 1.7 }}>
            Credit Comeback Kit™ is the proprietary intellectual property of<br/>
            <span style={{ color: t.textMuted, fontWeight: 600 }}>CARES Consulting, Inc. &amp; Kari Hoglund Kounkel</span><br/>
            © 2025–2026. All rights reserved. Unauthorized use, duplication, hosting, or distribution is strictly prohibited.
          </div>
          <div style={{ marginTop: 8, fontStyle: "italic", color: t.textFaint, fontSize: 12 }}>Now go be brilliant.</div>
        </div>
      </div>

      {showAddExpense && <AddExpenseModal onClose={() => setShowAddExpense(false)} onAdd={addExpense} theme={theme} />}
      {showAddIncome && <AddIncomeModal onClose={() => setShowAddIncome(false)} onAdd={addIncome} theme={theme} />}
    </div>
  );
}

// ─── ADMIN TAB COMPONENT ─────────────────────────────────────────────────────
function AdminTab({ theme, t, user }) {
  const [sessionNotes, setSessionNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const [notesLoading, setNotesLoading] = useState(true);
  const [participants, setParticipants] = useState([
    { name: "Jessica Stewart",      email: "",  joined: "Mar 7, 2026", status: "founding", notes: "" },
    { name: "Desiree Hart",         email: "",  joined: "Mar 7, 2026", status: "founding", notes: "" },
    { name: "Elizabeth (Betsy) Hankel", email: "", joined: "Mar 7, 2026", status: "founding", notes: "" },
    { name: "Scott Hoglund",        email: "",  joined: "pending",     status: "pending",  notes: "" },
  ]);

  // Load session notes from Supabase on mount
  useEffect(() => {
    supabase.from("admin_notes").select("notes").eq("key", "session_notes").single()
      .then(({ data }) => {
        if (data?.notes) setSessionNotes(data.notes);
        setNotesLoading(false);
      })
      .catch(() => setNotesLoading(false));
  }, []);

  const saveNotes = async () => {
    await supabase.from("admin_notes").upsert({ key: "session_notes", notes: sessionNotes, updated_at: new Date().toISOString() });
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  };

  const videos = [
    {
      title: "How to Save $20,000 — The Framework That Actually Works",
      channel: "Nischa",
      url: "https://www.youtube.com/watch?v=fxh6BI7JjjE",
      duration: "~10 min",
      note: "The $20K threshold concept — why this number shifts your brain from survival mode to growth mode. Core to the Freedom Fund goal.",
    },
    {
      title: "How to Age Your Money (Holdback Method)",
      channel: "Nick True — MappedOutMoney",
      url: "https://www.youtube.com/watch?v=ajqpkIMFgZo",
      duration: "~8 min",
      note: "Core concept for the Holding Tank. Shows how living on last month's income breaks the paycheck-to-paycheck cycle. ⚠️ Remind Kari: fast-forward past the opening segment before showing in class.",
    },
  ];

  const resources = [
    { label: "Credit Comeback Kit (PDF)", url: "https://credit.karikounkel.com", icon: "📘" },
    { label: "AnnualCreditReport.com", url: "https://www.annualcreditreport.com", icon: "📋" },
    { label: "Experian", url: "https://www.experian.com", icon: "📊" },
    { label: "TransUnion", url: "https://www.transunion.com", icon: "📊" },
    { label: "Equifax", url: "https://www.equifax.com", icon: "📊" },
    { label: "CFPB Dispute Letter Templates", url: "https://www.consumerfinance.gov/consumer-tools/credit-reports-and-scores/", icon: "✉️" },
  ];

  const cardStyle = {
    background: t.cardBg,
    border: "1px solid " + t.cardBorder,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  };

  const headingStyle = {
    fontFamily: "'Playfair Display',serif",
    color: t.gold,
    fontSize: 18,
    fontWeight: 700,
    margin: "0 0 16px",
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <h2 style={{ ...headingStyle, margin: 0, fontSize: 22 }}>🔐 Admin Center</h2>
        <span style={{ fontSize: 11, color: t.textMuted, padding: "3px 10px", borderRadius: 20, border: "1px solid " + t.cardBorder, background: t.rowHover }}>Visible only to you</span>
      </div>

      {/* ── CLASS VIDEOS ── */}
      <div style={cardStyle}>
        <h3 style={headingStyle}>📹 Class Videos</h3>
        {videos.map((v, i) => (
          <div key={i} style={{ padding: "14px 0", borderBottom: i < videos.length - 1 ? "1px solid " + t.cardBorder : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 2 }}>{v.title}</div>
                <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 6 }}>{v.channel} · {v.duration}</div>
                <div style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.5, maxWidth: 560 }}>{v.note}</div>
              </div>
              <a
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ padding: "6px 16px", borderRadius: 8, border: "1px solid #FF0000", background: "#FF000011", color: "#FF6B6B", fontSize: 12, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap", display: "inline-block" }}
              >▶ Watch</a>
            </div>
          </div>
        ))}
      </div>

      {/* ── RESOURCES ── */}
      <div style={cardStyle}>
        <h3 style={headingStyle}>🔗 Class Resources</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          {resources.map((r, i) => (
            <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, border: "1px solid " + t.cardBorder, background: t.rowHover, textDecoration: "none", color: t.text, fontSize: 13, transition: "border-color 0.2s" }}
            >
              <span style={{ fontSize: 18 }}>{r.icon}</span>
              <span>{r.label}</span>
            </a>
          ))}
        </div>
      </div>

      {/* ── PARTICIPANTS ── */}
      <div style={cardStyle}>
        <h3 style={headingStyle}>👥 Cohort 1 — March 2026</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Name", "Email", "Joined", "Status", "Notes"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 10, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1, borderBottom: "1px solid " + t.cardBorder, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {participants.map((p, i) => (
                <tr key={i} style={{ borderBottom: "1px solid " + t.cardBorder }}>
                  <td style={{ padding: "10px", fontSize: 13, color: t.text, fontWeight: 600 }}>{p.name}</td>
                  <td style={{ padding: "10px", fontSize: 12, color: t.textMuted }}>{p.email}</td>
                  <td style={{ padding: "10px", fontSize: 12, color: t.textMuted, whiteSpace: "nowrap" }}>{p.joined}</td>
                  <td style={{ padding: "10px" }}>
                    <span style={{
                      padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                      background: p.status === "founding" ? "#C9A84C22" : p.status === "pending" ? "#88888822" : "#22C55E22",
                      color: p.status === "founding" ? "#C9A84C" : p.status === "pending" ? "#888888" : "#22C55E",
                      border: "1px solid " + (p.status === "founding" ? "#C9A84C44" : p.status === "pending" ? "#88888844" : "#22C55E44"),
                    }}>{p.status === "founding" ? "🪙 founding" : p.status === "pending" ? "⏳ pending" : p.status}</span>
                  </td>
                  <td style={{ padding: "10px" }}>
                    <input
                      value={p.notes}
                      onChange={e => setParticipants(prev => prev.map((x, j) => j === i ? { ...x, notes: e.target.value } : x))}
                      placeholder="Add note..."
                      style={{ width: "100%", padding: "4px 8px", borderRadius: 6, border: "1px solid " + t.cardBorder, background: t.rowHover, color: t.text, fontSize: 12, fontFamily: "'DM Sans',sans-serif", outline: "none" }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: t.textFaint, fontStyle: "italic" }}>
          Notes save to the cloud — available from any device.
        </div>
      </div>

      {/* ── SESSION PLAN ── */}
      <div style={cardStyle}>
        <h3 style={headingStyle}>📅 13-Week Session Plan</h3>
        <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 16, fontStyle: "italic" }}>
          Your roadmap. Edit sessions 7–12 when Monet &amp; Finn fill in the rest.
        </div>
        {[
          { n: 1,  plan: "Share the tech and the workbook. Discuss the concepts and share story. Show the videos. ROADMAP and MASLOW." },
          { n: 2,  plan: "Workbook pgs 13, 55." },
          { n: 3,  plan: "Workbook pgs 23, 30, 72. TERMS, RESOURCES, KARI'S ENCOURAGEMENT." },
          { n: 4,  plan: "Workbook pgs 27, 29, 51 — talk about other reflections." },
          { n: 5,  plan: "REVIEW WHAT SHOULD BE DONE — workbook pgs 58, 60, 67." },
          { n: 6,  plan: "Ask Monet/Finn for the rest of this session plan." },
          { n: 7,  plan: "" },
          { n: 8,  plan: "" },
          { n: 9,  plan: "" },
          { n: 10, plan: "" },
          { n: 11, plan: "" },
          { n: 12, plan: "" },
          { n: 13, plan: "Sign Certificates and Send. Collect Testimonials. Plan follow-up / Future Meets." },
        ].map((s) => (
          <div key={s.n} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderBottom: s.n < 13 ? "1px solid " + t.cardBorder : "none" }}>
            <div style={{ minWidth: 80, fontWeight: 700, fontSize: 13, color: t.gold, fontFamily: "'DM Mono',monospace", paddingTop: 6 }}>
              Week {s.n}
            </div>
            <input
              defaultValue={s.plan}
              placeholder={s.n >= 7 && s.n <= 12 ? "Ask Monet / Finn..." : ""}
              style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "1px solid " + t.cardBorder, background: t.rowHover, color: t.text, fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: "none" }}
              onFocus={e => e.target.style.borderColor = t.gold}
              onBlur={e => e.target.style.borderColor = t.cardBorder}
            />
          </div>
        ))}
        <div style={{ marginTop: 12, fontSize: 11, color: t.textFaint, fontStyle: "italic" }}>
          These edits are local for now — session notes below save to the cloud.
        </div>
      </div>

      {/* ── SESSION NOTES ── */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ ...headingStyle, margin: 0 }}>📝 Session Notes</h3>
          <button
            onClick={saveNotes}
            style={{ padding: "6px 18px", borderRadius: 8, border: "none", background: notesSaved ? "#22C55E" : "linear-gradient(135deg," + t.gold + "," + t.goldDark + ")", color: notesSaved ? "#fff" : t.btnText, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.3s" }}
          >{notesSaved ? "✓ Saved" : "Save Notes"}</button>
        </div>
        <textarea
          value={sessionNotes}
          onChange={e => setSessionNotes(e.target.value)}
          placeholder={"Session 1 — March 7, 2026\n\nTopics covered:\n- Pulled credit reports\n- Reviewed CARES Framework\n- Set up accounts\n\nParticipant wins:\n\nNext session prep:\n"}
          style={{
            width: "100%", minHeight: 240, padding: "12px 14px",
            borderRadius: 8, border: "1px solid " + t.cardBorder,
            background: t.rowHover, color: t.text,
            fontSize: 13, fontFamily: "'DM Mono',monospace",
            lineHeight: 1.7, resize: "vertical", outline: "none",
            boxSizing: "border-box",
          }}
        />
        <div style={{ marginTop: 8, fontSize: 11, color: t.textFaint, fontStyle: "italic" }}>Saves to your browser locally. Copy to a doc for permanent records.</div>
      </div>
    </div>
  );
}
