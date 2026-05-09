import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { THEMES, MONTHS, STATUS_LABELS, CAT_EMOJIS } from "../constants";

const fmt = (n) => "$" + Math.round(n || 0).toLocaleString();

/**
 * CoachAccessPanel — sits inside AdminTab.
 *
 * Shows every signed-up user (from public.profiles), the coach's current
 * data_view_requests state with that user (none / pending / approved /
 * denied / expired), and lets the coach send a Request, see approval
 * status, or open a read-only viewer when they've been granted access.
 */
export default function CoachAccessPanel({ user, theme, t }) {
  const [profiles, setProfiles] = useState([]);
  const [requests, setRequests] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [loadErr, setLoadErr] = useState(null);
  const [viewing, setViewing] = useState(null);   // { profile, data }
  const [viewLoading, setViewLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoadErr(null);
    const [p, r] = await Promise.all([
      supabase.from("profiles").select("id, email, full_name").order("email"),
      supabase.from("data_view_requests")
        .select("id, target_id, status, requested_at, expires_at, message")
        .eq("requester_id", user.id),
    ]);
    if (p.error) { setLoadErr(p.error.message); return; }
    setProfiles((p.data || []).filter(pp => pp.id !== user.id));   // exclude self
    setRequests(r.data || []);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const stateFor = (targetId) => {
    const now = Date.now();
    // newest first
    const userRequests = requests
      .filter(r => r.target_id === targetId)
      .sort((a, b) => new Date(b.requested_at) - new Date(a.requested_at));
    if (!userRequests.length) return { kind: "none" };
    const r = userRequests[0];
    if (r.status === "approved" && r.expires_at && new Date(r.expires_at).getTime() > now) {
      return { kind: "approved", request: r };
    }
    if (r.status === "approved" && r.expires_at && new Date(r.expires_at).getTime() <= now) {
      return { kind: "expired", request: r };
    }
    if (r.status === "pending")  return { kind: "pending",  request: r };
    if (r.status === "denied")   return { kind: "denied",   request: r };
    if (r.status === "revoked")  return { kind: "revoked",  request: r };
    return { kind: r.status, request: r };
  };

  const requestAccess = async (targetId) => {
    setBusyId(targetId);
    const reason = window.prompt("Optional message to the user (why you're requesting access):", "") || null;
    const { error } = await supabase.from("data_view_requests").insert({
      requester_id: user.id,
      target_id: targetId,
      status: "pending",
      message: reason,
    });
    setBusyId(null);
    if (error) { alert("Could not send request: " + error.message); return; }
    load();
  };

  const cancelRequest = async (requestId) => {
    setBusyId(requestId);
    const { error } = await supabase.from("data_view_requests").delete().eq("id", requestId);
    setBusyId(null);
    if (error) { alert("Could not cancel: " + error.message); return; }
    load();
  };

  const viewData = async (profile) => {
    setViewing({ profile, data: null });
    setViewLoading(true);
    const { data, error } = await supabase
      .from("tracker_data")
      .select("data, updated_at")
      .eq("user_id", profile.id)
      .maybeSingle();
    setViewLoading(false);
    if (error) { alert("Load failed: " + error.message); setViewing(null); return; }
    setViewing({ profile, data: data?.data || null, updated_at: data?.updated_at });
  };

  const cardStyle = {
    background: t.cardBg, border: "1px solid " + t.cardBorder,
    borderRadius: 12, padding: 20, marginBottom: 20,
  };
  const heading = {
    fontFamily: "'Playfair Display',serif", color: t.gold,
    fontSize: 18, fontWeight: 700, margin: "0 0 16px",
  };

  return (
    <div style={cardStyle}>
      <h3 style={heading}>🔑 Coach Access — Request to View Participant Data</h3>
      <p style={{ fontSize: 13, color: t.textMuted, margin: "0 0 16px", lineHeight: 1.6 }}>
        Send a request to view a participant's data. They see a banner on their next login
        and can approve or deny. Approval lasts 24 hours, then auto-expires. They can revoke any time.
      </p>

      {loadErr && (
        <div style={{ padding: 10, background: t.red + "22", color: t.red, borderRadius: 8, marginBottom: 12 }}>
          {loadErr}
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Participant", "Email", "Status", "Action"].map(h => (
                <th key={h} style={{
                  padding: "8px 10px", textAlign: "left",
                  fontSize: 10, color: t.textMuted, textTransform: "uppercase",
                  letterSpacing: 1, borderBottom: "1px solid " + t.cardBorder, fontWeight: 600,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {profiles.map(p => {
              const s = stateFor(p.id);
              return (
                <tr key={p.id} style={{ borderBottom: "1px solid " + t.cardBorder }}>
                  <td style={{ padding: 10, fontSize: 13, color: t.text, fontWeight: 600 }}>{p.full_name || "—"}</td>
                  <td style={{ padding: 10, fontSize: 12, color: t.textMuted }}>{p.email}</td>
                  <td style={{ padding: 10 }}>{statusChip(s, t)}</td>
                  <td style={{ padding: 10 }}>
                    {s.kind === "none" || s.kind === "denied" || s.kind === "revoked" || s.kind === "expired" ? (
                      <button
                        onClick={() => requestAccess(p.id)}
                        disabled={busyId === p.id}
                        style={btnPrimary(t)}
                      >
                        {s.kind === "none" ? "Request access" : "Request again"}
                      </button>
                    ) : s.kind === "pending" ? (
                      <button
                        onClick={() => cancelRequest(s.request.id)}
                        disabled={busyId === s.request.id}
                        style={btnGhost(t)}
                      >Cancel request</button>
                    ) : s.kind === "approved" ? (
                      <button
                        onClick={() => viewData(p)}
                        style={btnPrimary(t)}
                      >View their data →</button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {profiles.length === 0 && (
              <tr><td colSpan={4} style={{ padding: 20, textAlign: "center", color: t.textMuted, fontSize: 13 }}>No other users found yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {viewing && (
        <ViewerModal
          profile={viewing.profile}
          data={viewing.data}
          updated_at={viewing.updated_at}
          loading={viewLoading}
          theme={theme}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}

function statusChip(s, t) {
  const base = {
    fontSize: 10, padding: "3px 10px", borderRadius: 999,
    fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase",
    display: "inline-block",
  };
  switch (s.kind) {
    case "none":     return <span style={{ ...base, background: t.cardBorder, color: t.textMuted }}>no request</span>;
    case "pending":  return <span style={{ ...base, background: t.gold + "22", color: t.gold }}>awaiting approval</span>;
    case "approved": {
      const exp = new Date(s.request.expires_at);
      const hrsLeft = Math.max(0, Math.round((exp - Date.now()) / 36e5));
      return <span style={{ ...base, background: t.green + "22", color: t.green }}>approved · {hrsLeft}h left</span>;
    }
    case "denied":   return <span style={{ ...base, background: t.red + "22", color: t.red }}>denied</span>;
    case "revoked":  return <span style={{ ...base, background: t.red + "22", color: t.red }}>revoked</span>;
    case "expired":  return <span style={{ ...base, background: t.cardBorder, color: t.textMuted }}>expired</span>;
    default:         return <span style={{ ...base, background: t.cardBorder, color: t.textMuted }}>{s.kind}</span>;
  }
}

const btnPrimary = (t) => ({
  padding: "6px 14px", borderRadius: 8, border: "none",
  background: "linear-gradient(135deg," + t.gold + "," + t.goldDark + ")",
  color: t.btnText, fontSize: 12, fontWeight: 700,
  cursor: "pointer", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap",
});
const btnGhost = (t) => ({
  padding: "6px 14px", borderRadius: 8, border: "1px solid " + t.cardBorder,
  background: "transparent", color: t.textMuted, fontSize: 12, fontWeight: 600,
  cursor: "pointer", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap",
});

// ─── Viewer Modal — read-only summary of a user's tracker_data ───
function ViewerModal({ profile, data, updated_at, loading, theme, onClose }) {
  const t = THEMES[theme] || THEMES.dark;
  const months = MONTHS;

  const totals = months.map((m, i) => {
    const income = (data?.income?.[i] || []).reduce((s, x) => s + (x.amount || 0), 0);
    const bills  = data?.bills?.[i]  || [];
    const expenses = bills.reduce((s, b) => s + (b.budgeted || 0), 0);
    return { m, i, income, expenses, bills, incomeItems: data?.income?.[i] || [] };
  });
  const yearIncome = totals.reduce((s, t) => s + t.income, 0);
  const yearExpenses = totals.reduce((s, t) => s + t.expenses, 0);
  const totalSaved = (data?.savings || []).reduce((s, v) => s + (v || 0), 0);
  const latestScore = (data?.creditScores || []).filter(Boolean).slice(-1)[0] || 0;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
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
              {profile.full_name || profile.email}'s Credit Comeback Data
            </h3>
            <div style={{ fontSize: 11, color: t.textMuted }}>
              Read-only view via approved consent · {profile.email}
              {updated_at && " · Last saved " + new Date(updated_at).toLocaleString()}
            </div>
          </div>
          <button onClick={onClose} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid " + t.cardBorder, background: "transparent", color: t.textMuted, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>✕ Close</button>
        </div>

        {loading && <div style={{ padding: 30, textAlign: "center", color: t.textMuted }}>Loading…</div>}

        {!loading && !data && (
          <div style={{ padding: 30, textAlign: "center", color: t.textMuted, fontStyle: "italic" }}>
            No data has been saved by this user yet.
          </div>
        )}

        {!loading && data && (
          <>
            {/* Top stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 20 }}>
              {[
                { label: "Year Income",   value: fmt(yearIncome),   color: t.green },
                { label: "Year Expenses", value: fmt(yearExpenses), color: t.red },
                { label: "Total Saved",   value: fmt(totalSaved),   color: t.gold },
                { label: "Latest Score",  value: latestScore || "—", color: t.text },
              ].map(s => (
                <div key={s.label} style={{ background: t.cardBg, border: "1px solid " + t.cardBorder, borderRadius: 10, padding: 14, textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: t.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Per-month summary */}
            <h4 style={{ fontFamily: "'Playfair Display',serif", color: t.gold, fontSize: 14, margin: "20px 0 10px" }}>By Month</h4>
            {totals.filter(x => x.income > 0 || x.expenses > 0).map(x => (
              <div key={x.i} style={{ marginBottom: 12, padding: 12, background: t.cardBg, border: "1px solid " + t.cardBorder, borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <strong style={{ color: t.gold }}>{x.m}</strong>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12 }}>
                    <span style={{ color: t.green }}>+{fmt(x.income)}</span>
                    {" "}<span style={{ color: t.textMuted }}>·</span>{" "}
                    <span style={{ color: t.red }}>−{fmt(x.expenses)}</span>
                  </span>
                </div>
                {x.bills.map((b, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0", color: t.textMuted }}>
                    <span>{CAT_EMOJIS[b.category] || ""} {b.name} {b.dueDay && <span style={{ color: t.textFaint }}>(day {b.dueDay})</span>}</span>
                    <span style={{ fontFamily: "'DM Mono',monospace" }}>
                      {fmt(b.budgeted)}{" "}
                      <span style={{ color: b.status === "paid" ? t.green : b.status === "unpaid" ? t.red : t.gold, fontSize: 10, marginLeft: 4 }}>
                        {STATUS_LABELS[b.status] || b.status}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
