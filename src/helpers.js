import { supabase } from "./supabaseClient";
import { STORAGE_KEY, THEME_KEY, CATEGORIES, CALENDAR_LENGTH } from "./constants";

export function makeDefault() {
  const bills = {};
  const income = {};
  for (let m = 0; m < CALENDAR_LENGTH; m++) {
    bills[m] = [];
    income[m] = [];
  }
  return {
    income,
    bills,
    creditScores: Array(CALENDAR_LENGTH).fill(0),
    savings: Array(CALENDAR_LENGTH).fill(0),
  };
}

// Migrate old flat income array to per-month format AND extend old 12-month
// arrays into the current CALENDAR_LENGTH (36 by default — 2026 → 2028).
// Existing data stays in indices 0..11; new months 12..35 start empty.
export function migrateData(data) {
  if (!data) return data;
  // (1) old: income was a flat array — wrap into per-month
  if (Array.isArray(data.income)) {
    const oldIncome = data.income;
    const newIncome = {};
    for (let m = 0; m < CALENDAR_LENGTH; m++) {
      newIncome[m] = m < 12 ? oldIncome.map((src) => ({ ...src })) : [];
    }
    data.income = newIncome;
  }
  // (2) ensure every slot exists in the new CALENDAR_LENGTH range
  for (let m = 0; m < CALENDAR_LENGTH; m++) {
    if (!data.income[m]) data.income[m] = [];
    if (!data.bills[m]) data.bills[m] = [];
  }
  // (3) extend creditScores / savings arrays to CALENDAR_LENGTH if needed
  if (!Array.isArray(data.creditScores)) data.creditScores = [];
  if (!Array.isArray(data.savings))      data.savings      = [];
  while (data.creditScores.length < CALENDAR_LENGTH) data.creditScores.push(0);
  while (data.savings.length      < CALENDAR_LENGTH) data.savings.push(0);
  return data;
}

export function loadLocal() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return JSON.parse(s);
  } catch (e) {}
  // Check old key for migration
  try {
    const s = localStorage.getItem("creditComebackTracker_v1");
    if (s) return JSON.parse(s);
  } catch (e) {}
  return null;
}

export function saveLocal(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {}
}

export function loadTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved;
  } catch (e) {}
  return "crisp"; // new default
}

export function fmt(n) {
  return "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function hasLocalData() {
  const d = loadLocal();
  if (!d) return false;
  const hasIncome = Object.values(d.income || {}).some(month => Array.isArray(month) && month.some(i => i.amount > 0));
  const hasBills = Object.values(d.bills || {}).some(
    (month) => Array.isArray(month) && month.some((b) => b.budgeted > 0 || b.actual > 0)
  );
  const hasScores = d.creditScores?.some((s) => s > 0);
  const hasSavings = d.savings?.some((s) => s > 0);
  return hasIncome || hasBills || hasScores || hasSavings;
}

export function groupByCategory(bills) {
  const groups = {};
  bills.forEach((b, idx) => {
    const cat = b.category || "Other";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push({ ...b, _idx: idx });
  });
  const sorted = {};
  CATEGORIES.forEach((cat) => {
    if (groups[cat]) sorted[cat] = groups[cat];
  });
  Object.keys(groups).forEach((cat) => {
    if (!sorted[cat]) sorted[cat] = groups[cat];
  });
  return sorted;
}

// Cloud data functions
export async function loadFromCloud(userId) {
  const { data, error } = await supabase
    .from("tracker_data")
    .select("data")
    .eq("user_id", userId)
    .single();
  if (error && error.code !== "PGRST116") console.error("Load error:", error);
  return data?.data || null;
}

export async function saveToCloud(userId, trackerData) {
  const { error } = await supabase
    .from("tracker_data")
    .upsert(
      { user_id: userId, data: trackerData, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  if (error) console.error("Save error:", error);
}
