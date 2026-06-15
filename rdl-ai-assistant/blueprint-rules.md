# Blueprint Authoring Rules

**Purpose:** Every AI Adoption Blueprint must be derived 100% from the client's onboarding form. No assumptions. No fabrication. No filler.

**Applies to:** All real estate agent blueprints, regardless of market, brokerage, or niche.

---

## Rule 1: Source of Truth

The client's onboarding PDF is the only acceptable source for:
- Their communication style and tone
- Their daily workflow and pain points
- Their current tools
- Their lead sources
- What they want automated
- What they want to approve personally
- Words or phrases they avoid

The `meta.json` file is the structured extraction of that PDF. If `meta.json` doesn't contain a field, the blueprint cannot reference it.

**Never write content from memory of a previous session.** Always re-read the source.

---

## Rule 2: Parse Before You Write

Before writing a single word of the blueprint:

1. Run the PDF through `pdftotext` and read the full output
2. Confirm `meta.json` has been populated from the extraction
3. Identify every section of the form that has substantive answers
4. Flag any sections where the client wrote "N/A" or left blank — these are gaps, not fabrications

If a section is blank or N/A, state "Not specified" or omit the reference entirely. Do not invent preferences.

---

## Rule 3: Quote the Client, Don't Interpret Loosely

When describing the client's tone, style, or workflow, use their exact words or close paraphrase — never embellish.

| What the client wrote | ✅ Use this | ❌ Never write this |
|---|---|---|
| "Friendly, slightly chaos and imperfect" | "Friendly, warm, and imperfect" | "Emoji-forward, bubbly, energetic" |
| "Social media posting, reels, videos" | "Social media posting, reels, and video content" | "Content creation across all platforms" |
| "I dont but I should" (re: CRM) | "No CRM currently in use" | "Eager to adopt new technology" |
| "all of it? Im a control freak" | "Prefers to review all AI-generated messages before sending" | "Hands-off, trusts automation completely" |
| "The word no" (re: phrases to avoid) | "Avoid the word 'no' in client communications" | "Always maintains positive framing" |
| "Organized chaos... mostly??" | "Self-described organized chaos" | "Structured and methodical" |

**The rule:** If you can't trace a claim back to a specific answer on the form, delete it.

---

## Rule 4: Use Generic Service Descriptions

The client-facing blueprint describes **services and outcomes**, never tool names or technical architecture.

When referring to RDL's core AI system, use the full product name: **"Rain Design Labs KeyFlow" software**.

|| ✅ Client-facing language | ❌ Never in client blueprint ||
||---|---||
|| "Rain Design Labs KeyFlow software handles automated lead response across your website, Facebook, and Instagram" | "ManyChat automation on 3 channels" ||
|| "A CRM built for real estate that tracks every lead and automates follow-ups" | "Follow Up Boss with lead routing enabled" ||
|| "Rain Design Labs KeyFlow coordinates your calendar, showing tools, and lead responses" | "Google Calendar API + ShowingTime webhook" ||
|| "Monthly home value reports sent to past clients automatically" | "Homebot equity reports via email" ||
|| "Email triage with draft replies ready for your review" | "alfred_ connected to your inbox via IMAP" ||
|| "Connects to your existing calendar and showing tools" | "Google Calendar API + ShowingTime webhook" ||
|| "KeyFlow integrates seamlessly with your existing business tools" | "API integrations, webhook connections, third-party services" ||

Tool names, costs, API references, and technical setup details belong in the **internal ops sheet only** (never shared with client).

---

## Rule 5: Recommendations Must Be Grounded

Every recommendation in the blueprint must connect to a specific pain point or gap the client identified on their form.

**Valid structure:**
> Client stated: "Social media posting, reels, videos" eat up the most time.
> Recommendation: AI Social Media Manager — automates content creation and scheduling.
> Connection: Direct — solves their #1 time sink.

**Invalid structure:**
> Recommendation: AI Past-Client Nurture
> Reason: "64% of sellers would reuse their agent..." (generic industry stat)
> Problem: Client never mentioned past-client follow-up as a pain point.

**Industry statistics are fine for context**, but only if the client's own answers support the recommendation. If the client didn't express the problem, it goes in the "future expansion" section, not the main recommendations.

---

## Rule 6: Current Setup Section

The "Your Current Setup" section must use only what the client listed in Section 8 (Tools & Accounts) of their onboarding form.

- ✅ List the tool they named (e.g., "Cozi")
- ✅ Describe the action in plain terms (e.g., "Upgrade", "Keep", "Add")
- ✅ Explain why in client-friendly language
- ❌ Never show your internal tool recommendation name
- ❌ Never show costs of your recommended replacement
- ❌ Never imply the client made a bad choice

**Tone:** "Here's what you have and how we can improve it" — never "Here's what's wrong."

---

## Rule 7: Handling Incomplete or Vague Answers

Clients don't always fill out forms thoroughly. Handle gaps honestly:

