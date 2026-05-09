export const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export const STATUSES = ["unpaid","upcoming","partial","paid"];
export const STATUS_LABELS = {unpaid:"Unpaid",upcoming:"Upcoming",partial:"Partial",paid:"Paid ✓"};
export const STATUS_COLORS = {unpaid:"#B84233",upcoming:"#D4943A",partial:"#C4652A",paid:"#5A8A59"};

export const CATEGORIES = [
  "Housing","Utilities","Transportation","Insurance","Subscriptions",
  "Food & Groceries","Debt Payments","Personal Care","Entertainment",
  "Medical/Health","Giving/Tithe","Variable","Other"
];

export const CAT_EMOJIS = {
  "Housing":"🏠","Utilities":"💡","Transportation":"🚗","Insurance":"🛡️",
  "Subscriptions":"📱","Food & Groceries":"🛒","Debt Payments":"💳",
  "Personal Care":"✨","Entertainment":"🎬","Medical/Health":"🏥",
  "Giving/Tithe":"💛","Variable":"⛽","Other":"📦"
};

export const MILESTONES = [
  {score:500,label:"Starting Line",emoji:"🏁"},
  {score:580,label:"Warming Up",emoji:"🌱"},
  {score:620,label:"Getting Traction",emoji:"⚡"},
  {score:670,label:"Momentum",emoji:"🔥"},
  {score:700,label:"The Club",emoji:"🎯"},
  {score:740,label:"Excellent Territory",emoji:"⭐"},
  {score:780,label:"Elite Status",emoji:"👑"},
  {score:800,label:"Legendary",emoji:"🏆"},
];

export const SAVINGS_GOAL = 20000;
export const STORAGE_KEY = "creditComebackTracker_v2";
export const THEME_KEY = "creditTracker_theme";
export const WORKBOOK_URL = "https://karikounkel.shop/products/the-credit-comeback-kit-a-90-day-ladder-to-financial-stability";
export const JOTFORM_URL = "https://form.jotform.com/260390334535050";

// ─── THEMES ──────────────────────────────────────────────────────────
// Each theme defines the same token names; semantic uses are:
//   bg/cardBg/cardBorder = surfaces
//   text/textMuted/textFaint = type hierarchy
//   gold = primary accent (CTAs, active state) — name kept for backward compat
//   green = positive (paid/done)
//   red = negative (overdue/error)
//
// Crisp is the new default — clean white background, navy text, sage accent.
export const THEME_DEFAULT = "crisp";
export const THEMES = {
  crisp: {
    label: "Crisp",
    swatch: "#FFFFFF",
    bg: "linear-gradient(180deg,#FAFAF9 0%,#F4F4F2 100%)",
    cardBg: "#FFFFFF",
    cardBorder: "rgba(20,40,55,0.10)",
    text: "#16263A",
    textMuted: "#5C6B7A",
    textFaint: "#9AA5B1",
    headerBg: "linear-gradient(135deg,rgba(90,138,89,0.10) 0%,rgba(90,138,89,0.02) 100%)",
    headerBorder: "rgba(90,138,89,0.25)",
    inputBg: "#FFFFFF",
    inputBorder: "rgba(20,40,55,0.18)",
    inputText: "#16263A",
    editBg: "#FFFFFF",
    rowHover: "rgba(90,138,89,0.04)",
    sidebarBg: "rgba(20,40,55,0.04)",
    sidebarText: "#3D556E",
    gold: "#3F7A6B",        // sage primary
    goldDark: "#2C5C50",
    green: "#3F7A6B",
    red: "#B84233",
    modalBg: "#FFFFFF",
    btnText: "#FFFFFF",
  },
  sage: {
    label: "Sage",
    swatch: "#7BA67A",
    bg: "linear-gradient(135deg,#F2F5F0 0%,#E6EDE2 100%)",
    cardBg: "#FFFFFF",
    cardBorder: "rgba(46,76,52,0.12)",
    text: "#1F3324",
    textMuted: "#5F7866",
    textFaint: "#9CB0A2",
    headerBg: "linear-gradient(135deg,rgba(123,166,122,0.18) 0%,rgba(123,166,122,0.04) 100%)",
    headerBorder: "rgba(123,166,122,0.35)",
    inputBg: "#FFFFFF",
    inputBorder: "rgba(46,76,52,0.18)",
    inputText: "#1F3324",
    editBg: "#FFFFFF",
    rowHover: "rgba(123,166,122,0.06)",
    sidebarBg: "rgba(46,76,52,0.05)",
    sidebarText: "#3F5C46",
    gold: "#5A8A59",
    goldDark: "#3D6B3D",
    green: "#5A8A59",
    red: "#B84233",
    modalBg: "#F8FAF7",
    btnText: "#FFFFFF",
  },
  light: {
    label: "Cream",
    swatch: "#EDE3D4",
    bg: "linear-gradient(135deg,#F5EDE0 0%,#EDE3D4 40%,#E8D5B5 100%)",
    cardBg: "rgba(255,248,240,0.8)",
    cardBorder: "rgba(58,42,31,0.1)",
    text: "#3A2A1F",
    textMuted: "#7A6B5E",
    textFaint: "#A89880",
    headerBg: "linear-gradient(135deg,rgba(45,79,95,0.1) 0%,rgba(45,79,95,0.03) 100%)",
    headerBorder: "rgba(45,79,95,0.2)",
    inputBg: "rgba(255,248,240,0.9)",
    inputBorder: "rgba(58,42,31,0.15)",
    inputText: "#3A2A1F",
    editBg: "#FFF8F0",
    rowHover: "rgba(45,79,95,0.04)",
    sidebarBg: "rgba(45,79,95,0.06)",
    sidebarText: "#5A4E3A",
    gold: "#2D4F5F",
    goldDark: "#1E3640",
    green: "#5A8A59",
    red: "#B84233",
    modalBg: "#F5EDE0",
    btnText: "#F5EDE0",
  },
  dark: {
    label: "Brown",
    swatch: "#2A1F17",
    bg: "linear-gradient(135deg,#140E09 0%,#1E1510 40%,#2A1F17 100%)",
    cardBg: "rgba(232,213,181,0.04)",
    cardBorder: "rgba(232,213,181,0.08)",
    text: "#E8D5B5",
    textMuted: "#9C8B78",
    textFaint: "#6B5D4F",
    headerBg: "linear-gradient(135deg,rgba(212,148,58,0.14) 0%,rgba(212,148,58,0.04) 100%)",
    headerBorder: "rgba(212,148,58,0.25)",
    inputBg: "rgba(232,213,181,0.06)",
    inputBorder: "rgba(212,148,58,0.25)",
    inputText: "#E8D5B5",
    editBg: "#1E1510",
    rowHover: "rgba(232,213,181,0.03)",
    sidebarBg: "rgba(212,148,58,0.08)",
    sidebarText: "#BBA88E",
    gold: "#D4943A",
    goldDark: "#A07328",
    green: "#7BA67A",
    red: "#B84233",
    modalBg: "#1E1510",
    btnText: "#140E09",
  },
};
