/* KeyFlow — Pilot app shell.
   Tabs: Pilot (the proposal, with optional Expert mode) + Automation (the Auto/Ask me/Never control center).
   Helpers are local to this file (uses KI/Icon/Badge/Tick from keyflow-icons.jsx). */

const { useState, useEffect } = React;

/* sliders / automation icon (added to the shared KI map) */
KI.tune = "M6 4v4M6 12v8M12 4v9M12 17v3M18 4v2M18 10v10M3 10h6M9 17h6M15 8h6";

/* ---------- data ---------- */
const SNAP_BASE = [
  ["Business","Reyes Realty Group"],["Industry","Residential real estate"],
  ["Primary contact","Diana Reyes"],["Serves","Buyers & sellers, Skagit County"],
  ["Team size","Solo agent + 1 assistant"],["Current tools","Spreadsheet, phone, Gmail"],
];
const SNAP_EXPERT = [
  ["New leads / month","~60"],["Avg. deal size","$540k"],
  ["Response SLA target","5 min"],["After-hours share","41% of calls"],
];
const PAINS = [
  [() => KI.phone,"Missed calls after hours","Most new-buyer calls land after 5 PM and go to voicemail. By morning, the lead has already called another agent."],
  [() => KI.clock,"Slow first follow-up","Manual replies take 3–6 hours. Speed-to-lead is the single biggest factor in who wins the listing."],
  [() => KI.doc,"Repetitive intake","The same 8 qualifying questions — budget, timeline, area, financing — typed out by hand for every lead."],
];
const AI_DOES = [
  "Respond to every new lead within 5 minutes",
  "Ask the qualifying questions",
  "Capture budget, timeline & preferred areas",
  "Suggest appointment times from your calendar",
  "Flag and escalate hot leads to you",
];
const HUMAN_DOES = ["Pricing & market strategy","Negotiations & offers","Contract & legal questions","Emotional, high-stakes conversations"];
const KNOWLEDGE = [
  ["Buyer Intake Brief","ready","Voice · Email · SMS","Jun 11","Diana",100],
  ["Seller Listing Brief","ready","Voice · Email","Jun 10","Diana",100],
  ["Closing Timeline Brief","review","Voice","Jun 13","Assistant",70],
  ["Escalation Rules","ready","All channels","Jun 9","Diana",100],
  ["Tone & Voice Rules","draft","All channels","Jun 13","Diana",40],
];
const SUCCESS = [
  ["10+","leads contacted","in the first 2 weeks",14,10],
  ["3+","qualified conversations","budget + timeline captured",4,3],
  ["1+","booked appointment","on Diana's calendar",2,1],
];
const CHECK = [
  ["Business profile complete","done","Diana","Jun 9"],
  ["Voice & tone approved","done","Diana","Jun 10"],
  ["Knowledge briefs approved","done","Diana","Jun 11"],
  ["Escalation rules approved","done","Diana","Jun 11"],
  ["Test conversation reviewed","now","You","—"],
  ["Pilot ready to launch","todo","—","—"],
];
const KPIS = [
  ["Leads contacted","14","+6","up","vs target 10"],
  ["Qualified","4","+2","up","budget + timeline"],
  ["Appointments","2","+1","up","on your calendar"],
  ["Avg. response","2m 41s","−18m","up","was 21m manual"],
  ["Awaiting approval","2","","flat","follow-up drafts"],
  ["Escalations","1","","flat","one hot buyer"],
];
const ACTIVITY = [
  [() => KI.bot,"Followed up with new lead","Sarah Miller","Qualified","ok","4m ago"],
  [() => KI.phone,"Answered after-hours call","Marcus Lee","Summarized","info","32m ago"],
  [() => KI.mail,"Drafted reply — awaiting approval","T. Okafor","Needs approval","warn","1h ago"],
  [() => KI.bolt,"Escalated hot buyer to Diana","Sarah Miller","Escalated","bad","1h ago"],
  [() => KI.calendar,"Proposed 3 showing times","J. & P. Alvarez","Booked","ok","2h ago"],
];
const ESCAL = ["Asks for Diana by name","Budget over $1M","Upset or complaint","Legal question","Mentions another agent"];

