# KeyFlow Full Dashboard Roadmap Summary

**Project:** KeyFlow CRM  
**Purpose:** Summarize the intended direction beyond the v1.2 pilot dashboard, including the full-featured client dashboard, RDL admin dashboard, and the main dashboard page with the visual Kanban / Work in Motion concept.  
**Date:** 2026-06-13

---

## 1. Product Direction Beyond the Pilot

KeyFlow should become the operating system for Rain Design Labs AI Employees.

The pilot dashboard is the front door. The full product becomes the place where:

- **Clients** understand and control their AI employee.
- **RDL admins** configure, monitor, improve, and support every AI employee across clients.

KeyFlow should not become a generic CRM clone. It should become:

> **The control center for AI employees: what they know, what they do, what they need approval for, how they performed, and what RDL needs to fix or improve.**

---

# 2. Client-Facing Version

This is what a client like Diana logs into.

The client-facing dashboard should answer:

- What is my AI employee doing?
- What does it need from me?
- Is it helping?
- Can I trust it?

Tone:

- Calm
- Simple
- Non-technical
- Apple-inspired
- Confidence-building

---

## 2.1 Home / AI Employee Overview

The client should immediately see:

- Who their AI employee is
- What it is currently responsible for
- Whether it is active, paused, or waiting on approval
- What happened recently
- What needs their attention
- Whether it is producing results

Core widgets:

- AI employee status
- Today’s activity
- Pending approvals
- Recent lead/customer interactions
- Current pilot or active workflow
- Performance snapshot
- “What changed since last login?”

Primary question answered:

> Is my AI employee working, and is anything waiting on me?

---

## 2.2 Pilot / Onboarding

This is the v1.2 focus.

Purpose:

- Turn discovery into a clear implementation plan.
- Show the client exactly what RDL is setting up.
- Make the AI employee feel concrete, not abstract.

It includes:

- Business snapshot
- Pain points
- Recommended workflow
- AI responsibilities
- Human responsibilities
- Knowledge needed
- Success criteria
- Launch checklist
- Expert mode for deeper details

This becomes reusable for every new client.

---

## 2.3 Automation / Guardrails

This becomes one of the most important screens.

Purpose:

> Let clients control what the AI can do without turning them into software admins.

Client controls:

- **Auto**
- **Ask me first**
- **Never**

Examples:

- Reply to a new lead: Auto
- Ask qualifying questions: Auto
- Book an appointment: Ask me
- Discuss pricing: Never
- Discuss legal/contract terms: Never

This is how KeyFlow builds client trust.

The final version needs backend persistence for:

- `workflow_capabilities`
- `approval_rules`
- `escalation_rules`
- `automation_settings`

Current v1.2 state is local UI state. The full version needs backend storage per client/workflow.

---

## 2.4 Activity Feed

The client needs a readable timeline of what the AI employee did.

Not raw logs. Not technical traces.

Good client-facing examples:

- “Responded to Sarah Miller within 2 minutes”
- “Asked buyer qualifying questions”
- “Flagged Marcus Lee as high intent”
- “Drafted a follow-up that needs approval”
- “Escalated contract question to Diana”

Filters:

- All activity
- Calls
- Emails
- Texts
- Approvals
- Escalations
- Errors/issues

This becomes the proof layer.

---

## 2.5 Approvals Queue

This is where the client reviews things before they go out.

Examples:

- Follow-up email drafts
- Text responses
- Appointment suggestions
- Sensitive lead replies
- Knowledge updates
- Escalation decisions

Each approval should show:

- What the AI wants to do
- Why it wants to do it
- The source conversation/context
- Approve
- Edit
- Reject
- Escalate to RDL

This gives clients control without forcing them to manage the whole system.

---

## 2.6 Leads / Contacts

This should exist, but KeyFlow should avoid becoming a bloated CRM.

Client-facing Leads should answer:

- Who contacted us?
- What do they want?
- How qualified are they?
- What did the AI do?
- What is the next step?
- Does a human need to take over?

Lightweight fields:

- Name
- Contact info
- Source
- Status
- Intent
- Budget/range if relevant
- Timeline
- Summary
- AI confidence
- Next action
- Conversation history

This should feel like an AI-curated lead desk, not Salesforce.

---

## 2.7 Knowledge / AI Training Library

