import { THEMES, MONTHS, STATUS_COLORS, STATUS_LABELS, CAT_EMOJIS } from "../constants";

const fmt = (n) => "$" + Math.round(n || 0).toLocaleString();

/**
 * BudgetTimeline — projects the user's year onto a 12-month strip plus a
 * detail card per month.
 *  - Past months: grayed (history)
 *  - Current month: color-coded by each bill's status (paid/unpaid/upcoming/partial)
 *  - Future months: muted accent (pending — pre-plan)
 *
 * Reads state.bills[m] and state.income[m] (m = 0..11) — the shape that
 * already lives in TrackerApp. No new schema, no new entry forms.
 */
export default function BudgetTimeline({ state, currentMonth, theme }) {
  const t = THEMES[theme] || THEMES.dark;

  // Per-month rollups + running balance carried across the year
  let running = 0;
  const monthData = MONTHS.map((name, m) => {
    const incomeItems = state.income[m] || [];
    const bills = state.bills[m] || [];
    const income = incomeItems.reduce((s, i) => s + (i.amount || 0), 0);
    const expenses = bills.reduce((s, b) => s + (b.budgeted || 0), 0);
    const net = income - expenses;
    running += net;
    return { name, m, income, expenses, net, running, bills, incomeItems };
  });

  const isPast = (m) => m < currentMonth;
  const isFuture = (m) => m > currentMonth;

  // Color helpers — central so the legend matches the cards
  const tones = {
    past:    { label: "Past",    chipBg: t.cardBorder,    chipColor: t.textMuted, accent: t.textFaint },
    current: { label: "This Month", chipBg: t.gold + "33", chipColor: t.gold,     accent: t.gold },
    future:  { label: "Upcoming", chipBg: t.green + "22", chipColor: t.green,    accent: t.green },
  };
  const toneFor = (m) => isPast(m) ? tones.past : isFuture(m) ? tones.future : tones.current;

  // Bill text color: past=faint, future=muted, current=status color
  const billColor = (m, status) =>
    isPast(m) ? t.textFaint :
    isFuture(m) ? t.textMuted :
    (STATUS_COLORS[status] || t.text);

  return (
    <div style={{ paddingBottom: 60 }}>

      {/* HEADER */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, color: t.gold, margin: "0 0 4px" }}>
          Money Map — Your Year Ahead
        </h2>
        <p style={{ color: t.textMuted, fontSize: 13, margin: 0 }}>
          Everything you've entered, spread across the next 12 months. Past is grayed
          out, this month is colored by what's paid vs pending, future months show
          you what's coming.
        </p>
      </div>

      {/* LEGEND */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", fontSize: 11 }}>
        {Object.values(tones).map(tone => (
          <div key={tone.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: tone.accent }} />
            <span style={{ color: t.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>{tone.label}</span>
          </div>
        ))}
      </div>

      {/* 12-MONTH STRIP */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(12, minmax(90px, 1fr))",
        gap: 6,
        overflowX: "auto",
        marginBottom: 28,
        paddingBottom: 4,
      }}>
        {monthData.map((md, i) => {
          const tone = toneFor(i);
          const isCurrent = i === currentMonth;
          return (
            <div key={i} style={{
              padding: "10px 8px",
              borderRadius: 10,
              border: isCurrent ? `2px solid ${t.gold}` : `1px solid ${t.cardBorder}`,
              background: isCurrent ? t.gold + "08" : t.cardBg,
              opacity: isPast(i) ? 0.55 : 1,
              minWidth: 90,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: tone.chipColor, marginBottom: 4 }}>
                {md.name}{isCurrent && " ●"}
              </div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: t.green }}>
                +{fmt(md.income)}
              </div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: t.red }}>
                −{fmt(md.expenses)}
              </div>
              <div style={{
                marginTop: 4,
                paddingTop: 4,
                borderTop: `1px dashed ${t.cardBorder}`,
                fontFamily: "'DM Mono',monospace",
                fontSize: 12,
                fontWeight: 700,
                color: md.net >= 0 ? t.green : t.red,
              }}>
                {md.net >= 0 ? "+" : "−"}{fmt(Math.abs(md.net))}
              </div>
              <div style={{ fontSize: 9, color: t.textFaint, marginTop: 2 }}>
                Run: {md.running >= 0 ? "+" : "−"}{fmt(Math.abs(md.running))}
              </div>
            </div>
          );
        })}
      </div>

      {/* DETAIL CARDS — one per month with content */}
      {monthData.map((md, i) => {
        const isCurrent = i === currentMonth;
        if (md.bills.length === 0 && md.incomeItems.length === 0) return null;
        const tone = toneFor(i);
        const sortedBills = [...md.bills].sort((a, b) => (a.dueDay || 32) - (b.dueDay || 32));

        return (
          <div key={i} style={{
            marginBottom: 14,
            padding: 16,
            borderRadius: 12,
            background: t.cardBg,
            border: isCurrent ? `2px solid ${t.gold}` : `1px solid ${t.cardBorder}`,
            opacity: isPast(i) ? 0.65 : 1,
          }}>
            {/* Card header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h3 style={{
                  fontFamily: "'Playfair Display',serif",
                  fontSize: 18,
                  margin: 0,
                  color: isPast(i) ? t.textMuted : isFuture(i) ? t.text : t.gold,
                }}>
                  {md.name}
                </h3>
                <span style={{
                  fontSize: 10,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: tone.chipBg,
                  color: tone.chipColor,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  fontWeight: 700,
                }}>
                  {tone.label}
                </span>
              </div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: t.textMuted }}>
                Net <span style={{ color: md.net >= 0 ? t.green : t.red, fontWeight: 700, marginLeft: 6 }}>
                  {md.net >= 0 ? "+" : "−"}{fmt(Math.abs(md.net))}
                </span>
                <span style={{ marginLeft: 12, color: t.textFaint }}>
                  · running {md.running >= 0 ? "+" : "−"}{fmt(Math.abs(md.running))}
                </span>
              </div>
            </div>

            {/* Income */}
            {md.incomeItems.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: t.textMuted, marginBottom: 4 }}>
                  Income
                </div>
                {md.incomeItems.map((src, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
                    <span style={{ color: isPast(i) ? t.textFaint : isFuture(i) ? t.textMuted : t.text }}>
                      {src.name}
                    </span>
                    <span style={{
                      fontFamily: "'DM Mono',monospace",
                      color: isPast(i) ? t.textFaint : isFuture(i) ? t.green : t.green,
                      opacity: isPast(i) ? 0.7 : 1,
                    }}>
                      +{fmt(src.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Bills */}
            {sortedBills.length > 0 && (
              <div>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: t.textMuted, marginBottom: 4 }}>
                  Bills &amp; expenses
                </div>
                {sortedBills.map((b, idx) => {
                  const color = billColor(i, b.status);
                  return (
                    <div key={idx} style={{
                      display: "grid",
                      gridTemplateColumns: "44px 1fr auto auto",
                      gap: 10,
                      padding: "5px 0",
                      fontSize: 13,
                      alignItems: "center",
                      borderBottom: `1px dashed ${t.cardBorder}`,
                    }}>
                      <span style={{ fontSize: 11, color: t.textMuted, textAlign: "right", fontFamily: "'DM Mono',monospace" }}>
                        {b.dueDay ? `${md.name} ${b.dueDay}` : "—"}
                      </span>
                      <span style={{ color: isPast(i) ? t.textFaint : isFuture(i) ? t.textMuted : t.text }}>
                        {CAT_EMOJIS[b.category] || ""} {b.name}
                      </span>
                      <span style={{
                        fontSize: 10,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: color + "22",
                        color: color,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        fontWeight: 600,
                      }}>
                        {isPast(i) && b.status !== "paid" ? "missed" : (STATUS_LABELS[b.status] || b.status)}
                      </span>
                      <span style={{
                        fontFamily: "'DM Mono',monospace",
                        color: color,
                        minWidth: 70,
                        textAlign: "right",
                        fontWeight: isCurrent ? 700 : 500,
                      }}>
                        −{fmt(b.budgeted)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Empty state — no data anywhere */}
      {monthData.every(md => md.bills.length === 0 && md.incomeItems.length === 0) && (
        <div style={{
          padding: 40,
          textAlign: "center",
          background: t.cardBg,
          border: `1px dashed ${t.cardBorder}`,
          borderRadius: 12,
          color: t.textMuted,
          fontSize: 14,
        }}>
          No income or bills entered yet. Add some on the <strong style={{ color: t.gold }}>Bills &amp; Budget</strong> tab and they'll appear here, projected across the year.
        </div>
      )}
    </div>
  );
}
