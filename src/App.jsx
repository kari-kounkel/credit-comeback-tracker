import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabaseClient";
import { THEMES, THEME_KEY } from "./constants";
import { makeDefault, loadLocal, saveLocal, loadTheme, hasLocalData, loadFromCloud, saveToCloud, migrateData } from "./helpers";
import AuthScreen from "./components/AuthScreen";
import TrackerApp from "./components/TrackerApp";
import CCKTutorial from "./components/CCKTutorial";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trackerData, setTrackerData] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [theme, setTheme] = useState(loadTheme);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const initDone = useRef(false);

  useEffect(() => {
    // Clear stale error fragments from URL
    if (window.location.hash.includes("error")) {
      window.history.replaceState(null, "", window.location.pathname);
    }

    // ── OPTIMISTIC FIRST PAINT ──
    // If we have local cached data, show it INSTANTLY (synchronous localStorage
    // read, ~1ms). The session check + fresh cloud sync run in the background
    // and update state when they return. No blank loading screen for returning
    // users.
    const local = loadLocal();
    if (local) {
      setTrackerData(migrateData(local));
      setLoading(false);
    }

    // Background: validate session, fetch fresh cloud data, swap auth screen
    // in if there's no session.
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await handleUserReady(session.user);
        } else if (!local) {
          // No session AND no local data → show auth screen
          setLoading(false);
        } else {
          // Have local data but no session → user is signed out, show auth
          setUser(null);
          setTrackerData(null);
          setLoading(false);
        }
      } catch (e) {
        console.error("Init error:", e);
        setLoading(false);
      }
      initDone.current = true;
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!initDone.current) return;
      if (event === "SIGNED_IN" && session?.user) await handleUserReady(session.user);
      else if (event === "SIGNED_OUT") { setUser(null); setTrackerData(null); }
    });

    return () => { subscription.unsubscribe(); };
  }, []);

  const handleUserReady = async (authUser) => {
    setUser(authUser);
    setAuthError(null);

    // Show tutorial if this user hasn't seen it yet
    const tutorialKey = `tutorial_seen_${authUser.id}`;
    if (!localStorage.getItem(tutorialKey)) {
      setShowTutorial(true);
    }

    // If we don't already have data on screen (fresh load, no local cache),
    // briefly show the loading screen while we fetch from cloud.
    const haveDataAlready = trackerData != null || loadLocal() != null;
    if (!haveDataAlready) setLoading(true);

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

  const handleDemo = () => {
    const demoData = makeDefault();
    demoData.income[2] = [
      { name: "Day Job — Wages", type: "Employment", amount: 2800 },
      { name: "Side Hustle", type: "Self-Employment", amount: 420 },
    ];
    demoData.bills[2] = [
      { name: "Rent", category: "Housing", budgeted: 950, actual: 950, dueDay: 1, status: "paid" },
      { name: "Electric", category: "Utilities", budgeted: 85, actual: 78, dueDay: 10, status: "paid" },
      { name: "Phone", category: "Utilities", budgeted: 55, actual: 55, dueDay: 15, status: "paid" },
      { name: "Groceries", category: "Food", budgeted: 400, actual: 312, dueDay: null, status: "partial" },
      { name: "Car Insurance", category: "Transportation", budgeted: 130, actual: 130, dueDay: 22, status: "paid" },
      { name: "Capital One CC", category: "Debt", budgeted: 75, actual: 0, dueDay: 28, status: "unpaid" },
      { name: "Medical Bill", category: "Health", budgeted: 50, actual: 0, dueDay: 30, status: "unpaid" },
    ];
    demoData.creditScores[2] = 594;
    demoData.savings[2] = 200;
    demoData.savings[0] = 150;
    demoData.savings[1] = 175;
    setTrackerData(demoData);
    setIsDemo(true);
  };

  const handleSave = useCallback(async (data) => {
    if (user) {
      try { await saveToCloud(user.id, data); } catch (e) { console.error("Save error:", e); }
    }
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setTrackerData(null);
    setAuthError(null);
  };

  const updateTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
  };

  const t = THEMES[theme] || THEMES.dark;

  // Font preload — always render this regardless of state
  const fontLink = (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet" />
    </>
  );

  // Loading screen — only briefly shown for fresh users with no cache.
  // Returning users see their data instantly via the optimistic-load path.
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif" }}>
        {fontLink}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, color: t.gold, marginBottom: 6 }}>The Credit Comeback Tracker</div>
          <div style={{ color: t.textMuted, fontSize: 13 }}>Loading…</div>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user && !isDemo) {
    return (
      <>
        {fontLink}
        <AuthScreen onAuth={async (u) => await handleUserReady(u)} theme={theme} setTheme={updateTheme} onDemo={handleDemo} />
      </>
    );
  }

  // Demo — has data but no user
  if (isDemo && !user && trackerData) {
    return (
      <>
        {fontLink}
        <TrackerApp
          user={{ email: "demo@demo.com" }}
          initialData={trackerData}
          onSave={() => {}}
          onLogout={() => { setIsDemo(false); setTrackerData(null); }}
          theme={theme}
          setTheme={updateTheme}
          isDemo={true}
          onReplayTutorial={() => setShowTutorial(true)}
        />
      </>
    );
  }

  // Logged in
  return (
    <>
      {fontLink}
      {showTutorial && (
        <CCKTutorial onComplete={() => {
          localStorage.setItem(`tutorial_seen_${user.id}`, "true");
          setShowTutorial(false);
        }} />
      )}
      <TrackerApp user={user} initialData={trackerData} onSave={handleSave} onLogout={handleLogout} theme={theme} setTheme={updateTheme} onReplayTutorial={() => setShowTutorial(true)} adminEmails={["kari@karikounkel.com", "kari@caresmn.com"]} />
    </>
  );
}
