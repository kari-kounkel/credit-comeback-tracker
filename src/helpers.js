import { supabase } from "./supabaseClient";
import { STORAGE_KEY, THEME_KEY, CATEGORIES } from "./constants";

export function makeDefault() {
  const bills = {};
  for (let m = 0; m < 12; m++) bills[m] = [];
  return {
    income: [{ name: "Primary Job", amount: 0 }, { name: "Side Income", amount: 0 }],
    bills,
    creditScores: Array(12).fill(0),
    savings: Array(12).fill(0),
  };
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
    return localStorage.getItem(THEME_KEY) || "dark";
  } catch (e) {
    return "dark";
  }
}

export function fmt(n) {
  return "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function hasLocalData() {
  const d = loadLocal();
  if (!d) return false;
  const hasIncome = d.income?.some((i) => i.amount > 0);
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
