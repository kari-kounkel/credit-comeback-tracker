import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { THEMES, MONTHS, MILESTONES } from "../constants";
import { LetterGenerator, SAMPLE_LETTERS } from "./ResourcesTab";
import { NumCell, ProgressBar } from "./SharedUI";

/**
 * CreditActionPreview — DEMO of the redesigned Credit Score page that
 * combines the score-tracking UI and the dispute-letter workflow on a
 * single page. Currently mounted under the admin-only "🧪 Preview" tab
 * so Kari can compare against the live Credit Score + Resources tabs
 * before promoting it.
 *
 * Once approved, this would replace the Credit Score tab content and
 * the letter sections of the Resources tab go away (or shrink to just
 * How-To, Support, FAQ).
 */
export default function CreditActionPreview({ activeState, currentMonth, theme, update, demoCharacter, user }) {
  const t = THEMES[theme] || THEMES.dark;
  const [view, setView] = useState("write");        // write | saved | samples
  const [savedLetters, setSavedLetters] = useState([]);
  const [letterToLoad, setLetterToLoad] = useState(null);
  const [loadingSaved, setLoadingSaved] = useState(false);

  const score = activeState.creditScores[currentMonth] || 0;
  const currentMilestone = [...MILESTONES].reverse().find((m) => score >= m.score);
  const nextMilestone = MILESTONES.find((m) => score < m.score);

  // Load saved letters when the user switches to that view
  useEffect(() => {
    if (!user?.id || view !== "saved") return;
    setLoadingSaved(true);
    supabase.from("saved_letters")
      .select("*").eq("user_id", user.id).order("saved_at", { ascending: false })
      .then(({ data }) => { setSavedLetters(data || []); setLoadingSaved(false); });
  }, [user?.id, view]);

  const deleteLetter = async (id) => {
    await supabase.from("saved_letters").delete().eq("id", id);
    setSavedLetters(prev => prev.filter(l => l.id !== id));
  };

  const cardStyle = {
    background: t.cardBg,
    border: "1px solid " + t.cardBorder,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  };

  return (
    <div>
      {/* DEMO STAMP — small badge so this is visibly the preview, not the live page */}
      <div style={{
        display: "inline-block",
        padding: "4px 12px",
        background: "#C9A84C22",
        color: "#C9A84C",
        border: "1px solid #C9A84C55",
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 1,
        textTransform: "uppercase",
        marginBottom: 14,
      }}>
        🧪 Preview · Combined Credit Score + Letters
      </div>

      {/* ── SCORE BLOCK (top, prominent) ── */}
      <div style={{
        ...cardStyle,
        background: t.gold + "10",
        border: "1px solid " + t.gold + "33",
        padding: 28,
        textAlign: "center",
      }}>
        <div style={{ fontSize: 11, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
          {MONTHS[currentMonth]} Credit Score
        </div>
        <NumCell
          value={score}
          onChange={(v) => { if (!demoCharacter) update((s) => { s.creditScores[currentMonth] = v; }); }}
          prefix=""
          placeholder="Enter score"
          theme={theme}
        />
        {currentMilestone && (
          <div style={{ marginTop: 12, fontSize: 16 }}>
            {currentMilestone.emoji} <span style={{ color: t.gold, fontWeight: 600 }}>{currentMilestone.label}</span>
          </div>
        )}
        {nextMilestone && (
          <div style={{ marginTop: 14, padding: "10px 14px", background: t.cardBg, borderRadius: 8, display: "inline-block" }}>
            <div style={{ fontSize: 11, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Next milestone</div>
            <div style={{ fontSize: 14, color: t.text }}>
              {nextMilestone.emoji} <strong>{nextMilestone.label}</strong>
              <span style={{ color: t.textMuted, marginLeft: 8 }}>· {nextMilestone.score - score} pts to go</span>
            </div>
          </div>
        )}
      </div>

      {/* ── 12-MONTH MINI HISTORY ── */}
      <div style={cardStyle}>
        <div style={{ fontSize: 11, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
          📈 Score across the year
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 4 }}>
          {MONTHS.map((m, i) => {
            const v = activeState.creditScores[i];
            const isNow = i === currentMonth;
            return (
              <div key={m} style={{
                textAlign: "center",
                padding: 6,
                borderRadius: 6,
                background: isNow ? t.gold + "18" : "transparent",
                border: isNow ? "1px solid " + t.gold + "44" : "1px solid transparent",
              }}>
                <div style={{ fontSize: 9, color: isNow ? t.gold : t.textMuted, marginBottom: 2 }}>{m}</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: v ? t.text : t.textFaint }}>
                  {v || "—"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── ACTION BLOCK — write a letter to drive the score ── */}
      <div style={{
        ...cardStyle,
        background: t.green + "08",
        border: "1px solid " + t.green + "33",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, color: t.text, marginBottom: 2 }}>
              Move your score with a letter
            </div>
            <div style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.5 }}>
              Disputes, validations, goodwill, pay-for-delete — every letter you send is a tiny lever on the number above.
            </div>
          </div>

          {/* Mini sub-tab */}
          <div style={{ display: "flex", gap: 4, background: t.cardBg, borderRadius: 999, padding: 4, border: "1px solid " + t.cardBorder }}>
            {[
              ["write", "✉️ Write"],
              ["saved", "📁 Saved"],
              ["samples", "🏰 Samples"],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setView(id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  border: "none",
                  background: view === id ? t.gold + "33" : "transparent",
                  color: view === id ? t.gold : t.textMuted,
                  fontSize: 12,
                  fontWeight: view === id ? 700 : 500,
                  cursor: "pointer",
                  fontFamily: "'DM Sans',sans-serif",
                }}
              >{label}</button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 8 }}>
          {view === "write" && (
            <LetterGenerator
              t={t}
              userId={user?.id}
              loadData={letterToLoad}
              onLoadConsumed={() => setLetterToLoad(null)}
            />
          )}

          {view === "saved" && (
            <div>
              {loadingSaved && <div style={{ color: t.textMuted, padding: 20, fontSize: 13 }}>Loading…</div>}
              {!loadingSaved && savedLetters.length === 0 && (
                <div style={{ padding: 30, textAlign: "center", color: t.textMuted, fontSize: 13, background: t.cardBg, borderRadius: 10, border: "1px dashed " + t.cardBorder }}>
                  📭 No saved letters yet. Write one in the ✉️ Write tab and hit Save.
                </div>
              )}
              {savedLetters.map(l => (
                <div key={l.id} style={{
                  background: t.cardBg, border: "1px solid " + t.cardBorder, borderRadius: 10,
                  padding: "12px 16px", marginBottom: 8,
                  display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
                }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{l.letter_label}</div>
                    <div style={{ fontSize: 11, color: t.textMuted }}>
                      To: {l.recipient_name || "—"} · Saved {new Date(l.saved_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => { setLetterToLoad(l); setView("write"); }}
                    style={btnGold(t)}
                  >Load &amp; Edit</button>
                  <button
                    onClick={() => { if (confirm("Delete this saved letter?")) deleteLetter(l.id); }}
                    style={btnRed(t)}
                  >✕</button>
                </div>
              ))}
            </div>
          )}

          {view === "samples" && (
            <div>
              <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 12, lineHeight: 1.6 }}>
                Three example letters from the Eggerton cast — load any one to see how a real letter is structured, then swap in your details.
              </div>
              {SAMPLE_LETTERS.map((sl, i) => (
                <div key={i} style={{
                  background: t.cardBg, border: "1px solid " + t.cardBorder, borderRadius: 10,
                  padding: 14, marginBottom: 10,
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                    <div style={{ fontSize: 22, lineHeight: 1 }}>{sl.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{sl.character}</div>
                      <div style={{ fontSize: 10, color: t.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>{sl.role}</div>
                      <div style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.5 }}>{sl.scenario}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid " + t.cardBorder }}>
                    <span style={{ fontSize: 12, color: t.textMuted }}>{sl.icon} {sl.letterLabel}</span>
                    <button
                      onClick={() => {
                        setLetterToLoad({
                          letter_id: sl.letterType,
                          letter_label: sl.letterLabel,
                          sender: sl.sender,
                          recipient_name: sl.recipientName,
                          recipient_address: sl.recipientAddress,
                          extra_fields: sl.extraFields,
                        });
                        setView("write");
                      }}
                      style={btnGold(t)}
                    >Load Letter →</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── MILESTONES ── kept compact since the Score block already shows current + next */}
      <div style={cardStyle}>
        <div style={{ fontSize: 11, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
          🎯 All Milestones
        </div>
        {MILESTONES.map((m) => (
          <div key={m.score} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "6px 0", opacity: score >= m.score ? 1 : 0.4,
          }}>
            <span style={{ fontSize: 18 }}>{m.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: score >= m.score ? t.text : t.textMuted }}>{m.label}</div>
              <ProgressBar current={Math.min(score, m.score)} goal={m.score} color={score >= m.score ? t.green : t.gold} height={3} theme={theme} />
            </div>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: score >= m.score ? t.green : t.textMuted }}>{m.score}</span>
          </div>
        ))}
      </div>

      {/* DEMO FOOTER — tiny prompt for Kari */}
      <div style={{
        marginTop: 24,
        padding: 16,
        background: t.cardBg,
        border: "1px dashed " + t.gold + "55",
        borderRadius: 10,
        fontSize: 12,
        color: t.textMuted,
        textAlign: "center",
        lineHeight: 1.6,
      }}>
        🧪 <strong style={{ color: t.gold }}>Preview only.</strong> The live Credit Score tab and Resources tab haven't changed.
        If this layout works, tell Ernie "promote it" — the live Credit Score tab will switch to this design and the letter sections in Resources will be removed.
      </div>
    </div>
  );
}

const btnGold = (t) => ({
  padding: "6px 14px", borderRadius: 7,
  border: "1px solid " + t.gold + "55",
  background: t.gold + "18",
  color: t.gold,
  fontSize: 12, fontWeight: 700, cursor: "pointer",
  fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap",
});
const btnRed = (t) => ({
  padding: "6px 12px", borderRadius: 7,
  border: "1px solid " + t.red + "33",
  background: t.red + "11",
  color: t.red,
  fontSize: 12, fontWeight: 700, cursor: "pointer",
  fontFamily: "'DM Sans',sans-serif",
});
