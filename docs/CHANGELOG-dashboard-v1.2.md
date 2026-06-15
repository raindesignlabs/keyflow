# CHANGELOG — Dashboard v1.2 Pilot Readiness

## 2026-06-14 — Multi-tenant security, real data wiring, settings persistence

### Fixed
- **Backend ESM import crash** — `src/backend/routes/properties.ts` was missing `.js` extensions on relative imports, causing the compiled server to crash on startup. Fixed both import paths.
- **Blank dashboard page** — Fastify async route handlers in `routes.ts` were not returning `reply.send()` results, causing empty responses (0 bytes) for the dashboard HTML and JS bundle. All handlers now explicitly return the reply object.
- **Cloudflare tunnel DNS** — `keyflow.raindesignlabs.net` had a stale CNAME pointing to an old tunnel ID (`83e78c30-...`). Updated to the active tunnel (`df2eb111-...`) via Cloudflare API.
- **ESLint 9 broken** — No flat config existed for ESLint 9. Created `eslint.config.js` with typescript-eslint recommended ruleset. Cleaned 18 pre-existing unused-vars errors.

### Added
- **`GET /dashboard/api/me`** — Returns authenticated user context (id, username, role, organization_id, display_name) for frontend workspace display.
- **Multi-tenant organization scoping** — Added `organization_id` UUID column to `dashboard_users` SQLite table, mapping to Postgres `organizations.id`. Every CRM route in `crm-routes.ts` now resolves the authenticated user's org and scopes all queries:
  - Admins (`role: admin`) see all data across orgs.
  - Client-role users restricted to their `organization_id`.
  - Users with null `organization_id` see zero records (fail-safe).
  - All queries use parameterized Drizzle `sql` template tags — no injection vectors.
- **`GET/PUT /dashboard/api/pilot/settings`** — Per-user persistence for automation guardrails (capability modes, approval toggle, escalation rules) in SQLite `pilot_settings` table.
- **Frontend API client** (`src/frontend/dashboard/src/lib/api.ts`) — Typed fetch wrapper for all CRM and pilot endpoints.
- **`useApi` hook** (`src/frontend/dashboard/src/hooks/useApi.ts`) — Data-fetching hook with loading/error/refetch state.
- **Real data wiring in PilotPage** — KPI grid and live activity feed now fetch real voice calls, pipeline deals, and attention items from CRM endpoints instead of sample data.
- **Settings persistence in AutomationPage** — Mode pickers, approval toggle, and escalation rules now auto-save to backend on change with debounced persistence and live "Saving…/Saved" badge.
- **Shell workspace context** — Sidebar now shows real user initials, workspace name, and role from `/api/me`.
- **`manage-users.ts` CLI** — Added `--org-id <uuid>` flag for user creation, `org <username> <uuid>` command for updating, and org column in `list` output.

### Security
- **Tenant isolation verified** — Test user with null org_id confirmed to see 0 contacts, 0 voice calls, 0 pipeline deals. Unauthenticated requests return 401 across all endpoints.
- All CRM queries parameterized via Drizzle ORM `sql` template literals.

### Infrastructure
- ESLint 9 flat config (`eslint.config.js`) with typescript-eslint 8.61.0.
- All three quality gates passing: `pnpm lint` (0 errors), `pnpm build`, `pnpm test:run` (5/5).

### Files Modified
- `src/backend/routes/properties.ts` — ESM import fix
- `src/backend/dashboard/routes.ts` — `/api/me`, `/api/pilot/settings` endpoints, Fastify reply fix
- `src/backend/dashboard/users.ts` — `organization_id` column, `getDb` export
- `src/backend/dashboard/crm-routes.ts` — Full rewrite with org scoping (327 lines)
- `src/backend/dashboard/pilot-settings.ts` — NEW: settings persistence module
- `src/frontend/dashboard/src/lib/api.ts` — NEW: typed API client
- `src/frontend/dashboard/src/hooks/useApi.ts` — NEW: data-fetching hook
- `src/frontend/dashboard/src/components/Shell.tsx` — Real user context
- `src/frontend/dashboard/src/routes/PilotPage.tsx` — Real data wiring
- `src/frontend/dashboard/src/routes/AutomationPage.tsx` — Settings persistence
- `scripts/manage-users.ts` — Org management commands
- `eslint.config.js` — NEW: ESLint 9 flat config
