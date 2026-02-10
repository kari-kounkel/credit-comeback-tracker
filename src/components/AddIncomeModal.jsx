import { useState } from "react";
import { THEMES, MONTHS } from "../constants";

const INCOME_TYPES = ["Employment", "Side Hustle", "Freelance", "Benefits", "Child Support", "Investment", "Other"];
const INCOME_EMOJIS = { "Employment": "💼", "Side Hustle": "🔥", "Freelance": "💻", "Benefits": "🏛️", "Child Support": "👶", "Investment": "📈", "Other": "💰" };

export { INCOME_TYPES, INCOME_EMOJIS };

export default function AddIncomeModal({ onClose, onAdd, theme }) {
  const t = THEMES[theme] || THEMES.dark;
  const [name, setName] = useState("");
  const [type, setType] = useState("Employment");
  const [amount, setAmount] = useState("");
  const [months, setMonths] = useState(Array(12).fill(true));

  const toggleMonth = (i) => setMonths((m) => { const n = [...m]; n[i] = !n[i]; return n; });
  const toggleAll = () => { const allOn = months.every(Boolean); setMonths(Array(12).fill(!allOn)); };

  const submit = () => {
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      type,
      amount: parseFloat(amount) || 0,
      months,
    });
    onClose();
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    background: t.inputBg,
    border: "1px solid " + t.inputBorder,
    borderRadius: 8,
    color: t.inputText,
    fontSize: 14,
    fontFamily: "'DM Sans',sans-serif",
    outline: "none",
    marginBottom: 16,
    boxSizing: "border-box",
  };

  return (
    <div
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: t.modalBg, border: "1px solid " + t.headerBorder, borderRadius: 16, padding: 28, maxWidth: 460, width: "100%", maxHeight: "90vh", overflowY: "auto" }}
      >
        <h3 style={{ color: t.gold, fontFamily: "'Playfair Display',serif", fontSize: 20, margin: "0 0 20px" }}>Add Income Source</h3>

        {/* Name */}
        <label style={{ display: "block", color: t.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Source Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Minuteman Press, Freelance Writing" style={inputStyle} />

        {/* Type */}
        <label style={{ display: "block", color: t.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={{ ...inputStyle, cursor: "pointer" }}
        >
          {INCOME_TYPES.map((t) => (
            <option key={t} value={t}>
              {INCOME_EMOJIS[t]} {t}
            </option>
          ))}
        </select>

        {/* Amount */}
        <label style={{ display: "block", color: t.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Monthly Amount</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          style={{ ...inputStyle, fontFamily: "'DM Mono',monospace" }}
        />

        {/* Months */}
        <label style={{ display: "block", color: t.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
          Which months?{" "}
          <span onClick={toggleAll} style={{ color: t.gold, cursor: "pointer", textTransform: "none", letterSpacing: 0 }}>
            ({months.every(Boolean) ? "uncheck all" : "check all"})
          </span>
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 20 }}>
          {MONTHS.map((m, i) => (
            <button
              key={m}
              onClick={() => toggleMonth(i)}
              style={{
                padding: "6px",
                borderRadius: 6,
                border: months[i] ? "1px solid " + t.gold : "1px solid " + t.cardBorder,
                background: months[i] ? t.gold + "22" : "transparent",
                color: months[i] ? t.gold : t.textFaint,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "'DM Sans',sans-serif",
              }}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid " + t.cardBorder, background: "transparent", color: t.textMuted, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "linear-gradient(135deg," + t.gold + "," + t.goldDark + ")", color: t.btnText, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}
          >
            Add Income
          </button>
        </div>
      </div>
    </div>
  );
}
