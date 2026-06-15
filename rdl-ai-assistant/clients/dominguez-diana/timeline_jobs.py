#!/usr/bin/env python3.12
"""SQLite job store for Diana closing timeline automation."""

from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

WORK_DIR = Path(__file__).parent
DB_PATH = WORK_DIR / "timeline_jobs.db"

TERMINAL_STATUSES = {"approval_sent", "customer_sent", "failed_dead_letter"}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@contextmanager
def connect(db_path: Path = DB_PATH):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db(db_path: Path = DB_PATH) -> None:
    with connect(db_path) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email_id TEXT NOT NULL UNIQUE,
                subject TEXT NOT NULL,
                client_name TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'received',
                attempts INTEGER NOT NULL DEFAULT 0,
                source_email_path TEXT,
                json_path TEXT,
                pdf_path TEXT,
                last_error TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                completed_at TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS job_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
                event_type TEXT NOT NULL,
                status TEXT,
                message TEXT,
                meta_json TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_events_job_id ON job_events(job_id)")


def _add_event(conn: sqlite3.Connection, job_id: int, event_type: str, status: str | None = None, message: str | None = None, meta: dict[str, Any] | None = None) -> None:
    conn.execute(
        """
        INSERT INTO job_events (job_id, event_type, status, message, meta_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (job_id, event_type, status, message, json.dumps(meta or {}, ensure_ascii=False), utc_now()),
    )


def get_job(email_id: str) -> dict[str, Any] | None:
    init_db()
    with connect() as conn:
        row = conn.execute("SELECT * FROM jobs WHERE email_id = ?", (email_id,)).fetchone()
        return dict(row) if row else None


def upsert_received(email_id: str, subject: str, client_name: str) -> dict[str, Any]:
    init_db()
    now = utc_now()
    with connect() as conn:
        row = conn.execute("SELECT * FROM jobs WHERE email_id = ?", (email_id,)).fetchone()
        if row:
            conn.execute(
                "UPDATE jobs SET subject = ?, client_name = ?, updated_at = ? WHERE email_id = ?",
                (subject, client_name, now, email_id),
            )
            return dict(conn.execute("SELECT * FROM jobs WHERE email_id = ?", (email_id,)).fetchone())

        cur = conn.execute(
            """
            INSERT INTO jobs (email_id, subject, client_name, status, created_at, updated_at)
            VALUES (?, ?, ?, 'received', ?, ?)
            """,
            (email_id, subject, client_name, now, now),
        )
        if cur.lastrowid is None:
            raise RuntimeError("SQLite did not return a job id")
        job_id = int(cur.lastrowid)
        _add_event(conn, job_id, "created", "received", f"Received {subject}")
        return dict(conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone())


def update_job(email_id: str, status: str, message: str | None = None, **fields: Any) -> dict[str, Any]:
    init_db()
    now = utc_now()
    allowed = {"source_email_path", "json_path", "pdf_path", "last_error"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    updates["status"] = status
    updates["updated_at"] = now
    if status in TERMINAL_STATUSES:
        updates["completed_at"] = now

    with connect() as conn:
        row = conn.execute("SELECT * FROM jobs WHERE email_id = ?", (email_id,)).fetchone()
        if not row:
            raise ValueError(f"Unknown job email_id: {email_id}")
        set_clause = ", ".join(f"{key} = ?" for key in updates)
        conn.execute(
            f"UPDATE jobs SET {set_clause} WHERE email_id = ?",
            [*updates.values(), email_id],
        )
        _add_event(conn, row["id"], "status", status, message, updates)
        return dict(conn.execute("SELECT * FROM jobs WHERE email_id = ?", (email_id,)).fetchone())


def record_failure(email_id: str, error: str, retryable: bool = True) -> dict[str, Any]:
    init_db()
    status = "failed_retryable" if retryable else "failed_dead_letter"
    now = utc_now()
    with connect() as conn:
        row = conn.execute("SELECT * FROM jobs WHERE email_id = ?", (email_id,)).fetchone()
        if not row:
            raise ValueError(f"Unknown job email_id: {email_id}")
        attempts = int(row["attempts"] or 0) + 1
        final_status = "failed_dead_letter" if attempts >= 3 else status
        conn.execute(
            """
            UPDATE jobs
            SET status = ?, attempts = ?, last_error = ?, updated_at = ?, completed_at = CASE WHEN ? = 'failed_dead_letter' THEN ? ELSE completed_at END
            WHERE email_id = ?
            """,
            (final_status, attempts, error, now, final_status, now, email_id),
        )
        _add_event(conn, row["id"], "failure", final_status, error, {"attempts": attempts})
        return dict(conn.execute("SELECT * FROM jobs WHERE email_id = ?", (email_id,)).fetchone())


def should_process(email_id: str) -> bool:
    job = get_job(email_id)
    if not job:
        return True
    return job["status"] not in TERMINAL_STATUSES


def list_jobs(limit: int = 20, status: str | None = None) -> list[dict[str, Any]]:
    init_db()
    with connect() as conn:
        if status:
            rows = conn.execute(
                "SELECT * FROM jobs WHERE status = ? ORDER BY updated_at DESC LIMIT ?",
                (status, limit),
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM jobs ORDER BY updated_at DESC LIMIT ?", (limit,)).fetchall()
        return [dict(row) for row in rows]


def audit_job(email_id: str) -> dict[str, Any]:
    init_db()
    with connect() as conn:
        job = conn.execute("SELECT * FROM jobs WHERE email_id = ?", (email_id,)).fetchone()
        if not job:
            raise ValueError(f"Unknown job email_id: {email_id}")
        events = conn.execute("SELECT * FROM job_events WHERE job_id = ? ORDER BY id", (job["id"],)).fetchall()
        return {"job": dict(job), "events": [dict(row) for row in events]}


def reset_for_replay(email_id: str) -> dict[str, Any]:
    init_db()
    now = utc_now()
    with connect() as conn:
        row = conn.execute("SELECT * FROM jobs WHERE email_id = ?", (email_id,)).fetchone()
        if not row:
            raise ValueError(f"Unknown job email_id: {email_id}")
        conn.execute(
            """
            UPDATE jobs
            SET status = 'received', attempts = 0, last_error = NULL, completed_at = NULL, updated_at = ?
            WHERE email_id = ?
            """,
            (now, email_id),
        )
        _add_event(conn, row["id"], "replay_requested", "received", "Job reset for replay")
        return dict(conn.execute("SELECT * FROM jobs WHERE email_id = ?", (email_id,)).fetchone())


def mark_dead_letter(email_id: str, reason: str = "Marked dead-letter manually") -> dict[str, Any]:
    return update_job(email_id, "failed_dead_letter", reason, last_error=reason)
