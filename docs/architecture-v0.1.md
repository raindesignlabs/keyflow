# KeyFlow CRM — Product Architecture v0.1

**Product:** Rain Design Labs KeyFlow — AI-first CRM for small business
**Date:** May 26, 2026
**Status:** Initial architecture draft

---

## Design Philosophy

1. **AI-native, not AI-bolted-on.** Every core workflow starts with an AI agent, not a manual form.
2. **Drafts for approval.** Nothing autosends without user OK. Trust builds over time.
3. **Phone-first.** Mobile is the primary interface. Desktop is for power users and setup.
4. **Open core.** Built-in essentials. Open API for everything else. No walled garden.
5. **Small biz first.** Works for a solo agent on day one. Scales to a team without re-architecture.

---

## Core Modules

### 1. Contact Engine (CRM Core)
The single source of truth for every person the business interacts with.

- **Unified contact record:** name, phone, email, company, tags, custom fields
- **Activity timeline:** every call, text, email, note, AI interaction in chronological order
- **Smart Lists (AI-powered):** "Who should I call today?" / "Who's gone cold?" / "Hot leads this week"
  - Dynamic, behavioral, AI-scored — not static filters
  - Learns from user behavior which leads convert
- **Relationship mapping:** buyer ↔ agent ↔ lender ↔ inspector, etc.
- **Lead scoring:** AI-driven based on engagement, behavior, time-to-close prediction
- **Duplicate detection + merge:** automatic on import

### 2. AI Agent System
Autonomous AI employees that work inside the CRM.

**AI Front Desk (Lead Response)**
- Answers phone calls 24/7 (voice AI)
- Responds to texts, Facebook/Instagram DMs, website chat
- Qualifies leads with configurable questions
- Escalates hot leads to the business owner
- Books appointments directly on calendar

**AI Follow-Up Engine**
- Drafts follow-up emails/texts in the client's voice
- Queues drafts for one-tap approval
- Re-engages cold leads automatically
- Sends birthday/anniversary/home anniversary messages
- Monthly check-ins for past clients

**AI Content Studio**
- Generates social media posts in the client's brand voice
- Creates property descriptions, newsletters, market reports
- Schedules and posts to Facebook, Instagram, TikTok
- Learns the client's writing style from past content

**AI Inbox Manager**
- Triages incoming emails
- Drafts replies for approval
- Flags urgent messages
- Archives / categorizes automatically

### 3. Communication Hub
All channels in one place.

- **Phone:** Built-in VoIP with call recording, transcription, AI summaries
- **SMS:** Two-way texting from business number, auto-replies via AI
- **Email:** Two-way sync (Gmail, Outlook), open/click tracking, template library
- **Social DMs:** Facebook, Instagram messages unified
- **Web chat:** Embeddable widget → feeds into contact record

### 4. Pipeline & Deals
Visual deal management.

- Drag-and-drop pipeline stages (customizable per industry)
- Commission tracking (real estate)
- Close date forecasting
- AI suggests next action per deal
- Automated stage progression triggers

### 5. Calendar & Appointments
- Google / Microsoft calendar sync
- AI books appointments directly during lead qualification
- Automated reminders (text + email)
- Appointment outcome tracking

