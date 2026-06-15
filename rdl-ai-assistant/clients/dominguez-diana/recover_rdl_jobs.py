#!/usr/bin/env python3.12
"""
Recovery CLI for RDL jobs (all types: property_survey, closing_timeline, etc.).
Operates on the shared rdl_jobs.db.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

RDL_DIR = Path(__file__).parent.parent.parent  # rdl-ai-assistant/
sys.path.insert(0, str(RDL_DIR))

from rdl_jobs import (
    audit_job, init_db, list_jobs, mark_dead_letter, reset_for_replay
)

JOB_TYPES = ["property_survey", "closing_timeline"]


def print_jobs(status: str | None, job_type: str | None, limit: int) -> None:
    jobs = list_jobs(limit=limit, status=status, job_type=job_type)
    if not jobs:
        print("No jobs found.")
        return
    for job in jobs:
        print(
            f"{job['email_id']} | {job['job_type']} | {job['status']} | "
            f"attempts={job['attempts']} | {job['client_id']} | {job['display_name']}"
        )
        if job.get("last_error"):
            first_line = str(job["last_error"]).splitlines()[0]
            print(f"  error: {first_line}")


def print_audit(email_id: str, job_type: str) -> None:
    audit = audit_job(email_id, job_type)
    print(json.dumps(audit["job"], indent=2, ensure_ascii=False))
    print("\nEvents:")
    for event in audit["events"]:
        print(
            f"- {event['created_at']} | {event['event_type']} | "
            f"{event.get('status') or ''} | {event.get('message') or ''}"
        )


def main() -> None:
    parser = argparse.ArgumentParser(description="Recover RDL automation jobs")
    sub = parser.add_subparsers(dest="command", required=True)

    status_cmd = sub.add_parser("status", help="List recent jobs")
    status_cmd.add_argument("--status", help="Filter by status")
    status_cmd.add_argument("--type", dest="job_type", choices=JOB_TYPES, help="Filter by job type")
    status_cmd.add_argument("--limit", type=int, default=20)

    audit_cmd = sub.add_parser("audit", help="Show one job and its event history")
    audit_cmd.add_argument("email_id")
    audit_cmd.add_argument("--type", dest="job_type", required=True, choices=JOB_TYPES)

    replay_cmd = sub.add_parser("replay", help="Reset a job so it processes again")
    replay_cmd.add_argument("email_id")
    replay_cmd.add_argument("--type", dest="job_type", required=True, choices=JOB_TYPES)

    dead_cmd = sub.add_parser("dead-letter", help="Mark a job as failed_dead_letter")
    dead_cmd.add_argument("email_id")
    dead_cmd.add_argument("--type", dest="job_type", required=True, choices=JOB_TYPES)
    dead_cmd.add_argument("--reason", default="Marked dead-letter manually")

    args = parser.parse_args()
    init_db()

    if args.command == "status":
        print_jobs(args.status, args.job_type, args.limit)
    elif args.command == "audit":
        print_audit(args.email_id, args.job_type)
    elif args.command == "replay":
        job = reset_for_replay(args.email_id, args.job_type)
        print(f"Reset for replay: {job['email_id']} | {job['job_type']} | {job['status']}")
    elif args.command == "dead-letter":
        job = mark_dead_letter(args.email_id, args.job_type, args.reason)
        print(f"Dead-lettered: {job['email_id']} | {job['job_type']} | {job['status']}")


if __name__ == "__main__":
    main()