This becomes the client’s “what my AI knows” section.

Client should see:

- Approved knowledge
- Draft knowledge
- Needs review
- Outdated
- Used by which workflows
- Last updated
- Owner/source

Examples:

- Buyer intake brief
- Seller listing brief
- Closing timeline
- Tone and voice rules
- Service FAQs
- Pricing boundaries
- Escalation rules
- Real estate terminology

Long term, clients can upload docs, but RDL should control ingestion at first so quality stays high.

Client-facing copy:

> This is what your AI employee has been trained to understand.

---

## 2.8 Reports / Outcomes

This is where KeyFlow proves value.

Client metrics:

- Leads contacted
- Average response time
- Missed-call recovery
- Qualified conversations
- Appointments booked
- Approvals handled
- Escalations
- Time saved
- Revenue/opportunity estimate
- Before vs after

This should be dead simple.

Not:

> System latency, worker queue throughput, token spend.

Instead:

> Your AI employee responded to 42 leads this month and booked 6 appointments.

---

## 2.9 Settings

Client settings should be limited.

Good settings:

- Business profile
- AI employee name/persona
- Communication tone
- Notification preferences
- Approval preferences
- Escalation contacts
- Business hours
- Connected channels
- Password/account

Avoid giving clients too much low-level control early. Most clients do not want to configure workflows. They want the system to work.

---

# 3. RDL Admin Version

This is what James and Rain Design Labs use internally.

The RDL admin dashboard should answer:

- What is broken?
- Which client needs attention?
- What did the AI do?
- How do we configure or improve it?
- Is this account profitable and healthy?

Tone:

- Operational
- Detailed
- Powerful
- Internal
- Reliable over pretty

---

## 3.1 Admin Home / Client Portfolio

RDL admins need to see all clients at once.

Dashboard should show:

- Active clients
- AI employees live
- Clients needing attention
- Failed jobs
- Pending approvals across clients
- Recent escalations
- System health
- Revenue/client tier eventually
- Onboarding stage per client

This is the mission-control view.

---

## 3.2 Client Admin Profile

For each client, RDL needs a full backend view:

- Client business profile
- Industry
- Assigned workflows
- Active AI employee
- Connected accounts/channels
- Knowledge library
- Approval rules
- Escalation rules
- Users
- Billing/tier later
- Internal notes
- Health status

This becomes the internal client workspace.

---

## 3.3 Workflow Builder / Workflow Templates

This is a major post-pilot feature.

RDL should be able to create reusable workflow templates:

- Real estate new lead triage
- Closing timeline assistant
- Seller intake
- Appointment booking
- Review request follow-up
- Missed call recovery
- Service business quote intake
- FAQ responder
- Internal ops assistant

Each template should define:

- Trigger
- Inputs
- AI task
- Required knowledge
- Approval rules
- Escalation rules
- Output channel
- Success metrics

Important distinction:

- Clients should not see this complexity at first.
- RDL admins should.

---

## 3.4 Knowledge Management / Ingestion Console

RDL admins need the full version of the training library.

Admin abilities:

- Upload files
- Convert docs into briefs
- Review extracted facts
- Approve knowledge
- Mark knowledge as client-visible or internal-only
- Version knowledge
- Attach knowledge to workflows
- See which AI runs used which knowledge
- Retire outdated briefs

This is where KeyFlow becomes repeatable.

Instead of rebuilding Diana’s context manually every time, RDL can onboard a new client through structured knowledge ingestion.

---

## 3.5 Conversation Review Console

RDL admins need to audit conversations.

For every call/email/text:

- Transcript
- Summary
- AI actions taken
- Extracted lead data
- Confidence
- Sentiment
- Escalation reason
- Errors
- Model/provider used
- Human review state

This helps with quality control and client support.

---

## 3.6 Approvals + Escalations Admin

Client sees their own approvals.

RDL admin sees all approvals and escalations across clients.

Admin filters:

- Client
- Workflow
- Urgency
- Channel
- Status
- Assigned reviewer
- Failed/blocked
- Needs RDL action

This lets RDL catch problems before clients complain.

---

## 3.7 System Health / Operations

RDL admins need operational visibility:

- Voice agent health
- Email watcher health
- Queue status
- Failed jobs
- Retry counts
- API auth status
- Tunnel status
- Last successful sync
- LLM provider status
- Token/cost usage eventually

