import { useState, useEffect } from "react";
import { THEMES } from "../constants";
import { fmt } from "../helpers";

export function NumCell({ value, onChange, prefix = "$", placeholder = "\u2014", theme }) {
  const t = THEMES[theme] || THEMES.dark;
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(value || "");
  useEffect(() => setTemp(value || ""), [value]);

  if (editing)
    return (
      <input
        autoFocus
        type="number"
        value={temp}
        onChange={(e) => setTemp(e.target.value)}
        onBlur={() => { setEditing(false); onChange(parseFloat(temp) || 0); }}
        onKeyDown={(e) => { if (e.key === "Enter") { setEditing(false); onChange(parseFloat(temp) || 0); } }}
        style={{ width: 80, padding: "4px 8px", background: t.editBg, border: "1px solid " + t.gold, borderRadius: 6, color: t.inputText, fontFamily: "'DM Mono',monospace", fontSize: 13, textAlign: "right", outline: "none" }}
      />
    );

  return (
    <span
      onClick={() => setEditing(true)}
      style={{ cursor: "pointer", padding: "4px 8px", borderRadius: 6, background: value ? t.gold + "11" : t.cardBg, fontFamily: "'DM Mono',monospace", fontSize: 13, color: value ? t.text : t.textFaint, display: "inline-block", minWidth: 70, textAlign: "right", transition: "background 0.2s", border: "1px solid transparent" }}
      onMouseEnter={(e) => (e.target.style.borderColor = t.gold + "55")}
      onMouseLeave={(e) => (e.target.style.borderColor = "transparent")}
    >
      {value ? (prefix === "$" ? fmt(value) : value) : placeholder}
    </span>
  );
}

export function DayCell({ value, onChange, theme }) {
  const t = THEMES[theme] || THEMES.dark;
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(value || "");
  useEffect(() => setTemp(value || ""), [value]);

  if (editing)
    return (
      <input
        autoFocus
        type="number"
        min="1"
        max="31"
        value={temp}
        onChange={(e) => setTemp(e.target.value)}
        onBlur={() => { setEditing(false); onChange(Math.min(31, Math.max(1, parseInt(temp) || 1))); }}
        onKeyDown={(e) => { if (e.key === "Enter") { setEditing(false); onChange(Math.min(31, Math.max(1, parseInt(temp) || 1))); } }}
        style={{ width: 50, padding: "4px 8px", background: t.editBg, border: "1px solid " + t.gold, borderRadius: 6, color: t.inputText, fontFamily: "'DM Mono',monospace", fontSize: 13, textAlign: "center", outline: "none" }}
      />
    );

  return (
    <span
      onClick={() => setEditing(true)}
      style={{ cursor: "pointer", padding: "4px 8px", borderRadius: 6, background: value ? t.gold + "11" : t.cardBg, fontFamily: "'DM Mono',monospace", fontSize: 13, color: value ? t.text : t.textFaint, display: "inline-block", minWidth: 40, textAlign: "center", transition: "background 0.2s", border: "1px solid transparent" }}
      onMouseEnter={(e) => (e.target.style.borderColor = t.gold + "55")}
      onMouseLeave={(e) => (e.target.style.borderColor = "transparent")}
    >
      {value || "\u2014"}
    </span>
  );
}

export function ProgressBar({ current, goal, color = "#D4A853", height = 8, theme }) {
  const t = THEMES[theme] || THEMES.dark;
  const pct = Math.min((current / goal) * 100, 100);
  return (
    <div style={{ width: "100%", background: t.cardBorder, borderRadius: height, height, overflow: "hidden" }}>
      <div style={{ width: pct + "%", height: "100%", background: color, borderRadius: height, transition: "width 0.5s ease" }} />
    </div>
  );
}

export function SidebarNote({ children, theme }) {
  const t = THEMES[theme] || THEMES.dark;
  return (
    <div style={{ margin: "20px 0", padding: "16px 20px", borderLeft: "3px solid " + t.gold, background: t.sidebarBg, borderRadius: "0 12px 12px 0", fontSize: 13, lineHeight: 1.6, color: t.sidebarText, fontStyle: "italic" }}>
      <span style={{ color: t.gold, fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Sidebar Note from Kari</span>
      {children}
    </div>
  );
}
