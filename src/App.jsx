import { useState, useEffect, useCallback } from "react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const STATUSES = ["unpaid","upcoming","partial","paid"];
const STATUS_LABELS = {unpaid:"Unpaid",upcoming:"Upcoming",partial:"Partial",paid:"Paid ✓"};
const STATUS_COLORS = {
  unpaid: {bg:"rgba(239,68,68,0.15)",text:"#ef4444",border:"rgba(239,68,68,0.2)"},
  upcoming: {bg:"rgba(212,168,83,0.15)",text:"#D4A853",border:"rgba(212,168,83,0.2)"},
  partial: {bg:"rgba(168,85,247,0.15)",text:"#a855f7",border:"rgba(168,85,247,0.2)"},
  paid: {bg:"rgba(34,197,94,0.15)",text:"#22c55e",border:"rgba(34,197,94,0.2)"},
};
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

function makeDefault() {
  const bills = {};
  for (let m = 0; m < 12; m++) bills[m] = DEFAULT_CATS.map(c => ({...c,budgeted:0,actual:0,dueDay:1,status:"unpaid"}));
  return { income:[{name:"Primary Job",amount:0},{name:"Side Income",amount:0}], bills, creditScores:Array(12).fill(0), savings:Array(12).fill(0) };
}

function loadState() {
  try { const s = localStorage.getItem("creditComebackTracker_v1"); if (s) return JSON.parse(s); } catch(e) {}
  return makeDefault();
}

function fmt(n) { return "$" + Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}); }

// Editable number cell
function NumCell({ value, onChange, prefix = "$" }) {
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
    >{value ? `${prefix}${value.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}` : "—"}</span>
  );
}