This is not for clients. This is for keeping the business alive.

---

## 3.8 Admin Analytics

RDL-level analytics should show:

- Client usage
- Workflow performance
- AI success rates
- Approval volume
- Escalation volume
- Failed task rate
- Time saved by client
- Monthly activity
- Cost per client
- Margin per client eventually

This tells RDL which client accounts are healthy and profitable.

---

## 3.9 Multi-client User / Permission System

Full version needs clean roles.

Client roles:

- Owner
- Manager
- Reviewer
- Read-only

RDL roles:

- Admin
- Operator
- Builder
- Support
- Viewer

Important rule:

> Client scoping has to be airtight. Diana should never see another client. RDL admins can see across clients.

---

# 4. Product Maturity Path

## v1.2 — Pilot-ready client dashboard

Current direction.

Includes:

- Pilot
- Automation
- Protected React dashboard
- Legacy dashboard preserved
- Local/static data first
- Initial client-facing experience

Goal:

> Show a potential client exactly what their AI employee will do and how it will be controlled.

---

## v1.3 — Real client data

Replace static data with real backend data.

Add:

- `/dashboard/api/me`
- Real client/workspace display
- Real voice calls
- Real contacts/leads
- Real activity feed
- Real approval queue foundation
- Read-only knowledge list

Goal:

> Client logs in and sees their real AI employee activity.

---

## v1.4 — Persistent automation and approvals

Add backend models for:

- Automation settings
- Approval rules
- Escalation rules
- Client workflow config
- Approval queue items

Goal:

> Client can actually control the AI employee from the dashboard.

---

## v1.5 — RDL admin console

Add admin-only areas:

- Client portfolio
- Client setup
- Workflow configuration
- Knowledge ingestion
- Conversation review
- System health

Goal:

> RDL can run multiple clients from one place.

---

## v1.6 — Workflow templates

Turn Diana’s pilot into reusable templates.

Add:

- Workflow template library
- Per-client workflow instances
- Default guardrails
- Default knowledge requirements
- Launch checklist generation

Goal:

> Onboard client #2, #3, #4 without reinventing the system every time.

---

## v2.0 — Full AI Employee platform

This is the real product.

Includes:

- Multi-client admin
- Client control center
- Workflow templates
- Knowledge ingestion
- Conversation review
- Approvals
- Reporting
- Health monitoring
- Cost/margin visibility
- Role-based access
- Repeatable onboarding

Goal:

> RDL can sell, launch, monitor, and improve AI employees as a managed service.

---

# 5. Main Dashboard Page

The main dashboard page is the client’s landing page after login.

Pilot is the setup story. Automation is the control story. The main dashboard is the daily “is my AI employee working?” story.

The main dashboard should answer five questions in under 10 seconds:

1. Is my AI employee active?
2. What did it do today?
3. What needs my approval?
4. Which leads/customers need attention?
5. Is this actually helping my business?

It should feel like a calm command center, not an analytics wall.

The page should be visual, simple, and status-driven.

---

## 5.1 Top Hero / Status Strip

At the top:

**Left side:**

- “Good morning, Diana”
- “Your AI employee is active”
- Small subtext: “Monitoring new leads, calls, and follow-ups”

**Right side:**

- Status pill: `Live`
- Last synced: `2 min ago`
- Button: `Review approvals`
- Button: `Pause AI` or `Settings`

This gives the client instant confidence that the system is awake.

---

## 5.2 AI Employee Status Card

A prominent card near the top.

Example:

**Diana’s AI Employee**

- Status: Active
- Current focus: New lead triage
- Working hours: 24/7 intake, human approval for outbound follow-up
- Today: 14 actions completed
- Needs you: 2 approvals

Visual style:

- Soft white card
- Small avatar or abstract AI employee icon
- Green active dot
- Calm RDL cyan highlight
- No robot gimmicks

This is the humanized anchor of the page.

---

# 6. Visual Kanban: Work in Motion

This should be the centerpiece of the main dashboard.

It should not be a literal dense Trello board yet. It should be a **Kanban-style flow board** that feels like a Trello board plus a bar graph.

Concept:

> A horizontal workflow board where each column is a stage, and each stage has color, count, activity, and motion.

