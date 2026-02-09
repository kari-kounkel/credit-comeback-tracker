import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabaseClient";
import { THEMES, THEME_KEY } from "./constants";
import { makeDefault, loadLocal, saveLocal, loadTheme, hasLocalData, loadFromCloud, saveToCloud, migrateData } from "./helpers";
import AuthScreen from "./components/AuthScreen";
import TrackerApp from "./components/TrackerApp";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trackerData, setTrackerData] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [theme, setTheme] = useState(loadTheme);
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

  // Not logged in
  if (!user || !trackerData) {
    return <AuthScreen onAuth={async (u) => await handleUserReady(u)} theme={theme} setTheme={updateTheme} />;
  }

  // Logged in
  return <TrackerApp user={user} initialData={trackerData} onSave={handleSave} onLogout={handleLogout} theme={theme} setTheme={updateTheme} />;
}
