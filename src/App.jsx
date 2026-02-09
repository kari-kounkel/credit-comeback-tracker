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

export default function App() {
  const [state, setState] = useState(loadState);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [activeTab, setActiveTab] = useState("dashboard");

  const save = useCallback((newState) => {
    setState(newState);
    localStorage.setItem("creditComebackTracker_v1", JSON.stringify(newState));
  }, []);

  const update = (fn) => { const s = {...state}; fn(s); save(s); };

  // Computed
  const totalIncome = state.income.reduce((s,i) => s+(i.amount||0), 0);
  const bills = state.bills[currentMonth] || [];
  const totalBudgeted = bills.reduce((s,b) => s+(b.budgeted||0), 0);
  const totalActual = bills.reduce((s,b) => s+(b.actual||0), 0);
  const remaining = totalIncome - totalActual;
  const totalSaved = state.savings.reduce((s,v) => s+(v||0), 0);
  const curScore = state.creditScores[currentMonth] || 0;

  const cycleStatus = (i) => update(s => { s.bills[currentMonth][i].status = STATUSES[(STATUSES.indexOf(s.bills[currentMonth][i].status)+1)%STATUSES.length]; });

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0f0f23 0%,#1a1a2e 40%,#16213e 100%)",fontFamily:"'DM Sans',sans-serif",color:"#e0e0e0"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet"/>

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
            <button onClick={() => update(s => { for(let m=0;m<12;m++) s.bills[m].push({name:"New Expense",type:"variable",budgeted:0,actual:0,dueDay:1,status:"unpaid"}); })} style={{padding:"6px 16px",borderRadius:8,border:"1px solid rgba(212,168,83,0.3)",background:"rgba(212,168,83,0.1)",color:"#D4A853",fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600}}>+ Add Expense</button>
          </div>
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
        <div style={{marginTop:40,textAlign:"center",padding:20,borderTop:"1px solid rgba(255,255,255,0.06)",fontSize:12,color:"#555"}}>
          <div style={{fontFamily:"'Playfair Display',serif",color:"#D4A853",fontSize:14,marginBottom:4}}>The Credit Comeback Tracker</div>
          <div>Part of The Credit Comeback Kit by CARES Consulting Inc.</div>
          <div style={{marginTop:8,fontStyle:"italic",color:"#777"}}>Now go be brilliant.</div>
        </div>
      </div>
    </div>
  );
}
