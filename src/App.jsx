import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ═══════════════════════════════════════════════
//  SUPABASE CONFIG
// ═══════════════════════════════════════════════
const supabase = createClient(
  "https://fufhjraudksavfncpdrm.supabase.co",
  "sb_publishable_zhgNH17s2IK1X0wesXKieA_3suOKEp1"
);

// ═══════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const STATUSES = ["unpaid","upcoming","partial","paid"];
const STATUS_LABELS = {unpaid:"Unpaid",upcoming:"Upcoming",partial:"Partial",paid:"Paid ✓"};
const STATUS_COLORS = {unpaid:"#DC143C",upcoming:"#D4A853",partial:"#FF8C00",paid:"#22c55e"};
const MILESTONES = [
  {score:500,label:"Starting Line",emoji:"🏁"},
  {score:580,label:"Warming Up",emoji:"🌱"},
  {score:620,label:"Getting Traction",emoji:"⚡"},
  {score:670,label:"Momentum",emoji:"🔥"},
  {score:700,label:"The Club",emoji:"🎯"},
  {score:740,label:"Excellent Territory",emoji:"⭐"},
  {score:780,label:"Elite Status",emoji:"👑"},
  {score:800,label:"Legendary",emoji:"🏆"},
];
const DEFAULT_CATS = [
  {name:"Housing (Rent/Mortgage)",type:"fixed"},
  {name:"Utilities",type:"fixed"},
  {name:"Car Payment",type:"fixed"},
  {name:"Insurance",type:"fixed"},
  {name:"Phone",type:"fixed"},
  {name:"Subscriptions",type:"fixed"},
  {name:"Groceries",type:"variable"},
  {name:"Gas/Transport",type:"variable"},
  {name:"Personal Care",type:"variable"},
  {name:"Dining Out",type:"variable"},
  {name:"Clothing",type:"variable"},
  {name:"Entertainment",type:"variable"},
  {name:"Minimum Debt Payments",type:"debt"},
];
const SAVINGS_GOAL = 20000;
const STORAGE_KEY = "creditComebackTracker_v1";

// ═══════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════
function makeDefault() {
  const bills = {};
  for (let m = 0; m < 12; m++) bills[m] = DEFAULT_CATS.map(c => ({...c,budgeted:0,actual:0,dueDay:1,status:"unpaid"}));
  return { income:[{name:"Primary Job",amount:0},{name:"Side Income",amount:0}], bills, creditScores:Array(12).fill(0), savings:Array(12).fill(0) };
}

function loadLocal() {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s); } catch(e) {}
  return null;
}

function saveLocal(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e) {}
}

function fmt(n) { return "$" + Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}); }

function hasLocalData() {
  const d = loadLocal();
  if (!d) return false;
  // Check if any income > 0 or any bill has been touched
  const hasIncome = d.income?.some(i => i.amount > 0);
  const hasBills = Object.values(d.bills || {}).some(month => month.some(b => b.budgeted > 0 || b.actual > 0));
  const hasScores = d.creditScores?.some(s => s > 0);
  const hasSavings = d.savings?.some(s => s > 0);
  return hasIncome || hasBills || hasScores || hasSavings;
}

// ═══════════════════════════════════════════════
//  SUPABASE DATA FUNCTIONS
// ═══════════════════════════════════════════════
async function loadFromCloud(userId) {
  const { data, error } = await supabase
    .from("tracker_data")
    .select("data")
    .eq("user_id", userId)
    .single();
  if (error && error.code !== "PGRST116") console.error("Load error:", error);
  return data?.data || null;
}

async function saveToCloud(userId, trackerData) {
  const { error } = await supabase
    .from("tracker_data")
    .upsert({
      user_id: userId,
      data: trackerData,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });
  if (error) console.error("Save error:", error);
}

