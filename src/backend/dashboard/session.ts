/**
 * Shared in-memory session store for the dashboard.
 * Single source of truth — imported by both routes.ts and crm-routes.ts.
 */

import { randomBytes } from "node:crypto";

const sessions = new Map<string, { username: string; expires: number }>();

export function createSession(username: string): string {
  const token = randomBytes(32).toString("hex");
  sessions.set(token, { username, expires: Date.now() + 24 * 60 * 60 * 1000 });
  return token;
}

export function getSession(token: string): string | null {
  const s = sessions.get(token);
  if (!s || s.expires < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return s.username;
}

export function deleteSession(token: string): void {
  sessions.delete(token);
}