Recommended name:

> **Work in Motion**

Alternative names:

- AI Work Board
- Lead Flow
- Today’s Flow
- Pipeline Pulse
- AI Activity Board

The reason “Work in Motion” works best:

- It avoids CRM language.
- It implies the AI employee is actively moving work forward.
- It is client-friendly.

---

## 6.1 Visual Kanban Structure

The board is horizontal, like Trello.

Columns:

1. **New**
2. **AI Responding**
3. **Qualifying**
4. **Needs Approval**
5. **Booked / Done**
6. **Escalated**

Each column has:

- Column title
- Count
- Colored top bar
- Mini stacked activity cards
- A small pulse or timestamp showing recent movement
- Optional thin vertical or horizontal bar showing volume

Example structure:

```text
NEW              AI RESPONDING      QUALIFYING        NEEDS APPROVAL     BOOKED/DONE       ESCALATED
5                3                  4                 2                  2                 1
[blue bar]       [cyan bar]         [indigo bar]      [amber bar]        [green bar]       [red bar]

Sarah M.         Marcus L.          Tom O.            Follow-up draft    Buyer consult     Legal question
Web lead         Missed call        Budget captured   Sarah M.           booked            escalated
2m ago           8m ago             16m ago           Waiting on you     10:30 AM          Diana needed
```

The real UI should be more elegant than the text mockup, but that is the core idea.

---

## 6.2 Column Color Language

Each column should be a soft rounded panel.

Suggested color language:

- **New:** soft blue
- **AI Responding:** RDL cyan
- **Qualifying:** soft violet/indigo or neutral blue-gray
- **Needs Approval:** amber/yellow
- **Booked / Done:** green
- **Escalated:** red/coral

The color should appear as:

- A thin top rail
- A small status dot
- A soft background tint
- A small vertical meter or side rail

Avoid:

- Neon colors
- Heavy gradients
- Cyberpunk AI visuals
- Dense CRM board clutter

The aesthetic should stay calm, Apple-like, and premium.

---

## 6.3 Bar Graph Behavior Inside the Kanban

The board should be more than Trello. It should also communicate volume and urgency.

Each column should have a small volume indicator.

Example behavior:

- Column top has a number: `5`
- Beneath it, a small bar shows volume compared to the day/week average.
- If “Needs Approval” is growing, the amber bar gets taller or more saturated.
- If “Escalated” spikes, the red column visually warns the client.

Example column behavior:

### Needs Approval

- Count: `2`
- Top rail: amber
- Volume bar: medium height
- Microcopy: “2 waiting on you”
- Cards:
  - “Sarah Miller follow-up”
  - “Marcus Lee appointment reply”

### Escalated

- Count: `1`
- Top rail: red
- Volume bar: low but high priority
- Microcopy: “Needs human judgment”
- Card:
  - “Contract question from Tom O.”

This lets the client see flow and risk at a glance.

---

## 6.4 Event Cards Inside the Kanban

Cards should be small, readable, and action-oriented.

Each mini-card should show:

- Person or lead name
- What happened
- Channel icon: call, SMS, email, web
- Time
- Status badge
- Optional `View` or `Approve` action

Example card:

```text
Sarah Miller
Follow-up drafted
SMS · 4m ago
Needs approval
```

Another:

```text
Marcus Lee
AI answered missed call
Voice · 12m ago
Qualified
```

Another:

```text
Tom Okafor
Asked contract question
Email · 18m ago
Escalated
```

---

## 6.5 Visual Events / Motion

The board should feel alive but not distracting.

Possible visual events:

- New card slides gently into **New**
- Card glows once when moved by AI
- **Needs Approval** column pulses softly if there are waiting items
- Escalated card gets a red left border
- Booked card gets a tiny green check animation
- Column count increments with subtle number animation
- Recent activity marker: “Moved 2m ago”
- Tiny sparkline behind each column count

Motion rule:

> Subtle, calm, useful. No casino dashboard.

---

# 7. Supporting Main Dashboard Modules

## 7.1 KPI Strip

Below or above the Work in Motion board, show 4–6 simple metrics.

Client-facing KPIs:

- Leads contacted
- Avg response time
- Qualified conversations
- Appointments booked
- Awaiting approval
- Escalations

Example:

