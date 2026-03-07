import { useState, useEffect } from "react";

const STEPS = [
  {
    id: 1,
    phase: "WELCOME",
    icon: "🪩",
    title: "You made it. That already took courage.",
    subtitle: "Here's what the next 90 days look like.",
    body: `The Credit Comeback Kit is a 90-day system — not a magic wand, not a punishment. It's a ladder. You don't have to climb it all at once. You just have to take the next rung.\n\nWhether your credit is a mystery, a mess, or just needs a tune-up — you're in the right place. This app tracks your progress, saves your data, and reminds you how far you've come when you forget.`,
    tip: null,
    cta: "Let's see how it works →",
  },
  {
    id: 2,
    phase: "CLARIFY",
    icon: "🔍",
    title: "Phase 1: Know your numbers.",
    subtitle: "Days 1–7",
    body: `First thing: pull your credit reports. All three of them. It's free, it doesn't hurt your score, and you can do it right now at AnnualCreditReport.com.\n\nThen come back here and log your starting scores. Equifax. Experian. TransUnion. Whatever those numbers are — they're just your starting line, not your finish line.`,
    tip: "💡 Never pulled your credit report before? That's fine. The site walks you through it. Give yourself 20 minutes.",
    cta: "Got it — what's next? →",
  },
  {
    id: 3,
    phase: "AUDIT",
    icon: "📋",
    title: "Phase 2: Find the errors.",
    subtitle: "Days 8–14",
    body: `Here's something a lot of people don't know: credit reports are wrong. A lot. Up to 1 in 5 people have errors significant enough to affect their score.\n\nIn this phase you go through your report line by line and flag anything that looks wrong, outdated, or flat-out doesn't belong to you. Then you dispute it — in writing, certified mail, tracked like a hawk.\n\nThe app has logs for all of it.`,
    tip: "💡 Already know your report is accurate? You still do this phase — because accurate negative items have rules about how long they can stay, and we're checking those too.",
    cta: "Makes sense →",
  },
  {
    id: 4,
    phase: "REPAIR",
    icon: "🔧",
    title: "Phase 3: Send the letters.",
    subtitle: "Days 15–45",
    body: `Disputing errors is a legal process. The bureaus have 30 days to respond. You send certified mail. You track the tracking numbers. You log the responses.\n\nThe workbook has letter templates for every situation — dispute letters, debt validation letters, goodwill letters. You fill in the blanks, you send them, you log them here.\n\nPatience is the skill this phase builds.`,
    tip: "💡 Goodwill letters work more often than people expect. If you have a solid payment history with a creditor and one late payment, it's worth asking them to remove it.",
    cta: "Keep going →",
  },
  {
    id: 5,
    phase: "ESTABLISH",
    icon: "🏗️",
    title: "Phase 4: Build the foundation.",
    subtitle: "Days 30–75",
    body: `Credit repair without budget work is like mopping while the faucet's still running.\n\nThis is where you set up your Holding Tank account (a separate savings buffer), build your Bill Ladder, run the 5% Shave on your expenses, and start the Debt Snowball. You don't have to do all of it perfectly. You just have to start.\n\nThe app tracks your income, your bills, your budget, your debt balances — month by month.`,
    tip: "💡 The 5% Shave is simple: take every variable expense and multiply it by 0.95. The difference goes toward debt or savings. Small shaves add up faster than you think.",
    cta: "Almost there →",
  },
  {
    id: 6,
    phase: "SUSTAIN",
    icon: "📈",
    title: "Phase 5: Watch the numbers move.",
    subtitle: "Ongoing",
    body: `Once the disputes are filed and the budget is running, your job becomes maintenance. Check your scores monthly. Log them. Watch them climb.\n\nThe 12-Month Monitoring Log in this app is where that happens. And the Wins & Milestones Tracker is where you record every single victory — because when this gets hard (and it might), you'll need proof of your own progress.`,
    tip: "💡 Scores don't move the day after a dispute. Give it 30–45 days after an item is removed before you check.",
    cta: "One more thing →",
  },
  {
    id: 7,
    phase: "YOUR TOOLS",
    icon: "🧰",
    title: "Everything lives here.",
    subtitle: "Your dashboard at a glance.",
    body: `This app is your command center for the whole 90 days:\n\n• Credit Scores — log all three bureaus, track changes over time\n• Budget — income, fixed expenses, variable expenses, savings\n• Debts — your snowball list, current balances, payoff tracker\n• Disputes — tracking logs, certified mail, results\n• Wins — your milestone record`,
    tip: null,
    cta: "Let's do this →",
  },
];

