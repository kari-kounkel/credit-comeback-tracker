import { useState } from "react";
import { supabase } from "../supabaseClient";
import { THEMES } from "../constants";
import { hasLocalData } from "../helpers";

export default function AuthScreen({ onAuth, theme, setTheme }) {
  const t = THEMES[theme] || THEMES.dark;
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) setError(err.message);
    else onAuth(data.user);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const { data, error: err } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else if (data.user && !data.user.confirmed_at && !data.session) {
      setMessage("Check your email for a confirmation link! Once confirmed, come back and log in.");
      setMode("login");
    } else {
      onAuth(data.user);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setLoading(false);
    if (err) setError(err.message);
    else {
      setMessage("Password reset email sent! Check your inbox.");
      setMode("login");
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    background: t.inputBg,
    border: "1px solid " + t.inputBorder,
    borderRadius: 10,
    color: t.inputText,
    fontSize: 14,
    fontFamily: "'DM Sans',sans-serif",
    outline: "none",
    boxSizing: "border-box",
  };

  const clearErrors = () => {
    setError(null);
    setMessage(null);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: t.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DM Sans',sans-serif",
        padding: 20,
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&family=Playfair+Display:wght@700;800&display=swap"
        rel="stylesheet"
      />

      {/* Theme toggle */}
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          padding: "6px 14px",
          borderRadius: 20,
          border: "1px solid " + t.cardBorder,
          background: t.cardBg,
          color: t.textMuted,
          fontSize: 12,
          cursor: "pointer",
          fontFamily: "'DM Sans',sans-serif",
        }}
      >
        {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
      </button>

      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h1
          style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: 32,
            fontWeight: 800,
            color: t.gold,
            margin: 0,
          }}
        >
          The Credit Comeback Tracker
        </h1>
        <p style={{ color: t.textMuted, fontSize: 13, margin: "8px 0 0", fontStyle: "italic" }}>
          Budget · Pay · Save · Rebuild — One month at a time.
        </p>
      </div>

      {/* Auth Card */}
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: t.cardBg,
          border: "1px solid " + t.headerBorder,
          borderRadius: 16,
          padding: 32,
        }}
      >
        <h2 style={{ color: t.text, fontSize: 20, fontWeight: 600, margin: "0 0 24px", textAlign: "center" }}>
          {mode === "login" ? "Welcome Back" : mode === "signup" ? "Create Your Account" : "Reset Password"}
        </h2>

        {message && (
          <div
            style={{
              padding: "12px 16px",
              background: t.green + "18",
              border: "1px solid " + t.green + "44",
              borderRadius: 10,
              color: t.green,
              fontSize: 13,
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            {message}
          </div>
        )}
        {error && (
          <div
            style={{
              padding: "12px 16px",
              background: t.red + "18",
              border: "1px solid " + t.red + "44",
              borderRadius: 10,
              color: t.red,
              fontSize: 13,
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={mode === "login" ? handleLogin : mode === "signup" ? handleSignup : handleForgot}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: t.textMuted, fontSize: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
              placeholder="you@email.com"
              onFocus={(e) => (e.target.style.borderColor = t.gold)}
              onBlur={(e) => (e.target.style.borderColor = t.inputBorder)}
            />
          </div>
          {mode !== "forgot" && (
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", color: t.textMuted, fontSize: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={inputStyle}
                placeholder={mode === "signup" ? "At least 6 characters" : "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
                onFocus={(e) => (e.target.style.borderColor = t.gold)}
                onBlur={(e) => (e.target.style.borderColor = t.inputBorder)}
              />
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: "linear-gradient(135deg," + t.gold + ",#B8860B)",
              border: "none",
              borderRadius: 10,
              color: t.btnText,
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'DM Sans',sans-serif",
              letterSpacing: "0.5px",
              boxShadow: "0 4px 15px " + t.gold + "44",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Working..." : mode === "login" ? "Log In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: "center", fontSize: 13, color: t.textMuted }}>
          {mode === "login" && (
            <>
              <span style={{ cursor: "pointer", color: t.gold }} onClick={() => { setMode("forgot"); clearErrors(); }}>Forgot password?</span>
              <div style={{ marginTop: 12 }}>
                Don't have an account?{" "}
                <span style={{ cursor: "pointer", color: t.gold, fontWeight: 600 }} onClick={() => { setMode("signup"); clearErrors(); }}>Sign up</span>
              </div>
            </>
          )}
          {mode === "signup" && (
            <div>
              Already have an account?{" "}
              <span style={{ cursor: "pointer", color: t.gold, fontWeight: 600 }} onClick={() => { setMode("login"); clearErrors(); }}>Log in</span>
            </div>
          )}
          {mode === "forgot" && (
            <div>
              <span style={{ cursor: "pointer", color: t.gold, fontWeight: 600 }} onClick={() => { setMode("login"); clearErrors(); }}>{"\u2190"} Back to login</span>
            </div>
          )}
        </div>
      </div>

      {/* Local data notice */}
      {hasLocalData() && mode === "login" && (
        <div
          style={{
            marginTop: 20,
            padding: "12px 20px",
            background: t.gold + "14",
            border: "1px solid " + t.gold + "33",
            borderRadius: 10,
            maxWidth: 400,
            width: "100%",
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: 13, color: t.gold }}>
            {"\uD83D\uDCE6"} We found local data from your browser. Log in or sign up and it'll sync to your account automatically.
          </span>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 32, textAlign: "center" }}>
        <div style={{ fontFamily: "'Playfair Display',serif", color: t.gold + "66", fontSize: 12 }}>
          Powered by CARES Workflows / Kari Hoglund Kounkel
        </div>
        <div style={{ marginTop: 4, fontStyle: "italic", color: t.textFaint, fontSize: 11 }}>Now go be brilliant.</div>
      </div>
    </div>
  );
}
