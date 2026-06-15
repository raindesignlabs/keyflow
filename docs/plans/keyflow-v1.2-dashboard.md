# KeyFlow v1.2 Dashboard Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build KeyFlow v1.2 as a polished client-facing Pilot + Automation dashboard for managing an AI employee.

**Architecture:** Preserve the existing Fastify backend, auth/session system, and `/dashboard/api/*` APIs. Add a proper React + TypeScript dashboard frontend served behind the existing authenticated `/dashboard` route. Keep the current inline dashboard available as legacy operational visibility until the new UI is verified.

**Tech Stack:** Fastify 5, TypeScript, Vite, React, CSS variables from `design_handoff_keyflow/source/keyflow-tokens.css`, existing KeyFlow dashboard session cookie.

---

## Source Inputs

Design handoff:

- `/home/james/my_claude/projects/keyflow/design_handoff_keyflow/README.md`
- `/home/james/my_claude/projects/keyflow/design_handoff_keyflow/source/Brand Guide.md`
- `/home/james/my_claude/projects/keyflow/design_handoff_keyflow/source/keyflow-tokens.css`
- `/home/james/my_claude/projects/keyflow/design_handoff_keyflow/source/pilot-pro.jsx`
- `/home/james/my_claude/projects/keyflow/design_handoff_keyflow/source/keyflow-icons.jsx`

Backend files to preserve:

- `src/backend/index.ts`
- `src/backend/dashboard/routes.ts`
- `src/backend/dashboard/crm-routes.ts`
- `src/backend/dashboard/session.ts`
- `src/backend/dashboard/users.ts`

Vault endpoint note:

- `/home/james/Documents/Obsidian Vault/RDL/James's notes/02-Projects/KeyFlow v1.2 - Pilot Endpoint.md`

---

## Guardrails

- Do not ship the design prototype directly.
- Do not use browser Babel/CDN React in production.
- Do not continue expanding the current inline dashboard string for v1.2.
- Do not remove legacy operational dashboard until replacement is verified.
- Keep auth/session protection intact.
- Use Manrope and RDL cyan `#00B3EA` tokens.
- Client-facing copy stays non-technical.
- Make small changes, verify after each step.

---

## Phase 0 — Baseline Verification

### Task 0.1: Verify current backend still builds

**Objective:** Establish baseline before touching code.

**Files:** none

**Command:**

```bash
cd /home/james/my_claude/projects/keyflow
pnpm build
```

**Expected:** TypeScript build passes.

### Task 0.2: Verify current tests pass

**Objective:** Establish test baseline.

**Files:** none

**Command:**

```bash
cd /home/james/my_claude/projects/keyflow
pnpm test:run
```

**Expected:** Existing Vitest suite passes.

### Task 0.3: Record lint blocker

**Objective:** Do not treat lint failure as a new regression.

**Command:**

```bash
cd /home/james/my_claude/projects/keyflow
pnpm lint
```

**Expected:** Fails until ESLint 9 config is added. This is existing tooling debt.

---

## Phase 1 — Frontend Shell Setup

### Task 1.1: Add frontend package dependencies

**Objective:** Add React/Vite frontend dependencies without changing backend behavior.

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Dependencies:**

- `react`
- `react-dom`
- `@vitejs/plugin-react`
- `vite`
- `@types/react`
- `@types/react-dom`

**Scripts to add:**

```json
{
  "dashboard:dev": "vite --config src/frontend/dashboard/vite.config.ts",
  "dashboard:build": "vite build --config src/frontend/dashboard/vite.config.ts",
  "build": "pnpm dashboard:build && tsc"
}
```

**Verification:**

```bash
pnpm install
pnpm build
pnpm test:run
```

### Task 1.2: Create dashboard frontend folder

**Objective:** Add frontend app skeleton.

**Files:**

- Create: `src/frontend/dashboard/index.html`
- Create: `src/frontend/dashboard/vite.config.ts`
- Create: `src/frontend/dashboard/src/main.tsx`
- Create: `src/frontend/dashboard/src/App.tsx`
- Create: `src/frontend/dashboard/src/styles/keyflow-tokens.css`
- Create: `src/frontend/dashboard/src/styles/app.css`

**Implementation notes:**

- Copy token intent from `design_handoff_keyflow/source/keyflow-tokens.css`.
- Do not import from `design_handoff_keyflow` at runtime.
- Use normal React rendering, no Babel browser scripts.

**Verification:**

```bash
pnpm dashboard:build
pnpm build
```

### Task 1.3: Build app shell only

