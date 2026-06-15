To: james.w.jameson@icloud.com
Subject: KeyFlow CRM — Security & Bug Audit Summary (2026-06-06)

Hi James,

I audited the KeyFlow CRM backend for bugs, crashes, conflicts, and security
problems, and applied fixes. Summary below; full write-up is in the repo at
docs/security-audit-2026-06-06.md.

FIXED (committed to the working tree):

1. CRITICAL — No auth on the REST API. Every /api/* route (contacts, deals,
   activities, smart-lists, properties, voice-calls, notifications) was exposed
   with no authentication — anyone reaching the server could read or delete all
   data for all tenants. Added an API-key/session guard (middleware/auth.ts).

2. HIGH — Stored XSS in the dashboard. Email-derived fields (subject, name,
   error text) were rendered without escaping, so a crafted email could run
   script in an admin's browser. Added output escaping everywhere.

3. HIGH — Hardcoded admin password ("password123") committed in
   create-admin-user.ts. Removed; the script now requires credentials as
   arguments with a minimum length.

4. MEDIUM — 500 crash when a login session outlived a deleted user account.
   Hardened the session-to-user lookup.

5. MEDIUM — Voice-call ingestion always failed (worker sent a payload the API
   rejected). Fixed the payload and gated it on a configured org id.

STILL OPEN (need a decision, not yet changed):

- HIGH — The dashboard CRM endpoints (/dashboard/api/crm/*) don't scope data by
  client, so a client-role user can read every tenant's contacts/deals/calls.
  Fixing it correctly needs a decision on how dashboard client_id maps to the
  Postgres organization id. This is the most important remaining item.
- Deal-stage vocabulary mismatch between the schema enum and the pipeline code.
- Weak default DB credentials in source (fine for local dev; set DATABASE_URL
  in shared environments).

NOTE: I couldn't run the build/test suite in this environment, so please run
`pnpm build && pnpm test` before deploying.

The Stratus audit you asked for (in ~5 hours) is pending — I couldn't locate a
"Stratus" project under ~/my_claude/projects; send me its path and I'll run the
same audit.

— Claude
