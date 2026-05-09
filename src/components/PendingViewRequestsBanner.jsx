import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { THEMES } from "../constants";

/**
 * Banner that appears for any user who has incoming pending view-access
 * requests from a coach. Also shows currently-approved access (so the
 * user knows when someone has a live view session and can revoke it).
 *
 * Mounts at TrackerApp top level so it's visible on every tab.
 *
 * Polls every 30s while the page is open. Cheap query (RLS-scoped).
 */
export default function PendingViewRequestsBanner({ user, theme }) {
  const t = THEMES[theme] || THEMES.dark;
  const [pending, setPending] = useState([]);
  const [active, setActive] = useState([]);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from("data_view_requests")
      .select("id, requester_id, status, message, requested_at, expires_at")
      .eq("target_id", user.id)
      .in("status", ["pending", "approved"])
      .order("requested_at", { ascending: false });
    if (error) return;
    const now = Date.now();
    const fresh = (data || []).filter(r => {
      if (r.status === "pending") return true;
      if (r.status === "approved" && r.expires_at && new Date(r.expires_at).getTime() > now) return true;
      return false;
    });
    // Look up requester emails (one round-trip)
    const ids = Array.from(new Set(fresh.map(r => r.requester_id)));
    let emailMap = {};
    if (ids.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", ids);
      (profiles || []).forEach(p => { emailMap[p.id] = p; });
    }
    setPending(fresh.filter(r => r.status === "pending").map(r => ({ ...r, requester: emailMap[r.requester_id] })));
    setActive(fresh.filter(r => r.status === "approved").map(r => ({ ...r, requester: emailMap[r.requester_id] })));
  }, [user?.id]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const approve = async (id) => {
    setBusyId(id);
    const { error } = await supabase.rpc("approve_view_request", { p_request_id: id, p_hours: 24 });
    setBusyId(null);
    if (error) { alert("Could not approve: " + error.message); return; }
    load();
  };
  const deny = async (id) => {
    setBusyId(id);
    const { error } = await supabase.rpc("deny_view_request", { p_request_id: id });
    setBusyId(null);
    if (error) { alert("Could not respond: " + error.message); return; }
    load();
  };

  if (!pending.length && !active.length) return null;

  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 900,
      padding: "10px 16px",
      background: pending.length ? "#1B3A5C" : "#0E2A1F",
      color: "#F5EDE0",
      fontFamily: "'DM Sans',sans-serif",
      borderBottom: "1px solid " + (pending.length ? "#C9A84C66" : "#5A8A5966"),
      fontSize: 13,
    }}>
      {pending.map(r => {
        const name = r.requester?.full_name || r.requester?.email || "A coach";
        return (
          <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, padding: "4px 0" }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <strong style={{ color: "#C9A84C" }}>{name}</strong> is requesting view-only access to your Credit Comeback data for <strong>24 hours</strong>.
              {r.message && <div style={{ fontStyle: "italic", color: "#cdb18a", fontSize: 12, marginTop: 2 }}>"{r.message}"</div>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => deny(r.id)}
                disabled={busyId === r.id}
                style={btn("transparent", "#cdb18a", "#cdb18a44")}
              >Deny</button>
              <button
                onClick={() => approve(r.id)}
                disabled={busyId === r.id}
                style={btn("#C9A84C", "#1B3A5C", "#C9A84C")}
              >Approve view access</button>
            </div>
          </div>
        );
      })}

      {active.map(r => {
        const name = r.requester?.full_name || r.requester?.email || "A coach";
        const expires = new Date(r.expires_at).toLocaleString();
        return (
          <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, padding: "4px 0" }}>
            <div style={{ flex: 1, minWidth: 240, color: "#a3c8a3" }}>
              ✓ <strong style={{ color: "#cdb18a" }}>{name}</strong> currently has view-only access · expires {expires}
            </div>
            <button
              onClick={() => deny(r.id)}
              disabled={busyId === r.id}
              style={btn("transparent", "#cdb18a", "#cdb18a44")}
            >Revoke</button>
          </div>
        );
      })}
    </div>
  );
}

const btn = (bg, color, border) => ({
  padding: "6px 14px",
  borderRadius: 999,
  border: "1px solid " + border,
  background: bg,
  color,
  fontFamily: "'DM Sans',sans-serif",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
});
