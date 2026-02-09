import { useState, useEffect, useCallback, useRef } from "react";
import { THEMES, MONTHS, STATUSES, STATUS_LABELS, STATUS_COLORS, CAT_EMOJIS, MILESTONES, SAVINGS_GOAL, THEME_KEY, WORKBOOK_URL, JOTFORM_URL } from "../constants";
import { fmt, groupByCategory, saveLocal } from "../helpers";
import { NumCell, DayCell, ProgressBar, SidebarNote } from "./SharedUI";
import AddExpenseModal from "./AddExpenseModal";

export default function TrackerApp({ user, initialData, onSave, onLogout, theme, setTheme }) {
  const t = THEMES[theme] || THEMES.dark;
  const [state, setState] = useState(initialData);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showAddExpense, setShowAddExpense] = useState(false);
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
  const totalIncome = state.income.reduce((s, i) => s + (i.amount || 0), 0);
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
    <p style="color:#888;font-style:italic;">Monthly Report \u2014 ${MONTHS[currentMonth]} ${new Date().getFullYear()}</p>
    <div class="summary">
      <div><div class="label">Monthly Income</div><div class="value">${fmt(totalIncome)}</div></div>
      <div><div class="label">Total Spent</div><div class="value">${fmt(totalAct)}</div></div>
      <div><div class="label">Remaining</div><div class="value" style="color:${totalIncome - totalAct >= 0 ? "#228B22" : "#DC143C"}">${totalIncome - totalAct >= 0 ? "+" : ""}${(totalIncome - totalAct).toFixed(2)}</div></div>
    </div>
    <h2>Bills & Budget</h2>
    <table><thead><tr><th>Expense</th><th>Category</th><th>Due</th><th>Budgeted</th><th>Actual</th><th>Status</th></tr></thead><tbody>
    ${bills.map((b) => `<tr><td>${b.name}</td><td>${b.category || "Other"}</td><td>${b.dueDay || "\u2014"}</td><td>${fmt(b.budgeted)}</td><td>${fmt(b.actual)}</td><td>${STATUS_LABELS[b.status]}</td></tr>`).join("")}
    </tbody></table>
    <div class="summary">
      <div><div class="label">Credit Score</div><div class="value">${sc}</div></div>
      <div><div class="label">Saved This Month</div><div class="value">${fmt(saved)}</div></div>
      <div><div class="label">Total Saved (YTD)</div><div class="value">${fmt(totalSavedAll)} / $20,000</div></div>
    </div>
    <div class="footer">The Credit Comeback Tracker \u00b7 Powered by CARES Workflows / Kari Hoglund Kounkel<br/>Now go be brilliant.</div>
    </body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div style={{ minHeight: "100vh", background: t.bg, fontFamily: "'DM Sans',sans-serif", color: t.text }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet" />

      {/* SYNC BAR */}
      <div style={{ background: syncStatus === "saving" ? t.gold + "22" : syncStatus === "error" ? t.red + "22" : t.green + "14", padding: "4px 20px", textAlign: "center", fontSize: 11, color: syncStatus === "saving" ? t.gold : syncStatus === "error" ? t.red : t.green, borderBottom: "1px solid " + t.cardBorder, transition: "all 0.3s" }}>
        {syncStatus === "saving" ? "\u2601\uFE0F Saving..." : syncStatus === "error" ? "\u26A0\uFE0F Sync error \u2014 data saved locally" : "\u2601\uFE0F Synced to your account"}
      </div>

      {/* HEADER */}
      <div style={{ background: t.headerBg, borderBottom: "1px solid " + t.headerBorder, padding: "24px 20px 16px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 800, color: t.gold, margin: 0, letterSpacing: "-0.5px" }}>The Credit Comeback Tracker</h1>
              <p style={{ color: t.textMuted, fontSize: 12, margin: "2px 0 0", fontStyle: "italic" }}>Budget · Pay · Save · Rebuild \u2014 One month at a time.</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: t.textMuted, letterSpacing: 1, textTransform: "uppercase" }}>Save $20K Goal</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 20, color: totalSaved >= SAVINGS_GOAL ? t.green : t.gold, fontWeight: 700 }}>{fmt(totalSaved)} <span style={{ fontSize: 12, color: t.textMuted }}>/ $20,000</span></div>
              <div style={{ marginTop: 6, width: 200, marginLeft: "auto" }}><ProgressBar current={totalSaved} goal={SAVINGS_GOAL} color={t.green} theme={theme} /></div>
              <div style={{ marginTop: 8, display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <button onClick={() => { const next = theme === "dark" ? "light" : "dark"; setTheme(next); localStorage.setItem(THEME_KEY, next); }} style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid " + t.cardBorder, background: "transparent", color: t.textMuted, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                  {theme === "dark" ? "\u2600\uFE0F Light" : "\uD83C\uDF19 Dark"}
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
            {[["dashboard", "\uD83D\uDCCA", "Dashboard"], ["bills", "\uD83D\uDCCB", "Bills & Budget"], ["credit", "\u2B50", "Credit Score"], ["savings", "\uD83C\uDFE6", "Savings"]].map(([id, icon, label]) => (
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
                { label: "Remaining", value: (remaining >= 0 ? "+" : "\u2212") + fmt(Math.abs(remaining)), color: remaining >= 0 ? t.green : t.red },
              ].map((s) => (
                <div key={s.label} style={{ background: t.cardBg, border: "1px solid " + t.cardBorder, borderRadius: 12, padding: 16, textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Income */}
            <div style={{ background: t.cardBg, border: "1px solid " + t.cardBorder, borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <h3 style={{ color: t.gold, fontSize: 14, fontWeight: 700, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: 1 }}>{"\uD83D\uDCB0"} Income Sources</h3>
              {state.income.map((src, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < state.income.length - 1 ? "1px solid " + t.cardBorder : "none" }}>
                  <input value={src.name} onChange={(e) => update((s) => { s.income[i].name = e.target.value; })} style={{ background: "transparent", border: "none", color: t.text, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none", flex: 1 }} />
                  <NumCell value={src.amount} onChange={(v) => update((s) => { s.income[i].amount = v; })} theme={theme} />
                </div>
              ))}
              <button onClick={() => update((s) => { s.income.push({ name: "New Source", amount: 0 }); })} style={{ marginTop: 8, padding: "6px 16px", borderRadius: 8, border: "1px dashed " + t.gold + "55", background: "transparent", color: t.gold, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>+ Add Income Source</button>
            </div>

            {/* Payment Status */}
            <div style={{ background: t.cardBg, border: "1px solid " + t.cardBorder, borderRadius: 12, padding: 20 }}>
              <h3 style={{ color: t.gold, fontSize: 14, fontWeight: 700, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 1 }}>{"\uD83D\uDCCB"} {MONTHS[currentMonth]} Payment Status</h3>
              <p style={{ color: t.textMuted, fontSize: 12, margin: "0 0 12px" }}>Tap status to cycle: Unpaid {"\u2192"} Upcoming {"\u2192"} Partial {"\u2192"} Paid</p>
              {bills.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 20px", color: t.textMuted }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{"\uD83D\uDCDD"}</div>
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
              {bills.length > 0 && <div style={{ marginTop: 12, fontSize: 13, color: t.textMuted }}>{paidCount} of {bills.length} paid{paidCount === bills.length && bills.length > 0 ? " \u2014 \uD83C\uDF89 All bills paid this month!" : ""}</div>}
            </div>

            <SidebarNote theme={theme}>The dashboard is your cockpit. Not the kind where you white-knuckle the controls \u2014 the kind where you sip your coffee and watch the gauges move in the right direction. If the "Remaining" number is green, you're winning. If it's red, you're not broken \u2014 you're informed. And informed is the first step out of chaos.</SidebarNote>
          </>
        )}

        {/* BILLS TAB */}
        {activeTab === "bills" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <h2 style={{ color: t.gold, fontFamily: "'Playfair Display',serif", fontSize: 20, margin: 0 }}>{MONTHS[currentMonth]} \u2014 Bills & Budget</h2>
              <button onClick={() => setShowAddExpense(true)} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg," + t.gold + ",#B8860B)", color: t.btnText, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>+ Add Expense</button>
            </div>

            {/* Tip */}
            <div style={{ padding: "10px 16px", background: t.gold + "11", border: "1px solid " + t.gold + "33", borderRadius: 10, marginBottom: 16, fontSize: 12, color: t.gold, lineHeight: 1.5 }}>
              {"\uD83D\uDCA1"} <strong>Make it yours:</strong> Add your actual bills using + Add Expense. Set the amount once and it fills across all selected months. You can override any individual month later.
            </div>

            {bills.length === 0 ? (
              <div style={{ background: t.cardBg, border: "1px solid " + t.cardBorder, borderRadius: 12, padding: "40px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>{"\uD83E\uDDFE"}</div>
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
            ) : (
              Object.entries(grouped).map(([cat, items]) => (
                <div key={cat} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "8px 0", borderBottom: "1px solid " + t.cardBorder }}>
                    <span style={{ fontSize: 18 }}>{CAT_EMOJIS[cat] || "\uD83D\uDCE6"}</span>
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
                              <td style={{ padding: "10px", textAlign: "center", fontFamily: "'DM Mono',monospace", fontSize: 13, color: diff >= 0 ? t.green : t.red }}>{diff >= 0 ? "+" : "\u2212"}{fmt(Math.abs(diff))}</td>
                              <td style={{ padding: "10px", textAlign: "center" }}>
                                <span onClick={() => cycleStatus(b._idx)} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", background: STATUS_COLORS[b.status] + "22", color: STATUS_COLORS[b.status], border: "1px solid " + STATUS_COLORS[b.status] + "44" }}>{STATUS_LABELS[b.status]}</span>
                              </td>
                              <td style={{ padding: "10px", textAlign: "center" }}>
                                <button onClick={() => { if (confirm('Remove "' + b.name + '"?')) removeExpense(b._idx); }} style={{ cursor: "pointer", color: t.red, fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "1px solid " + t.red + "33", background: t.red + "11", fontFamily: "'DM Sans',sans-serif", fontWeight: 600 }}>{"\u2715"}</button>
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
                  { label: "Difference", value: (totalBudgeted - totalActual >= 0 ? "+" : "\u2212") + fmt(Math.abs(totalBudgeted - totalActual)), color: totalBudgeted - totalActual >= 0 ? t.green : t.red },
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

        {/* CREDIT SCORE TAB */}
        {activeTab === "credit" && (
          <>
            <h2 style={{ color: t.gold, fontFamily: "'Playfair Display',serif", fontSize: 20, margin: "0 0 20px" }}>{"\u2B50"} Credit Score Tracker</h2>

            {/* Current Score */}
            <div style={{ background: t.gold + "18", border: "1px solid " + t.gold + "33", borderRadius: 16, padding: 28, textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{MONTHS[currentMonth]} Credit Score</div>
              <NumCell value={score} onChange={(v) => update((s) => { s.creditScores[currentMonth] = v; })} prefix="" placeholder="Enter score" theme={theme} />
              {currentMilestone && <div style={{ marginTop: 12, fontSize: 16 }}>{currentMilestone.emoji} <span style={{ color: t.gold, fontWeight: 600 }}>{currentMilestone.label}</span></div>}
            </div>

            {/* Workbook Promo */}
            <div style={{ background: t.green + "12", border: "1px solid " + t.green + "33", borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: t.text, marginBottom: 6 }}>{"\uD83D\uDCD8"} Want the full strategy behind the numbers?</div>
              <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.6, marginBottom: 12 }}>
                <strong>The Credit Comeback Kit</strong> walks you through everything step by step \u2014 from understanding your credit report to building a payoff plan that actually sticks. 100+ pages of real talk, real strategy.
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <a href={WORKBOOK_URL} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", padding: "10px 24px", borderRadius: 8, background: "linear-gradient(135deg," + t.gold + ",#B8860B)", color: t.btnText, fontSize: 14, fontWeight: 700, textDecoration: "none", fontFamily: "'DM Sans',sans-serif" }}>Get the Kit \u2014 $9.99</a>
                <span style={{ fontSize: 12, color: t.gold, fontStyle: "italic" }}>Launch price through March 31</span>
              </div>
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid " + t.cardBorder }}>
                <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.6 }}>
                  {"\uD83D\uDC9B"} <strong>Cost shouldn't stop your comeback.</strong>{" "}
                  <a href={JOTFORM_URL} target="_blank" rel="noopener noreferrer" style={{ color: t.gold, textDecoration: "underline" }}>Reach out</a> and we'll figure it out together.
                </div>
              </div>
            </div>

            {/* Milestones */}
            <div style={{ background: t.cardBg, border: "1px solid " + t.cardBorder, borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <h3 style={{ color: t.gold, fontSize: 14, fontWeight: 700, margin: "0 0 16px", textTransform: "uppercase", letterSpacing: 1 }}>{"\uD83C\uDFAF"} Milestones</h3>
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
              <h3 style={{ color: t.gold, fontSize: 14, fontWeight: 700, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: 1 }}>{"\uD83D\uDCC8"} Score History</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(80px,1fr))", gap: 8 }}>
                {MONTHS.map((m, i) => (
                  <div key={m} style={{ textAlign: "center", padding: 8, borderRadius: 8, background: i === currentMonth ? t.gold + "18" : "transparent", border: i === currentMonth ? "1px solid " + t.gold + "33" : "1px solid transparent" }}>
                    <div style={{ fontSize: 11, color: i === currentMonth ? t.gold : t.textMuted, marginBottom: 4 }}>{m}</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, fontWeight: 700, color: state.creditScores[i] ? t.text : t.textFaint }}>{state.creditScores[i] || "\u2014"}</div>
                  </div>
                ))}
              </div>
            </div>

            <SidebarNote theme={theme}>Your credit score is not your identity. It's a number on a screen that changes when you change. Every on-time payment is a tiny act of defiance against the version of you that thought this couldn't be fixed. You're not climbing a ladder \u2014 you're building one. Rung by rung. Month by month.</SidebarNote>
          </>
        )}

        {/* SAVINGS TAB */}
        {activeTab === "savings" && (
          <>
            <h2 style={{ color: t.gold, fontFamily: "'Playfair Display',serif", fontSize: 20, margin: "0 0 20px" }}>{"\uD83C\uDFE6"} Savings Tracker</h2>

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

            <SidebarNote theme={theme}>Savings doesn't start with a windfall. It starts with the $13 you didn't spend at the drive-through. It shows up in the $47 you didn't spend on things that don't love you back. Enter what you saved each month. Watch the green bar move. That bar is your future arguing with your past \u2014 and winning.</SidebarNote>
          </>
        )}

        {/* FOOTER */}
        <div style={{ marginTop: 40, textAlign: "center", padding: 20, borderTop: "1px solid " + t.cardBorder }}>
          <button onClick={printReport} style={{ padding: "10px 24px", borderRadius: 8, border: "1px solid " + t.gold + "44", background: t.gold + "15", color: t.gold, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", marginBottom: 16 }}>{"\uD83D\uDDA8\uFE0F"} Print {MONTHS[currentMonth]} Report</button>
          <div style={{ fontFamily: "'Playfair Display',serif", color: t.gold, fontSize: 14, marginBottom: 4 }}>The Credit Comeback Tracker</div>
          <div style={{ fontSize: 12, color: t.textMuted }}>Powered by CARES Workflows / Kari Hoglund Kounkel</div>
          <div style={{ marginTop: 8 }}>
            <a href={WORKBOOK_URL} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: t.gold, textDecoration: "none", fontStyle: "italic" }}>{"\uD83D\uDCD8"} Get The Credit Comeback Kit \u2014 $9.99</a>
          </div>
          <div style={{ marginTop: 8, fontStyle: "italic", color: t.textFaint, fontSize: 12 }}>Now go be brilliant.</div>
        </div>
      </div>

      {showAddExpense && <AddExpenseModal onClose={() => setShowAddExpense(false)} onAdd={addExpense} theme={theme} />}
    </div>
  );
}
