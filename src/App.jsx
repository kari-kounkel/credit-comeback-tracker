import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabaseClient";
import { THEMES, THEME_KEY } from "./constants";
import { makeDefault, loadLocal, saveLocal, loadTheme, hasLocalData, loadFromCloud, saveToCloud, migrateData } from "./helpers";
import AuthScreen from "./components/AuthScreen";
import TrackerApp from "./components/TrackerApp";

// ─── DEMO DATA ────────────────────────────────────────────────────────────────
// Pre-seeded fake participant data for live class demos
const makeDemoData = () => {
  const bills = Array(12).fill(null).map(() => []);
  const income = Array(12).fill(null).map(() => []);
  const savings = Array(12).fill(0);
  const creditScores = Array(12).fill(0);

  // Fill March (index 2) with demo data
  bills[2] = [
    { name: "Rent", category: "Housing", budgeted: 950, actual: 950, dueDay: 1, status: "paid" },
    { name: "Electric", category: "Utilities", budgeted: 85, actual: 91, dueDay: 5, status: "paid" },
    { name: "Water", category: "Utilities", budgeted: 40, actual: 40, dueDay: 5, status: "paid" },
    { name: "Internet", category: "Utilities", budgeted: 60, actual: 60, dueDay: 10, status: "paid" },
    { name: "Car Payment", category: "Transportation", budgeted: 280, actual: 280, dueDay: 12, status: "paid" },
    { name: "Car Insurance", category: "Transportation", budgeted: 110, actual: 110, dueDay: 12, status: "paid" },
    { name: "Phone", category: "Personal", budgeted: 65, actual: 65, dueDay: 15, status: "paid" },
    { name: "Credit Card (Cap One)", category: "Debt", budgeted: 75, actual: 75, dueDay: 18, status: "paid" },
    { name: "Credit Card (Discover)", category: "Debt", budgeted: 50, actual: 0, dueDay: 22, status: "unpaid" },
    { name: "Groceries", category: "Food", budgeted: 300, actual: 247, dueDay: 28, status: "paid" },
    { name: "Gas", category: "Transportation", budgeted: 80, actual: 63, dueDay: 28, status: "paid" },
    { name: "Netflix", category: "Personal", budgeted: 18, actual: 18, dueDay: 28, status: "paid" },
  ];
  income[2] = [
    { name: "Job — Warehouse", type: "Employment", amount: 2100 },
    { name: "Side Gig — DoorDash", type: "Side Income", amount: 380 },
  ];
  savings[2] = 130;

  // Fill Feb with partial data
  bills[1] = bills[2].map(b => ({ ...b, actual: b.budgeted, status: "paid" }));
  income[1] = [{ name: "Job — Warehouse", type: "Employment", amount: 2100 }];
  savings[1] = 85;

  // Scores showing improvement arc
  creditScores[0] = 541;
  creditScores[1] = 548;
  creditScores[2] = 562;

  const holdingTank = { balance: 2480, note: "Last month's income held for this month's bills — the Holdback method. This is not spending money. This is the plan." };

  return { bills, income, savings, creditScores, holdingTank };
};

const DEMO_USER = {
  id: "demo-user-0000",
  email: "demo@class.local",
  isDemo: true,
};

