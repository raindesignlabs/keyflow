# Handoff: KeyFlow — Pilot Dashboard & Automation

> The control center for managing an AI employee — built for non-technical small-business owners (real-estate example), with a power-user layer underneath. Apple-inspired, calm, premium. Product of Rain Design Labs.

---

## 1. About the design files

The files in `source/` are **design references created in HTML/React-via-Babel** — runnable prototypes that show the intended look and behavior. **They are not production code to ship.** Your job is to **recreate these designs in your target codebase** (Next.js/React, Vue, SwiftUI, native, etc.) using its established component library, routing, and data layer.

If there is **no codebase yet**, the recommended stack is **React + TypeScript + Vite (or Next.js App Router)** with CSS variables or Tailwind mapping to the tokens in §7. The prototype is plain React (no build step) on purpose — treat it as the spec, not the architecture.

The prototype uses inline `<script type="text/babel">` and a global `KI`/`Icon`/`Badge`/`Tick` helper set. In a real app you'd replace these with your icon library and component primitives.

### Files in this bundle
| File | What it is |
|---|---|
| `source/KeyFlow Pilot.html` | Host page. Loads React 18, Babel, fonts, the stylesheet, and the two JSX files, then mounts `<PilotPro/>`. |
| `source/pilot-pro.jsx` | **The app.** App shell (sidebar + tab routing), the Pilot pane (proposal + Expert mode), and the Automation pane (Auto/Ask-me/Never control center). All data is in plain consts at the top — swap for real API data. |
| `source/keyflow-tokens.css` | **The design system.** All colors, type, spacing, radii, shadows, and every component class (`.kf-card`, `.kf-btn`, `.kf-badge`, `.kf-switch`, `.kf-seg`, `.kf-nav-item`, etc.). This is the single source of truth for styling. |
| `source/keyflow-icons.jsx` | Stroke-icon path set (`KI`) + `Icon`, `Badge`, `Tick` render helpers. |
| `source/Brand Guide.md` | The full brand/design-system spec from Rain Design Labs. Authoritative for voice, IA, and intent. |

---

## 2. Fidelity

**Mid-to-high fidelity.** Final colors, typography (Manrope), spacing, radii, and real product copy are all in place; layouts are pixel-intentional. Treat colors/type/spacing as **exact** (recreate faithfully). The data is realistic sample content, not final — wire it to real sources. A few interactions are mocked (see §5) and should become real.

---

## 3. Information architecture

Left sidebar nav (icon + label), active state highlighted with the cyan soft tint:

`Home · Pilot · Automation · Activity · Approvals · Leads · Knowledge · Reports` + `Settings` pinned to the bottom.

In the prototype only **Pilot** and **Automation** are wired; the rest are placeholders. Approvals shows a warning count badge (`2`). The workspace switcher ("Reyes Realty / Pilot workspace") sits above the nav.

**Routing:** the prototype uses a single `tab` state (`"pilot" | "automation"`). In a real app these are routes (e.g. `/pilot`, `/automation`).

---

## 4. Screens / Views

### 4.1 Pilot pane — "Diana's AI employee"
**Purpose:** the sales-bridge proposal. Answers "what AI employee are we setting up, what will it do, and how will we know it worked?" Demo-ready for a prospect.

**Layout:** fixed 236px sidebar + fluid main. Main has a **sticky, blurred header** (`backdrop-filter: blur(14px)`, 82% white) and a centered content column. Column `max-width: 900px` normally, **1120px in Expert mode** (animated, `.3s ease`). Section vertical rhythm: 36px between sections.

**Header:** eyebrow `PILOT SETUP`; H1 "Diana's AI employee"; right cluster = **Expert mode switch**, vertical divider, `Ready — 1 step left` success badge, primary **Launch pilot** button.

**Numbered sections (always visible):**
1. **Business snapshot** — card; 3-col grid of label/value facts; divider; "Main bottleneck" row with a warning icon tile.
2. **Pain points** — 3 stacked cards, each = icon tile + title + body.
3. **Recommended pilot** — the hero card:
   - Header row: accent bolt tile + "Workflow / New lead triage & follow-up" + `Best fit for Reyes` badge.
   - **Workflow map** band (secondary surface): 5 nodes joined by arrows — `Lead comes in → AI responds → AI qualifies → You review → Appointment`. Node variants: neutral, **AI** (accent-faint bg), **human** (warning-soft bg).
   - **Two-column split:** left "What your AI handles" (accent), right "What you still control" (warning-soft bg). Each is a checklist; **no permission chips here** (those live in Automation).
   - **Automation link bar** (footer): sliders icon + "Exactly what runs on its own vs. needs your approval is set in **Automation**." + `Open Automation →` button that navigates to the Automation tab.
