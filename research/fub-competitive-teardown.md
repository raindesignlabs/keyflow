# Follow Up Boss (FUB) — Competitive Teardown

**Purpose:** Reverse-engineer FUB to build KeyFlow CRM — an AI-first, ground-up reimagining for small business.

**Date:** May 26, 2026

---

## What FUB Is

Real estate CRM + "Team OS" — centralizes leads, automates follow-up, manages team performance. Acquired by Zillow in 2023 for ~$500M. 200K+ agents. 41 of 50 highest-volume US teams use it.

**Three pillars:** Organize → Engage → Coach

---

## What FUB Does Well (Steal These)

### 1. Smart Lists
Dynamic lead filters based on real-time activity (website visits, email opens). Instantly surfaces hottest leads. This is their killer feature — agents love it.

### 2. Action Plans (Automations 2.0)
Automated drip sequences triggered by lead events. Auto-text + email new leads. Task checklists for agents. Birthday emails, review requests on deal close. Re-engage cold leads based on database signals.

### 3. Lead Distribution
Round-robin, first-to-claim, by area/price/MLS. Lead ponds for extra deals. Speed-to-lead tracking.

### 4. Communication Hub
Single timeline: calls, texts, emails in one view. Two-way email sync. Two-way texting with video texts. Built-in dialer with one-click calling. AI call summaries + transcripts.

### 5. Open API / 250+ Integrations
REST API. Webhooks. Embedded apps in FUB UI. Connects to everything: Zillow, Realtor.com, IDX sites, Google, Microsoft, Zapier, Mailchimp, BombBomb.

### 6. Team Coaching Tools
Leaderboards (closed deals, volume, GCI). Call coaching with recordings. Activity reporting. Mentions/tagging for feedback.

### 7. Pixel (Website Tracking)
See when clients browse your site, which listings they view/save. Campaign source tracking. Data portability.

### 8. Deals Pipeline
Drag-and-drop. Visual pipeline. Commission tracking. Forecasting.

### 9. No Contracts
14-day free trial. Cancel anytime. Export your data. Transparent pricing.

---

## What FUB Does Badly (Fix These)

### 1. Not AI-Native — AI Is Bolted On
"AI features rely on data from FUB Calling (paid add-on on Grow plan)." AI does: smart summaries, suggested tasks, smart messages, predictive lead prioritization. That's it. No AI agents. No autonomous follow-up. No AI-generated content. No voice AI. It's a 2010s CRM with a thin AI layer.

### 2. Expensive for Solo/Small Teams
- Grow: $69/user/mo + $39/user/mo dialer = $108/user/mo for ONE person
- Pro: $499/mo for up to 10 users
- Solo agents pay a premium for full functionality
- No tier between "single user" and "10-user team"

### 3. No Native Website/IDX
Requires third-party tools for website + IDX. No built-in property search or listing management.

### 4. No Transaction Management
No contract management, compliance tracking, or transaction coordination. Requires third-party (Dotloop, SkySlope, etc.).

### 5. No Social Media Management
No content creation, scheduling, or posting. Requires external tools entirely.

### 6. Zillow Privacy Concerns
Privacy policy changes in Oct 2025 triggered industry backlash. Top coaches (Tom Ferry, Jared James) publicly told agents to leave. Lingering distrust about data sharing with Zillow portal network.

### 7. Gmail Deliverability Issues
Reports of emails being flagged/rate-limited when sending through FUB's email system. FUB is supposed to manage sending limits but doesn't always work.

### 8. Bloated for Small Teams
Designed for teams of 5-30+. Solo agents and small shops pay for features they don't use. Complex setup for simple needs.

### 9. No Content Generation
AI can't write emails, social posts, property descriptions, newsletters, or market reports. It summarizes and prioritizes — doesn't create.

### 10. Mobile App Mirrors Desktop
Not truly mobile-first. It's the desktop experience shrunk down, not designed for on-the-go workflows.

---

## FUB Pricing Reference (Internal Only)

| Plan | Monthly | Annual | Users | Dialer |
|------|---------|--------|-------|--------|
| Grow | $69/user | $58/user | Per user | $39/user add-on |
| Pro | $499 | $416 | Up to 10 | Included |
| Platform | $1,000 | $833 | Up to 30 | Included |

---

## KeyFlow CRM Opportunity — AI-First Gaps FUB Can't Fill

1. **Autonomous AI agents** that handle entire conversations, not just suggestions
2. **AI content generation** — emails, social posts, newsletters, property descriptions in client's voice
3. **Voice AI** — phone answering, lead qualification, appointment booking
4. **Zero-setup for solos** — works out of the box, no team configuration needed
5. **Privacy-first** — no Zillow-style data sharing, client data belongs to the business
6. **Flat, simple pricing** — no per-user add-on games
7. **Social media built-in** — content creation + scheduling + posting, not just lead capture
8. **Transaction coordination** — AI-assisted contract tracking, deadlines, compliance
9. **Mobile-native** — designed phone-first, not desktop-first
10. **Cross-industry** — real estate first, but architecture supports any small business

---

## FUB API Notes

- REST API at `api.followupboss.com/v1/`
- Resources: people, notes, events, deals, etc.
- Open API docs at `docs.followupboss.com`
- LLM-friendly index at `docs.followupboss.com/llms.txt`
- System registration required for third-party integrations
- GitHub examples: `github.com/FollowUpBoss/fub-api-examples`

---

*Source: FUB website, Kee Technology review, Notorious R.O.B., Capterra, Software Advice, Reddit, FUB API docs*
