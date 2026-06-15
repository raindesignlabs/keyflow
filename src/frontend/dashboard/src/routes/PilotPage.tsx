import { useEffect, useState } from "react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Icon, type IconName } from "../components/Icon";
import { Progress } from "../components/Progress";
import { Section } from "../components/Section";
import { Switch } from "../components/Switch";
import { useApi } from "../hooks/useApi";
import { api, type VoiceCall } from "../lib/api";
import {
  aiHandles,
  checklist,
  humanControls,
  knowledgeRows,
  painPoints,
  snapshotBase,
  snapshotExpert,
  successTargets,
} from "../data/pilotSample";

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="kf-label kf-fact-label">{label}</div>
      <div className="kf-fact-value">{value}</div>
    </div>
  );
}

function Tick({ state }: { state: string }) {
  if (state === "done") {
    return (
      <span className="kf-tick done">
        <Icon name="check" size={13} />
      </span>
    );
  }
  if (state === "now") return <span className="kf-tick now"><i /></span>;
  return <span className="kf-tick todo" />;
}

function FlowNode({ kind, label, sub, count, expert }: { kind?: "ai" | "human"; label: string; sub: string; count?: number; expert: boolean }) {
  return (
    <div className={["kf-flow-node", kind].filter(Boolean).join(" ")}>
      {expert && count != null ? <div className="kf-flow-count kf-num">{count}</div> : null}
      <div className="kf-flow-label">{label}</div>
      <div className="kf-sm kf-flow-sub">{expert && count != null ? "this pilot" : sub}</div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="kf-flow-arrow">
      <Icon name="arrowR" size={15} />
    </div>
  );
}

function statusBadge(status: string) {
  if (status === "ready") return <Badge kind="ok" dot>Ready for AI</Badge>;
  if (status === "review") return <Badge kind="warn" dot>Needs review</Badge>;
  return <Badge>Draft</Badge>;
}