// Editable name
function NameCell({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(value);
  useEffect(() => setTemp(value), [value]);
  if (editing) return (
    <input autoFocus value={temp}
      onChange={e => setTemp(e.target.value)}
      onBlur={() => { setEditing(false); onChange(temp); }}
      onKeyDown={e => { if(e.key==="Enter"){setEditing(false);onChange(temp);} }}
      style={{padding:"4px 8px",background:"#0f0f23",border:"1px solid #D4A853",borderRadius:4,color:"#e0e0e0",fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif",width:160}}
    />
  );
  return <span onClick={() => setEditing(true)} style={{cursor:"pointer",borderBottom:"1px dashed rgba(255,255,255,0.15)"}}>{value}</span>;
}

function StatusBadge({ status, onClick }) {
  const c = STATUS_COLORS[status]||STATUS_COLORS.unpaid;
  return <button onClick={onClick} style={{padding:"3px 10px",borderRadius:20,background:c.bg,color:c.text,border:`1px solid ${c.border}`,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",letterSpacing:"0.3px"}}>{STATUS_LABELS[status]}</button>;
}

function ProgressBar({ current, goal, color = "#D4A853", height = 12 }) {
  const pct = Math.min((current/goal)*100, 100);
  return (
    <div style={{width:"100%",background:"rgba(255,255,255,0.05)",borderRadius:height,height,overflow:"hidden",position:"relative"}}>
      <div style={{width:`${pct}%`,height:"100%",background:`linear-gradient(90deg,${color},${color}cc)`,borderRadius:height,transition:"width 0.6s ease"}} />
    </div>
  );
}

function SidebarNote({ children }) {
  return (
    <div style={{marginTop:16,padding:"14px 18px",background:"linear-gradient(135deg,rgba(212,168,83,0.08),rgba(212,168,83,0.02))",borderLeft:"3px solid #D4A853",borderRadius:"0 8px 8px 0",fontSize:13,color:"#aaa",fontStyle:"italic"}}>
      <strong style={{color:"#D4A853"}}>Sidebar Note from Kari:</strong> {children}
    </div>
  );
}

function Card({ children, style }) {
  return <div style={{background:"#1a1a2e",borderRadius:12,padding:20,border:"1px solid rgba(212,168,83,0.15)",marginBottom:16,...style}}>{children}</div>;
}

// Add Expense Modal
function AddExpenseModal({ onAdd, onClose, currentMonth }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("variable");
  const [frequency, setFrequency] = useState("every");
  const [selectedMonths, setSelectedMonths] = useState(Array(12).fill(false));
  const [dueDay, setDueDay] = useState(1);
  const [budgeted, setBudgeted] = useState("");

  const toggleMonth = (i) => { const m = [...selectedMonths]; m[i]=!m[i]; setSelectedMonths(m); };

  const handleAdd = () => {
    if (!name.trim()) return;
    let months = [];
    if (frequency === "every") months = [0,1,2,3,4,5,6,7,8,9,10,11];
    else if (frequency === "this") months = [currentMonth];
    else months = selectedMonths.map((v,i) => v?i:-1).filter(i=>i>=0);
    onAdd({ name: name.trim(), type, dueDay: parseInt(dueDay)||1, budgeted: parseFloat(budgeted)||0, months });
  };

  const overlay = {position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20};
  const modal = {background:"#1a1a2e",borderRadius:16,padding:28,border:"1px solid rgba(212,168,83,0.3)",maxWidth:440,width:"100%",maxHeight:"90vh",overflowY:"auto"};
  const label = {fontSize:11,color:"#888",textTransform:"uppercase",letterSpacing:1,marginBottom:6,display:"block"};
  const input = {width:"100%",padding:"8px 12px",background:"#0f0f23",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,color:"#e0e0e0",fontFamily:"'DM Sans',sans-serif",fontSize:14,outline:"none",marginBottom:16};
  const radioRow = {display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"};
  const radioBtn = (active) => ({padding:"6px 14px",borderRadius:8,border:active?"1px solid #D4A853":"1px solid rgba(255,255,255,0.1)",background:active?"rgba(212,168,83,0.2)":"rgba(255,255,255,0.03)",color:active?"#D4A853":"#888",fontSize:12,fontWeight:active?700:500,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"});
  const monthBtn = (active) => ({padding:"4px 8px",borderRadius:6,border:active?"1px solid #D4A853":"1px solid rgba(255,255,255,0.08)",background:active?"rgba(212,168,83,0.2)":"rgba(255,255,255,0.03)",color:active?"#D4A853":"#666",fontSize:11,fontWeight:active?700:500,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"});

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <h3 style={{margin:"0 0 20px",fontSize:18,color:"#D4A853",fontFamily:"'Playfair Display',serif"}}>Add Expense</h3>

        <label style={label}>Expense Name</label>
        <input style={input} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Car Insurance" autoFocus/>

        <label style={label}>Type</label>
        <div style={radioRow}>
          {[["fixed","Fixed"],["variable","Variable"],["debt","Debt"]].map(([v,l]) => (
            <button key={v} style={radioBtn(type===v)} onClick={() => setType(v)}>{l}</button>
          ))}
        </div>

        <label style={label}>Due Day of Month</label>
        <input style={{...input,width:80}} type="number" value={dueDay} onChange={e => setDueDay(e.target.value)} min={1} max={31}/>

        <label style={label}>Budgeted Amount</label>
        <input style={{...input,width:120}} type="number" value={budgeted} onChange={e => setBudgeted(e.target.value)} placeholder="0.00"/>

        <label style={label}>How Often?</label>
        <div style={radioRow}>
          {[["every","Every Month"],["this","Just "+MONTHS[currentMonth]],["select","Select Months"]].map(([v,l]) => (
            <button key={v} style={radioBtn(frequency===v)} onClick={() => setFrequency(v)}>{l}</button>
          ))}
        </div>

        {frequency === "select" && (
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:16}}>
            {MONTHS.map((m,i) => (
              <button key={m} style={monthBtn(selectedMonths[i])} onClick={() => toggleMonth(i)}>{m}</button>
            ))}
          </div>
        )}

        <div style={{display:"flex",gap:12,marginTop:8}}>
          <button onClick={onClose} style={{flex:1,padding:"10px 16px",borderRadius:8,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"#888",fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Cancel</button>
          <button onClick={handleAdd} style={{flex:1,padding:"10px 16px",borderRadius:8,border:"1px solid #D4A853",background:"rgba(212,168,83,0.2)",color:"#D4A853",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Add Expense</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState(loadState);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showAddModal, setShowAddModal] = useState(false);

  const save = useCallback((newState) => {
    setState(newState);
    localStorage.setItem("creditComebackTracker_v1", JSON.stringify(newState));
  }, []);

  const update = (fn) => { const s = {...state}; fn(s); save(s); };

  const handleAddExpense = ({ name, type, dueDay, budgeted, months }) => {
    update(s => {
      months.forEach(m => {
        s.bills[m].push({ name, type, budgeted, actual: 0, dueDay, status: "unpaid" });
      });
    });
    setShowAddModal(false);
  };

  // Computed
  const totalIncome = state.income.reduce((s,i) => s+(i.amount||0), 0);
  const bills = state.bills[currentMonth] || [];
  const totalBudgeted = bills.reduce((s,b) => s+(b.budgeted||0), 0);
  const totalActual = bills.reduce((s,b) => s+(b.actual||0), 0);
  const remaining = totalIncome - totalActual;
  const totalSaved = state.savings.reduce((s,v) => s+(v||0), 0);
  const curScore = state.creditScores[currentMonth] || 0;

  const printReport = () => {
    const bills = state.bills[currentMonth] || [];
    const totalBud = bills.reduce((s,b) => s+(b.budgeted||0), 0);
    const totalAct = bills.reduce((s,b) => s+(b.actual||0), 0);
    const score = state.creditScores[currentMonth] || "Not entered";
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
      <div><div class="label">Remaining</div><div class="value" style="color:${totalIncome-totalAct>=0?'#228B22':'#DC143C'}">${fmt(totalIncome-totalAct)}</div></div>
    </div>
    <h2>Bills & Expenses</h2>
    <table><thead><tr><th>Expense</th><th>Type</th><th>Budgeted</th><th>Actual</th><th>Diff</th><th>Status</th></tr></thead><tbody>
    ${bills.map(b => {const d=(b.budgeted||0)-(b.actual||0); return `<tr><td>${b.name}</td><td>${b.type}</td><td>${fmt(b.budgeted)}</td><td>${fmt(b.actual)}</td><td class="${d>=0?'green':'red'}">${d>=0?'+':''}${d.toFixed(2)}</td><td>${STATUS_LABELS[b.status]}</td></tr>`;}).join('')}
    <tr style="font-weight:bold;background:#f5f0e0;"><td>TOTALS</td><td></td><td>${fmt(totalBud)}</td><td>${fmt(totalAct)}</td><td class="${totalBud-totalAct>=0?'green':'red'}">${(totalBud-totalAct>=0?'+':'')}${(totalBud-totalAct).toFixed(2)}</td><td></td></tr>
    </tbody></table>
    <div class="summary">
      <div><div class="label">Credit Score</div><div class="value">${score}</div></div>
      <div><div class="label">Saved This Month</div><div class="value">${fmt(saved)}</div></div>
      <div><div class="label">Total Saved (YTD)</div><div class="value">${fmt(totalSavedAll)} / $20,000</div></div>
    </div>
    <div class="footer">The Credit Comeback Tracker · Powered by CARES Workflows / Kari Hoglund Kounkel<br/>Now go be brilliant.</div>
    </body></html>`);
    w.document.close();
    w.print();
  };

  const cycleStatus = (i) => update(s => { s.bills[currentMonth][i].status = STATUSES[(STATUSES.indexOf(s.bills[currentMonth][i].status)+1)%STATUSES.length]; });

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0f0f23 0%,#1a1a2e 40%,#16213e 100%)",fontFamily:"'DM Sans',sans-serif",color:"#e0e0e0"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet"/>

      {/* BETA BANNER */}
      <div style={{background:"linear-gradient(90deg,rgba(212,168,83,0.2),rgba(212,168,83,0.1))",padding:"8px 20px",textAlign:"center",fontSize:12,color:"#D4A853",borderBottom:"1px solid rgba(212,168,83,0.2)"}}>
        🧪 <strong>Beta Preview</strong> — Your data saves to this browser. Don't clear your history or you'll lose it! Full accounts coming soon.
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
              <button key={id} onClick={() => setActiveTab(id)} style={{padding:"8px 16px",border:"none",borderBottom:activeTab===id?"3px solid #D4A853":"3px solid transparent",background:activeTab===id?"rgba(212,168,83,0.1)":"transparent",color:activeTab===id?"#D4A853":"#8a8a8a",fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:activeTab===id?700:500,cursor:"pointer",display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap"}}>{icon} {label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{maxWidth:960,margin:"0 auto",padding:"20px 20px 60px"}}>

        {/* ===== DASHBOARD ===== */}
        {activeTab === "dashboard" && <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:16}}>
            {[{l:"Monthly Income",v:totalIncome,c:"#22c55e"},{l:"Total Budgeted",v:totalBudgeted,c:"#D4A853"},{l:"Actually Spent",v:totalActual,c:totalActual>totalBudgeted?"#ef4444":"#D4A853"},{l:"Remaining",v:remaining,c:remaining>=0?"#22c55e":"#ef4444"}].map((s,i) => (
              <Card key={i} style={{textAlign:"center",marginBottom:0}}>
                <div style={{fontSize:10,color:"#666",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>{s.l}</div>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:22,color:s.c,fontWeight:700}}>{fmt(s.v)}{s.l==="Remaining"&&s.v<0&&<span style={{fontSize:12,color:"#ef4444"}}> (over)</span>}</div>
              </Card>
            ))}
          </div>

          <Card>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h3 style={{margin:0,fontSize:16,color:"#D4A853",fontFamily:"'Playfair Display',serif"}}>Income Sources</h3>
              <button onClick={() => update(s => s.income.push({name:"New Source",amount:0}))} style={{padding:"4px 12px",borderRadius:6,border:"1px solid rgba(212,168,83,0.3)",background:"transparent",color:"#D4A853",fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>+ Add Source</button>
            </div>
            {state.income.map((src,i) => (
              <div key={i} style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
                <input value={src.name} onChange={e => update(s => {s.income[i].name=e.target.value;})} style={{flex:1,padding:"6px 10px",background:"#0f0f23",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,color:"#e0e0e0",fontFamily:"'DM Sans',sans-serif",fontSize:13,outline:"none"}}/>
                <NumCell value={src.amount} onChange={v => update(s => {s.income[i].amount=v;})}/>
              </div>
            ))}
          </Card>

          <Card>
            <h3 style={{margin:"0 0 16px",fontSize:16,color:"#D4A853",fontFamily:"'Playfair Display',serif"}}>{MONTHS[currentMonth]} Payment Status</h3>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:8}}>
              {bills.map((b,i) => (
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:"rgba(255,255,255,0.02)",borderRadius:8,border:"1px solid rgba(255,255,255,0.04)"}}>
                  <span style={{fontSize:12,color:"#aaa"}}>{b.name}</span>
                  <StatusBadge status={b.status} onClick={() => cycleStatus(i)}/>
                </div>
              ))}
            </div>
          </Card>
          <SidebarNote>Click any status badge to cycle it through Unpaid → Upcoming → Partial → Paid. Watching those little badges turn green? That's dopamine you earned.</SidebarNote>
        </>}

        {/* ===== BILLS ===== */}
        {activeTab === "bills" && <>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <h3 style={{margin:0,fontSize:18,color:"#D4A853",fontFamily:"'Playfair Display',serif"}}>{MONTHS[currentMonth]} — Bills & Budget</h3>
            <button onClick={() => setShowAddModal(true)} style={{padding:"6px 16px",borderRadius:8,border:"1px solid rgba(212,168,83,0.3)",background:"rgba(212,168,83,0.1)",color:"#D4A853",fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600}}>+ Add Expense</button>
          </div>
          {showAddModal && <AddExpenseModal currentMonth={currentMonth} onAdd={handleAddExpense} onClose={() => setShowAddModal(false)}/>}
          <Card>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>
                  {["Expense","Type","Due Day","Budgeted","Actual","Diff","Status",""].map(h => (
                    <th key={h} style={{textAlign:h==="Expense"?"left":"right",padding:"8px 10px",fontSize:10,color:"#666",textTransform:"uppercase",letterSpacing:1,borderBottom:"1px solid rgba(255,255,255,0.06)",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {bills.map((b,i) => {
                    const diff = (b.budgeted||0)-(b.actual||0);
                    return (
                      <tr key={i} style={{borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
                        <td style={{padding:10,fontSize:13}}><NameCell value={b.name} onChange={v => update(s => {s.bills[currentMonth][i].name=v;})}/></td>
                        <td style={{textAlign:"right",padding:10}}><span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:b.type==="fixed"?"rgba(59,130,246,0.15)":b.type==="debt"?"rgba(239,68,68,0.15)":"rgba(168,85,247,0.15)",color:b.type==="fixed"?"#3b82f6":b.type==="debt"?"#ef4444":"#a855f7",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"}}>{b.type}</span></td>
                        <td style={{textAlign:"right",padding:10}}><NumCell value={b.dueDay} onChange={v => update(s => {s.bills[currentMonth][i].dueDay=v;})} prefix=""/></td>
                        <td style={{textAlign:"right",padding:10}}><NumCell value={b.budgeted} onChange={v => update(s => {s.bills[currentMonth][i].budgeted=v;})}/></td>
                        <td style={{textAlign:"right",padding:10}}><NumCell value={b.actual} onChange={v => update(s => {s.bills[currentMonth][i].actual=v;})}/></td>
                        <td style={{textAlign:"right",padding:10,fontFamily:"'DM Mono',monospace",fontSize:13}}><span style={{color:diff>=0?"#22c55e":"#ef4444"}}>{diff>=0?"+":""}{diff.toFixed(2)}</span></td>
                        <td style={{textAlign:"right",padding:10}}><StatusBadge status={b.status} onClick={() => cycleStatus(i)}/></td>
                        <td style={{textAlign:"right",padding:10}}><button onClick={() => update(s => { for(let m=0;m<12;m++) s.bills[m].splice(i,1); })} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:14}} title="Remove">✕</button></td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{borderTop:"2px solid rgba(212,168,83,0.2)"}}>
                    <td style={{padding:"12px 10px",fontWeight:700,color:"#D4A853"}}>TOTALS</td>
                    <td colSpan={2}></td>
                    <td style={{textAlign:"right",padding:"12px 10px",fontFamily:"'DM Mono',monospace",fontWeight:700,color:"#D4A853"}}>{fmt(totalBudgeted)}</td>
                    <td style={{textAlign:"right",padding:"12px 10px",fontFamily:"'DM Mono',monospace",fontWeight:700,color:"#D4A853"}}>{fmt(totalActual)}</td>
                    <td style={{textAlign:"right",padding:"12px 10px",fontFamily:"'DM Mono',monospace",fontWeight:700}}><span style={{color:totalBudgeted-totalActual>=0?"#22c55e":"#ef4444"}}>{(totalBudgeted-totalActual>=0?"+":"")}{(totalBudgeted-totalActual).toFixed(2)}</span></td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
          <SidebarNote>The "Diff" column is your truth-teller. Green means you came in under budget. Red means the month bit back. Neither is failure — both are data.</SidebarNote>
        </>}

        {/* ===== CREDIT ===== */}
        {activeTab === "credit" && <>
          <Card>
            <h3 style={{margin:"0 0 20px",fontSize:18,color:"#D4A853",fontFamily:"'Playfair Display',serif"}}>Credit Score Journey</h3>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(85px,1fr))",gap:8,marginBottom:20}}>
              {MONTHS.map((m,i) => (
                <div key={m} style={{textAlign:"center"}}>
                  <div style={{fontSize:10,color:"#666",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:4}}>{m}</div>
                  <input type="number" value={state.creditScores[i]||""} placeholder="—"
                    onChange={e => update(s => {s.creditScores[i]=parseInt(e.target.value)||0;})}
                    style={{width:60,padding:5,textAlign:"center",background:currentMonth===i?"rgba(212,168,83,0.15)":"#0f0f23",border:currentMonth===i?"1px solid #D4A853":"1px solid rgba(255,255,255,0.08)",borderRadius:8,color:"#e0e0e0",fontFamily:"'DM Mono',monospace",fontSize:14,outline:"none"}}/>
                </div>
              ))}
            </div>
            <div style={{display:"flex",alignItems:"flex-end",gap:6,height:120,marginBottom:20}}>
              {state.creditScores.map((score,i) => {
                const pct = score > 0 ? ((score-300)/(850-300))*100 : 0;
                const bg = currentMonth===i ? "linear-gradient(180deg,#D4A853,#b8922e)" : score>=700?"rgba(34,197,94,0.4)":score>=580?"rgba(212,168,83,0.3)":score>0?"rgba(239,68,68,0.3)":"rgba(255,255,255,0.03)";
                return (
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",height:"100%"}}>
                    <div style={{flex:1,width:"100%",display:"flex",alignItems:"flex-end"}}>
                      <div style={{width:"100%",height:`${Math.max(pct,2)}%`,background:bg,borderRadius:"4px 4px 0 0",transition:"height 0.4s ease"}}/>
                    </div>
                    <div style={{fontSize:9,color:"#666",marginTop:4}}>{MONTHS[i]}</div>
                  </div>
                );
              })}
            </div>
            {curScore > 0 && (() => {
              let cur=MILESTONES[0], next=MILESTONES[MILESTONES.length-1];
              for(const m of MILESTONES) if(curScore>=m.score) cur=m;
              for(const m of MILESTONES) if(curScore<m.score){next=m;break;}
              return (
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:16,background:"rgba(212,168,83,0.06)",borderRadius:10,border:"1px solid rgba(212,168,83,0.15)"}}>
                  <div>
                    <div style={{fontSize:11,color:"#666",textTransform:"uppercase",letterSpacing:1}}>Current Level</div>
                    <div style={{fontSize:18,marginTop:4}}>{cur.emoji} <span style={{color:"#D4A853",fontWeight:700}}>{cur.label}</span> <span style={{color:"#666",fontSize:14}}>({curScore})</span></div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:11,color:"#666",textTransform:"uppercase",letterSpacing:1}}>Next Milestone</div>
                    <div style={{fontSize:16,marginTop:4}}>{next.emoji} {next.label} <span style={{color:"#666",fontSize:13}}>({next.score-curScore} pts away)</span></div>
                  </div>
                </div>
              );
            })()}
          </Card>
          <SidebarNote>Your credit score is not your worth. It's just a number learning to behave. Enter your score each month and watch the chart grow. Even 5 points is a victory lap.</SidebarNote>
        </>}

        {/* ===== SAVINGS ===== */}
        {activeTab === "savings" && <>
          <Card>
            <h3 style={{margin:"0 0 20px",fontSize:18,color:"#D4A853",fontFamily:"'Playfair Display',serif"}}>Save $20,000 — The Comeback Fund</h3>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:12,marginBottom:20}}>
              {MONTHS.map((m,i) => {
                const cum = state.savings.slice(0,i+1).reduce((s,v) => s+(v||0), 0);
                return (
                  <div key={m} style={{padding:12,textAlign:"center",borderRadius:10,background:currentMonth===i?"rgba(212,168,83,0.1)":"rgba(255,255,255,0.02)",border:currentMonth===i?"1px solid rgba(212,168,83,0.3)":"1px solid rgba(255,255,255,0.04)"}}>
                    <div style={{fontSize:10,color:"#666",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>{m}</div>
                    <input type="number" value={state.savings[i]||""} placeholder="$0"
                      onChange={e => update(s => {s.savings[i]=parseFloat(e.target.value)||0;})}
                      style={{width:80,padding:5,textAlign:"center",background:"#0f0f23",border:"1px solid rgba(255,255,255,0.08)",borderRadius:6,color:"#22c55e",fontFamily:"'DM Mono',monospace",fontSize:14,outline:"none"}}/>
                    <div style={{fontSize:10,color:"#555",marginTop:6,fontFamily:"'DM Mono',monospace"}}>Total: {fmt(cum)}</div>
                  </div>
                );
              })}
            </div>
            <div style={{marginBottom:20}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontSize:13,color:"#aaa"}}>Progress to $20,000</span>
                <span style={{fontFamily:"'DM Mono',monospace",color:"#22c55e",fontWeight:700}}>{fmt(totalSaved)} ({((totalSaved/SAVINGS_GOAL)*100).toFixed(1)}%)</span>
              </div>
              <ProgressBar current={totalSaved} goal={SAVINGS_GOAL} color="#22c55e" height={20}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
              {[
                {l:"Monthly Average",v:fmt(totalSaved/Math.max(state.savings.filter(v=>v>0).length,1))},
                {l:"Remaining",v:fmt(Math.max(SAVINGS_GOAL-totalSaved,0))},
                {l:"Months Active",v:state.savings.filter(v=>v>0).length},
              ].map((s,i) => (
                <div key={i} style={{textAlign:"center",padding:12,background:"rgba(255,255,255,0.02)",borderRadius:8}}>
                  <div style={{fontSize:10,color:"#666",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>{s.l}</div>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:18,color:"#D4A853",fontWeight:700}}>{s.v}</div>
                </div>
              ))}
            </div>
          </Card>
          <SidebarNote>$20,000 doesn't show up in a lump. It shows up in the $47 you didn't spend on things that don't love you back. Enter what you saved each month. Watch the green bar move. That bar is your future arguing with your past — and winning.</SidebarNote>
        </>}

        {/* Footer */}
        <div style={{marginTop:40,textAlign:"center",padding:20,borderTop:"1px solid rgba(255,255,255,0.06)"}}>
          <button onClick={printReport} style={{padding:"10px 24px",borderRadius:8,border:"1px solid rgba(212,168,83,0.3)",background:"rgba(212,168,83,0.1)",color:"#D4A853",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",marginBottom:16}}>🖨️ Print {MONTHS[currentMonth]} Report</button>
          <div style={{fontFamily:"'Playfair Display',serif",color:"#D4A853",fontSize:14,marginBottom:4}}>The Credit Comeback Tracker</div>
          <div style={{fontSize:12,color:"#555"}}>Powered by CARES Workflows / Kari Hoglund Kounkel</div>
          <div style={{marginTop:8,fontStyle:"italic",color:"#777",fontSize:12}}>Now go be brilliant.</div>
        </div>
      </div>
    </div>
  );
}
