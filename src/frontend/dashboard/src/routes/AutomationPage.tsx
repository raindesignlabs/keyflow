import { useEffect, useMemo, useState, useCallback } from "react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Icon } from "../components/Icon";
import { ModePicker } from "../components/ModePicker";
import { Switch } from "../components/Switch";
import { api } from "../lib/api";
import {
  type AutomationCapability,
  type AutomationMode,
  escalationRules as defaultEscalationRules,
  leadHandlingCapabilities,
  outreachCapabilities,
} from "../data/automationSample";

const MODE_BADGE: Record<AutomationMode, { kind: "ok" | "warn" | "bad"; label: string }> = {
  auto: { kind: "ok", label: "Run automatically" },
  ask: { kind: "warn", label: "Ask you first" },
  never: { kind: "bad", label: "Off-limits" },
};

function initialModes(groups: AutomationCapability[][]) {
  return Object.fromEntries(groups.flat().map((capability) => [capability.label, capability.defaultMode])) as Record<string, AutomationMode>;
}

function CapabilityRow({ capability, mode, onChange }: { capability: AutomationCapability; mode: AutomationMode; onChange: (mode: AutomationMode) => void }) {
  return (
    <div className="kf-capability-row">
      <div className="kf-grow">
        <div className="kf-row kf-capability-title-row">
          <h3 className="kf-h3">{capability.label}</h3>
          <Badge kind={MODE_BADGE[mode].kind}>{MODE_BADGE[mode].label}</Badge>
        </div>
        <p className="kf-body">{capability.description}</p>
      </div>
      <ModePicker value={mode} onChange={onChange} label={capability.label} />
    </div>
  );
}

function CapabilityGroup({ title, subtitle, capabilities, modes, setMode }: {
  title: string;
  subtitle: string;
  capabilities: AutomationCapability[];
  modes: Record<string, AutomationMode>;
  setMode: (label: string, mode: AutomationMode) => void;
}) {
  return (
    <Card className="kf-auto-group">
      <div className="kf-auto-group-head">
        <h2 className="kf-h2">{title}</h2>
        <p className="kf-body">{subtitle}</p>
      </div>
      <div className="kf-capability-list">
        {capabilities.map((capability) => (
          <CapabilityRow
            key={capability.label}
            capability={capability}
            mode={modes[capability.label]}
            onChange={(mode) => setMode(capability.label, mode)}
          />
        ))}
      </div>
    </Card>
  );
}