export default function CCKTutorial({ onComplete }) {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [visible, setVisible] = useState(false);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
  }, []);

  const step = STEPS[current];
  const isLast = current === STEPS.length - 1;
  const progress = (current / (STEPS.length - 1)) * 100;

  function goTo(idx) {
    if (animating) return;
    setAnimating(true);
    setVisible(false);
    setTimeout(() => {
      setCurrent(idx);
      setVisible(true);
      setAnimating(false);
    }, 280);
  }

  function next() {
    if (isLast) { onComplete && onComplete(); return; }
    goTo(current + 1);
  }

  function prev() {
    if (current === 0) return;
    goTo(current - 1);
  }

  if (skipped) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(10,20,35,0.88)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Georgia', serif",
      backdropFilter: "blur(6px)",
    }}>
      <div style={{
        width: "100%", maxWidth: 620,
        margin: "0 16px",
        background: "#FDFAF5",
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: "0 32px 80px rgba(0,0,0,0.45)",
        transform: visible ? "translateY(0) scale(1)" : "translateY(24px) scale(0.97)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.28s cubic-bezier(.22,.68,0,.99), opacity 0.28s ease",
      }}>
        <div style={{ background: "#1B3A5C", padding: "18px 28px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontFamily: "'Arial', sans-serif", letterSpacing: "0.15em", color: "#C9A84C", fontWeight: 700, textTransform: "uppercase" }}>
              {step.phase}
            </span>
            <button onClick={() => setSkipped(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: 12, fontFamily: "'Arial', sans-serif", letterSpacing: "0.05em", padding: "4px 0" }}>
              skip tutorial
            </button>
          </div>
          <div style={{ height: 3, background: "rgba(255,255,255,0.12)", borderRadius: 2 }}>
            <div style={{ height: "100%", borderRadius: 2, background: "#C9A84C", width: `${progress}%`, transition: "width 0.4s ease" }} />
          </div>
        </div>

        <div style={{ background: "#1B3A5C", padding: "28px 32px 32px" }}>
          <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 16 }}>{step.icon}</div>
          <h2 style={{ margin: 0, color: "#FDFAF5", fontSize: 24, lineHeight: 1.25, fontFamily: "'Georgia', serif", fontWeight: "normal" }}>
            {step.title}
          </h2>
          <p style={{ margin: "8px 0 0", color: "#C9A84C", fontSize: 13, fontFamily: "'Arial', sans-serif", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {step.subtitle}
          </p>
        </div>

        <div style={{ padding: "28px 32px 0" }}>
          {step.body.split("\n\n").map((para, i) => (
            <p key={i} style={{ margin: "0 0 16px", color: "#2C2C2C", fontSize: 15.5, lineHeight: 1.7, fontFamily: "'Georgia', serif" }}>
              {para.split("\n").map((line, j) => (
                <span key={j}>
                  {line.startsWith("•") ? (
                    <span style={{ display: "block", paddingLeft: 16, color: "#333" }}>{line}</span>
                  ) : line}
                  {j < para.split("\n").length - 1 && <br />}
                </span>
              ))}
            </p>
          ))}
          {step.tip && (
            <div style={{ background: "#EFF4FA", borderLeft: "3px solid #C9A84C", borderRadius: "0 8px 8px 0", padding: "12px 16px", marginTop: 4, marginBottom: 8 }}>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#1B3A5C", fontFamily: "'Arial', sans-serif" }}>{step.tip}</p>
            </div>
          )}
        </div>

        <div style={{ padding: "20px 32px 0", display: "flex", gap: 6, alignItems: "center" }}>
          {STEPS.map((_, i) => (
            <button key={i} onClick={() => goTo(i)} style={{ width: i === current ? 24 : 8, height: 8, borderRadius: 4, background: i === current ? "#C9A84C" : i < current ? "#1B3A5C" : "#D8D8D8", border: "none", cursor: "pointer", padding: 0, transition: "all 0.3s ease" }} />
          ))}
          <span style={{ marginLeft: "auto", fontSize: 12, color: "#999", fontFamily: "'Arial', sans-serif" }}>{current + 1} of {STEPS.length}</span>
        </div>

        <div style={{ padding: "20px 32px 28px", display: "flex", gap: 12, alignItems: "center" }}>
          {current > 0 && (
            <button onClick={prev} style={{ background: "none", border: "1.5px solid #D0D0D0", borderRadius: 10, padding: "12px 20px", cursor: "pointer", color: "#666", fontSize: 14, fontFamily: "'Arial', sans-serif" }}>
              ← Back
            </button>
          )}
          <button onClick={next}
            style={{ flex: 1, background: "#1B3A5C", border: "none", borderRadius: 10, padding: "14px 24px", cursor: "pointer", color: "#FDFAF5", fontSize: 15, fontFamily: "'Arial', sans-serif", fontWeight: 600, letterSpacing: "0.03em", transition: "background 0.2s" }}
            onMouseEnter={e => e.target.style.background = "#C9A84C"}
            onMouseLeave={e => e.target.style.background = "#1B3A5C"}
          >
            {isLast ? "Take me to my dashboard" : step.cta}
          </button>
        </div>
      </div>
    </div>
  );
}
