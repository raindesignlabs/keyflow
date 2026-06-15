# KeyFlow CRM

**AI-first CRM for small business.** Built by Rain Design Labs.

Live pilot dashboard: https://keyflow.raindesignlabs.net/dashboard

---

## What It Is

KeyFlow is a CRM designed for solo operators and small teams who need AI-powered follow-up, pipeline tracking, and voice agent integration — without the bloat of enterprise tools.

**Current pilot client:** Diana Dominguez (real estate, closing timeline automation, email parsing, PDF generation).

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Run database migrations
pnpm db:migrate

# Build the frontend dashboard
pnpm dashboard:build

# Start the dev server
pnpm dev

# Run tests
pnpm test:run
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | TypeScript, Fastify, Drizzle ORM |
| **Database** | PostgreSQL (CRM data), SQLite (dashboard auth/settings) |
| **Cache / Jobs** | Redis, BullMQ |
| **Frontend** | React 18 + Vite (dashboard), React Native (mobile — planned) |
| **AI / LLM** | Anthropic Haiku 4-5, Z.AI GLM 4.7 fallback |
| **Voice** | Retell AI / Vapi + Twilio |
| **Auth** | Fastify secure-session |
| **Deployment** | Cloudflare Tunnel → Ubuntu 24.04 server |

---

## Project Structure

```
keyflow/
├── src/
│   ├── backend/
│   │   ├── routes/          # API endpoints (contacts, deals, voice calls, etc.)
│   │   ├── models/          # Drizzle schema definitions
│   │   ├── services/        # Business logic (email, content studio, briefing)
│   │   ├── middleware/      # Auth, session, security headers
│   │   ├── jobs/            # BullMQ workers (daily briefing, voice health)
│   │   └── dashboard/       # v1.2 pilot dashboard routes + auth
│   └── frontend/
│       └── dashboard/       # React/Vite pilot dashboard
│           ├── src/components/  # Shell, Cards, ModePicker, Switch, etc.
│           ├── src/routes/      # PilotPage, AutomationPage
│           ├── src/hooks/       # useApi
│           └── src/lib/         # Typed API client
├── docs/                    # Architecture, changelogs, plans
├── drizzle/                 # Migration files + meta snapshots
├── scripts/                 # CLI utilities (manage-users.ts, test-api.ts)
├── rdl-ai-assistant/        # Diana's email automation + PDF pipelines
└── research/                # Competitive analysis (FUB teardown, etc.)
```

---

## Features (v1.2 Pilot)

| Feature | Status |
|---------|--------|
| Contact management | ✅ Live |
| Pipeline (kanban deals) | ✅ Live |
| Voice call tracking + transcripts | ✅ Live |
| AI daily briefing | ✅ Live |
| Smart lists | ✅ Live |
| Email automation (Diana pilot) | ✅ Live |
| **Pilot dashboard** | ✅ Live |
| Multi-tenant org scoping | ✅ Live |
| Automation guardrails + approvals | ✅ Live |
| Mobile app | ⬜ Phase 2 |
| Content Studio | ⬜ Phase 2 |
| MLS integrations | ⬜ Phase 3 |

---

## Dashboard v1.2

The pilot dashboard is a calm, Apple-inspired control center for AI Employee oversight:

- **Business Snapshot** — KPIs computed from live CRM data
- **Pain Points** — Attention items requiring human review
- **Recommended Pilot** — Suggested AI capability rollout
- **AI Training Library** — Knowledge base + guardrails
- **Guardrails** — Capability modes, approval toggles, escalation rules
- **Approvals** — Human-in-the-loop checkpoints
- **Activity** — Real voice calls, pipeline changes, system events
- **Results** — Outcome tracking

---

## Security

- Session-based auth with secure cookies
- Multi-tenant organization isolation (verified: null-org users see zero records)
- Parameterized queries via Drizzle ORM
- Cloudflare Tunnel for zero-trust public access
- Security headers (HSTS, CSP, X-Frame-Options)

See `docs/security-audit-2026-06-06.md` for full audit details.

---

## Changelog

- `docs/CHANGELOG-dashboard-v1.2.md` — Dashboard v1.2 pilot readiness
- `CHANGELOG-keyflow-v1.2-dashboard.md` — Legacy inline changelog

---

## License

Proprietary — Rain Design Labs. All rights reserved.