4. **Knowledge needed** — card list; each row = doc icon + brief name + status badge (`Ready for AI` / `Needs review` / `Draft`).
5. **What success looks like** — 3 KPI-target cards (target icon + big number + label + sub).
6. **Launch checklist** — progress bar (83%) + checklist rows with tick states (`done` / `now` / `todo`); the `now` row has a primary "Review now" button.

**Footer CTA:** accent-faint card, "One step from launch" + "Review test" (ghost) + "Launch pilot" (primary).

### 4.2 Pilot pane — **Expert mode** (toggle ON)
Progressive disclosure of a power-user layer. Persisted to `localStorage["kf-expert"]`. When ON:
- An `EXPERT VIEW` pill appears next to the eyebrow.
- A **meta toolbar** row under the header: pills for `Pilot Day 6 of 14`, `Last sync 2 min ago`, `Model KeyFlow Voice v2`, `Guardrails 9 active` (clickable → Automation); right side `Export pilot brief`, `Advanced settings`.
- A **Live pilot metrics** strip: 6 KPI cards (Leads contacted, Qualified, Appointments, Avg. response, Awaiting approval, Escalations) with trend deltas.
- **Snapshot** gains a 4-col secondary fact grid + connected-source pills (Gmail, VoIP line, Connect CRM).
- **Pain points** gain a `Targeted by pilot` badge.
- **Recommended pilot:** workflow nodes show live counts (14 → 14 → 9 → 3 → 2); a `View runs` button; a Trigger/SLA/Approval meta row.
- **Knowledge** rows gain `channels · owner · date` meta + a readiness progress bar each.
- **Success** cards switch to live value `/ target` + progress bar + `Target met`.
- **Checklist** rows gain `owner · date`.
- Two **expert-only sections** appear: **07 Live activity** (table: Action / Lead / Status / When) and the Guardrails summary is represented in Automation (see 4.3).

Reveal animation: `.kf-reveal` — **slide only, no opacity fade** (so it stays visible in static/PDF/PPTX exports). Gated behind `prefers-reduced-motion: no-preference`.

### 4.3 Automation pane — "Automation" (control center)
**Purpose:** answers "what can the AI do on its own, what needs my OK, what's off-limits?" This is where the **Auto / Ask me / Never** controls live (moved out of the proposal so the dashboard stays focused).

**Layout:** same shell; sticky header `CONTROL CENTER / Automation` + `All changes saved` badge + `Test a conversation` ghost button. Content column `max-width: 980px`.

**Blocks:**
1. Intro paragraph.
2. **Summary strip** — 3 cards with colored icon tiles + counts that **update live** as settings change: `Run automatically (N)` (green), `Ask you first (N)` (amber), `Off-limits (N)` (red).
3. **How a reply flows** legend: `New lead → AI drafts → [Approval gate] → You approve → Sent` (the gate node is dashed-accent).
4. **Lead handling** group — 5 capability rows, each with a 3-way **segmented control**: `Auto / Ask me / Never`. Active segment is color-coded (green/amber/red soft).
5. **Outreach, pricing & legal** group — 4 capability rows, same control. Defaults: Quote a price = Never, Discuss contract/legal = Never.
6. **Approval-window toggle** — iOS switch: "Require approval before the first outbound message" (default ON).
7. **Always escalate to you** — warning-soft card listing hard hand-off triggers as chips (Asks for Diana by name, Budget over $1M, Upset or complaint, Legal question, Mentions another agent) + `Add rule`.

### 4.4 Mobile (reference only — in the separate explorations file)
The mobile "Needs your review" approval screen (Approve & send / Edit / Reject) is the priority mobile view. Not in this bundle's app file but described in the Brand Guide; ask if you want it exported too.

---

## 5. Interactions & behavior

| Interaction | Behavior | Make real |
|---|---|---|
| **Expert mode switch** | Toggles the power layer; persisted in `localStorage["kf-expert"]` (`"1"`/`"0"`). | Persist per-user (profile/setting). |
| **Sidebar Pilot/Automation** | Switches `tab` state. | Real routes. |
| **"Open Automation →"** / Guardrails meta pill | Navigates to Automation tab. | Real navigation. |
| **Auto / Ask me / Never** segmented control | Local `useState` map keyed by capability label; updates the live summary counts immediately. | Persist to backend; counts derive from state. |
| **Approval-window toggle** | Local boolean state. | Persist. |
| Launch pilot / Review now / Test a conversation / Add rule / Export | **Mocked** (no handler). | Wire to real actions. |
| Transitions | Header blur; `max-width` 0.3s ease on Expert; `.kf-reveal` 0.3s slide; switch knob 0.22s; button press translateY(1px). | Keep subtle; respect reduced-motion. |

