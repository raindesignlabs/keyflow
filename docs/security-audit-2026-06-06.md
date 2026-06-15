# KeyFlow CRM — Security & Bug Audit (2026-06-06)

Audit of the KeyFlow backend (`src/backend`, scripts, jobs). Scope: bugs, crashes,
conflicts, and security problems. Items marked **FIXED** were changed in this pass;
**OPEN** items need a product/data-model decision and were intentionally not
auto-changed to avoid breaking behavior or giving false assurance.

> Note: `pnpm` (build/typecheck/test) was **not runnable** in the audit
> environment (sandbox denied shell execution), so changes were made to be
> type-correct by construction but were **not** verified by `tsgo`/`vitest`.
> Run `pnpm build && pnpm test` before deploying.

---

## Fixed

### S1 — Entire `/api/*` REST surface had no authentication (Critical)
`index.ts` registered `contacts`, `activities`, `smart-lists`, `deals`,
`properties`, `voice-calls`, `notifications`, `voice-health` with **no auth**.
Anyone able to reach the port could read/modify/delete every tenant's CRM data.
Only `/dashboard/*` was protected.
**Fix:** new `src/backend/middleware/auth.ts` adds an `onRequest` guard for
`/api/*` (except `/api/health`). Accepts a timing-safe `x-api-key`
(`KEYFLOW_API_KEY`) for internal services, or a valid dashboard session cookie.
Fails closed if no key is configured, with a `KEYFLOW_API_AUTH=disabled`
escape hatch for local dev. Wired in `index.ts`; the voice-health worker and
`scripts/test-api.ts` now send the key.

### S3 — Stored XSS in the dashboard UI (High)
Job/email-derived fields (`subject`, `display_name`, `last_error`, `client_id`,
event messages, PDF filenames) were interpolated into `innerHTML`/`onclick`
without escaping. A crafted email subject could run script in an admin's session
→ privilege escalation. **Fix:** added `esc()`/`escJs()` client helpers and a
server-side `escapeHtml()`; applied to `renderTable`, `openPanel`, `loadUsers`,
`loadAttention`, and the nav. PDF links now use `encodeURIComponent`.

### S4 — Hardcoded admin credentials committed (`create-admin-user.ts`) (High)
Script created admin `james` / `password123`. **Fix:** rewritten to require
username+password from argv, enforce an 8-char minimum, and refuse duplicates.
No credential in source.

### B1 — Crash (500) when a session outlives its user (Medium)
Dashboard routes did `findUser(username)!` after auth; if the account was deleted
(or DB reset) the non-null assertion threw. **Fix:** `requireAuth` now resolves
and returns the `DashboardUser` (or `null`, dropping the orphaned session), and
all call sites use it — no more non-null assertions.

### B2 — Voice-call ingestion always failed (Medium)
`handleCallWatcher` POSTed `{callerNumber, duration, …}` but
`/api/voice-calls` requires `{callId, organizationId, callerPhone, …}` → every
call 400'd and was never recorded. **Fix:** payload aligned to the schema; gated
on a new `VOICE_AGENT_ORG_ID` (skips with a warning if unset instead of spamming
400s); sends `x-api-key`. Also removed a dead, precedence-buggy `userMessages`
computation (B3).

---

## Open (need a decision — not auto-changed)

### S2 — CRM routes leak across tenants (High)
`src/backend/dashboard/crm-routes.ts` (`/dashboard/api/crm/pipeline`,
`/contacts`, `/contacts/:id`, `/attention`, `/voice-calls`) authenticate the
session but apply **no `client_id` scoping** — a `client`-role user can read
every tenant's contacts/deals/properties/calls. The main dashboard scopes jobs by
`user.client_id`, but these don't.
**Blocker:** dashboard users carry a string `client_id` (e.g. `dominguez-diana`)
while the Postgres CRM uses `organizationId` (uuid). There is no mapping between
them, so correct scoping needs a data-model decision (add an
org-id/client-id link to `dashboard_users`, then filter every CRM query).
Currently only `/attention` is actually called by the UI; the others are
reachable but unused by the front end.

### Stage-vocabulary mismatch (Medium, latent)
`dealStageEnum` in `schema.ts` defines `lead/qualified/proposal/negotiation/...`,
but `pipelines`/`crm-routes`/`seed.ts` use `new_lead/active_client/under_contract/
inspection/appraisal/clear_to_close/closed`. `deals.stage` is a free `varchar`
(the enum isn't applied), so nothing crashes, but the two vocabularies will
produce empty pipeline columns and inconsistent filtering. Pick one set.

### Weak default DB credentials in source (Low)
`db/index.ts`, `drizzle.config.ts`, `drizzle/migrate.ts` fall back to
`postgresql://james:keyflow@localhost:5432/keyflow`. Fine for local dev, but make
sure `DATABASE_URL` is always set in any shared/prod environment; consider failing
fast if it's missing there.

### Login rate-limiter hygiene (Low)
`routes.ts` `loginAttempts` entries that never reach the lockout threshold are
never cleaned (the sweep only removes expired *locked* entries) — slow unbounded
growth. Also keyed on `request.ip`, which is the proxy IP unless Fastify
`trustProxy` is configured. Low impact.

### Disabled CRM front-end code (Low, cosmetic)
The dashboard template has a real `loadPipeline()` shadowed by a later stub of the
same name (last declaration wins), plus stubbed `openDealPanel/loadContacts/...`.
The Pipeline/Contacts tabs therefore never render. Per the in-file TODO, the
client JS should be moved out of the backend template; tracked for later.

---

## Notes
- No secrets/`.env` files are committed (good). SMTP/Redis/OpenAI creds are read
  from env with localhost-ish defaults.
- API input validation via Zod is solid on the write paths; SQL goes through
  Drizzle parameterization / `sql` templates (no injection found).
