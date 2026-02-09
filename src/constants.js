export const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export const STATUSES = ["unpaid","upcoming","partial","paid"];
export const STATUS_LABELS = {unpaid:"Unpaid",upcoming:"Upcoming",partial:"Partial",paid:"Paid ✓"};
export const STATUS_COLORS = {unpaid:"#DC143C",upcoming:"#D4A853",partial:"#FF8C00",paid:"#22c55e"};

export const CATEGORIES = [
  "Housing","Utilities","Transportation","Insurance","Subscriptions",
  "Food & Groceries","Debt Payments","Personal Care","Entertainment",
  "Medical/Health","Giving/Tithe","Other"
];

export const CAT_EMOJIS = {
  "Housing":"🏠","Utilities":"💡","Transportation":"🚗","Insurance":"🛡️",
  "Subscriptions":"📱","Food & Groceries":"🛒","Debt Payments":"💳",
  "Personal Care":"✨","Entertainment":"🎬","Medical/Health":"🏥",
  "Giving/Tithe":"💛","Other":"📦"
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

export const THEMES = {
  dark: {
    bg: "linear-gradient(135deg,#0f0f23 0%,#1a1a2e 40%,#16213e 100%)",
    cardBg: "rgba(255,255,255,0.03)",
    cardBorder: "rgba(255,255,255,0.06)",
    text: "#e0e0e0",
    textMuted: "#888",
    textFaint: "#555",
    headerBg: "linear-gradient(135deg,rgba(212,168,83,0.12) 0%,rgba(212,168,83,0.03) 100%)",
    headerBorder: "rgba(212,168,83,0.2)",
    inputBg: "rgba(255,255,255,0.06)",
    inputBorder: "rgba(212,168,83,0.2)",
    inputText: "#e0e0e0",
    editBg: "#0f0f23",
    rowHover: "rgba(255,255,255,0.02)",
    sidebarBg: "rgba(212,168,83,0.06)",
    sidebarText: "#bbb",
    gold: "#D4A853",
    green: "#22c55e",
    red: "#DC143C",
    modalBg: "#1a1a2e",
    btnText: "#0f0f23",
  },
  light: {
    bg: "linear-gradient(135deg,#faf8f4 0%,#f5f0e8 40%,#ede7db 100%)",
    cardBg: "rgba(255,255,255,0.7)",
    cardBorder: "rgba(180,160,120,0.2)",
    text: "#2c2418",
    textMuted: "#7a6f60",
    textFaint: "#b0a690",
    headerBg: "linear-gradient(135deg,rgba(212,168,83,0.15) 0%,rgba(212,168,83,0.05) 100%)",
    headerBorder: "rgba(212,168,83,0.25)",
    inputBg: "rgba(255,255,255,0.8)",
    inputBorder: "rgba(180,160,120,0.3)",
    inputText: "#2c2418",
    editBg: "#ffffff",
    rowHover: "rgba(212,168,83,0.04)",
    sidebarBg: "rgba(212,168,83,0.08)",
    sidebarText: "#5a4e3a",
    gold: "#B8860B",
    green: "#16a34a",
    red: "#dc2626",
    modalBg: "#faf8f4",
    btnText: "#ffffff",
  }
};
