# KeyFlow CRM

Rain Design Labs KeyFlow — AI-first CRM for small business.

## Quick Start

```bash
# Install dependencies
pnpm install

# Run dev server
pnpm dev

# Run tests
pnpm test
```

## Architecture

See `docs/architecture-v0.1.md` for full design docs.

### Tech Stack
- **Backend:** TypeScript, Fastify, PostgreSQL, Redis, BullMQ
- **Frontend:** React Native (mobile + web)
- **AI:** Custom agent runtime + LangChain
- **Voice:** Retell AI / Vapi
- **SMS/VoIP:** Twilio

### Project Structure
```
keyflow/
├── src/
│   ├── backend/         # API server
│   │   ├── routes/      # API endpoints
│   │   ├── models/      # Database schemas
│   │   ├── services/    # Business logic
│   │   ├── agents/      # AI agent modules
│   │   ├── middleware/   # Auth, logging, etc.
│   │   └── jobs/        # Background job processors
│   └── frontend/        # React Native app
│       ├── components/  # Reusable UI components
│       ├── screens/     # App screens
│       ├── hooks/       # Custom React hooks
│       └── lib/         # Utilities, API client
├── docs/                # Architecture & specs
├── research/            # Competitive analysis
├── config/              # Config files
└── scripts/             # Build & utility scripts
```

## Modules (MVP = Phase 1)

| Module | Phase | Status |
|---|---|---|
| Contact Engine | 1 | 🔄 Scaffolding |
| Smart Lists | 1 | ⬜ |
| Communication Hub (email+SMS) | 1 | ⬜ |
| AI Follow-Up Engine | 1 | ⬜ |
| Pipeline (basic kanban) | 1 | ⬜ |
| Daily Briefing | 1 | ⬜ |
| Calendar Sync | 1 | ⬜ |
| Automation Engine | 1 | ⬜ |
| Mobile App | 1 | ⬜ |
| Voice AI Phone | 2 | ⬜ |
| Content Studio | 2 | ⬜ |
| Full Reporting | 2 | ⬜ |
| MLS Integrations | 2 | ⬜ |
| Team Coaching | 3 | ⬜ |
| Embedded App SDK | 3 | ⬜ |

## License

Proprietary — Rain Design Labs
