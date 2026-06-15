#!/usr/bin/env python3.12
"""Recovery CLI for Diana closing timeline jobs."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from timeline_jobs import audit_job, init_db, list_jobs, mark_dead_letter, reset_for_replay


def print_jobs(status: str | None, limit: int) -> None:
    jobs = list_jobs(limit=limit, status=status)
    if not jobs:
        print("No jobs found.")
        return
    for job in jobs:
        print(f"{job['email_id']} | {job['status']} | attempts={job['attempts']} | {job['client_name']} | {job['subject']}")
        if job.get("last_error"):
            first_line = str(job["last_error"]).splitlines()[0]
            print(f"  error: {first_line}")


def print_audit(email_id: str) -> None:
    audit = audit_job(email_id)
    print(json.dumps(audit["job"], indent=2, ensure_ascii=False))
    print("\nEvents:")
    for event in audit["events"]:
        print(f"- {event['created_at']} | {event['event_type']} | {event.get('status') or ''} | {event.get('message') or ''}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Recover closing timeline automation jobs")
    sub = parser.add_subparsers(dest="command", required=True)

    status_cmd = sub.add_parser("status", help="List recent jobs")
    status_cmd.add_argument("--status", help="Filter by status")
    status_cmd.add_argument("--limit", type=int, default=20)

    audit_cmd = sub.add_parser("audit", help="Show one job and its event history")
    audit_cmd.add_argument("email_id")

    replay_cmd = sub.add_parser("replay", help="Reset a failed/non-terminal job so watch_emails.py processes it again")
    replay_cmd.add_argument("email_id")

    dead_cmd = sub.add_parser("dead-letter", help="Mark a job as failed_dead_letter")
    dead_cmd.add_argument("email_id")
    dead_cmd.add_argument("--reason", default="Marked dead-letter manually")

    args = parser.parse_args()
    init_db()

    if args.command == "status":
        print_jobs(args.status, args.limit)
    elif args.command == "audit":
        print_audit(args.email_id)
    elif args.command == "replay":
        job = reset_for_replay(args.email_id)
        print(f"Reset for replay: {job['email_id']} | {job['status']}")
    elif args.command == "dead-letter":
        job = mark_dead_letter(args.email_id, args.reason)
        print(f"Dead-lettered: {job['email_id']} | {job['status']}")


if __name__ == "__main__":
    main()