```text
Leads contacted: 14
Avg response: 2m 41s
Qualified: 4
Appointments: 2
Awaiting approval: 2
Escalated: 1
```

This gives measurable proof without overwhelming the client.

---

## 7.2 Needs You Panel

This should be one of the most important dashboard modules.

Purpose:

> Pull all required human action into one place.

Shows:

- Approval drafts
- Escalations
- Missing knowledge
- Failed syncs
- Client decisions needed

Example:

**Needs you**

- Approve Sarah Miller follow-up
- Review contract/legal question from Tom Okafor
- Upload updated buyer FAQ
- Confirm whether AI can suggest appointment times

Buttons:

- Approve
- Review
- Edit
- Dismiss
- Ask RDL

This keeps the client engaged without forcing them to hunt.

---

## 7.3 Recent Activity Feed

This is a linear timeline.

The Kanban shows work state. The activity feed shows history.

Example:

- `4m ago` — AI drafted follow-up for Sarah Miller
- `12m ago` — AI answered missed call from Marcus Lee
- `28m ago` — AI qualified Tom Okafor as buyer lead
- `1h ago` — AI escalated contract question to Diana

This is the audit trail.

Client-facing language only. No technical logs.

---

## 7.4 AI Knowledge Health

Small card showing whether the AI has enough knowledge to operate well.

Example:

**Knowledge health**

- Buyer intake brief: Ready
- Seller listing brief: Ready
- Closing timeline: Needs review
- Tone rules: Draft
- Escalation rules: Ready

Visual:

- Progress ring or simple progress bar
- “4 of 5 ready”
- Button: `Review knowledge`

This makes the AI training library visible without making it technical.

---

## 7.5 Outcomes / Value Card

This is the “why am I paying RDL?” card.

Example:

**This week**

- 42 leads contacted
- 9 qualified conversations
- 4 appointments booked
- 7.3 hours estimated saved
- 0 missed after-hours leads

This should be client-friendly and sales-friendly.

Eventually this feeds case studies.

---

# 8. RDL Admin Version of the Visual Kanban

The RDL admin version should use the same core idea, but across all clients.

Instead of one client’s Work in Motion, RDL sees an operations board.

## Admin Work in Motion

Columns:

- New client setup
- Knowledge needed
- AI active
- Needs RDL review
- Client approval waiting
- Issues / failed jobs
- Performing well

Admin cards represent:

- Clients
- Workflows
- AI employees
- Failed automations
- Pending launches
- Escalations

Example:

```text
KNOWLEDGE NEEDED
Diana Reyes
Closing timeline needs review

CLIENT APPROVAL WAITING
Reyes Realty
2 follow-up drafts pending

ISSUES
Smith Dental
Email watcher disconnected
```

This becomes RDL’s operations board.

---

# 9. Final Main Dashboard Summary

The final main dashboard should contain:

1. **Header**
   - Client greeting
   - AI employee status
   - Sync/status controls

2. **AI Employee Status Card**
   - Active/inactive
   - Current workflow
   - Today’s actions
   - Needs attention count

3. **Visual Kanban / Work in Motion**
   - Trello-like horizontal flow
   - Counts per stage
   - Color-coded state columns
   - Mini lead/action cards
   - Bar-graph-like volume indicators
   - Recent movement/events

4. **Needs You**
   - Approvals
   - Escalations
   - Missing inputs
   - Review tasks

5. **KPI Strip**
   - Leads contacted
   - Response time
   - Qualified conversations
   - Appointments
   - Awaiting approval
   - Escalations

6. **Recent Activity**
   - Human-readable timeline of AI actions

7. **Knowledge Health**
   - What the AI knows
   - What needs review
   - What is missing

8. **Outcomes**
   - Time saved
   - Leads handled
   - Appointments booked
   - Value proof

---

# 10. Recommendation

Make **Work in Motion** the centerpiece of the main dashboard.

It should be the thing clients remember.

Not a boring chart. Not a generic task board.

It should feel like:

> I can see my AI employee moving work through the business.

For clients, it builds trust.

For RDL admins, the same pattern becomes an operations board for managing all AI employees across all clients.

The full-featured version is not “a better CRM.”

It is:

> **A managed AI Employee platform where clients see simple control and outcomes, while RDL gets the internal machinery to configure, monitor, and scale the service.**