export function AutomationPage() {
  const [modes, setModes] = useState(() => initialModes([leadHandlingCapabilities, outreachCapabilities]));
  const [requireApproval, setRequireApproval] = useState(true);
  const [escalationRulesState, setEscalationRules] = useState<string[]>([...defaultEscalationRules]);
  const [_, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // Load persisted settings on mount
  useEffect(() => {
    api.getPilotSettings().then((s) => {
      // Merge saved modes over defaults (new capabilities keep their default)
      setModes((prev) => ({ ...prev, ...s.capability_modes }));
      setRequireApproval(s.require_approval);
      if (s.escalation_rules.length) setEscalationRules(s.escalation_rules);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  // Debounced save whenever settings change (after initial load)
  const persist = useCallback((patch: { capability_modes?: Record<string, AutomationMode>; require_approval?: boolean; escalation_rules?: string[] }) => {
    setSaving(true);
    api.savePilotSettings(patch)
      .then(() => {
        setSaving(false);
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 2000);
      })
      .catch(() => setSaving(false));
  }, []);

  const counts = useMemo(() => {
    const values = Object.values(modes);
    return {
      auto: values.filter((mode) => mode === "auto").length,
      ask: values.filter((mode) => mode === "ask").length,
      never: values.filter((mode) => mode === "never").length,
    };
  }, [modes]);

  function setMode(label: string, mode: AutomationMode) {
    setModes((current) => {
      const next = { ...current, [label]: mode };
      persist({ capability_modes: next });
      return next;
    });
  }

  function handleApprovalChange(value: boolean) {
    setRequireApproval(value);
    persist({ require_approval: value });
  }

  return (
    <>
      <header className="kf-pilot-header">
        <div className="kf-between kf-pilot-header-main">
          <div>
            <div className="kf-row kf-pilot-eyebrow-row">
              <span className="kf-eyebrow">Control center</span>
              <Badge kind={saving ? "warn" : savedFlash ? "ok" : "ok"} dot>{saving ? "Saving…" : savedFlash ? "Saved" : "All changes saved"}</Badge>
            </div>
            <h1 className="kf-h1">Automation</h1>
          </div>
          <div className="kf-row kf-pilot-actions">
            <Button><Icon name="bot" size={15} />Test a conversation</Button>
          </div>
        </div>
      </header>

      <div className="kf-auto-content">
        <p className="kf-body kf-pilot-intro">
          Decide what Diana&apos;s AI employee can do automatically, what needs approval first, and what stays completely off-limits.
        </p>

        <div className="kf-auto-summary-grid">
          <Card className="kf-auto-summary-card ok">
            <span className="kf-ico ok"><Icon name="bolt" size={17} /></span>
            <div>
              <div className="kf-kpi-val kf-num">{counts.auto}</div>
              <div className="kf-h3">Run automatically</div>
              <p className="kf-sm">Safe routine work</p>
            </div>
          </Card>
          <Card className="kf-auto-summary-card warn">
            <span className="kf-ico warn"><Icon name="approvals" size={17} /></span>
            <div>
              <div className="kf-kpi-val kf-num">{counts.ask}</div>
              <div className="kf-h3">Ask you first</div>
              <p className="kf-sm">Human review required</p>
            </div>
          </Card>
          <Card className="kf-auto-summary-card bad">
            <span className="kf-ico"><Icon name="settings" size={17} /></span>
            <div>
              <div className="kf-kpi-val kf-num">{counts.never}</div>
              <div className="kf-h3">Off-limits</div>
              <p className="kf-sm">AI must escalate</p>
            </div>
          </Card>
        </div>

        <Card className="kf-reply-flow-card">
          <div className="kf-label">How a reply flows</div>
          <div className="kf-reply-flow">
            <span>New lead</span>
            <Icon name="arrowR" size={14} />
            <span>AI drafts</span>
            <Icon name="arrowR" size={14} />
            <span className="gate">Approval gate</span>
            <Icon name="arrowR" size={14} />
            <span>You approve</span>
            <Icon name="arrowR" size={14} />
            <span>Sent</span>
          </div>
        </Card>

        <CapabilityGroup
          title="Lead handling"
          subtitle="Routine intake, lead response, qualification, and appointment handoff."
          capabilities={leadHandlingCapabilities}
          modes={modes}
          setMode={setMode}
        />

        <CapabilityGroup
          title="Outreach, pricing & legal"
          subtitle="Outbound messages and high-risk topics that need tighter guardrails."
          capabilities={outreachCapabilities}
          modes={modes}
          setMode={setMode}
        />

        <Card className="kf-approval-window-card">
          <div>
            <h2 className="kf-h2">Approval window</h2>
            <p className="kf-body">Require human approval before the first outbound message to a new lead.</p>
          </div>
          <Switch checked={requireApproval} onChange={handleApprovalChange} label="Require approval" />
        </Card>

        <Card className="kf-escalation-card">
          <div className="kf-between kf-escalation-head">
            <div>
              <h2 className="kf-h2">Always escalate to you</h2>
              <p className="kf-body">These situations should never be handled fully by AI.</p>
            </div>
            <Button variant="subtle" size="sm"><Icon name="plus" size={13} />Add rule</Button>
          </div>
          <div className="kf-escalation-chips">
            {escalationRulesState.map((rule) => <Badge key={rule} kind="warn">{rule}</Badge>)}
          </div>
        </Card>
      </div>
    </>
  );
}