/* automation capability groups */
const AUTO_LEAD = [
  ["Reply to a brand-new lead","Within 5 minutes, any hour","auto"],
  ["Ask qualifying questions","Budget, timeline, area, financing","auto"],
  ["Capture buyer & seller needs","Save to the lead profile","auto"],
  ["Suggest appointment times","From your live calendar","ask"],
  ["Book directly on your calendar","Without checking with you first","ask"],
];
const AUTO_MONEY = [
  ["Send a follow-up email or text","Outbound messages to leads","ask"],
  ["Re-engage a cold lead","After 7 days of silence","auto"],
  ["Quote a price or price range","Any listing or offer","never"],
  ["Discuss contract or legal terms","Disclosures, contingencies","never"],
];

/* ---------- shared helpers ---------- */
function PSection({ n, title, sub, right, children }) {
  return (
    <section style={{ marginBottom:36 }}>
      <div className="kf-between" style={{ marginBottom:15 }}>
        <div className="kf-row" style={{ gap:12, alignItems:"baseline" }}>
          {n && <span className="kf-num" style={{ fontSize:12, fontWeight:800, color:"var(--kf-accent)", letterSpacing:".04em" }}>{n}</span>}
          <h2 className="kf-h2" style={{ whiteSpace:"nowrap" }}>{title}</h2>
          <span className="kf-sm" style={{ marginLeft:2, whiteSpace:"nowrap" }}>{sub}</span>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}
function FNode({ kind, label, sub, count, expert }) {
  return (
    <div className={"kf-flow-node"+(kind?" "+kind:"")}>
      {expert && count!=null && <div className="kf-num" style={{ fontSize:17, fontWeight:800, lineHeight:1, marginBottom:3 }}>{count}</div>}
      <div style={{ fontSize:12.5, fontWeight:700 }}>{label}</div>
      <div className="kf-sm" style={{ fontSize:10.5, marginTop:2 }}>{expert && count!=null ? "this pilot" : sub}</div>
    </div>
  );
}
function FArrow() { return <div className="kf-flow-arrow"><Icon d={KI.arrowR} size={15} /></div>; }
function Fact({ k, v }) {
  return <div><div className="kf-label" style={{ marginBottom:5 }}>{k}</div><div style={{ fontSize:15, fontWeight:650 }}>{v}</div></div>;
}

/* interactive Auto / Ask me / Never control */
const MODE_ACTIVE = {
  auto:  { color:"#16794d", background:"var(--kf-ok-soft)" },
  ask:   { color:"#9a6310", background:"var(--kf-warn-soft)" },
  never: { color:"#b5343a", background:"var(--kf-bad-soft)" },
};
function ModePicker({ value, onChange }) {
  const opts = [["auto","Auto"],["ask","Ask me"],["never","Never"]];
  return (
    <div className="kf-seg" style={{ flex:"none" }} role="radiogroup">
      {opts.map(([k,l]) =>
        <button key={k} role="radio" aria-checked={value===k} className={value===k?"on":""}
          style={value===k?MODE_ACTIVE[k]:null} onClick={() => onChange(k)}>{l}</button>
      )}
    </div>
  );
}

/* ============================================================
   SIDEBAR
   ============================================================ */
function Sidebar({ tab, setTab }) {
  const nav = [
    ["home","Home",null],["pilot","Pilot","pilot"],["tune","Automation","automation"],
    ["activity","Activity",null],["approvals","Approvals",null],["leads","Leads",null],
    ["knowledge","Knowledge",null],["reports","Reports",null],
  ];
  return (
    <aside style={{ width:236, flex:"none", background:"var(--kf-surface)", borderRight:"1px solid var(--kf-border)", display:"flex", flexDirection:"column", padding:"20px 14px", position:"sticky", top:0, height:"100vh" }}>
      <div className="kf-row" style={{ gap:9, padding:"0 8px 18px" }}>
        <div style={{ width:28, height:28, borderRadius:8, background:"var(--kf-ink)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff" }}><Icon d={KI.bolt} size={15} /></div>
        <div className="kf-logo"><span className="k">Key</span><span className="f">Flow</span></div>
      </div>
      <div className="kf-panel kf-row" style={{ gap:9, padding:"8px 9px", marginBottom:16 }}>
        <span className="kf-av gray">DR</span>
        <div className="kf-grow" style={{ lineHeight:1.2 }}>
          <div style={{ fontSize:12.5, fontWeight:750 }}>Reyes Realty</div>
          <div className="kf-sm" style={{ fontSize:11 }}>Pilot workspace</div>
        </div>
        <Icon d={KI.chevD} size={14} />
      </div>
      <nav className="kf-col" style={{ gap:2 }}>
        {nav.map(([ic,label,t]) =>
          <div key={label} className={"kf-nav-item"+(t && t===tab?" active":"")}
            onClick={t ? () => setTab(t) : undefined} style={{ cursor: t?"pointer":"default" }}>
            <Icon d={KI[ic]} /><span>{label}</span>
            {label==="Approvals" && <span style={{ marginLeft:"auto" }}><Badge kind="warn">2</Badge></span>}
          </div>
        )}
      </nav>
      <div style={{ flex:1 }} />
      <div className="kf-nav-item"><Icon d={KI.settings} /><span>Settings</span></div>
    </aside>
  );
}

/* ============================================================
   PILOT PANE  (the proposal)
   ============================================================ */
function PilotPane({ goAutomation }) {
  const [expert, setExpert] = useState(() => {
    try { return localStorage.getItem("kf-expert") === "1"; } catch(e) { return false; }
  });
  useEffect(() => { try { localStorage.setItem("kf-expert", expert ? "1" : "0"); } catch(e){} }, [expert]);

  return (
    <React.Fragment>
      {/* sticky header */}
      <header style={{ position:"sticky", top:0, zIndex:5, background:"rgba(255,255,255,.82)", backdropFilter:"blur(14px)", borderBottom:"1px solid var(--kf-border)" }}>
        <div className="kf-between" style={{ padding:"20px 40px 18px" }}>
          <div>
            <div className="kf-row" style={{ gap:10, marginBottom:6 }}>
              <span className="kf-eyebrow">Pilot setup</span>
              {expert && <span className="kf-expert-tag kf-reveal"><Icon d={KI.bolt} size={11} />Expert view</span>}
            </div>
            <h1 className="kf-h1">Diana's AI employee</h1>
          </div>
          <div className="kf-row" style={{ gap:18 }}>
            <button className="kf-switch" data-on={expert} onClick={() => setExpert(v => !v)} aria-pressed={expert} title="Show advanced controls and live data">
              <span className="track"><i /></span>
              <span>Expert mode</span>
            </button>
            <div className="kf-vdiv" style={{ height:34 }} />
            <Badge kind="ok" dot>Ready — 1 step left</Badge>
            <button className="kf-btn primary lg"><Icon d={KI.bolt} size={16} />Launch pilot</button>
          </div>
        </div>
        {expert &&
          <div className="kf-row kf-wrap kf-reveal" style={{ gap:10, padding:"0 40px 16px" }}>
            <span className="kf-metapill"><Icon d={KI.bolt} />Pilot <b>Day 6 of 14</b></span>
            <span className="kf-metapill"><Icon d={KI.clock} />Last sync <b>2 min ago</b></span>
            <span className="kf-metapill"><Icon d={KI.bot} />Model <b>KeyFlow Voice v2</b></span>
            <span className="kf-metapill" onClick={goAutomation} style={{ cursor:"pointer" }}><Icon d={KI.tune} />Guardrails <b>9 active</b></span>
            <div style={{ flex:1 }} />
            <button className="kf-btn ghost sm"><Icon d={KI.doc} size={14} />Export pilot brief</button>
            <button className="kf-btn ghost sm"><Icon d={KI.settings} size={14} />Advanced settings</button>
          </div>
        }
      </header>

      <div style={{ padding:"30px 40px 64px", maxWidth: expert ? 1120 : 900, margin:"0 auto", width:"100%", transition:"max-width .3s ease" }}>
        <p className="kf-body" style={{ fontSize:16, marginBottom:28, maxWidth:760 }}>
          A 2-week pilot that puts an AI employee on Reyes Realty's new-lead line. Here's exactly what it will do,
          what stays in Diana's hands, and how we'll know it worked.
        </p>

        {expert &&
          <div className="kf-reveal" style={{ marginBottom:34 }}>
            <div className="kf-row" style={{ gap:8, marginBottom:13 }}><span className="kf-label">Live pilot metrics</span><Badge kind="ok" dot>Updating</Badge></div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:12 }}>
              {KPIS.map(([l,v,d,dir,sub]) =>
                <div key={l} className="kf-card" style={{ padding:"14px 16px" }}>
                  <div className="kf-label" style={{ marginBottom:9, fontSize:10.5 }}>{l}</div>
                  <div className="kf-row" style={{ gap:7, alignItems:"baseline" }}>
                    <span className="kf-kpi-val kf-num" style={{ fontSize:23 }}>{v}</span>
                    {d && <span className={"kf-trend "+(dir==="up"?"up":"down")}><Icon d={KI.trend} size={12} />{d}</span>}
                  </div>
                  <div className="kf-sm" style={{ fontSize:10.5, marginTop:6 }}>{sub}</div>
                </div>
              )}
            </div>
          </div>
        }

        {/* 01 snapshot */}
        <PSection n="01" title="Business snapshot" sub="Who the AI is working for">
          <div className="kf-card" style={{ padding:24 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"20px 28px" }}>
              {SNAP_BASE.map(([k,v]) => <Fact key={k} k={k} v={v} />)}
            </div>
            {expert &&
              <div className="kf-reveal">
                <hr className="kf-divider" style={{ margin:"20px 0" }} />
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"16px 28px" }}>
                  {SNAP_EXPERT.map(([k,v]) => <Fact key={k} k={k} v={v} />)}
                </div>
              </div>
            }
            <hr className="kf-divider" style={{ margin:"20px 0" }} />
            <div className="kf-between">
              <div className="kf-row" style={{ gap:11 }}>
                <span className="kf-ico warn"><Icon d={KI.bolt} size={16} /></span>
                <div><span className="kf-label">Main bottleneck</span><div style={{ fontSize:14.5, fontWeight:600 }}>After-hours lead response — speed-to-lead is being lost overnight.</div></div>
              </div>
              {expert && <div className="kf-row kf-reveal" style={{ gap:6 }}><span className="kf-metapill"><Icon d={KI.leads} />Gmail</span><span className="kf-metapill"><Icon d={KI.phone} />VoIP line</span><button className="kf-btn subtle sm"><Icon d={KI.plus} size={13} />Connect CRM</button></div>}
            </div>
          </div>
        </PSection>

        {/* 02 pains */}
        <PSection n="02" title="Pain points" sub="What's costing time and listings today">
          <div className="kf-col" style={{ gap:12 }}>
            {PAINS.map(([ic,t,b]) =>
              <div key={t} className="kf-card kf-row" style={{ padding:18, gap:15, alignItems:"flex-start" }}>
                <span className="kf-ico"><Icon d={ic()} size={16} /></span>
                <div className="kf-grow"><h3 className="kf-h3" style={{ marginBottom:4 }}>{t}</h3><p className="kf-body" style={{ fontSize:13.5 }}>{b}</p></div>
                {expert && <span className="kf-reveal" style={{ flex:"none" }}><Badge kind="acc">Targeted by pilot</Badge></span>}
              </div>
            )}
          </div>
        </PSection>

        {/* 03 recommended pilot */}
        <PSection n="03" title="Recommended pilot" sub="The one workflow we'd start with">
          <div className="kf-card" style={{ overflow:"hidden" }}>
            <div style={{ padding:"22px 24px", borderBottom:"1px solid var(--kf-border)" }} className="kf-between">
              <div className="kf-row" style={{ gap:13 }}>
                <span className="kf-ico acc" style={{ width:40, height:40 }}><Icon d={KI.bolt} size={19} /></span>
                <div><div className="kf-eyebrow" style={{ marginBottom:3 }}>Workflow</div><h2 className="kf-h2">New lead triage &amp; follow-up</h2></div>
              </div>
              {expert ? <button className="kf-btn ghost sm kf-reveal"><Icon d={KI.workflows} size={14} />View runs</button> : <Badge kind="acc">Best fit for Reyes</Badge>}
            </div>
            <div style={{ padding:"20px 24px", background:"var(--kf-surface-2)", borderBottom:"1px solid var(--kf-border)" }}>
              <div className="kf-flow">
                <FNode label="Lead comes in" sub="Call · web · text" count={14} expert={expert} />
                <FArrow /><FNode kind="ai" label="AI responds" sub="under 5 min" count={14} expert={expert} />
                <FArrow /><FNode kind="ai" label="AI qualifies" sub="budget · timeline" count={9} expert={expert} />
                <FArrow /><FNode kind="human" label="You review" sub="hot leads only" count={3} expert={expert} />
                <FArrow /><FNode label="Appointment" sub="booked" count={2} expert={expert} />
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr" }}>
              <div style={{ padding:"20px 24px" }}>
                <div className="kf-row" style={{ gap:8, marginBottom:14 }}><span className="kf-ico acc" style={{ width:28, height:28 }}><Icon d={KI.bot} size={15} /></span><h3 className="kf-h3">What your AI handles</h3></div>
                <ul className="kf-col" style={{ gap:11, listStyle:"none", margin:0, padding:0 }}>
                  {AI_DOES.map(x =>
                    <li key={x} className="kf-row" style={{ gap:9, alignItems:"flex-start" }}><span className="kf-tick done" style={{ width:18, height:18 }}><Icon d={KI.check} size={11} /></span><span style={{ fontSize:13.5, fontWeight:550 }}>{x}</span></li>
                  )}
                </ul>
              </div>
              <div style={{ padding:"20px 24px", borderLeft:"1px solid var(--kf-border)", background:"var(--kf-warn-soft)" }}>
                <div className="kf-row" style={{ gap:8, marginBottom:14 }}><span className="kf-ico warn" style={{ width:28, height:28 }}><Icon d={KI.user} size={15} /></span><h3 className="kf-h3">What you still control</h3></div>
                <ul className="kf-col" style={{ gap:11, listStyle:"none", margin:0, padding:0 }}>
                  {HUMAN_DOES.map(x =>
                    <li key={x} className="kf-row" style={{ gap:9, alignItems:"flex-start" }}><span style={{ color:"#9a6310", marginTop:2 }}><Icon d={KI.shield} size={15} /></span><span style={{ fontSize:13.5, fontWeight:600 }}>{x}</span></li>
                  )}
                </ul>
              </div>
            </div>
            {/* automation link bar — exact permissions live in the Automation tab */}
            <div className="kf-between" style={{ padding:"14px 24px", borderTop:"1px solid var(--kf-border)", background:"var(--kf-surface)", gap:16 }}>
              <span className="kf-row kf-sm" style={{ gap:8 }}><Icon d={KI.tune} size={15} /><span>Exactly what runs on its own vs. needs your approval is set in <b style={{ color:"var(--kf-ink)" }}>Automation</b>.</span></span>
              <button className="kf-btn subtle sm" onClick={goAutomation}>Open Automation<Icon d={KI.arrowR} size={14} /></button>
            </div>
            {expert &&
              <div className="kf-reveal" style={{ padding:"14px 24px", borderTop:"1px solid var(--kf-border)", display:"flex", gap:18, alignItems:"center", background:"var(--kf-surface-2)" }}>
                <span className="kf-label">Trigger</span><span style={{ fontSize:13, fontWeight:600 }}>New lead from any channel</span>
                <div className="kf-vdiv" style={{ height:20 }} />
                <span className="kf-label">SLA</span><span style={{ fontSize:13, fontWeight:600 }}>First reply &lt; 5 min</span>
                <div className="kf-vdiv" style={{ height:20 }} />
                <span className="kf-label">Approval</span><span style={{ fontSize:13, fontWeight:600 }}>Required before first outbound</span>
              </div>
            }
          </div>
        </PSection>

        {/* 04 knowledge */}
        <PSection n="04" title="Knowledge needed" sub="What we load before launch"
          right={expert && <button className="kf-btn subtle sm kf-reveal"><Icon d={KI.plus} size={13} />Add knowledge source</button>}>
          <div className="kf-card" style={{ padding:"6px 22px" }}>
            {KNOWLEDGE.map(([t,s,used,upd,owner,pct],i) =>
              <div key={t} style={{ padding:"13px 0", borderTop: i?"1px solid var(--kf-border)":"none" }}>
                <div className="kf-between">
                  <div className="kf-row" style={{ gap:12 }}><span className="kf-ico" style={{ width:28, height:28 }}><Icon d={KI.doc} size={14} /></span><span style={{ fontSize:14, fontWeight:650 }}>{t}</span></div>
                  <div className="kf-row" style={{ gap:14 }}>
                    {expert && <span className="kf-sm kf-reveal" style={{ fontSize:11.5 }}>{used} · {owner} · {upd}</span>}
                    {s==="ready" && <Badge kind="ok" dot>Ready for AI</Badge>}
                    {s==="review" && <Badge kind="warn" dot>Needs review</Badge>}
                    {s==="draft" && <Badge dot>Draft</Badge>}
                  </div>
                </div>
                {expert && <div className="kf-track kf-reveal" style={{ marginTop:10 }}><i className={s==="ready"?"ok":""} style={{ width:pct+"%" }} /></div>}
              </div>
            )}
          </div>
        </PSection>

        {/* 05 success */}
        <PSection n="05" title="What success looks like" sub="Measured at the 2-week mark">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
            {SUCCESS.map(([num,t,s,val,tar]) => {
              const pct = Math.min(100, Math.round(val/tar*100));
              return (
                <div key={t} className="kf-card" style={{ padding:20 }}>
                  <div className="kf-row" style={{ gap:8, marginBottom:8, color:"var(--kf-accent)" }}>
                    <Icon d={KI.target} size={17} />
                    <span className="kf-kpi-val" style={{ color:"var(--kf-ink)" }}>{expert ? val : num}</span>
                    {expert && <span className="kf-sm kf-reveal" style={{ fontSize:12, fontWeight:700, color:"var(--kf-muted)" }}>/ {tar} target</span>}
                  </div>
                  <div style={{ fontSize:14, fontWeight:700 }}>{t}</div>
                  <div className="kf-sm" style={{ marginTop:2 }}>{s}</div>
                  {expert && <div className="kf-reveal" style={{ marginTop:12 }}><div className="kf-track"><i className="ok" style={{ width:pct+"%" }} /></div><div className="kf-sm" style={{ fontSize:11, marginTop:6, color:"var(--kf-ok)", fontWeight:700 }}>Target met</div></div>}
                </div>
              );
            })}
          </div>
        </PSection>

        {/* 06 launch checklist */}
        <PSection n="06" title="Launch checklist" sub="5 of 6 complete">
          <div className="kf-card" style={{ padding:"8px 24px 18px" }}>
            <div style={{ padding:"14px 0 6px" }}><div className="kf-track lg"><i className="ok" style={{ width:"83%" }} /></div></div>
            {CHECK.map(([t,st,owner,when]) =>
              <div key={t} className="kf-check">
                <Tick state={st} />
                <span style={{ fontSize:14, fontWeight:600, color: st==="todo"?"var(--kf-muted)":"var(--kf-ink)" }}>{t}</span>
                {expert && <span className="kf-sm kf-reveal" style={{ marginLeft:14, fontSize:11.5 }}>{owner} · {when}</span>}
                {st==="now" && <span style={{ marginLeft:"auto" }}><button className="kf-btn primary sm">Review now</button></span>}
              </div>
            )}
          </div>
        </PSection>

        {/* EXPERT-ONLY: live activity */}
        {expert &&
          <PSection n="07" title="Live activity" sub="What the AI employee has done"
            right={<button className="kf-btn subtle sm"><Icon d={KI.activity} size={13} />View all</button>}>
            <div className="kf-card kf-reveal" style={{ padding:"6px 4px" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead><tr style={{ color:"var(--kf-muted)" }}>
                  {["Action","Lead","Status","When"].map((h,i)=><th key={h} style={{ textAlign:i>1?"right":"left", fontSize:10.5, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase", padding:"10px 18px" }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {ACTIVITY.map(([ic,a,who,st,k,t],i)=>
                    <tr key={i} style={{ borderTop:"1px solid var(--kf-border)" }}>
                      <td style={{ padding:"11px 18px" }}><div className="kf-row" style={{ gap:10 }}><span className="kf-ico" style={{ width:28, height:28 }}><Icon d={ic()} size={14} /></span><span style={{ fontWeight:600 }}>{a}</span></div></td>
                      <td style={{ padding:"11px 18px", color:"var(--kf-ink-2)", fontWeight:600 }}>{who}</td>
                      <td style={{ padding:"11px 18px", textAlign:"right" }}><Badge kind={k}>{st}</Badge></td>
                      <td style={{ padding:"11px 18px", textAlign:"right", color:"var(--kf-muted)", fontSize:12 }} className="kf-num">{t}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </PSection>
        }

        {/* footer CTA */}
        <div className="kf-card" style={{ padding:"22px 26px", display:"flex", alignItems:"center", gap:20, background:"var(--kf-accent-faint)", borderColor:"#cfeefb" }}>
          <div className="kf-grow">
            <h3 className="kf-h3" style={{ marginBottom:3 }}>One step from launch</h3>
            <p className="kf-sm">Review the test conversation, then your AI employee starts answering Reyes Realty's new-lead line.</p>
          </div>
          <button className="kf-btn ghost lg">Review test</button>
          <button className="kf-btn primary lg"><Icon d={KI.bolt} size={16} />Launch pilot</button>
        </div>
      </div>
    </React.Fragment>
  );
}

/* ============================================================
   AUTOMATION PANE  (the Auto / Ask me / Never control center)
   ============================================================ */
function GuardGroup({ title, sub, rows, modes, setMode }) {
  return (
    <div style={{ marginBottom:26 }}>
      <div style={{ marginBottom:12 }}>
        <h2 className="kf-h2" style={{ fontSize:17 }}>{title}</h2>
        <p className="kf-sm" style={{ marginTop:3 }}>{sub}</p>
      </div>
      <div className="kf-card" style={{ padding:"4px 20px" }}>
        {rows.map(([t,d],i) =>
          <div key={t} className="kf-between" style={{ padding:"14px 0", borderTop: i?"1px solid var(--kf-border)":"none", gap:16 }}>
            <div className="kf-grow"><div style={{ fontSize:14, fontWeight:650 }}>{t}</div><div className="kf-sm" style={{ marginTop:2 }}>{d}</div></div>
            <ModePicker value={modes[t]} onChange={(m) => setMode(t,m)} />
          </div>
        )}
      </div>
    </div>
  );
}
function GateNode({ kind, label, gate }) {
  if (gate) return <div className="kf-flow-node" style={{ padding:"10px 6px", background:"#fff", borderStyle:"dashed", borderColor:"var(--kf-accent)", color:"var(--kf-accent)" }}><div className="kf-row" style={{ gap:5, justifyContent:"center", fontSize:11.5, fontWeight:700 }}><Icon d={KI.shield} size={12} />Approval gate</div></div>;
  return <div className={"kf-flow-node"+(kind?" "+kind:"")} style={{ padding:"10px 6px" }}><div style={{ fontSize:12, fontWeight:700 }}>{label}</div></div>;
}

function AutomationPane() {
  const init = {}; [...AUTO_LEAD, ...AUTO_MONEY].forEach(([t,,m]) => init[t] = m);
  const [modes, setModes] = useState(init);
  const setMode = (t,m) => setModes(s => ({ ...s, [t]:m }));
  const [reqApproval, setReqApproval] = useState(true);
  const vals = Object.values(modes);
  const autoN = vals.filter(x => x==="auto").length;
  const askN  = vals.filter(x => x==="ask").length;
  const neverN= vals.filter(x => x==="never").length;
  const summary = [
    ["auto", autoN, "Run automatically", KI.bot],
    ["ask",  askN,  "Ask you first",     KI.user],
    ["never",neverN,"Off-limits",        KI.ban],
  ];

  return (
    <React.Fragment>
      <header style={{ position:"sticky", top:0, zIndex:5, background:"rgba(255,255,255,.82)", backdropFilter:"blur(14px)", borderBottom:"1px solid var(--kf-border)" }}>
        <div className="kf-between" style={{ padding:"20px 40px 18px" }}>
          <div>
            <div className="kf-eyebrow" style={{ marginBottom:6 }}>Control center</div>
            <h1 className="kf-h1">Automation</h1>
          </div>
          <div className="kf-row" style={{ gap:14 }}>
            <Badge kind="ok" dot>All changes saved</Badge>
            <button className="kf-btn ghost"><Icon d={KI.bot} size={15} />Test a conversation</button>
          </div>
        </div>
      </header>

      <div style={{ padding:"30px 40px 64px", maxWidth:980, margin:"0 auto", width:"100%" }}>
        <p className="kf-body" style={{ fontSize:16, marginBottom:24, maxWidth:680 }}>
          Decide what your AI employee can do on its own, what it should check with you first, and what it must never
          do. Changes apply across every channel — voice, email, and text. Nothing here is permanent.
        </p>

        {/* summary strip */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:30 }}>
          {summary.map(([k,n,l,ic]) =>
            <div key={k} className="kf-card" style={{ padding:"16px 18px", display:"flex", alignItems:"center", gap:13 }}>
              <span className="kf-ico" style={{ width:38, height:38, ...MODE_ACTIVE[k] }}><Icon d={ic} size={17} /></span>
              <div><div className="kf-kpi-val kf-num" style={{ fontSize:24 }}>{n}</div><div className="kf-sm" style={{ fontSize:12, fontWeight:600, marginTop:1 }}>{l}</div></div>
            </div>
          )}
        </div>

        {/* legend flow */}
        <div className="kf-card" style={{ padding:"16px 20px", marginBottom:30, display:"flex", gap:22, alignItems:"center" }}>
          <span className="kf-label" style={{ flex:"none" }}>How a reply flows</span>
          <div className="kf-flow kf-grow">
            <GateNode label="New lead" />
            <FArrow /><GateNode kind="ai" label="AI drafts" />
            <FArrow /><GateNode gate />
            <FArrow /><GateNode kind="human" label="You approve" />
            <FArrow /><GateNode label="Sent" />
          </div>
        </div>

        <GuardGroup title="Lead handling" sub="The day-to-day work of meeting a new lead" rows={AUTO_LEAD} modes={modes} setMode={setMode} />
        <GuardGroup title="Outreach, pricing & legal" sub="Higher-stakes actions — most stay with you" rows={AUTO_MONEY} modes={modes} setMode={setMode} />

        {/* approval window toggle */}
        <div className="kf-card" style={{ padding:"16px 20px", marginBottom:26, display:"flex", alignItems:"center", gap:16 }}>
          <span className="kf-ico acc" style={{ width:34, height:34 }}><Icon d={KI.approvals} size={16} /></span>
          <div className="kf-grow">
            <div style={{ fontSize:14, fontWeight:650 }}>Require approval before the first outbound message</div>
            <div className="kf-sm" style={{ marginTop:2 }}>Every brand-new lead's first reply waits for your OK. Recommended while the pilot warms up.</div>
          </div>
          <button className="kf-switch" data-on={reqApproval} onClick={() => setReqApproval(v => !v)} aria-pressed={reqApproval}>
            <span className="track"><i /></span>
          </button>
        </div>

        {/* escalation */}
        <PSection title="Always escalate to you" sub="Hard hand-offs — no reply is sent"
          right={<button className="kf-btn subtle sm"><Icon d={KI.plus} size={13} />Add rule</button>}>
          <div className="kf-card" style={{ padding:20, background:"var(--kf-warn-soft)", borderColor:"#f6e4bd" }}>
            <div className="kf-row" style={{ gap:10, marginBottom:6 }}>
              <span className="kf-ico warn" style={{ width:30, height:30 }}><Icon d={KI.shield} size={16} /></span>
              <div><h3 className="kf-h3">The AI stops and hands off when…</h3><p className="kf-sm" style={{ marginTop:2 }}>No matter the settings above, these always come straight to you.</p></div>
            </div>
            <div className="kf-row kf-wrap" style={{ gap:8, marginTop:12 }}>
              {ESCAL.map(x => <span key={x} className="kf-badge" style={{ background:"#fff", borderColor:"#f0dcae", fontWeight:600, padding:"6px 12px" }}><Icon d={KI.bolt} size={13} />{x}</span>)}
            </div>
          </div>
        </PSection>
      </div>
    </React.Fragment>
  );
}

/* ============================================================
   APP SHELL
   ============================================================ */
function PilotPro() {
  const [tab, setTab] = useState("pilot");
  return (
    <div className="kf" style={{ display:"flex", minHeight:"100vh" }}>
      <Sidebar tab={tab} setTab={setTab} />
      <main className="kf-grow" style={{ display:"flex", flexDirection:"column" }}>
        {tab === "pilot"
          ? <PilotPane goAutomation={() => setTab("automation")} />
          : <AutomationPane />}
      </main>
    </div>
  );
}

window.PilotPro = PilotPro;