**Objective:** Render the KeyFlow shell with sidebar and empty content.

**Files:**

- Modify: `src/frontend/dashboard/src/App.tsx`
- Create: `src/frontend/dashboard/src/components/Shell.tsx`
- Create: `src/frontend/dashboard/src/components/Icon.tsx`

**Acceptance:**

- KeyFlow logo lockup appears.
- Sidebar nav appears.
- Pilot nav item is active.
- Settings is pinned at bottom.
- Main content area renders a placeholder.

**Verification:**

```bash
pnpm dashboard:build
pnpm build
```

---

## Phase 2 — Fastify Serving Strategy

### Task 2.1: Serve built frontend assets behind dashboard auth

**Objective:** Let authenticated users see the new frontend without making it public.

**Files:**

- Modify: `src/backend/dashboard/routes.ts`

**Approach:**

- Keep `/dashboard/login`, `/dashboard/logout`, and `/dashboard/api/*` behavior.
- Keep current `requireAuth()` behavior.
- Serve new built `index.html` for `/dashboard` and dashboard client routes after auth.
- Serve static assets under a protected or non-sensitive asset prefix such as `/dashboard/assets/*`.

**Important:** Static JS/CSS assets do not contain secrets, but app routes must still require auth before serving the app shell.

**Verification:**

```bash
pnpm build
pnpm test:run
```

Manual checks:

- unauthenticated `/dashboard` redirects to `/dashboard/login`
- authenticated `/dashboard` serves new UI
- `/dashboard/api/stats` still works after login

### Task 2.2: Preserve legacy dashboard

**Objective:** Keep old operational dashboard accessible until v1.2 fully replaces it.

**Files:**

- Modify: `src/backend/dashboard/routes.ts`

**Route:**

- `/dashboard/legacy`

**Implementation:**

- Rename existing dashboard HTML renderer to `legacyDashboardHtml()`.
- Serve it at `/dashboard/legacy` behind auth.
- Do not delete existing API logic.

**Verification:**

- authenticated `/dashboard/legacy` loads old operational UI
- `/dashboard` loads new app shell

---

## Phase 3 — Pilot Screen

### Task 3.1: Port static Pilot data

**Objective:** Move design handoff sample data into a typed local data module.

**Files:**

- Create: `src/frontend/dashboard/src/data/pilotSample.ts`

**Data groups:**

- business snapshot
- expert snapshot facts
- pain points
- AI handles
- human controls
- knowledge rows
- success targets
- checklist rows
- KPI rows
- activity rows

**Verification:**

```bash
pnpm dashboard:build
```

### Task 3.2: Create shared primitives

**Objective:** Build reusable components matching the design system.

**Files:**

- Create: `src/frontend/dashboard/src/components/Badge.tsx`
- Create: `src/frontend/dashboard/src/components/Button.tsx`
- Create: `src/frontend/dashboard/src/components/Card.tsx`
- Create: `src/frontend/dashboard/src/components/Switch.tsx`
- Create: `src/frontend/dashboard/src/components/Progress.tsx`
- Create: `src/frontend/dashboard/src/components/Section.tsx`

**Verification:**

```bash
pnpm dashboard:build
```

### Task 3.3: Build Pilot page light mode

**Objective:** Recreate the design handoff Pilot screen.

**Files:**

- Create: `src/frontend/dashboard/src/routes/PilotPage.tsx`
- Modify: `src/frontend/dashboard/src/App.tsx`

**Acceptance:**

- Business Snapshot section renders.
- Pain Points section renders.
- Recommended Pilot section renders.
- Workflow Map renders.
- AI Handles / Human Controls split renders.
- Knowledge Needed renders.
- Success Criteria renders.
- Launch Checklist renders.
- Footer CTA renders.

**Verification:**

```bash
pnpm dashboard:build
pnpm build
```

Visual verification:

- Run local server.
- Capture screenshot at 1440×1200.
- Compare to `design_handoff_keyflow/source/KeyFlow Pilot.html`.

### Task 3.4: Add Expert mode

**Objective:** Add progressive power layer.

**Files:**

- Modify: `src/frontend/dashboard/src/routes/PilotPage.tsx`

**Behavior:**

- Toggle persists to `localStorage["kf-expert"]`.
- Expert tag appears.
- Metrics strip appears.
- Meta toolbar appears.
- Snapshot gains expert facts.
- Workflow counts appear.
- Knowledge rows gain metadata/progress.
- Live activity section appears.

**Verification:**

- Toggle on/off works.
- Refresh preserves state.
- Build passes.

---

## Phase 4 — Automation Screen