### 6. Automation Engine
User-configurable automations (like FUB's Action Plans 2.0).

- **Triggers:** new lead, stage change, email open, website visit, time-based, AI-detected intent
- **Actions:** send email, send text, create task, assign to agent, trigger AI agent, update field, create deal
- **Templates:** pre-built automation recipes (new lead sequence, past-client nurture, birthday, etc.)
- **Approval gates:** any action can require human approval before executing

### 7. Reporting & Insights
- **Daily briefing:** AI-generated morning digest (activity, leads, appointments, hot items)
- **Conversion funnel:** leads → contacted → appointment → deal → close
- **Agent performance:** calls made, texts sent, response time, conversion rate
- **AI coaching:** "You haven't followed up with 3 hot leads. Want me to draft messages?"
- **Revenue forecasting:** based on pipeline + historical data

### 8. Integrations (Open API)
- REST API + webhooks (like FUB's open approach)
- **Day-1 integrations:** Gmail, Outlook, Google Calendar, Facebook, Instagram, Twilio/Vonage (SMS/voice)
- **Phase 2:** Zillow, Realtor.com, MLS (RESO API), Stripe, QuickBooks
- **Phase 3:** Zapier/Make connector, embedded app SDK
- Import from any CRM (CSV + direct connectors for FUB, HubSpot, Salesforce)

---

## Tech Stack (Proposed)

### Backend
- **Language:** TypeScript (Node.js) — fast iteration, shared types with frontend
- **Framework:** Fastify or Hono (lightweight, fast)
- **Database:** PostgreSQL + Redis (cache/sessions)
- **ORM:** Drizzle ORM (type-safe, lightweight)
- **Queue:** BullMQ (Redis-backed job queue for AI agent tasks, automations)
- **AI orchestration:** LangChain or custom agent runtime
- **Voice:** Retell AI or Vapi (white-label voice AI)
- **SMS/VoIP:** Twilio or Vonage
- **Email:** Gmail API + Outlook API + SendGrid for outbound

### Frontend
- **Framework:** React Native (mobile + web from one codebase)
- **State:** Zustand or Jotai
- **UI:** Custom component library (clean, fast, not bloated)

### Infrastructure
- **Hosting:** Vercel (frontend) + Railway/Fly.io (backend) or bare metal
- **Auth:** Clerk or Auth0
- **Storage:** S3-compatible (Cloudflare R2)
- **Monitoring:** Sentry + PostHog (product analytics)

---

## Pricing Strategy (Standalone SaaS — separate from RDL managed service)

| Tier | Price | Target | Includes |
|---|---|---|---|
| **Solo** | $49/mo | Solo agents, freelancers | 1 user, 500 contacts, AI drafts, email/text, smart lists |
| **Pro** | $149/mo | Small teams (2-5) | 5 users, 5K contacts, voice AI, content studio, automations |
| **Business** | $349/mo | Growing teams (6-15) | 15 users, unlimited contacts, full AI suite, API, reporting |

All tiers: 14-day free trial. No contracts. Cancel anytime.

**RDL managed service** remains separate: we run KeyFlow for clients who don't want to do it themselves ($799–$5K+/mo).

---

## MVP Scope (Phase 1 — Launch)

1. Contact Engine (CRUD, timeline, tags, import)
2. Smart Lists (basic version — AI-scored)
3. Communication Hub (email sync + SMS)
4. AI Follow-Up Engine (draft replies for approval)
5. Pipeline (basic kanban)
6. Daily Briefing (AI-generated)
7. Google Calendar sync
8. Basic automations (new lead → send text, create task)
9. Mobile app (React Native)

**Not in MVP (Phase 2+):** Voice AI phone answering, social media content studio, full reporting suite, MLS integrations, team coaching/leaderboards, embedded app SDK.

---

## Differentiator Summary

| Feature | FUB | Lofty | B.Claw | KeyFlow |
|---|---|---|---|---|
| Full CRM | ✅ | ✅ | ❌ | ✅ |
| AI Agents (autonomous) | ❌ | ⚠️ | ✅ | ✅ |
| Voice AI | ❌ | ❌ | ❌ | ✅ (Phase 2) |
| Content Generation | ❌ | ⚠️ | ✅ | ✅ |
| Drafts-for-Approval | ❌ | ❌ | ✅ | ✅ |
| Open API | ✅ | ❌ | ✅ | ✅ |
| Morning Briefing | ❌ | ❌ | ✅ | ✅ |
| Smart Lists | ✅ (manual) | ⚠️ | ❌ | ✅ (AI) |
| Mobile-First | ❌ | ❌ | ❌ | ✅ |
| Small Biz Pricing | ❌ | ❌ | ✅ | ✅ |

---

*Next steps: Validate architecture, choose tech stack, build MVP feature spec, start coding.*
