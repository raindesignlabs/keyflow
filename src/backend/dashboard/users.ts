/**
 * Dashboard user store — SQLite-backed with bcrypt passwords.
 *
 * Roles:
 *   admin  — full access, sees all clients, can manage users
 *   client — sees only their own client_id data
 *
 * DB: dashboard_users.db (auto-created on first run)
 */

import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const DB_PATH =
  process.env.DASHBOARD_USERS_DB ||
  path.resolve(import.meta.dirname, "../../dashboard_users.db");

export interface DashboardUser {
  id: number;
  username: string;
  password_hash: string;
  role: "admin" | "client";
  client_id: string | null;
  organization_id: string | null; // UUID FK to Postgres organizations.id
  display_name: string;
  created_at: string;
  updated_at: string;
}

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  _db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL CHECK(role IN ('admin', 'client')),
      client_id     TEXT,
      display_name  TEXT NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── Migrations ──────────────────────────────────────────────────────
  // Add organization_id column (links dashboard user to Postgres org).
  // SQLite has no ADD COLUMN IF NOT EXISTS — guard with PRAGMA check.
  const cols = _db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  const colNames = cols.map((c) => c.name);
  if (!colNames.includes("organization_id")) {
    _db.exec("ALTER TABLE users ADD COLUMN organization_id TEXT");
  }

  return _db;
}

// ── Query functions ──────────────────────────────────────────────────────

export function findUser(username: string): DashboardUser | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username) as DashboardUser | undefined;
}

export function findUserById(id: number): DashboardUser | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(id) as DashboardUser | undefined;
}

export function checkPassword(user: DashboardUser, password: string): boolean {
  return bcrypt.compareSync(password, user.password_hash);
}

export function listUsers(): Omit<DashboardUser, "password_hash">[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT id, username, role, client_id, organization_id, display_name, created_at, updated_at FROM users ORDER BY id"
    )
    .all() as Omit<DashboardUser, "password_hash">[];
}

export function createUser(opts: {
  username: string;
  password: string;
  role: "admin" | "client";
  client_id?: string | null;
  organization_id?: string | null;
  display_name: string;
}): DashboardUser {
  const db = getDb();
  const hash = bcrypt.hashSync(opts.password, 10);
  const info = db
    .prepare(
      `INSERT INTO users (username, password_hash, role, client_id, organization_id, display_name)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      opts.username,
      hash,
      opts.role,
      opts.client_id ?? null,
      opts.organization_id ?? null,
      opts.display_name
    );
  return findUserById(info.lastInsertRowid as number)!;
}

export function updateUser(
  id: number,
  opts: {
    role?: "admin" | "client";
    client_id?: string | null;
    organization_id?: string | null;
    display_name?: string;
  }
): DashboardUser | undefined {
  const db = getDb();
  const sets: string[] = [];
  const vals: unknown[] = [];

  if (opts.role !== undefined) {
    sets.push("role = ?");
    vals.push(opts.role);
  }
  if (opts.client_id !== undefined) {
    sets.push("client_id = ?");
    vals.push(opts.client_id);
  }
  if (opts.organization_id !== undefined) {
    sets.push("organization_id = ?");
    vals.push(opts.organization_id);
  }
  if (opts.display_name !== undefined) {
    sets.push("display_name = ?");
    vals.push(opts.display_name);
  }

  if (sets.length === 0) return findUserById(id);

  sets.push("updated_at = datetime('now')");
  vals.push(id);

  db.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  return findUserById(id);
}

export function changePassword(id: number, newPassword: string): boolean {
  const db = getDb();
  const hash = bcrypt.hashSync(newPassword, 10);
  const info = db
    .prepare(
      `UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`
    )
    .run(hash, id);
  return info.changes > 0;
}

export function deleteUser(id: number): boolean {
  const db = getDb();
  const info = db.prepare("DELETE FROM users WHERE id = ?").run(id);
  return info.changes > 0;
}