### Task 4.1: Build Automation data model locally

**Objective:** Define local data for automation capabilities.

**Files:**

- Create: `src/frontend/dashboard/src/data/automationSample.ts`

**Data groups:**

- lead handling capabilities
- outreach/pricing/legal capabilities
- escalation chips

**Verification:**

```bash
pnpm dashboard:build
```

### Task 4.2: Build ModePicker segmented control

**Objective:** Implement Auto / Ask me / Never control.

**Files:**

- Create: `src/frontend/dashboard/src/components/ModePicker.tsx`

**Acceptance:**

- Active mode is visually distinct.
- Modes use success/warning/danger soft states.
- Keyboard/accessibility labels are present.

**Verification:**

```bash
pnpm dashboard:build
```

### Task 4.3: Build Automation page

**Objective:** Recreate the Automation control center.

**Files:**

- Create: `src/frontend/dashboard/src/routes/AutomationPage.tsx`
- Modify: `src/frontend/dashboard/src/App.tsx`

**Acceptance:**

- Header renders.
- Summary counts update as modes change.
- Reply-flow legend renders.
- Capability groups render.
- Approval-window toggle works locally.
- Escalation chips render.

**Verification:**

```bash
pnpm dashboard:build
pnpm build
pnpm test:run
```

---

## Phase 5 — Routing and Placeholder Screens

### Task 5.1: Add frontend route state

**Objective:** Allow sidebar navigation without backend route conflicts.

**Files:**

- Modify: `src/frontend/dashboard/src/App.tsx`
- Modify: `src/frontend/dashboard/src/components/Shell.tsx`

**Approach:**

Use lightweight client-side route state first:

- `pilot`
- `automation`
- `home`
- `activity`
- `approvals`
- `leads`
- `knowledge`
- `reports`
- `settings`

Avoid adding React Router until needed.

### Task 5.2: Add placeholders

**Objective:** Make nav feel complete without overbuilding.

**Files:**

- Create: `src/frontend/dashboard/src/routes/PlaceholderPage.tsx`

**Acceptance:**

- Each placeholder has a title, short purpose statement, and “coming next” note.
- Approvals nav shows warning count `2` as design reference.

---

## Phase 6 — Real Data Wiring

### Task 6.1: Fetch authenticated session/user context

**Objective:** Display real logged-in user's name/role.

**Likely backend change:** Add endpoint if missing:

- `GET /dashboard/api/me`

**Files:**

- Modify: `src/backend/dashboard/routes.ts`
- Create/modify: `src/frontend/dashboard/src/api/client.ts`

**Verification:**

- unauthenticated returns 401
- authenticated returns display name, role, client_id

### Task 6.2: Wire existing CRM/voice data carefully

**Objective:** Pull existing data without building new persistence models yet.

Existing endpoints:

- `/dashboard/api/crm/voice-calls`
- `/dashboard/api/crm/contacts`
- `/dashboard/api/crm/pipeline`
- `/dashboard/api/crm/attention`
- `/dashboard/api/stats`

**Approach:**

- Start read-only.
- Keep sample data fallback when endpoint unavailable.
- Do not expose technical errors to clients.

---

## Phase 7 — Dark Mode and Mobile

### Task 7.1: Add dark tokens

**Objective:** Implement Brand Guide dark mode values.

**Files:**

- Modify: `src/frontend/dashboard/src/styles/keyflow-tokens.css`

**Approach:**

Use `[data-theme="dark"]` or class on root.

### Task 7.2: Add responsive behavior

**Objective:** Make Pilot and Automation usable on tablet/mobile.

**Acceptance:**

- Sidebar collapses or becomes drawer.
- Main content becomes single-column.
- Workflow map stacks or scrolls cleanly.
- AI/Human split stacks.
- Automation capability rows stack.

---

## Phase 8 — Quality Gates

### Required commands

```bash
pnpm dashboard:build
pnpm build
pnpm test:run
```

### Manual checks

- `/dashboard/login` works
- `/dashboard` protected by session
- `/dashboard/legacy` protected by session
- `/dashboard/api/*` still works
- Pilot page screenshot matches design intent
- Automation controls work locally
- Mobile screenshot usable

### Known blocker to resolve later

```bash
pnpm lint
```

Currently blocked by missing ESLint 9 flat config.

---

## First Implementation Step

Start with **Phase 1 / Task 1.1** only after James is ready for code changes.

Before making that change, confirm the frontend path choice:

Preferred:

```text
src/frontend/dashboard/
```

If accepted, proceed with dependencies and Vite skeleton.
