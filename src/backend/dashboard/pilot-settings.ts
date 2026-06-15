/**
 * Pilot automation settings — persisted per-user in the SQLite auth DB.
 *
 * Stores capability modes (auto/ask/never), approval toggle, and escalation rules.
 * Backed by a single JSON row per user for simplicity.
 */

import { getDb } from "./users.js";

export interface PilotSettings {
  capability_modes: Record<string, "auto" | "ask" | "never">;
  require_approval: boolean;
  escalation_rules: string[];
}

const DEFAULT_SETTINGS: PilotSettings = {
  capability_modes: {},
  require_approval: true,
  escalation_rules: [
    "Asks for Diana by name",
    "Budget over $1M",
    "Upset or complaint",
    "Legal question",
    "Mentions another agent",
  ],
};

export function ensurePilotSettingsTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS pilot_settings (
      user_id          INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      capability_modes TEXT    NOT NULL DEFAULT '{}',
      require_approval INTEGER NOT NULL DEFAULT 1,
      escalation_rules TEXT    NOT NULL DEFAULT '[]',
      updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function getPilotSettings(userId: number): PilotSettings {
  const db = getDb();
  ensurePilotSettingsTable();
  const row = db.prepare(
    "SELECT capability_modes, require_approval, escalation_rules FROM pilot_settings WHERE user_id = ?"
  ).get(userId) as { capability_modes: string; require_approval: number; escalation_rules: string } | undefined;

  if (!row) return { ...DEFAULT_SETTINGS };

  return {
    capability_modes: JSON.parse(row.capability_modes),
    require_approval: Boolean(row.require_approval),
    escalation_rules: JSON.parse(row.escalation_rules),
  };
}

export function savePilotSettings(userId: number, settings: PilotSettings): void {
  const db = getDb();
  ensurePilotSettingsTable();
  db.prepare(`
    INSERT INTO pilot_settings (user_id, capability_modes, require_approval, escalation_rules, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      capability_modes = excluded.capability_modes,
      require_approval = excluded.require_approval,
      escalation_rules = excluded.escalation_rules,
      updated_at = datetime('now')
  `).run(
    userId,
    JSON.stringify(settings.capability_modes),
    settings.require_approval ? 1 : 0,
    JSON.stringify(settings.escalation_rules),
  );
}
