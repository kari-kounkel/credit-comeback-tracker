import { useState } from "react";
import { THEMES, MONTHS, CATEGORIES, CAT_EMOJIS, CALENDAR_LENGTH, CALENDAR_START_YEAR, getTodayIndex } from "../constants";
import { INCOME_EMOJIS } from "./AddIncomeModal";

const INCOME_TYPES = ["Employment", "Side Hustle", "Freelance", "Benefits", "Child Support", "Investment", "Other"];

/**
 * AddEntryModal — unified income/expense add. Top toggle picks which
 * kind, the rest of the form adapts. Replaces AddIncomeModal +
 * AddExpenseModal (which still exist for backwards compat).
 *
 * Props:
 *   defaultKind: "income" | "expense"  (which one starts selected)
 *   onClose
 *   onAddIncome({name, type, amount, months})
 *   onAddExpense({name, category, budgeted, dueDay, months})
 *   theme
 */
export default function AddEntryModal({ defaultKind = "expense", onClose, onAddIncome, onAddExpense, theme }) {
  const t = THEMES[theme] || THEMES.dark;
  const [kind, setKind] = useState(defaultKind);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  // Default: select only the remaining months in the current year (so a new entry
  // doesn't accidentally land in past months or future years the user hasn't planned).
  const [months, setMonths] = useState(() => {
    const arr = Array(CALENDAR_LENGTH).fill(false);
    const today = getTodayIndex();
    const yearOfToday = Math.floor(today / 12);
    for (let i = today; i < CALENDAR_LENGTH && Math.floor(i / 12) === yearOfToday; i++) arr[i] = true;
    return arr;
  });

  // Income-only
  const [incomeType, setIncomeType] = useState("Employment");

  // Expense-only
  const [category, setCategory] = useState("Other");
  const [dueDay, setDueDay] = useState("");

  const toggleMonth = (i) => setMonths((m) => { const n = [...m]; n[i] = !n[i]; return n; });
  const toggleAll = () => { const allOn = months.every(Boolean); setMonths(Array(CALENDAR_LENGTH).fill(!allOn)); };
  const toggleYear = (yearOffset) => setMonths((m) => {
    const n = [...m];
    const start = yearOffset * 12;
    const end = start + 12;
    const allOnInYear = n.slice(start, end).every(Boolean);
    for (let i = start; i < end; i++) n[i] = !allOnInYear;
    return n;
  });

  const submit = () => {
    if (!name.trim()) return;
    if (kind === "income") {
      onAddIncome({
        name: name.trim(),
        type: incomeType,
        amount: parseFloat(amount) || 0,
        months,
      });
    } else {
      onAddExpense({
        name: name.trim(),
        category,
        budgeted: parseFloat(amount) || 0,
        dueDay: parseInt(dueDay) || 1,
        months,
      });
    }
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

  const isIncome = kind === "income";
  const accent = isIncome ? t.green : t.gold;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: t.modalBg, border: "1px solid " + t.headerBorder, borderRadius: 16, padding: 28, maxWidth: 460, width: "100%", maxHeight: "90vh", overflowY: "auto" }}
      >
        <h3 style={{ color: accent, fontFamily: "'Playfair Display',serif", fontSize: 20, margin: "0 0 6px" }}>
          Add {isIncome ? "Income" : "Expense"}
        </h3>
        <p style={{ color: t.textMuted, fontSize: 12, margin: "0 0 18px" }}>
          {isIncome
            ? "Money coming in — paychecks, side hustle, benefits, anything regular."
            : "Money going out — rent, utilities, subscriptions, anything you're paying."}
        </p>

        {/* Top toggle */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: 4, background: t.inputBg, borderRadius: 999, marginBottom: 20, border: "1px solid " + t.inputBorder }}>
          <button
            type="button"
            onClick={() => setKind("income")}
            style={toggleBtn(isIncome, t.green, t)}
          >💚 Income</button>
          <button
            type="button"
            onClick={() => setKind("expense")}
            style={toggleBtn(!isIncome, t.gold, t)}
          >📋 Expense</button>
        </div>

        {/* Name */}
        <Field t={t} label={isIncome ? "Source Name" : "Expense Name"}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isIncome ? "e.g., Day Job, Freelance Writing" : "e.g., Electric Bill, Netflix, Car Payment"}
            style={inputStyle}
          />
        </Field>

        {/* Income → Type    OR    Expense → Category */}
        {isIncome ? (
          <Field t={t} label="Income Type">
            <select
              value={incomeType}
              onChange={(e) => setIncomeType(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              {INCOME_TYPES.map((opt) => (
                <option key={opt} value={opt}>{INCOME_EMOJIS[opt]} {opt}</option>
              ))}
            </select>
          </Field>
        ) : (
          <Field t={t} label="Category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{CAT_EMOJIS[c]} {c}</option>
              ))}
            </select>
          </Field>
        )}

        {/* Amount + (Expense only: Due Day) */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={fieldLabel(t)}>Monthly Amount</div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              style={{ ...inputStyle, marginBottom: 0, fontFamily: "'DM Mono',monospace" }}
            />
          </div>
          {!isIncome && (
            <div style={{ width: 110 }}>
              <div style={fieldLabel(t)}>Due Day</div>
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
          )}
        </div>

        {/* Months — grouped by year, each year has its own row + select-all */}
        <div style={fieldLabel(t)}>
          Which months?{" "}
          <span onClick={toggleAll} style={{ color: accent, cursor: "pointer", textTransform: "none", letterSpacing: 0 }}>
            ({months.every(Boolean) ? "uncheck all" : "check all"})
          </span>
        </div>
        <div style={{ marginBottom: 22 }}>
          {Array.from({ length: CALENDAR_LENGTH / 12 }, (_, yearOffset) => {
            const year = CALENDAR_START_YEAR + yearOffset;
            const yearStart = yearOffset * 12;
            const yearMonths = months.slice(yearStart, yearStart + 12);
            const allOnInYear = yearMonths.every(Boolean);
            return (
              <div key={year} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, letterSpacing: 1 }}>{year}</span>
                  <span onClick={() => toggleYear(yearOffset)} style={{ fontSize: 10, color: accent, cursor: "pointer" }}>
                    {allOnInYear ? "clear" : "all"}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 4 }}>
                  {yearMonths.map((on, j) => {
                    const i = yearStart + j;
                    // Just the short month part (strip the year suffix in this view)
                    const shortLabel = MONTHS[i].split(" ")[0];
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleMonth(i)}
                        style={{
                          padding: "5px 4px",
                          borderRadius: 5,
                          border: on ? "1px solid " + accent : "1px solid " + t.cardBorder,
                          background: on ? accent + "22" : "transparent",
                          color: on ? accent : t.textFaint,
                          fontSize: 11,
                          cursor: "pointer",
                          fontFamily: "'DM Sans',sans-serif",
                        }}
                      >{shortLabel}</button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid " + t.cardBorder, background: "transparent", color: t.textMuted, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}
          >Cancel</button>
          <button
            type="button"
            onClick={submit}
            style={{
              flex: 1, padding: "10px", borderRadius: 8, border: "none",
              background: "linear-gradient(135deg," + accent + "," + (isIncome ? "#486347" : t.goldDark) + ")",
              color: t.btnText, fontSize: 13, fontWeight: 700,
              cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
            }}
          >Add {isIncome ? "Income" : "Expense"}</button>
        </div>
      </div>
    </div>
  );
}

const toggleBtn = (active, accent, t) => ({
  padding: "9px 12px",
  borderRadius: 999,
  border: "none",
  background: active ? accent : "transparent",
  color: active ? t.btnText : t.textMuted,
  fontSize: 13,
  fontWeight: active ? 700 : 500,
  cursor: "pointer",
  fontFamily: "'DM Sans',sans-serif",
  transition: "all 0.15s",
});

const fieldLabel = (t) => ({
  display: "block",
  fontSize: 11,
  color: t.textMuted,
  textTransform: "uppercase",
  letterSpacing: 1,
  marginBottom: 6,
  fontFamily: "'DM Sans',sans-serif",
});

function Field({ t, label, children }) {
  return (
    <div>
      <div style={fieldLabel(t)}>{label}</div>
      {children}
    </div>
  );
}
