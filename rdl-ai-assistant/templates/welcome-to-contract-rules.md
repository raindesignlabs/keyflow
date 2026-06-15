# Welcome to Contract — AI Generation Rules

This document tells the AI assistant exactly what to collect, how to format it, and how to produce the "We Are Officially Under Contract" PDF for any new buyer.

---

## Step 1 — Collect the Data

Ask Diana for the following. Group your questions to avoid overwhelming her.

### Property (ask first — always known at contract)
| Field | Example | Notes |
|---|---|---|
| `address_line1` | 9716 Wild Mountain Dr. | Street + number only |
| `address_line2` | Little Rock, AR 72210 | City, State ZIP |
| `purchase_price` | $335,000 | Include dollar sign and comma |
| `earnest_money` | $2,500 | Use "$0" if none; never blank |

### Timeline (ask second — some may be PENDING)
| Field | Example | Notes |
|---|---|---|
| `effective_date` | JUN 2, 2026 | Always known |
| `earnest_money_due` | JUN 4, 2026 | Use "N/A" if no earnest |
| `inspection_date` | JUN 9, 2026 | Use "PENDING" if not yet scheduled |
| `inspection_period_ends` | JUN 13, 2026 | Typically 10 days from effective |
| `appraisal_date` | JUN 20, 2026 | Use "PENDING" if unknown |
| `final_walk_through` | JUL 14, 2026 | Typically 1 day before closing |
| `closing_date` | JUL 15, 2026 | Always known |

**Date format rule:** ALL CAPS abbreviated month, no leading zero on day — e.g., `JUN 2, 2026` not `June 02, 2026`.

### Contacts (ask third — gather what's available, use placeholders for unknown)
For each contact below, collect: company name, address (optional), contact person, phone, email.

- **Title Company** — usually known at contract
- **Lender** — usually known; use "TBD" if cash offer
- **Home Inspections** — often PENDING at contract time
- **Survey Company** — check if title company is ordering (if yes, note that)
- **Home Insurance** — often PENDING; use "Pending" as company if unknown

### Notes
Ask Diana: *"Any special notes for this buyer — appraisal timing, survey authorization, repair contingencies?"*

Defaults to use if she has nothing specific:
1. "We will wait to order appraisal until we get through the inspection period."
2. "We will need to send you a survey authorization to order the survey however we will wait on that also until we come to an agreement on repairs."

---

## Step 2 — Fill in the Data File

Copy `templates/contract-data-template.json` to the client folder and rename it `data.json`.

```
cp templates/contract-data-template.json clients/<client-folder>/data.json
```

Fill in every field. Rules:
- Never leave a value as `""` — use `"N/A"`, `"PENDING"`, or `"TBD"` instead.
- The `notes` field is a JSON array of strings — one string per paragraph.
- The `agent.photo` path is relative to the `data.json` file location.
- For survey company, if title is ordering it, set `"note"` field and leave phone/email blank.

---

## Step 3 — Generate the PDF

Run from the client folder (requires Python 3.12, python-pptx, LibreOffice):

```bash
python3.12 build_closing_timeline.py --data data.json --out closing-timeline.pdf
```

Or from any directory:

```bash
python3.12 clients/<folder>/build_closing_timeline.py \
  --data clients/<folder>/data.json \
  --out clients/<folder>/closing-timeline.pdf
```

The script fills a PPTX template and converts to PDF via LibreOffice headless.

---

## Step 4 — Review & Send

1. Open the PDF and verify all dates and contact info visually.
2. Check that no field shows `%%PHOTO_URI%%` or `{placeholder}` text.
3. Send to the buyer via email with subject: *"You're Under Contract! 🎉 Here's Your Timeline & Contacts"*

### Email Routing Rules

- **Outgoing closing timeline PDFs** → To: Diana (agent), CC: James
- **Diana's email:** diana.dominguez@icloud.com
- **James's email:** james@raindesignlabs.net
- **Send from:** assistant@raindesignlabs.net

---

## Field Format Reference

| Type | Format | Bad ❌ | Good ✓ |
|---|---|---|---|
| Date | MON D, YYYY | June 02, 2026 | JUN 2, 2026 |
| Price | $X,XXX | 335000 | $335,000 |
| Phone | XXX-XXX-XXXX or XXX.XXX.XXXX | 5015550100 | 501-555-0100 |
| Unknown | "PENDING" or "N/A" | "" or "unknown" | "PENDING" |

---

## Agent Profile (Diana — do not change per transaction)

These fields live in `data.json` under `agent` and are pre-filled in the template. Only update if Diana changes brokerage, phone, or email.

```json
"agent": {
  "name": "Diana Dominguez",
  "title": "REALTOR®",
  "brokerage": "Signature Properties",
  "phone": "325.829.2839",
  "email": "Diana.dominguez@icloud.com",
  "website": "www.pcsingtolittlerock.com",
  "photo": "assets/dd-bodyshot.png"
}
```