| Situation | What to do |
|---|---|
| Blank answer | Omit from the blueprint. Do not assume. |
| "N/A" | Omit. |
| Vague answer ("depends", "not sure") | Quote what they said. Note it for the strategy call. |
| Contradictory answers | Flag both. Resolve on the strategy call. |
| One-word answer | Use it as-is. Don't expand into a paragraph. |

**Example:** If the client writes "depends on if they email me a day" for lead response time, write: "Response time varies — depends on whether the lead comes by email or message." Don't write: "Responds within minutes to text leads but may delay email responses by up to 24 hours."

---

## Rule 8: Blueprint Sections and What Feeds Each One

Every section must draw from specific onboarding form sections. Sections must appear in this exact order:

| Blueprint Section | Onboarding Source |
|---|---|
| Executive Summary | Agent Profile (Section 1) + Day-to-Day (Section 2) + what they want automated (Section 6) |
| Business Profile | Agent Profile (Section 1) — name, brokerage, license, market area, website, years, specialty |
| Current State Assessment | Day-to-Day (Section 2) + Lead & Client Management (Section 3) |
| AI Recommendations | What You Want Automated (Section 6) + pain points from Section 2 + lead gaps from Section 3 |
| Your Current Setup | Tools & Accounts (Section 8) |
| Voice & Tone Settings | Voice & Style (Section 5) — exact words, sample messages, phrases to avoid, sign-off |
| Implementation Roadmap | Rules & Boundaries (Section 7) — approval requirements + automation wishes from Section 6 |
| Investment Summary | RDL pricing tiers (fixed, same for all clients) |
| Next Steps + Contact | Closing section |

**Pricing placement rule:** The Investment Summary section must appear **near the end of the document** — after all recommendations, setup details, and roadmap phases. Never place pricing on page 1 or in the top half of any page. The client should see the value story (recommendations, current setup, roadmap) before seeing costs. This reduces sticker shock and frames pricing as an investment in an already-compelling solution.

**Any section that cannot be populated from the form should be marked "To be discussed on strategy call" rather than filled with generic content.**

---

## Rule 9: Voice & Tone Fidelity

The client's voice is described using **only** their Section 5 answers:
- "Describe your communication style in 3 words" → Use those 3 words (or close paraphrase)
- "Example messages" → Reference the style shown (casual, formal, emoji use, abbreviations, etc.)
- "Phrases/words to avoid" → List them as hard rules for the AI Employee
- "Sign-off" → Use as the AI Employee's closing style

