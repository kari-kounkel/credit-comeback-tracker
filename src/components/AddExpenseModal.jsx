import { useState } from "react";
import { THEMES, MONTHS, CATEGORIES, CAT_EMOJIS } from "../constants";

export default function AddExpenseModal({ onClose, onAdd, theme }) {
  const t = THEMES[theme] || THEMES.dark;
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Other");
  const [budgeted, setBudgeted] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [months, setMonths] = useState(Array(12).fill(true));

  const toggleMonth = (i) => setMonths((m) => { const n = [...m]; n[i] = !n[i]; return n; });
  const toggleAll = () => { const allOn = months.every(Boolean); setMonths(Array(12).fill(!allOn)); };

  const submit = () => {
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      category,
      budgeted: parseFloat(budgeted) || 0,
      dueDay: parseInt(dueDay) || 1,
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
        <h3 style={{ color: t.gold, fontFamily: "'Playfair Display',serif", fontSize: 20, margin: "0 0 20px" }}>Add New Expense</h3>

        {/* Name */}
        <label style={{ display: "block", color: t.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Expense Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Electric Bill, Netflix, Car Payment" style={inputStyle} />

        {/* Category */}
        <label style={{ display: "block", color: t.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ ...inputStyle, cursor: "pointer" }}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CAT_EMOJIS[c]} {c}
            </option>
          ))}
        </select>

        {/* Amount + Due Day */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", color: t.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Monthly Amount</label>
            <input
              type="number"
              value={budgeted}
              onChange={(e) => setBudgeted(e.target.value)}
              placeholder="0.00"
              style={{ ...inputStyle, marginBottom: 0, fontFamily: "'DM Mono',monospace" }}
            />
          </div>
          <div style={{ width: 100 }}>
            <label style={{ display: "block", color: t.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Due Day</label>
            <input
              type="number"
              min="1"
              max="31"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              placeholder="15"
              style={{ ...inputStyle, marginBottom: 0, fontFamily: "'DM Mono',monospace", textAlign: "center" }}
            />
          </div>
        </div>

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
            style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "linear-gradient(135deg," + t.gold + ",#B8860B)", color: t.btnText, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}
          >
            Add Expense
          </button>
        </div>
      </div>
    </div>
  );
}