// ─── ADMIN EMAILS ─────────────────────────────────────────────────────────────
export const ADMIN_EMAILS = ["kari@karikounkel.com", "kari@caresmn.com"];

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trackerData, setTrackerData] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [theme, setTheme] = useState(loadTheme);
  const [isDemo, setIsDemo] = useState(false);
  const initDone = useRef(false);

  useEffect(() => {
    // Safety timeout — never stuck on loading more than 8 seconds
    const timeout = setTimeout(() => setLoading(false), 8000);

    const init = async () => {
      try {
        // Clear stale error fragments from URL
        if (window.location.hash.includes("error")) {
          window.history.replaceState(null, "", window.location.pathname);
        }
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) await handleUserReady(session.user);
      } catch (e) {
        console.error("Init error:", e);
      }
      initDone.current = true;
      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!initDone.current) return;
      if (event === "SIGNED_IN" && session?.user) await handleUserReady(session.user);
      else if (event === "SIGNED_OUT") { setUser(null); setTrackerData(null); }
    });

    return () => { clearTimeout(timeout); subscription.unsubscribe(); };
  }, []);

  const handleUserReady = async (authUser) => {
    setUser(authUser);
    setLoading(true);
    setAuthError(null);

    try {
      let cloudData = await loadFromCloud(authUser.id);
      const localData = loadLocal();
      const localHasStuff = hasLocalData();

      if (!cloudData && localHasStuff) {
        cloudData = migrateData(localData);
        try { await saveToCloud(authUser.id, cloudData); } catch (e) { console.error("Migration save failed:", e); }
      } else if (!cloudData) {
        cloudData = makeDefault();
        try { await saveToCloud(authUser.id, cloudData); } catch (e) { console.error("Initial save failed:", e); }
      } else {
        cloudData = migrateData(cloudData);
      }

      setTrackerData(cloudData);
      saveLocal(cloudData);
    } catch (e) {
      console.error("handleUserReady error:", e);
      const fallback = loadLocal() || makeDefault();
      setTrackerData(fallback);
      setAuthError("Cloud sync had a hiccup — using local data for now.");
    }

    setLoading(false);
  };

  const handleSave = useCallback(async (data) => {
    if (isDemo) return; // demo mode — never touches real data
    if (user) {
      try { await saveToCloud(user.id, data); } catch (e) { console.error("Save error:", e); }
    }
  }, [user, isDemo]);

  const handleLogout = async () => {
    if (isDemo) {
      setIsDemo(false);
      setUser(null);
      setTrackerData(null);
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
    setTrackerData(null);
    setAuthError(null);
  };

  const handleDemoMode = () => {
    setIsDemo(true);
    setUser(DEMO_USER);
    setTrackerData(makeDemoData());
  };

  const updateTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
  };

  const t = THEMES[theme] || THEMES.dark;

  // Loading screen
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet" />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, color: t.gold, marginBottom: 12 }}>The Credit Comeback Tracker</div>
          <div style={{ color: t.textMuted, fontSize: 14 }}>Loading your data...</div>
        </div>
      </div>
    );
  }

  // Not logged in — show auth screen with Demo Mode button injected below it
  if (!user || !trackerData) {
    return (
      <div style={{ position: "relative" }}>
        <AuthScreen onAuth={async (u) => await handleUserReady(u)} theme={theme} setTheme={updateTheme} />
        {/* Demo Mode button — floats at bottom of screen */}
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: "rgba(27,58,92,0.97)",
          borderTop: "1px solid #C9A84C44",
          padding: "12px 20px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 16,
          fontFamily: "'DM Sans',sans-serif", zIndex: 999
        }}>
          <span style={{ fontSize: 12, color: "#C9A84C99", letterSpacing: 1, textTransform: "uppercase" }}>
            🎓 Teaching today?
          </span>
          <button
            onClick={handleDemoMode}
            style={{
              padding: "8px 24px", borderRadius: 8,
              border: "1px solid #C9A84C",
              background: "#C9A84C22",
              color: "#C9A84C",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              fontFamily: "'DM Sans',sans-serif",
              letterSpacing: 0.5,
            }}
          >
            Enter Demo Mode
          </button>
        </div>
      </div>
    );
  }

  // Logged in (real or demo)
  return (
    <TrackerApp
      user={user}
      initialData={trackerData}
      onSave={handleSave}
      onLogout={handleLogout}
      theme={theme}
      setTheme={updateTheme}
      isDemo={isDemo}
      adminEmails={ADMIN_EMAILS}
    />
  );
}