If the client provided example messages, analyze them for:
- Sentence length (short/punchy or long/detailed)
- Punctuation style (exclamation marks, ellipses, proper capitalization)
- Emoji usage (present or absent — don't assume either way)
- Formality level (first name basis, use of titles, etc.)

---

## Rule 10: Niche-Specific but Not Niche-Limited

Real estate agents have different specialties. The blueprint should reflect their niche using their own words:

| Niche Indicators | Where to Find Them |
|---|---|
| Military PCS | Section 1 "Primary Market Area" + Section 3 lead questions mentioning "PCSing" or "RNLT date" |
| Luxury | Section 1 market area + Section 3 buyer/seller questions |
| First-time buyers | Section 3 buyer intake questions |
| Commercial | Section 1 license/brokerage + Section 3 workflow |
| Geographic farm | Section 1 primary market area |

**Use the client's niche language** (e.g., "military PCS families" not "relocating families" if they said PCS). But keep the blueprint structure identical across all niches — only the content changes.

---

## Rule 11: Before Delivery Checklist

Before regenerating any blueprint PDF:

- [ ] Re-read the full `pdftotext` output of the client's onboarding PDF
- [ ] Verify every claim in the blueprint traces to a specific form answer
- [ ] Check that no tool names appear in the client-facing version
- [ ] Check that no costs appear except RDL service tiers
- [ ] Verify phone number is the business line (360) 306-7579 — never personal
- [ ] Verify email is james@raindesignlabs.net — never personal
- [ ] Confirm "Voice & Tone" section uses the client's self-described style, not assumptions
- [ ] Confirm all recommendations map to automation wishes from Section 6
- [ ] Run `python3.12 build_blueprint.py` and verify output
- [ ] Preview the generated PDF before sending

---

## Rule 12: Internal Ops Sheet — Purpose and Scope

The internal ops sheet is James's operational playbook for delivering the client's AI services. It contains everything the client-facing blueprint deliberately omits.

**This file is never shared with the client.** The filename always includes `INTERNAL`.

### What goes in the internal ops sheet ONLY (never in client blueprint):

| Category | Examples | Why it stays internal |
|---|---|---|
| Tool names | ManyChat, Follow Up Boss, RealEstateContent.ai, alfred_, Homebot | RDL swaps vendors without client confusion |
| Per-tool costs | $15/mo, $69/mo, $99/mo, $25/mo, $25/mo | Client sees only RDL service tier pricing |
| Total tool spend | $233/mo | Client never sees the margin breakdown |
| Margin analysis | RDL revenue vs tool cost, gross margin % | Business intelligence for James only |
| API/integration details | IMAP connection, webhook URLs, API keys | Technical complexity confuses clients |
| Credential tracking | Account emails, API keys, connected inboxes | Security risk if shared |
| Implementation steps with product names | "Set up ManyChat account, connect FB page" | Client sees phased roadmap without tool names |
| Alternative tool options | If ManyChat doesn't work, try Chatfuel | Client sees the outcome, not the shopping list |
| Token usage / availability | "Unlimited tokens, 24/7 availability" | Implies limitations that don't exist for the client |
| Tech support details | "24/7 tech support included" | Client just gets the service, no caveats |

### Internal Ops Sheet Required Sections

Every internal sheet must include:

1. **Client Profile** — name, email, phone, company, website, niche, recommended tier, discount notes
2. **Tool Stack & Costs** — every tool by name, monthly cost, category, what it does, with a total row
3. **Margin Analysis** — revenue scenarios (low end, high end, next tier up) with tool cost % and gross margin
4. **Implementation Checklist** — phase-by-phase with exact tool names and specific setup steps
5. **Credentials & Access** — checklist of every account/API key to track (actual secrets stored separately in `~/.openclaw/credentials/` or 1Password — never in this file)

### Internal Ops Sheet Formatting

- **Red header bar** (not cyan) to visually distinguish from client documents
- **Footer:** "INTERNAL - DO NOT SHARE WITH CLIENT" on every page
- **First page header:** "INTERNAL OPERATIONS SHEET" + client name + "FOR JAMES ONLY"
- Generated via `~/my_claude/projects/rdl-ai-assistant/templates/build_ops_sheet.py`

---

## Rule 13: The Two-Document Boundary

When building either document, constantly check: "Does this belong in the other one?"

| If you're writing this... | ...and it contains... | ...move it to |
|---|---|---|
| Client blueprint | A tool name (ManyChat, FUB, etc.) | Internal ops sheet |
| Client blueprint | A dollar amount for a specific tool | Internal ops sheet |
| Client blueprint | "API", "webhook", "integration", "token" | Internal ops sheet (or rephrase as "connects to", "works with") |
| Internal ops sheet | A client-facing recommendation paragraph | Client blueprint |
| Internal ops sheet | Service outcome language ("every lead in 60 seconds") | Client blueprint (internal keeps the tool that delivers it) |

**The client blueprint sells the outcome. The internal ops sheet builds the machine.**

---

## Rule 14: Before Delivery — Dual Document Checklist

Before delivering to James, verify BOTH documents:

**Client-facing blueprint:**
- [ ] Re-read the full onboarding PDF text
- [ ] Every claim traces to a specific form answer
- [ ] Zero tool names (search for: ManyChat, Follow Up Boss, RealEstateContent, alfred_, Homebot)
- [ ] Zero per-tool costs (only RDL service tiers)
- [ ] Zero technical terms (search for: API, webhook, token, hook, stack, integrate)
- [ ] Phone is (360) 306-7579 — never personal
- [ ] Email is james@raindesignlabs.net
- [ ] Voice & Tone uses client's self-described style words
- [ ] All recommendations map to Section 6 automation wishes
- [ ] No "NO PAYMENT UNTIL SATISFIED" anywhere
- [ ] Job titles are title case (Realtor, not REALTOR)
- [ ] PDF generated and previewed

**Internal ops sheet:**
- [ ] Contains all tool names with exact costs
- [ ] Total tool spend calculated correctly
- [ ] Margin analysis covers at least 3 pricing scenarios
- [ ] Implementation checklist names every product explicitly
- [ ] Credentials checklist lists every account needed
- [ ] Red header bar (not cyan)
- [ ] "INTERNAL" in filename
- [ ] No client-facing language leaked in (no outcome selling, no testimonials)
- [ ] PDF generated

---

## File Locations

| File | Path | Purpose |
|---|---|---|
| Blueprint rules | `/home/james/my_claude/projects/keyflow/rdl-ai-assistant/blueprint-rules.md` | This document |
| Email monitor | `~/.hermes/profiles/rdl/scripts/email_monitor.py` | Parses onboarding PDFs |
| Client data | `/home/james/my_claude/projects/keyflow/rdl-ai-assistant/clients/[last-first]/meta.json` | Structured client record |
| Build templates | `/home/james/my_claude/projects/keyflow/rdl-ai-assistant/templates/` | Canonical blueprint + ops sheet generators |
| Skill templates | `~/.hermes/profiles/rdl/skills/devops/rdl-consulting/templates/` | Backup copies for skill isolation |
| Obsidian vault | `/home/james/Documents/Obsidian Vault/RDL/AI Employees/` | Search here first for context |

---

*Last updated: May 26, 2026*
*Pilot client: Diana Dominguez (Signature Properties, Little Rock AR)*
