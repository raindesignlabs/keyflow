/**
 * Typed API client for KeyFlow dashboard.
 * All endpoints are relative to /dashboard/api/ and require the session cookie.
 */

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "same-origin",
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Types ────────────────────────────────────────────────────────────────

export interface MeResponse {
  id: number;
  username: string;
  role: "admin" | "client";
  client_id: string | null;
  organization_id: string | null;
  display_name: string;
}

export interface PipelineResponse {
  stages: string[];
  labels: Record<string, string>;
  pipeline: Record<string, PipelineDeal[]>;
}

export interface PipelineDeal {
  id: string;
  title: string;
  stage: string;
  value: number | null;
  close_date: string | null;
  ai_next_action: string | null;
  days_in_stage: number;
  contact_id: string;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  property_address: string | null;
  updated_at: string;
}

export interface Contact {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  lead_score: number;
  source: string | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  created_at: string;
  updated_at: string;
  deal_count: number;
}

export interface AttentionResponse {
  stalled: AttentionItem[];
  followups: AttentionItem[];
  total: number;
}

export interface AttentionItem {
  type: "stalled_deal" | "overdue_followup";
  id: string;
  label: string;
  detail: string;
}

export interface VoiceCall {
  id: string;
  call_id: string;
  caller_phone: string;
  caller_name: string | null;
  mode: string;
  duration_seconds: string;
  sentiment: string | null;
  summary: string | null;
  started_at: string;
  ended_at: string | null;
  model: string | null;
  llm_provider: string | null;
  topics: any;
}

export interface VoiceCallsResponse {
  calls: VoiceCall[];
  total: number;
  limit: number;
  offset: number;
}

// ── API functions ─────────────────────────────────────────────────────────

export interface PilotSettings {
  capability_modes: Record<string, "auto" | "ask" | "never">;
  require_approval: boolean;
  escalation_rules: string[];
}

export const api = {
  me: () => fetchJson<MeResponse>("/dashboard/api/me"),
  pipeline: () => fetchJson<PipelineResponse>("/dashboard/api/crm/pipeline"),
  contacts: () => fetchJson<Contact[]>("/dashboard/api/crm/contacts"),
  attention: () => fetchJson<AttentionResponse>("/dashboard/api/crm/attention"),
  voiceCalls: (limit = 25, offset = 0) =>
    fetchJson<VoiceCallsResponse>(`/dashboard/api/crm/voice-calls?limit=${limit}&offset=${offset}`),
  stats: () => fetchJson<any>("/dashboard/api/stats"),
  getPilotSettings: () => fetchJson<PilotSettings>("/dashboard/api/pilot/settings"),
  savePilotSettings: (settings: Partial<PilotSettings>) =>
    fetchJson<{ ok: boolean; settings: PilotSettings }>("/dashboard/api/pilot/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),
};