export function PilotPage({ goAutomation }: { goAutomation: () => void }) {
  const [expert, setExpert] = useState(() => {
    try { return localStorage.getItem("kf-expert") === "1"; } catch { return false; }
  });

  // Fetch real CRM data for expert view
  const voiceCalls = useApi(() => api.voiceCalls(10), [expert]);
  const pipeline = useApi(() => api.pipeline(), [expert]);
  const attention = useApi(() => api.attention(), [expert]);

  useEffect(() => {
    try { localStorage.setItem("kf-expert", expert ? "1" : "0"); } catch { /* localStorage unavailable */ }
  }, [expert]);

  // Derive live KPIs from real data
  const calls = voiceCalls.data?.calls ?? [];
  const totalDeals = pipeline.data ? Object.values(pipeline.data.pipeline).reduce((sum, deals) => sum + deals.length, 0) : 0;
  const activeDeals = pipeline.data ? Object.entries(pipeline.data.pipeline)
    .filter(([stage]) => stage !== "closed")
    .reduce((sum, [, deals]) => sum + deals.length, 0) : 0;
  const attentionCount = attention.data?.total ?? 0;

  const liveKpis = [
    { label: "Voice calls", value: String(voiceCalls.data?.total ?? "—"), delta: "", trend: "flat" as const, sub: `${calls.filter(c => c.mode === "prospect").length} prospects` },
    { label: "Active deals", value: String(activeDeals), delta: "", trend: "flat" as const, sub: `${totalDeals} total in pipeline` },
    { label: "Needs attention", value: String(attentionCount), delta: "", trend: "flat" as const, sub: attention.data ? `${attention.data.stalled.length} stalled, ${attention.data.followups.length} overdue` : "—" },
    { label: "Avg. call duration", value: calls.length ? `${Math.round(calls.reduce((s, c) => s + Number(c.duration_seconds || 0), 0) / calls.length / 60)}m` : "—", delta: "", trend: "flat" as const, sub: `across ${calls.length} calls` },
  ];

  return (
    <>
      <header className="kf-pilot-header">
        <div className="kf-between kf-pilot-header-main">
          <div>
            <div className="kf-row kf-pilot-eyebrow-row">
              <span className="kf-eyebrow">Pilot setup</span>
              {expert ? <span className="kf-expert-tag"><Icon name="bolt" size={11} />Expert view</span> : null}
            </div>
            <h1 className="kf-h1">Diana&apos;s AI employee</h1>
          </div>
          <div className="kf-row kf-pilot-actions">
            <Switch checked={expert} onChange={setExpert} label="Expert mode" title="Show advanced controls and live data" />
            <span className="kf-vdiv" />
            <Badge kind="ok" dot>Ready — 1 step left</Badge>
            <Button variant="primary" size="lg"><Icon name="bolt" size={16} />Launch pilot</Button>
          </div>
        </div>
        {expert ? (
          <div className="kf-row kf-wrap kf-meta-toolbar kf-reveal">
            <span className="kf-metapill"><Icon name="bolt" />Pilot <b>Day 6 of 14</b></span>
            <span className="kf-metapill"><Icon name="clock" />Last sync <b>2 min ago</b></span>
            <span className="kf-metapill"><Icon name="bot" />Model <b>KeyFlow Voice v2</b></span>
            <button className="kf-metapill kf-metapill-button" type="button" onClick={goAutomation}><Icon name="tune" />Guardrails <b>9 active</b></button>
            <span className="kf-grow" />
            <Button size="sm"><Icon name="doc" size={14} />Export pilot brief</Button>
            <Button size="sm"><Icon name="settings" size={14} />Advanced settings</Button>
          </div>
        ) : null}
      </header>

      <div className={`kf-pilot-content${expert ? " expert" : ""}`}>
        <p className="kf-body kf-pilot-intro">
          A 2-week pilot that puts an AI employee on Reyes Realty&apos;s new-lead line. Here&apos;s exactly what it will do,
          what stays in Diana&apos;s hands, and how we&apos;ll know it worked.
        </p>

        {expert ? (
          <div className="kf-reveal kf-live-metrics">
            <div className="kf-row kf-live-metrics-head"><span className="kf-label">Live pilot metrics</span><Badge kind="ok" dot>Updating</Badge></div>
            <div className="kf-kpi-grid">
              {liveKpis.map((kpi) => (
                <Card key={kpi.label} className="kf-kpi-card">
                  <div className="kf-label kf-kpi-label">{kpi.label}</div>
                  <div className="kf-row kf-kpi-row">
                    <span className="kf-kpi-val kf-num">{kpi.value}</span>
                    {kpi.delta ? <span className={`kf-trend ${kpi.trend}`}><Icon name="trend" size={12} />{kpi.delta}</span> : null}
                  </div>
                  <div className="kf-sm kf-kpi-sub">{kpi.sub}</div>
                </Card>
              ))}
            </div>
          </div>
        ) : null}

        <Section number="01" title="Business snapshot" subtitle="Who the AI is working for">
          <Card className="kf-snapshot-card">
            <div className="kf-fact-grid base">
              {snapshotBase.map(([label, value]) => <Fact key={label} label={label} value={value} />)}
            </div>
            {expert ? (
              <div className="kf-reveal">
                <hr className="kf-divider kf-card-divider" />
                <div className="kf-fact-grid expert">
                  {snapshotExpert.map(([label, value]) => <Fact key={label} label={label} value={value} />)}
                </div>
              </div>
            ) : null}
            <hr className="kf-divider kf-card-divider" />
            <div className="kf-between kf-bottleneck-row">
              <div className="kf-row kf-bottleneck-copy">
                <span className="kf-ico warn"><Icon name="bolt" size={16} /></span>
                <div>
                  <span className="kf-label">Main bottleneck</span>
                  <div className="kf-bottleneck-text">After-hours lead response — speed-to-lead is being lost overnight.</div>
                </div>
              </div>
              {expert ? (
                <div className="kf-row kf-wrap kf-source-pills kf-reveal">
                  <span className="kf-metapill"><Icon name="leads" />Gmail</span>
                  <span className="kf-metapill"><Icon name="phone" />VoIP line</span>
                  <Button variant="subtle" size="sm"><Icon name="plus" size={13} />Connect CRM</Button>
                </div>
              ) : null}
            </div>
          </Card>
        </Section>

        <Section number="02" title="Pain points" subtitle="Why this pilot matters">
          <div className="kf-pain-list">
            {painPoints.map((pain) => (
              <Card key={pain.title} className="kf-pain-card">
                <span className="kf-ico acc"><Icon name={pain.icon as IconName} size={17} /></span>
                <div className="kf-grow">
                  <div className="kf-row kf-pain-title-row">
                    <h3 className="kf-h3">{pain.title}</h3>
                    {expert ? <Badge kind="acc">Targeted by pilot</Badge> : null}
                  </div>
                  <p className="kf-body">{pain.body}</p>
                </div>
              </Card>
            ))}
          </div>
        </Section>

        <Section number="03" title="Recommended pilot" subtitle="The smallest useful AI employee">
          <Card className="kf-recommend-card">
            <div className="kf-between kf-recommend-head">
              <div className="kf-row kf-recommend-title">
                <span className="kf-ico acc"><Icon name="bolt" size={17} /></span>
                <div>
                  <div className="kf-label">Workflow</div>
                  <h3 className="kf-h2">New lead triage & follow-up</h3>
                </div>
              </div>
              <div className="kf-row kf-wrap kf-recommend-actions">
                <Badge kind="acc">Best fit for Reyes</Badge>
                {expert ? <Button size="sm">View runs</Button> : null}
              </div>
            </div>

            <div className="kf-panel kf-flow-panel">
              <div className="kf-flow">
                <FlowNode label="Lead comes in" sub="Call · web · text" count={14} expert={expert} />
                <FlowArrow />
                <FlowNode kind="ai" label="AI responds" sub="under 5 min" count={14} expert={expert} />
                <FlowArrow />
                <FlowNode kind="ai" label="AI qualifies" sub="budget · timeline" count={9} expert={expert} />
                <FlowArrow />
                <FlowNode kind="human" label="You review" sub="hot leads only" count={3} expert={expert} />
                <FlowArrow />
                <FlowNode label="Appointment" sub="booked" count={2} expert={expert} />
              </div>
            </div>

            {expert ? (
              <div className="kf-reveal kf-pilot-meta-row">
                <span><b>Trigger:</b> New lead from phone, form, or text</span>
                <span><b>SLA:</b> 5 min first response</span>
                <span><b>Approval:</b> outbound follow-up drafts</span>
              </div>
            ) : null}

            <div className="kf-ai-human-grid">
              <div className="kf-ai-list">
                <div className="kf-label">What your AI handles</div>
                {aiHandles.map((item) => (
                  <div key={item} className="kf-checkline"><Tick state="done" /><span>{item}</span></div>
                ))}
              </div>
              <div className="kf-human-list">
                <div className="kf-label">What you still control</div>
                {humanControls.map((item) => (
                  <div key={item} className="kf-checkline"><Tick state="now" /><span>{item}</span></div>
                ))}
              </div>
            </div>

            <div className="kf-automation-link">
              <div className="kf-row" style={{ gap: 10 }}>
                <span className="kf-ico"><Icon name="tune" size={16} /></span>
                <p className="kf-body">Exactly what runs on its own vs. needs your approval is set in <b>Automation</b>.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={goAutomation}>Open Automation <Icon name="arrowR" size={14} /></Button>
            </div>
          </Card>
        </Section>

        <Section number="04" title="Knowledge needed" subtitle="What the AI will use">
          <Card className="kf-knowledge-card">
            {knowledgeRows.map((row) => (
              <div key={row.name} className="kf-knowledge-row">
                <span className="kf-ico"><Icon name="doc" size={16} /></span>
                <div className="kf-grow">
                  <div className="kf-between kf-knowledge-main">
                    <strong>{row.name}</strong>
                    {statusBadge(row.status)}
                  </div>
                  {expert ? (
                    <div className="kf-reveal kf-knowledge-meta">
                      <span>{row.channels}</span>
                      <span>Owner: {row.owner}</span>
                      <span>{row.date}</span>
                      <Progress value={row.progress} ok={row.progress === 100} />
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </Card>
        </Section>

        <Section number="05" title="What success looks like" subtitle="Pilot targets">
          <div className="kf-success-grid">
            {successTargets.map((target) => (
              <Card key={target.label} className="kf-success-card">
                <span className="kf-ico ok"><Icon name="target" size={17} /></span>
                <div className="kf-success-value kf-num">{expert ? `${target.value}/${target.goal}` : target.target}</div>
                <div className="kf-h3">{target.label}</div>
                <div className="kf-sm">{target.sub}</div>
                {expert ? <Progress value={target.value} max={target.goal} ok /> : null}
              </Card>
            ))}
          </div>
        </Section>

        <Section number="06" title="Launch checklist" subtitle="One step left">
          <Card className="kf-checklist-card">
            <div className="kf-between kf-progress-head">
              <div>
                <div className="kf-label">Readiness</div>
                <div className="kf-h3">83% complete</div>
              </div>
              <Badge kind="warn" dot>Review test conversation</Badge>
            </div>
            <Progress value={83} large />
            <div className="kf-checklist-list">
              {checklist.map((item) => (
                <div key={item.label} className="kf-check">
                  <Tick state={item.state} />
                  <div className="kf-grow">
                    <div className="kf-check-label">{item.label}</div>
                    {expert ? <div className="kf-sm">{item.owner} · {item.date}</div> : null}
                  </div>
                  {item.state === "now" ? <Button variant="primary" size="sm">Review now</Button> : null}
                </div>
              ))}
            </div>
          </Card>
        </Section>

        {expert ? (
          <Section number="07" title="Live activity" subtitle="Recent voice calls & CRM events">
            <Card className="kf-activity-card">
              {voiceCalls.loading ? (
                <div className="kf-sm" style={{ padding: 12 }}>Loading recent calls…</div>
              ) : voiceCalls.error ? (
                <div className="kf-sm" style={{ padding: 12, color: "var(--kf-warn, #c77)" }}>Error: {voiceCalls.error}</div>
              ) : calls.length === 0 ? (
                <div className="kf-sm" style={{ padding: 12 }}>No voice calls yet.</div>
              ) : (
                calls.map((call: VoiceCall) => (
                  <div key={call.id} className="kf-activity-row">
                    <span className="kf-ico acc"><Icon name={call.mode === "prospect" ? "phone" : "bot"} size={16} /></span>
                    <div className="kf-grow">
                      <strong>{call.mode === "prospect" ? "Prospect call" : "Inbound call"}</strong>
                      <div className="kf-sm">
                        {call.caller_name || call.caller_phone || "Unknown"}
                        {call.summary ? ` — ${call.summary.slice(0, 80)}` : ""}
                      </div>
                    </div>
                    <Badge kind={call.sentiment === "positive" ? "ok" : call.sentiment === "negative" ? "bad" : "info"}>
                      {call.sentiment || "—"}
                    </Badge>
                    <span className="kf-sm">{Math.round(Number(call.duration_seconds || 0) / 60)}m</span>
                  </div>
                ))
              )}
            </Card>
          </Section>
        ) : null}

        <Card className="kf-footer-cta">
          <div>
            <h2 className="kf-h2">One step from launch</h2>
            <p className="kf-body">Review one test conversation, then this pilot is ready to go live.</p>
          </div>
          <div className="kf-row kf-footer-actions">
            <Button>Review test</Button>
            <Button variant="primary"><Icon name="bolt" size={15} />Launch pilot</Button>
          </div>
        </Card>
      </div>
    </>
  );
}
