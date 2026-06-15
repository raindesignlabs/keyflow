# KeyFlow v1.2 Dashboard Changelog

## 2026-06-13 — Pilot endpoint target locked

### Summary

James approved KeyFlow v1.2 as the Pilot + Automation dashboard endpoint for the client-facing AI Employee control center.

### Architecture decision

- Do not continue building the v1.2 client-facing dashboard as inline HTML/JS inside `src/backend/dashboard/routes.ts`.
- Preserve existing Fastify backend, auth/session system, and dashboard API routes.
- Add a proper dashboard frontend surface, preferably React + TypeScript + Vite, served behind existing dashboard authentication.
- Keep the current operational dashboard available as legacy visibility until the new UI is verified.

### Source design

- Design handoff: `/home/james/my_claude/projects/keyflow/design_handoff_keyflow/`
- Canonical vault note: `/home/james/Documents/Obsidian Vault/RDL/James's notes/02-Projects/KeyFlow v1.2 - Pilot Endpoint.md`
- Implementation plan: `docs/plans/keyflow-v1.2-dashboard.md`

### Known blockers before implementation

- Current dashboard is a large inline template string.
- Current dashboard visual language conflicts with KeyFlow v1.2 direction.
- Current dashboard JS contains duplicated/disabled pipeline/contact functions.
- Automation controls need backend persistence later.
- Dark mode is specified in design but not implemented in prototype CSS.
- `pnpm lint` is blocked by missing ESLint 9 flat config.
- Git state should be treated carefully before relying on status/diff as a safety net.

### Verification baseline from audit

- `pnpm build` passed.
- `pnpm test:run` passed.
- `pnpm lint` failed due to missing `eslint.config.js`.

## 2026-06-13 — Phase 1 started: frontend dependencies added

### Changed

Added dashboard frontend dependencies for the KeyFlow v1.2 React/Vite implementation path:

- `react`
- `react-dom`
- `vite`
- `@vitejs/plugin-react`
- `@types/react`
- `@types/react-dom`

No frontend app shell has been created yet. Existing backend build behavior remains unchanged.

### Verification

- `pnpm build` passed.
- `pnpm test:run` passed: 1 test file, 5 tests.

## 2026-06-13 — Phase 1 shell + Pilot/Automation frontend added

### Changed

Added the first real KeyFlow v1.2 dashboard frontend under `src/frontend/dashboard/`:

- Vite dashboard config and HTML entry.
- React app entry.
- KeyFlow shell/sidebar.
- Client-side route state with direct route support via `?route=` or hash.
- Pilot page with local static pilot data.
- Automation page with local Auto / Ask me / Never permission controls.
- Shared primitives: Badge, Button, Card, Icon, ModePicker, Progress, Section, Switch.
- KeyFlow token CSS and page-level CSS.

### Verification

- `pnpm dashboard:build` passed.
- `pnpm build` passed.
- `pnpm test:run` passed: 1 test file, 5 tests.
- Headless Chrome rendered screenshots for Pilot and Automation from the built bundle:
  - `/tmp/keyflow-v12-pilot-final.png`
  - `/tmp/keyflow-v12-automation.png`

### Notes

- Frontend is not wired into Fastify yet.
- Pilot and Automation use local static sample data only.
- Existing backend/auth/API routes are untouched.
- Visual audit found header/body grid alignment issue on Automation; CSS was adjusted before backend serving.

## 2026-06-13 — Fastify serving wired for v1.2 dashboard

### Changed

Wired the built React/Vite dashboard into existing Fastify dashboard routing:

- `/dashboard` now serves the KeyFlow v1.2 React app after existing session auth.
- `/dashboard/assets/*` serves built dashboard assets after existing session auth.
- `/dashboard/legacy` preserves the previous inline operational dashboard behind auth.
- Existing `/dashboard/login`, `/dashboard/logout`, `/dashboard/api/*`, and `/dashboard/stream` behavior remains in place.

### Verification

- `pnpm build` passed.
- `pnpm test:run` passed: 1 test file, 5 tests.
- Local TypeScript runtime server started on `127.0.0.1:3321`.
- `GET /dashboard` without session returned `302 /dashboard/login`.
- `GET /dashboard/login` returned `200` and login HTML.
- `GET /dashboard/assets/<built-js>` without session returned `401 Unauthorized`.
- `GET /dashboard/legacy` without session returned `302 /dashboard/login`.

### Known unrelated blocker found during verification

`node dist/backend/index.js` currently fails before server startup because `dist/backend/routes/properties.js` imports `../models/schema` without a `.js` extension. The TypeScript runtime path (`pnpm exec tsx src/backend/index.ts`) works and was used for HTTP route verification. This appears unrelated to the dashboard frontend work but should be fixed before relying on compiled Node startup.

## 2026-06-13 — Full dashboard roadmap summary captured

### Changed

Created `docs/keyflow-full-dashboard-roadmap-summary.md`, summarizing:

- KeyFlow direction beyond v1.2 pilot.
- Full client-facing dashboard areas.
- RDL admin dashboard areas.
- Product maturity path through v2.0.
- Main dashboard page concept.
- Visual Kanban / Work in Motion board concept.

### Purpose

This is the product/design reference for moving beyond Pilot + Automation into the full-featured client and RDL admin dashboard.