**Responsive:** desktop-first here. Brand Guide specifies: tablet = collapsible sidebar/reduced columns; mobile = single column + bottom nav, prioritizing Approvals → Activity → Calls/Leads.

---

## 6. State management

- `tab: "pilot" | "automation"` (App shell) → real router.
- `expert: boolean` (Pilot pane) → persisted `localStorage["kf-expert"]`.
- `modes: Record<capabilityLabel, "auto" | "ask" | "never">` (Automation pane) → derive summary counts; persist.
- `reqApproval: boolean` (Automation pane) → persist.
- All displayed content (KPIs, activity, knowledge, leads, checklist) is **sample data** in consts at the top of `pilot-pro.jsx`. Replace with fetched data; keep the shapes.

---

## 7. Design tokens (authoritative — from `keyflow-tokens.css`)

**Brand / accent (RDL cyan — use sparingly):**
`--kf-accent #00B3EA` · hover `#008CBA` · soft `#E4F6FD` · faint `#F4FBFE`

**Neutrals (light):**
page `#F7F8F9` · surface `#FFFFFF` · surface-2 `#F4F6F8` · border `#E7E9EB` · border-strong `#D7DADC` · ink `#2A2C2E` · ink-2 `#54585B` · muted `#8A8D90` · faint `#AEB1B4`
*(Dark-mode palette is specified in the Brand Guide; not yet implemented in the prototype — implement using those values.)*

**Status:** success `#20A36A` / soft `#E8F7EF` · warning `#F5A524` / soft `#FFF4DB` · danger `#E5484D` / soft `#FDEBEC` · info `#3B82F6` / soft `#EAF2FF`

**Typography:** **Manrope** (Google Fonts, weights 400/450/500/600/650/700/750/800), fallback `-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif`. Global letter-spacing `-0.01em`.
- H1 30px/800 (-0.03em) · H2 19px/750 · H3 15px/700 · Body 14px/450 · Small 12.5px · Label 11px/700 uppercase (.06em) · KPI value 27px/800 tabular-nums.

**Spacing scale:** 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 px.

**Radius:** sm 10px · md 14px · lg 20px · xl 26px · pill 999px. Inputs 12px; cards 18–24px (token `lg`=20).

**Shadows:** `--kf-shadow-sm: 0 1px 2px rgba(20,24,28,.05), 0 4px 12px -8px rgba(20,24,28,.10)` · `--kf-shadow: 0 1px 2px rgba(20,24,28,.04), 0 10px 30px -16px rgba(20,24,28,.14)`. Subtle only.

**Component classes to mirror:** `.kf-card`, `.kf-panel`, `.kf-btn(.primary/.ghost/.subtle/.sm/.lg)`, `.kf-badge(.ok/.warn/.bad/.info/.acc)`, `.kf-switch`, `.kf-seg` (segmented control), `.kf-nav-item`, `.kf-ico`, `.kf-av`, `.kf-track` (progress), `.kf-check`/`.kf-tick`, `.kf-flow`/`.kf-flow-node(.ai/.human)`, `.kf-metapill`, `.kf-kpi-val`, `.kf-trend`.

---

## 8. Assets

- **Font:** Manrope via Google Fonts (or self-host).
- **Icons:** custom 24×24 stroke paths in `keyflow-icons.jsx` (`KI` map). Swap for your icon library (Lucide/Phosphor are close in weight — 1.7px stroke, round caps/joins). No raster assets.
- **Logo lockup:** text — `Key` in ink `#2A2C2E`, `Flow` in accent `#00B3EA`, weight 800, `-0.03em`. Small bolt glyph in a dark rounded tile beside it.
- No photography. Avoid AI-sparkle/neon styling (per Brand Guide).

---

## 9. Voice & content rules (from Brand Guide)
Plain-language, calm, non-technical by default. Use: "Needs approval", "AI followed up", "Knowledge brief", "Escalation". Avoid technical terms (LLM, vector, webhook, inference) outside an explicit advanced/admin view. Label AI output clearly but without gimmicks.

---

## 10. How to run the reference
Open `source/KeyFlow Pilot.html` in a browser (needs internet for the React/Babel/font CDNs). Toggle **Expert mode** in the Pilot header; click **Automation** in the sidebar to see the control center. See the Brand Guide for the complete design system and the screens not yet built (Home, Activity, Approvals, Leads, Knowledge, Reports, Settings, dark mode, mobile).
