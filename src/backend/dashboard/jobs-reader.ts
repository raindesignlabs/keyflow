/**
 * Read RDL job data from SQLite databases.
 * Bridges Python-land SQLite into the Fastify dashboard.
 */

import Database from "better-sqlite3";
import fs from "fs";

const RDL_DB =
  process.env.RDL_JOBS_DB ||
  "/home/james/my_claude/projects/keyflow/rdl-ai-assistant/rdl_jobs.db";

const LEGACY_DB =
  process.env.TIMELINE_JOBS_DB ||
  "/home/james/my_claude/projects/keyflow/rdl-ai-assistant/clients/dominguez-diana/timeline_jobs.db";

export interface Job {
  id: number;
  email_id: string;
  job_type: string;
  client_id: string;
  subject: string;
  display_name: string;
  status: string;
  attempts: number;
  source_email_path: string | null;
  source_attachment_path: string | null;
  json_path: string | null;
  pdf_path: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface JobEvent {
  id: number;
  job_id: number;
  event_type: string;
  status: string | null;
  message: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface DailyStats {
  date: string;
  total: number;
  completed: number;
  failed: number;
  in_progress: number;
}

function openDb(dbPath: string): Database.Database | null {
  if (!fs.existsSync(dbPath)) return null;
  return new Database(dbPath, { readonly: true });
}

/** Normalize legacy timeline_jobs rows into Job shape */
function normalizeLegacyRow(row: Record<string, unknown>): Job {
  return {
    id: row.id as number,
    email_id: row.email_id as string,
    job_type: "closing_timeline",
    client_id: "dominguez-diana",
    subject: row.subject as string,
    display_name: row.client_name as string,
    status: row.status as string,
    attempts: row.attempts as number,
    source_email_path: row.source_email_path as string | null,
    source_attachment_path: null,
    json_path: row.json_path as string | null,
    pdf_path: row.pdf_path as string | null,
    last_error: row.last_error as string | null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    completed_at: row.completed_at as string | null,
  };
}

export function listJobs(options: {
  client_id?: string;
  job_type?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Job[] {
  const { client_id, job_type, status, limit = 50, offset = 0 } = options;

  const jobs: Job[] = [];

  // Read from rdl_jobs.db (new shared DB)
  const db = openDb(RDL_DB);
  if (db) {
    try {
      const clauses: string[] = [];
      const params: unknown[] = [];
      if (client_id) { clauses.push("client_id = ?"); params.push(client_id); }
      if (job_type) { clauses.push("job_type = ?"); params.push(job_type); }
      if (status) { clauses.push("status = ?"); params.push(status); }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const rows = db
        .prepare(`SELECT * FROM jobs ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`)
        .all([...params, limit, offset]) as Job[];
      jobs.push(...rows);
    } finally {
      db.close();
    }
  }

  // Read from legacy timeline_jobs.db — only if no job_type filter or filter is closing_timeline
  const wantTimeline = !job_type || job_type === "closing_timeline";
  const wantClient = !client_id || client_id === "dominguez-diana";

  if (wantTimeline && wantClient) {
    const legacyDb = openDb(LEGACY_DB);
    if (legacyDb) {
      try {
        const clauses: string[] = [];
        const params: unknown[] = [];
        if (status) { clauses.push("status = ?"); params.push(status); }
        const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
        const rows = legacyDb
          .prepare(`SELECT * FROM jobs ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`)
          .all([...params, limit, offset]) as Record<string, unknown>[];
        jobs.push(...rows.map(normalizeLegacyRow));
      } finally {
        legacyDb.close();
      }
    }
  }

  // Sort combined results by updated_at desc, respect limit
  jobs.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  return jobs.slice(0, limit);
}

export function getJob(emailId: string, jobType: string): Job | null {
  if (jobType === "closing_timeline") {
    const db = openDb(LEGACY_DB);
    if (!db) return null;
    try {
      const row = db.prepare("SELECT * FROM jobs WHERE email_id = ?").get(emailId) as Record<string, unknown> | undefined;
      return row ? normalizeLegacyRow(row) : null;
    } finally {
      db.close();
    }
  }
  const db = openDb(RDL_DB);
  if (!db) return null;
  try {
    return (db.prepare("SELECT * FROM jobs WHERE email_id = ? AND job_type = ?").get(emailId, jobType) as Job) || null;
  } finally {
    db.close();
  }
}

export function getJobEvents(emailId: string, jobType: string): JobEvent[] {
  const job = getJob(emailId, jobType);
  if (!job) return [];
  const dbPath = jobType === "closing_timeline" ? LEGACY_DB : RDL_DB;
  const db = openDb(dbPath);
  if (!db) return [];
  try {
    return db.prepare("SELECT * FROM job_events WHERE job_id = ? ORDER BY id").all(job.id) as JobEvent[];
  } finally {
    db.close();
  }
}

export function getStats(client_id?: string): {
  total: number;
  completed: number;
  failed: number;
  in_progress: number;
  error_rate: number;
  last_24h: number;
  clients: string[];
} {
  const jobs = listJobs({ client_id, limit: 1000 });
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const terminal = ["approval_sent", "customer_sent"];
  const failed = ["failed_dead_letter", "failed_retryable"];
  const active = ["received", "reading_email", "source_saved", "downloading",
                  "attachment_downloaded", "parsing", "parsed", "building_pdf",
                  "pdf_built", "sending_approval"];

  const completed = jobs.filter((j) => terminal.includes(j.status)).length;
  const failedCount = jobs.filter((j) => failed.includes(j.status)).length;
  const inProgress = jobs.filter((j) => active.includes(j.status)).length;
  const last24h = jobs.filter((j) => j.updated_at >= yesterday).length;
  const clients = [...new Set(jobs.map((j) => j.client_id))];

  return {
    total: jobs.length,
    completed,
    failed: failedCount,
    in_progress: inProgress,
    error_rate: jobs.length > 0 ? Math.round((failedCount / jobs.length) * 100) : 0,
    last_24h: last24h,
    clients,
  };
}

export function getDailyStats(client_id?: string, days = 7): DailyStats[] {
  const jobs = listJobs({ client_id, limit: 1000 });
  const map = new Map<string, DailyStats>();

  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, { date: key, total: 0, completed: 0, failed: 0, in_progress: 0 });
  }

  const terminal = ["approval_sent", "customer_sent"];
  const failed = ["failed_dead_letter", "failed_retryable"];

  for (const job of jobs) {
    const key = job.updated_at.slice(0, 10);
    const day = map.get(key);
    if (!day) continue;
    day.total++;
    if (terminal.includes(job.status)) day.completed++;
    else if (failed.includes(job.status)) day.failed++;
    else day.in_progress++;
  }

  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}