// ═══════════════════════════════════════════════
//  COMPONENTS: Editable cells
// ═══════════════════════════════════════════════
function NumCell({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(value || "");
  useEffect(() => setTemp(value || ""), [value]);
  if (editing) return (
    <input autoFocus type="number" value={temp}
      onChange={e => setTemp(e.target.value)}
      onBlur={() => { setEditing(false); onChange(parseFloat(temp)||0); }}
      onKeyDown={e => { if(e.key==="Enter"){setEditing(false);onChange(parseFloat(temp)||0);} }}
      style={{width:80,padding:"4px 8px",background:"#0f0f23",border:"1px solid #D4A853",borderRadius:6,color:"#e0e0e0",fontFamily:"'DM Mono',monospace",fontSize:13,textAlign:"right",outline:"none"}}
    />
  );
  return (
    <span onClick={() => setEditing(true)}
      style={{cursor:"pointer",padding:"4px 8px",borderRadius:6,background:value?"rgba(212,168,83,0.08)":"rgba(255,255,255,0.03)",fontFamily:"'DM Mono',monospace",fontSize:13,color:value?"#e0e0e0":"#555",display:"inline-block",minWidth:70,textAlign:"right",transition:"background 0.2s",border:"1px solid transparent"}}
      onMouseEnter={e=>e.target.style.borderColor="rgba(212,168,83,0.3)"}
      onMouseLeave={e=>e.target.style.borderColor="transparent"}
    >{value ? fmt(value) : "—"}</span>
  );
}

function ProgressBar({ current, goal, color = "#D4A853", height = 8 }) {
  const pct = Math.min((current / goal) * 100, 100);
  return (
    <div style={{width:"100%",background:"rgba(255,255,255,0.06)",borderRadius:height,height,overflow:"hidden"}}>
      <div style={{width:`${pct}%`,height:"100%",background:color,borderRadius:height,transition:"width 0.5s ease"}}/>
    </div>
  );
}

function SidebarNote({ children }) {
  return (
    <div style={{margin:"20px 0",padding:"16px 20px",borderLeft:"3px solid #D4A853",background:"rgba(212,168,83,0.06)",borderRadius:"0 12px 12px 0",fontSize:13,lineHeight:1.6,color:"#bbb",fontStyle:"italic"}}>
      <span style={{color:"#D4A853",fontWeight:700,fontSize:11,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:4}}>Sidebar Note from Kari</span>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════
//  AUTH SCREEN
// ═══════════════════════════════════════════════
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login"); // login | signup | forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null);
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) setError(err.message);
    else onAuth(data.user);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null); setMessage(null);
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
    setLoading(true); setError(null); setMessage(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    });
    setLoading(false);
    if (err) setError(err.message);
    else { setMessage("Password reset email sent! Check your inbox."); setMode("login"); }
  };

  const inputStyle = {
    width:"100%",padding:"12px 16px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(212,168,83,0.2)",
    borderRadius:10,color:"#e0e0e0",fontSize:14,fontFamily:"'DM Sans',sans-serif",outline:"none",boxSizing:"border-box",
    transition:"border-color 0.2s"
  };

  const btnStyle = {
    width:"100%",padding:"14px",background:"linear-gradient(135deg,#D4A853,#B8860B)",border:"none",
    borderRadius:10,color:"#0f0f23",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",
    letterSpacing:"0.5px",transition:"transform 0.15s, box-shadow 0.15s",
    boxShadow:"0 4px 15px rgba(212,168,83,0.3)"
  };

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0f0f23 0%,#1a1a2e 40%,#16213e 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif",padding:20}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet"/>

      <div style={{textAlign:"center",marginBottom:32}}>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:32,fontWeight:800,color:"#D4A853",margin:0,letterSpacing:"-0.5px"}}>
          The Credit Comeback Tracker
        </h1>
        <p style={{color:"#8a8a8a",fontSize:13,margin:"8px 0 0",fontStyle:"italic"}}>
          Budget · Pay · Save · Rebuild — One month at a time.
        </p>
      </div>

      <div style={{width:"100%",maxWidth:400,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(212,168,83,0.15)",borderRadius:16,padding:32}}>
        <h2 style={{color:"#e0e0e0",fontSize:20,fontWeight:600,margin:"0 0 24px",textAlign:"center"}}>
          {mode === "login" ? "Welcome Back" : mode === "signup" ? "Create Your Account" : "Reset Password"}
        </h2>

        {message && (
          <div style={{padding:"12px 16px",background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.3)",borderRadius:10,color:"#22c55e",fontSize:13,marginBottom:16,lineHeight:1.5}}>
            {message}
          </div>
        )}

        {error && (
          <div style={{padding:"12px 16px",background:"rgba(220,20,60,0.1)",border:"1px solid rgba(220,20,60,0.3)",borderRadius:10,color:"#DC143C",fontSize:13,marginBottom:16,lineHeight:1.5}}>
            {error}
          </div>
        )}

        <form onSubmit={mode === "login" ? handleLogin : mode === "signup" ? handleSignup : handleForgot}>
          <div style={{marginBottom:16}}>
            <label style={{display:"block",color:"#888",fontSize:12,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required
              style={inputStyle} placeholder="you@email.com"
              onFocus={e=>e.target.style.borderColor="#D4A853"} onBlur={e=>e.target.style.borderColor="rgba(212,168,83,0.2)"}
            />
          </div>

          {mode !== "forgot" && (
            <div style={{marginBottom:24}}>
              <label style={{display:"block",color:"#888",fontSize:12,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Password</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required
                minLength={6} style={inputStyle} placeholder={mode==="signup"?"At least 6 characters":"••••••••"}
                onFocus={e=>e.target.style.borderColor="#D4A853"} onBlur={e=>e.target.style.borderColor="rgba(212,168,83,0.2)"}
              />
            </div>
          )}

          <button type="submit" disabled={loading} style={{...btnStyle, opacity:loading?0.7:1}}
            onMouseEnter={e=>{e.target.style.transform="translateY(-1px)";e.target.style.boxShadow="0 6px 20px rgba(212,168,83,0.4)"}}
            onMouseLeave={e=>{e.target.style.transform="translateY(0)";e.target.style.boxShadow="0 4px 15px rgba(212,168,83,0.3)"}}
          >
            {loading ? "Working..." : mode === "login" ? "Log In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
          </button>
        </form>

        <div style={{marginTop:20,textAlign:"center",fontSize:13,color:"#888"}}>
          {mode === "login" && (
            <>
              <span style={{cursor:"pointer",color:"#D4A853"}} onClick={()=>{setMode("forgot");setError(null);setMessage(null);}}>Forgot password?</span>
              <div style={{marginTop:12}}>
                Don't have an account?{" "}
                <span style={{cursor:"pointer",color:"#D4A853",fontWeight:600}} onClick={()=>{setMode("signup");setError(null);setMessage(null);}}>Sign up</span>
              </div>
            </>
          )}
          {mode === "signup" && (
            <div>
              Already have an account?{" "}
              <span style={{cursor:"pointer",color:"#D4A853",fontWeight:600}} onClick={()=>{setMode("login");setError(null);setMessage(null);}}>Log in</span>
            </div>
          )}
          {mode === "forgot" && (
            <div>
              <span style={{cursor:"pointer",color:"#D4A853",fontWeight:600}} onClick={()=>{setMode("login");setError(null);setMessage(null);}}>← Back to login</span>
            </div>
          )}
        </div>
      </div>

      {hasLocalData() && mode === "login" && (
        <div style={{marginTop:20,padding:"12px 20px",background:"rgba(212,168,83,0.08)",border:"1px solid rgba(212,168,83,0.2)",borderRadius:10,maxWidth:400,width:"100%",textAlign:"center"}}>
          <span style={{fontSize:13,color:"#D4A853"}}>📦 We found local data from your browser. Log in or sign up and it'll sync to your account automatically.</span>
        </div>
      )}

      <div style={{marginTop:32,textAlign:"center"}}>
        <div style={{fontFamily:"'Playfair Display',serif",color:"rgba(212,168,83,0.4)",fontSize:12}}>Powered by CARES Workflows / Kari Hoglund Kounkel</div>
        <div style={{marginTop:4,fontStyle:"italic",color:"rgba(255,255,255,0.15)",fontSize:11}}>Now go be brilliant.</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  ADD EXPENSE MODAL
// ═══════════════════════════════════════════════
function AddExpenseModal({ onClose, onAdd }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("variable");
  const [months, setMonths] = useState(Array(12).fill(true));

  const toggleMonth = (i) => setMonths(m => { const n=[...m]; n[i]=!n[i]; return n; });
  const toggleAll = () => { const allOn = months.every(Boolean); setMonths(Array(12).fill(!allOn)); };

  const submit = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), type, months });
    onClose();
  };

  return (
    <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#1a1a2e",border:"1px solid rgba(212,168,83,0.2)",borderRadius:16,padding:28,maxWidth:420,width:"100%"}}>
        <h3 style={{color:"#D4A853",fontFamily:"'Playfair Display',serif",fontSize:20,margin:"0 0 20px"}}>Add New Expense</h3>

        <label style={{display:"block",color:"#888",fontSize:11,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Name</label>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g., Gym Membership"
          style={{width:"100%",padding:"10px 14px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(212,168,83,0.2)",borderRadius:8,color:"#e0e0e0",fontSize:14,fontFamily:"'DM Sans',sans-serif",outline:"none",marginBottom:16,boxSizing:"border-box"}}
        />

        <label style={{display:"block",color:"#888",fontSize:11,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Type</label>
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          {["fixed","variable","debt"].map(t => (
            <button key={t} onClick={()=>setType(t)}
              style={{flex:1,padding:"8px",borderRadius:8,border:type===t?"1px solid #D4A853":"1px solid rgba(255,255,255,0.1)",
                background:type===t?"rgba(212,168,83,0.15)":"rgba(255,255,255,0.03)",color:type===t?"#D4A853":"#888",
                fontSize:12,fontWeight:600,cursor:"pointer",textTransform:"capitalize",fontFamily:"'DM Sans',sans-serif"}}
            >{t}</button>
          ))}
        </div>

        <label style={{display:"block",color:"#888",fontSize:11,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>
          Which months?{" "}
          <span onClick={toggleAll} style={{color:"#D4A853",cursor:"pointer",textTransform:"none",letterSpacing:0}}>
            ({months.every(Boolean) ? "uncheck all" : "check all"})
          </span>
        </label>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:20}}>
          {MONTHS.map((m,i) => (
            <button key={m} onClick={()=>toggleMonth(i)}
              style={{padding:"6px",borderRadius:6,border:months[i]?"1px solid #D4A853":"1px solid rgba(255,255,255,0.1)",
                background:months[i]?"rgba(212,168,83,0.15)":"transparent",color:months[i]?"#D4A853":"#555",
                fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}
            >{m}</button>
          ))}
        </div>

        <div style={{display:"flex",gap:10}}>
          <button onClick={onClose} style={{flex:1,padding:"10px",borderRadius:8,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"#888",fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Cancel</button>
          <button onClick={submit} style={{flex:1,padding:"10px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#D4A853,#B8860B)",color:"#0f0f23",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Add Expense</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  MAIN TRACKER APP
// ═══════════════════════════════════════════════
function TrackerApp({ user, initialData, onSave, onLogout }) {
  const [state, setState] = useState(initialData);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [syncStatus, setSyncStatus] = useState("saved"); // saved | saving | error
  const saveTimer = useRef(null);

  // Deep clone + update helper
  const update = useCallback((fn) => {
    setState(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      fn(copy);
      return copy;
    });
  }, []);

  // Auto-save on state change (debounced)
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSyncStatus("saving");
      saveLocal(state); // Always save locally too
      try {
        await onSave(state);
        setSyncStatus("saved");
      } catch (e) {
        console.error("Sync error:", e);
        setSyncStatus("error");
      }
    }, 1000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [state, onSave]);

  // Derived values
  const bills = state.bills[currentMonth] || [];
  const totalIncome = state.income.reduce((s, i) => s + (i.amount || 0), 0);
  const totalBudgeted = bills.reduce((s, b) => s + (b.budgeted || 0), 0);
  const totalActual = bills.reduce((s, b) => s + (b.actual || 0), 0);
  const remaining = totalIncome - totalActual;
  const totalSaved = state.savings.reduce((s, v) => s + (v || 0), 0);
  const score = state.creditScores[currentMonth] || 0;
  const paidCount = bills.filter(b => b.status === "paid").length;
  const currentMilestone = [...MILESTONES].reverse().find(m => score >= m.score);

  const addExpense = ({ name, type, months: selectedMonths }) => {
    update(s => {
      selectedMonths.forEach((on, m) => {
        if (on) s.bills[m].push({ name, type, budgeted: 0, actual: 0, dueDay: 1, status: "unpaid" });
      });
    });
  };

  const removeExpense = (idx) => {
    update(s => { s.bills[currentMonth].splice(idx, 1); });
  };

  const cycleStatus = (i) => {
    update(s => {
      const cur = s.bills[currentMonth][i].status;
      s.bills[currentMonth][i].status = STATUSES[(STATUSES.indexOf(cur) + 1) % STATUSES.length];
    });
  };

  // Print Report
  const printReport = () => {
    const totalBud = bills.reduce((s,b) => s+(b.budgeted||0), 0);
    const totalAct = bills.reduce((s,b) => s+(b.actual||0), 0);
    const sc = state.creditScores[currentMonth] || "Not entered";
    const saved = state.savings[currentMonth] || 0;
    const totalSavedAll = state.savings.reduce((s,v) => s+(v||0), 0);

    const w = window.open('','','width=800,height=900');
    w.document.write(`<!DOCTYPE html><html><head><title>Credit Comeback Report - ${MONTHS[currentMonth]}</title>
    <style>body{font-family:Georgia,serif;padding:40px;color:#222;max-width:700px;margin:0 auto;}
    h1{color:#B8860B;border-bottom:2px solid #B8860B;padding-bottom:8px;}
    h2{color:#B8860B;margin-top:28px;font-size:18px;}
    table{width:100%;border-collapse:collapse;margin:12px 0;}
    th,td{padding:8px 12px;border:1px solid #ddd;text-align:right;font-size:13px;}
    th{background:#f5f0e0;text-align:left;font-weight:bold;}
    td:first-child{text-align:left;}
    .summary{display:flex;justify-content:space-between;gap:20px;margin:16px 0;}
    .summary div{flex:1;padding:16px;background:#f9f6ee;border-radius:8px;text-align:center;}
    .summary .label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;}
    .summary .value{font-size:22px;font-weight:bold;color:#B8860B;margin-top:4px;}
    .green{color:#228B22;} .red{color:#DC143C;}
    .footer{margin-top:40px;text-align:center;font-size:11px;color:#999;border-top:1px solid #ddd;padding-top:16px;}
    @media print{body{padding:20px;}}
    </style></head><body>
    <h1>The Credit Comeback Tracker</h1>
    <p style="color:#888;font-style:italic;">Monthly Report — ${MONTHS[currentMonth]} ${new Date().getFullYear()}</p>
    <div class="summary">
      <div><div class="label">Monthly Income</div><div class="value">${fmt(totalIncome)}</div></div>
      <div><div class="label">Total Spent</div><div class="value">${fmt(totalAct)}</div></div>
      <div><div class="label">Remaining</div><div class="value" style="color:${totalIncome-totalAct>=0?'#228B22':'#DC143C'}">${totalIncome-totalAct>=0?'+':''}${(totalIncome-totalAct).toFixed(2)}</div></div>
    </div>
    <h2>Bills & Budget</h2>
    <table><thead><tr><th>Expense</th><th>Type</th><th>Budgeted</th><th>Actual</th><th>Diff</th><th>Status</th></tr></thead><tbody>
    ${bills.map(b => { const d=(b.budgeted||0)-(b.actual||0); return `<tr><td>${b.name}</td><td>${b.type}</td><td>${fmt(b.budgeted)}</td><td>${fmt(b.actual)}</td><td class="${d>=0?'green':'red'}">${d>=0?'+':''}${d.toFixed(2)}</td><td>${STATUS_LABELS[b.status]}</td></tr>`; }).join('')}
    <tr style="font-weight:bold;background:#f5f0e0;"><td>TOTALS</td><td></td><td>${fmt(totalBud)}</td><td>${fmt(totalAct)}</td><td class="${totalBud-totalAct>=0?'green':'red'}">${(totalBud-totalAct>=0?'+':'')}${(totalBud-totalAct).toFixed(2)}</td><td></td></tr>
    </tbody></table>
    <div class="summary">
      <div><div class="label">Credit Score</div><div class="value">${sc}</div></div>
      <div><div class="label">Saved This Month</div><div class="value">${fmt(saved)}</div></div>
      <div><div class="label">Total Saved (YTD)</div><div class="value">${fmt(totalSavedAll)} / $20,000</div></div>
    </div>
    <div class="footer">The Credit Comeback Tracker · Powered by CARES Workflows / Kari Hoglund Kounkel<br/>Now go be brilliant.</div>
    </body></html>`);
    w.document.close();
    w.print();
  };

  // ─── RENDER ───
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0f0f23 0%,#1a1a2e 40%,#16213e 100%)",fontFamily:"'DM Sans',sans-serif",color:"#e0e0e0"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet"/>

      {/* SYNC STATUS BAR */}
      <div style={{background:syncStatus==="saving"?"rgba(212,168,83,0.15)":syncStatus==="error"?"rgba(220,20,60,0.15)":"rgba(34,197,94,0.08)",
        padding:"4px 20px",textAlign:"center",fontSize:11,color:syncStatus==="saving"?"#D4A853":syncStatus==="error"?"#DC143C":"#22c55e",
        borderBottom:"1px solid rgba(255,255,255,0.05)",transition:"all 0.3s"}}>
        {syncStatus === "saving" ? "☁️ Saving..." : syncStatus === "error" ? "⚠️ Sync error — data saved locally" : "☁️ Synced to your account"}
      </div>

      {/* HEADER */}
      <div style={{background:"linear-gradient(135deg,rgba(212,168,83,0.12) 0%,rgba(212,168,83,0.03) 100%)",borderBottom:"1px solid rgba(212,168,83,0.2)",padding:"24px 20px 16px"}}>
        <div style={{maxWidth:960,margin:"0 auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
            <div>
              <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:800,color:"#D4A853",margin:0,letterSpacing:"-0.5px"}}>The Credit Comeback Tracker</h1>
              <p style={{color:"#8a8a8a",fontSize:12,margin:"2px 0 0",fontStyle:"italic"}}>Budget · Pay · Save · Rebuild — One month at a time.</p>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:10,color:"#666",letterSpacing:1,textTransform:"uppercase"}}>Save $20K Goal</div>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:20,color:totalSaved>=SAVINGS_GOAL?"#22c55e":"#D4A853",fontWeight:700}}>{fmt(totalSaved)} <span style={{fontSize:12,color:"#666"}}>/ $20,000</span></div>
              <div style={{marginTop:6,width:200,marginLeft:"auto"}}><ProgressBar current={totalSaved} goal={SAVINGS_GOAL} color="#22c55e"/></div>
              <button onClick={onLogout} style={{marginTop:8,padding:"4px 12px",borderRadius:6,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"#666",fontSize:11,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                Sign Out
              </button>
            </div>
          </div>

          {/* Months */}
          <div style={{display:"flex",gap:4,marginTop:16,flexWrap:"wrap"}}>
            {MONTHS.map((m,i) => (
              <button key={m} onClick={() => setCurrentMonth(i)} style={{padding:"5px 10px",borderRadius:8,border:currentMonth===i?"1px solid #D4A853":"1px solid rgba(255,255,255,0.06)",background:currentMonth===i?"rgba(212,168,83,0.2)":"rgba(255,255,255,0.03)",color:currentMonth===i?"#D4A853":"#777",fontSize:12,fontWeight:currentMonth===i?700:500,cursor:"pointer",transition:"all 0.2s",fontFamily:"'DM Sans',sans-serif"}}>{m}</button>
            ))}
          </div>

          {/* Tabs */}
          <div style={{display:"flex",gap:4,marginTop:12,borderBottom:"1px solid rgba(255,255,255,0.06)",overflowX:"auto"}}>
            {[["dashboard","📊","Dashboard"],["bills","📋","Bills & Budget"],["credit","⭐","Credit Score"],["savings","🏦","Savings"]].map(([id,icon,label]) => (
              <button key={id} onClick={() => setActiveTab(id)} style={{padding:"8px 16px",border:"none",borderBottom:activeTab===id?"2px solid #D4A853":"2px solid transparent",background:"transparent",color:activeTab===id?"#D4A853":"#777",fontSize:13,fontWeight:activeTab===id?600:400,cursor:"pointer",transition:"all 0.2s",fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}>{icon} {label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{maxWidth:960,margin:"0 auto",padding:20}}>

        {/* ─── DASHBOARD TAB ─── */}
        {activeTab === "dashboard" && <>
          {/* Stats Row */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:20}}>
            {[
              {label:"Monthly Income",value:fmt(totalIncome),color:"#D4A853"},
              {label:"Total Budgeted",value:fmt(totalBudgeted),color:"#888"},
              {label:"Total Spent",value:fmt(totalActual),color:"#e0e0e0"},
              {label:"Remaining",value:`${remaining>=0?"+":"−"}${fmt(Math.abs(remaining))}`,color:remaining>=0?"#22c55e":"#DC143C"},
            ].map(s => (
              <div key={s.label} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:16,textAlign:"center"}}>
                <div style={{fontSize:10,color:"#666",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>{s.label}</div>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:20,fontWeight:700,color:s.color}}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Income Section */}
          <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:20,marginBottom:16}}>
            <h3 style={{color:"#D4A853",fontSize:14,fontWeight:700,margin:"0 0 12px",textTransform:"uppercase",letterSpacing:1}}>💰 Income Sources</h3>
            {state.income.map((src, i) => (
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<state.income.length-1?"1px solid rgba(255,255,255,0.04)":"none"}}>
                <input value={src.name} onChange={e => update(s => { s.income[i].name = e.target.value; })}
                  style={{background:"transparent",border:"none",color:"#e0e0e0",fontSize:14,fontFamily:"'DM Sans',sans-serif",outline:"none",flex:1}}
                />
                <NumCell value={src.amount} onChange={v => update(s => { s.income[i].amount = v; })} />
              </div>
            ))}
            <button onClick={() => update(s => { s.income.push({name:"New Source",amount:0}); })}
              style={{marginTop:8,padding:"6px 16px",borderRadius:8,border:"1px dashed rgba(212,168,83,0.3)",background:"transparent",color:"#D4A853",fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
              + Add Income Source
            </button>
          </div>

          {/* Payment Status Grid */}
          <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:20}}>
            <h3 style={{color:"#D4A853",fontSize:14,fontWeight:700,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:1}}>📋 {MONTHS[currentMonth]} Payment Status</h3>
            <p style={{color:"#666",fontSize:12,margin:"0 0 12px"}}>Tap status to cycle: Unpaid → Upcoming → Partial → Paid</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8}}>
              {bills.map((b, i) => (
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:"rgba(255,255,255,0.02)",borderRadius:8,border:"1px solid rgba(255,255,255,0.04)"}}>
                  <span style={{fontSize:13,color:"#ccc",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,marginRight:8}}>{b.name}</span>
                  <span onClick={() => cycleStatus(i)}
                    style={{padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,cursor:"pointer",
                      background:`${STATUS_COLORS[b.status]}22`,color:STATUS_COLORS[b.status],border:`1px solid ${STATUS_COLORS[b.status]}44`,
                      whiteSpace:"nowrap",transition:"all 0.2s"}}>
                    {STATUS_LABELS[b.status]}
                  </span>
                </div>
              ))}
            </div>
            <div style={{marginTop:12,fontSize:13,color:"#888"}}>
              {paidCount} of {bills.length} paid{paidCount === bills.length && bills.length > 0 ? " — 🎉 All bills paid this month!" : ""}
            </div>
          </div>

          <SidebarNote>
            The dashboard is your cockpit. Not the kind where you white-knuckle the controls — the kind where you sip your coffee and watch the gauges move in the right direction. If the "Remaining" number is green, you're winning. If it's red, you're not broken — you're informed. And informed is the first step out of chaos.
          </SidebarNote>
        </>}

        {/* ─── BILLS TAB ─── */}
        {activeTab === "bills" && <>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
            <h2 style={{color:"#D4A853",fontFamily:"'Playfair Display',serif",fontSize:20,margin:0}}>{MONTHS[currentMonth]} — Bills & Budget</h2>
            <button onClick={() => setShowAddExpense(true)}
              style={{padding:"8px 20px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#D4A853,#B8860B)",color:"#0f0f23",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
              + Add Expense
            </button>
          </div>

          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr>
                  {["Expense","Type","Due","Budgeted","Actual","Diff","Status",""].map(h => (
                    <th key={h} style={{padding:"10px 12px",textAlign:h==="Expense"?"left":"right",fontSize:11,color:"#888",textTransform:"uppercase",letterSpacing:1,borderBottom:"1px solid rgba(255,255,255,0.08)",fontWeight:600}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bills.map((b, i) => {
                  const diff = (b.budgeted||0) - (b.actual||0);
                  return (
                    <tr key={i} style={{borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                      <td style={{padding:"10px 12px",fontSize:13,color:"#e0e0e0"}}>{b.name}</td>
                      <td style={{padding:"10px 12px",textAlign:"right"}}>
                        <span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:600,textTransform:"uppercase",
                          background:b.type==="fixed"?"rgba(100,149,237,0.15)":b.type==="debt"?"rgba(220,20,60,0.15)":"rgba(34,197,94,0.15)",
                          color:b.type==="fixed"?"#6495ED":b.type==="debt"?"#DC143C":"#22c55e"}}>{b.type}</span>
                      </td>
                      <td style={{padding:"10px 12px",textAlign:"right"}}>
                        <NumCell value={b.dueDay} onChange={v => update(s => { s.bills[currentMonth][i].dueDay = v; })} />
                      </td>
                      <td style={{padding:"10px 12px",textAlign:"right"}}>
                        <NumCell value={b.budgeted} onChange={v => update(s => { s.bills[currentMonth][i].budgeted = v; })} />
                      </td>
                      <td style={{padding:"10px 12px",textAlign:"right"}}>
                        <NumCell value={b.actual} onChange={v => update(s => { s.bills[currentMonth][i].actual = v; })} />
                      </td>
                      <td style={{padding:"10px 12px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:13,color:diff>=0?"#22c55e":"#DC143C"}}>
                        {diff >= 0 ? "+" : "−"}{fmt(Math.abs(diff))}
                      </td>
                      <td style={{padding:"10px 12px",textAlign:"right"}}>
                        <span onClick={() => cycleStatus(i)}
                          style={{padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,cursor:"pointer",
                            background:`${STATUS_COLORS[b.status]}22`,color:STATUS_COLORS[b.status],border:`1px solid ${STATUS_COLORS[b.status]}44`}}>
                          {STATUS_LABELS[b.status]}
                        </span>
                      </td>
                      <td style={{padding:"10px 12px",textAlign:"right"}}>
                        <span onClick={() => { if(confirm(`Remove "${b.name}"?`)) removeExpense(i); }}
                          style={{cursor:"pointer",color:"#555",fontSize:14,padding:"2px 6px",borderRadius:4}}
                          onMouseEnter={e=>e.target.style.color="#DC143C"} onMouseLeave={e=>e.target.style.color="#555"}>✕</span>
                      </td>
                    </tr>
                  );
                })}
                {/* Totals row */}
                <tr style={{borderTop:"2px solid rgba(212,168,83,0.3)"}}>
                  <td style={{padding:"12px",fontSize:13,fontWeight:700,color:"#D4A853"}} colSpan={3}>TOTALS</td>
                  <td style={{padding:"12px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:700,color:"#D4A853"}}>{fmt(totalBudgeted)}</td>
                  <td style={{padding:"12px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:700,color:"#e0e0e0"}}>{fmt(totalActual)}</td>
                  <td style={{padding:"12px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:700,color:totalBudgeted-totalActual>=0?"#22c55e":"#DC143C"}}>
                    {totalBudgeted-totalActual>=0?"+":"−"}{fmt(Math.abs(totalBudgeted-totalActual))}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tbody>
            </table>
          </div>

          <SidebarNote>
            Your bills are not your enemy. They're the receipts of the life you're building. The budget column is your plan. The actual column is what happened. The difference between those two? That's where your power lives. Even $3 of awareness beats $300 of denial.
          </SidebarNote>
        </>}

        {/* ─── CREDIT SCORE TAB ─── */}
        {activeTab === "credit" && <>
          <h2 style={{color:"#D4A853",fontFamily:"'Playfair Display',serif",fontSize:20,margin:"0 0 20px"}}>⭐ Credit Score Tracker</h2>

          {/* Current Score Card */}
          <div style={{background:"linear-gradient(135deg,rgba(212,168,83,0.12),rgba(212,168,83,0.03))",border:"1px solid rgba(212,168,83,0.2)",borderRadius:16,padding:28,textAlign:"center",marginBottom:20}}>
            <div style={{fontSize:11,color:"#888",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>{MONTHS[currentMonth]} Credit Score</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12}}>
              <NumCell value={score} onChange={v => update(s => { s.creditScores[currentMonth] = v; })} />
            </div>
            {currentMilestone && (
              <div style={{marginTop:12,fontSize:16}}>
                {currentMilestone.emoji} <span style={{color:"#D4A853",fontWeight:600}}>{currentMilestone.label}</span>
              </div>
            )}
          </div>

          {/* Milestones */}
          <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:20,marginBottom:20}}>
            <h3 style={{color:"#D4A853",fontSize:14,fontWeight:700,margin:"0 0 16px",textTransform:"uppercase",letterSpacing:1}}>🎯 Milestones</h3>
            {MILESTONES.map(m => (
              <div key={m.score} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",opacity:score>=m.score?1:0.4}}>
                <span style={{fontSize:20}}>{m.emoji}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:score>=m.score?"#e0e0e0":"#666"}}>{m.label}</div>
                  <ProgressBar current={Math.min(score, m.score)} goal={m.score} color={score>=m.score?"#22c55e":"#D4A853"} height={4}/>
                </div>
                <span style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:score>=m.score?"#22c55e":"#666"}}>{m.score}</span>
              </div>
            ))}
          </div>

          {/* Score History */}
          <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:20}}>
            <h3 style={{color:"#D4A853",fontSize:14,fontWeight:700,margin:"0 0 12px",textTransform:"uppercase",letterSpacing:1}}>📈 Score History</h3>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(80px,1fr))",gap:8}}>
              {MONTHS.map((m, i) => (
                <div key={m} style={{textAlign:"center",padding:8,borderRadius:8,background:i===currentMonth?"rgba(212,168,83,0.1)":"transparent",border:i===currentMonth?"1px solid rgba(212,168,83,0.2)":"1px solid transparent"}}>
                  <div style={{fontSize:11,color:"#888",marginBottom:4}}>{m}</div>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:16,fontWeight:700,color:state.creditScores[i]?"#e0e0e0":"#444"}}>
                    {state.creditScores[i] || "—"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <SidebarNote>
            Your credit score is not your identity. It's a number on a screen that changes when you change. Every on-time payment is a tiny act of defiance against the version of you that thought this couldn't be fixed. You're not climbing a ladder — you're building one. Rung by rung. Month by month.
          </SidebarNote>
        </>}

        {/* ─── SAVINGS TAB ─── */}
        {activeTab === "savings" && <>
          <h2 style={{color:"#D4A853",fontFamily:"'Playfair Display',serif",fontSize:20,margin:"0 0 20px"}}>🏦 Savings Tracker</h2>

          {/* Big Goal Card */}
          <div style={{background:"linear-gradient(135deg,rgba(34,197,94,0.12),rgba(34,197,94,0.03))",border:"1px solid rgba(34,197,94,0.2)",borderRadius:16,padding:28,textAlign:"center",marginBottom:20}}>
            <div style={{fontSize:11,color:"#888",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Total Saved</div>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:36,fontWeight:700,color:totalSaved>=SAVINGS_GOAL?"#22c55e":"#D4A853"}}>{fmt(totalSaved)}</div>
            <div style={{fontSize:13,color:"#666",marginBottom:12}}>of {fmt(SAVINGS_GOAL)} goal ({Math.round((totalSaved/SAVINGS_GOAL)*100)}%)</div>
            <div style={{maxWidth:400,margin:"0 auto"}}><ProgressBar current={totalSaved} goal={SAVINGS_GOAL} color="#22c55e" height={12}/></div>
          </div>

          {/* Monthly Savings Grid */}
          <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:20}}>
            <h3 style={{color:"#D4A853",fontSize:14,fontWeight:700,margin:"0 0 12px",textTransform:"uppercase",letterSpacing:1}}>Monthly Savings</h3>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:12}}>
              {MONTHS.map((m, i) => (
                <div key={m} style={{padding:12,borderRadius:10,background:i===currentMonth?"rgba(212,168,83,0.1)":"rgba(255,255,255,0.02)",border:i===currentMonth?"1px solid rgba(212,168,83,0.2)":"1px solid rgba(255,255,255,0.04)",textAlign:"center"}}>
                  <div style={{fontSize:12,color:i===currentMonth?"#D4A853":"#888",fontWeight:i===currentMonth?700:400,marginBottom:6}}>{m}</div>
                  <NumCell value={state.savings[i]} onChange={v => update(s => { s.savings[i] = v; })} />
                </div>
              ))}
            </div>
          </div>

          <SidebarNote>
            Savings doesn't start with a windfall. It starts with the $13 you didn't spend at the drive-through. It shows up in the $47 you didn't spend on things that don't love you back. Enter what you saved each month. Watch the green bar move. That bar is your future arguing with your past — and winning.
          </SidebarNote>
        </>}

        {/* Footer */}
        <div style={{marginTop:40,textAlign:"center",padding:20,borderTop:"1px solid rgba(255,255,255,0.06)"}}>
          <button onClick={printReport} style={{padding:"10px 24px",borderRadius:8,border:"1px solid rgba(212,168,83,0.3)",background:"rgba(212,168,83,0.1)",color:"#D4A853",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",marginBottom:16}}>🖨️ Print {MONTHS[currentMonth]} Report</button>
          <div style={{fontFamily:"'Playfair Display',serif",color:"#D4A853",fontSize:14,marginBottom:4}}>The Credit Comeback Tracker</div>
          <div style={{fontSize:12,color:"#555"}}>Powered by CARES Workflows / Kari Hoglund Kounkel</div>
          <div style={{marginTop:8,fontStyle:"italic",color:"#777",fontSize:12}}>Now go be brilliant.</div>
        </div>
      </div>

      {showAddExpense && <AddExpenseModal onClose={() => setShowAddExpense(false)} onAdd={addExpense} />}
    </div>
  );
}

// ═══════════════════════════════════════════════
//  ROOT APP — Auth wrapper
// ═══════════════════════════════════════════════
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trackerData, setTrackerData] = useState(null);

  // Check for existing session on mount
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await handleUserReady(session.user);
      }
      setLoading(false);
    };

    init();

    // Listen for auth state changes (handles email confirmation redirects, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        await handleUserReady(session.user);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setTrackerData(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUserReady = async (authUser) => {
    setUser(authUser);
    setLoading(true);

    // 1. Try loading from cloud
    let cloudData = await loadFromCloud(authUser.id);

    // 2. Check for localStorage migration
    const localData = loadLocal();
    const localHasData = hasLocalData();

    if (!cloudData && localHasData) {
      // First login with existing local data → migrate to cloud
      cloudData = localData;
      await saveToCloud(authUser.id, cloudData);
      // Clear the migration flag (but keep local as backup)
    } else if (!cloudData) {
      // Brand new user, no data anywhere
      cloudData = makeDefault();
      await saveToCloud(authUser.id, cloudData);
    }

    setTrackerData(cloudData);
    saveLocal(cloudData); // Keep local in sync as backup
    setLoading(false);
  };

  const handleSave = useCallback(async (data) => {
    if (user) {
      await saveToCloud(user.id, data);
    }
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setTrackerData(null);
  };

  const handleAuth = async (authUser) => {
    await handleUserReady(authUser);
  };

  // Loading screen
  if (loading) {
    return (
      <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0f0f23 0%,#1a1a2e 40%,#16213e 100%)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif"}}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet"/>
        <div style={{textAlign:"center"}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:"#D4A853",marginBottom:12}}>The Credit Comeback Tracker</div>
          <div style={{color:"#888",fontSize:14}}>Loading your data...</div>
        </div>
      </div>
    );
  }

  // Not logged in → show auth screen
  if (!user || !trackerData) {
    return <AuthScreen onAuth={handleAuth} />;
  }

  // Logged in → show tracker
  return <TrackerApp user={user} initialData={trackerData} onSave={handleSave} onLogout={handleLogout} />;
}
