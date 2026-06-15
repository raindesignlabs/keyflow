#!/usr/bin/env python3
"""Generate 'We Are Officially Under Contract' PDF.

Usage:
  python3 build_welcome_contract.py                        # uses data.json in same dir
  python3 build_welcome_contract.py --data path/to/data.json
  python3 build_welcome_contract.py --data data.json --out output.pdf
"""

import argparse
import asyncio
import base64
import io
import json
from pathlib import Path

from PIL import Image
from playwright.async_api import async_playwright

HERE = Path(__file__).parent
DEFAULT_DATA = HERE / "data.json"
DEFAULT_OUT  = HERE / "diana-welcome-to-contract.pdf"

PHOTO_MAX_WIDTH = 600


def photo_data_uri(photo_path: Path) -> str:
    img = Image.open(photo_path).convert("RGBA")
    bg  = Image.new("RGBA", img.size, (255, 255, 255, 255))
    bg.paste(img, mask=img.split()[3] if img.mode == "RGBA" else None)
    rgb = bg.convert("RGB")
    w, h = rgb.size
    if w > PHOTO_MAX_WIDTH:
        rgb = rgb.resize((PHOTO_MAX_WIDTH, int(h * PHOTO_MAX_WIDTH / w)), Image.LANCZOS)
    buf = io.BytesIO()
    rgb.save(buf, format="JPEG", quality=85, optimize=True)
    return f"data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode()}"


def brittany_font_face() -> str:
    p = HERE / "brittany_b64.txt"
    if not p.exists():
        return ""
    b64 = p.read_text().strip()
    return (
        "@font-face {"
        " font-family: 'Brittany';"
        f" src: url('data:font/truetype;base64,{b64}') format('truetype');"
        " font-weight: normal; font-style: normal;"
        "}"
    )


# ── INLINE SVG ICONS (match PPTX icon style) ─────────────────────────────────
ICON_HOUSE = """<svg width="26" height="26" viewBox="0 0 24 24" fill="none"
  stroke="#555" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"/>
  <polyline points="9,21 9,13 15,13 15,21"/>
</svg>"""

ICON_DOLLAR = """<svg width="26" height="26" viewBox="0 0 24 24" fill="none"
  stroke="#555" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="9.5"/>
  <path d="M12 6v12M9.5 9.5a2.5 2.5 0 015 0c0 1.5-5 1.5-5 3a2.5 2.5 0 005 0"/>
</svg>"""

ICON_CASH = """<svg width="26" height="26" viewBox="0 0 24 24" fill="none"
  stroke="#555" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="2" y="7" width="20" height="13" rx="1.5"/>
  <path d="M16 3.5H6a2 2 0 00-2 2V7"/>
  <circle cx="12" cy="13.5" r="2.5"/>
  <line x1="5.5" y1="13.5" x2="6" y2="13.5"/>
  <line x1="18.5" y1="13.5" x2="18" y2="13.5"/>
</svg>"""

ICON_SIGNATURE = """<svg width="46" height="40" viewBox="0 0 46 40" fill="none"
  stroke="#1A1714" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
  <path d="M6 38V20L23 5l17 15v18"/>
  <rect x="17" y="24" width="12" height="14" rx="1"/>
  <path d="M2 21L23 3l21 18"/>
</svg>"""


def contact_html(label: str, c: dict) -> str:
    addr  = c.get("address", "").strip()
    note  = c.get("note", "").strip()
    person = c.get("contact_name", "").strip()
    addr_html   = f'<div class="ct-addr">{addr.replace(chr(10), "<br>")}</div>' if addr else ""
    person_html = f'<div class="ct-person">{person}</div>' if person else ""
    if note:
        detail = f'<div class="ct-detail">{note.replace(chr(10), "<br>")}</div>'
    else:
        lines = [c[k] for k in ("phone", "email") if c.get(k)]
        detail = f'<div class="ct-detail">{"<br>".join(lines)}</div>' if lines else ""
    return f"""<div class="ct-block">
  <div class="ct-label">{label}</div>
  <div class="ct-company">{c.get("company", "")}</div>
  {addr_html}{person_html}{detail}
</div>"""


def tl_row(key: str, val: str) -> str:
    return f"""<div class="tl-row">
  <span class="tl-key">{key}</span>
  <span class="tl-val">{val}</span>
</div>"""


def build_html(d: dict, photo_uri: str, font_face: str) -> str:
    prop  = d["property"]
    tl    = d["timeline"]
    co    = d["contacts"]
    ag    = d["agent"]
    notes = d.get("notes", [])

    notes_html = "".join(f'<p class="note-para">{n}</p>' for n in notes)

    tl_rows = "".join([
        tl_row("Effective Date",         tl["effective_date"]),
        tl_row("Earnest Money Due",       tl["earnest_money_due"]),
        tl_row("Inspection Date",         tl["inspection_date"]),
        tl_row("Inspection Period Ends",  tl["inspection_period_ends"]),
        tl_row("Appraisal Date",          tl["appraisal_date"]),
        tl_row("Final Walk-Through",      tl["final_walk_through"]),
        tl_row("Closing Date",            tl["closing_date"]),
    ])

    # Exact values from PPTX source:
    # Brittany 35pt → "Congratulations"
    # Brittany 27pt → section headers
    # Montserrat 15pt → contact section labels
    # Montserrat 13pt → timeline keys/values
    # Montserrat 12pt → contact details, property values
    # Montserrat 11pt → agent contact lines
    # Montserrat 8.6pt → "Please let me know"
    # Gray: #DDDDDD  Warm header: #F4F2EF  Text: #1A1714
    # Left column width ≈ 3.85in, right ≈ 2.84in, left margin ≈ 0.7in

    css = """\
* { margin: 0; padding: 0; box-sizing: border-box; }
@page { size: 8.5in 11in; margin: 0; }
body {
  font-family: 'Montserrat', Arial, sans-serif;
  background: #fff;
  color: #1A1714;
  width: 8.5in;
  min-height: 11in;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* ── Brittany: disable problematic ligatures ── */
.script {
  font-family: 'Brittany', cursive;
  font-feature-settings: "liga" 0, "calt" 0, "clig" 0;
  -webkit-font-feature-settings: "liga" 0, "calt" 0, "clig" 0;
}

/* ══ SECTION 1: WARM HEADER BAND (0 – 0.518in) ══ */
.hdr {
  background: #F4F2EF;
  padding: 0 0.7in;
  height: 0.518in;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.hdr-tagline {
  font-size: 15pt;
  font-weight: 400;
  color: #1A1714;
  letter-spacing: 0.01em;
}

/* ══ SECTION 2: GRAY PROPERTY BAND ══ */
.prop-band {
  background: #DDDDDD;
  display: flex;
  padding: 0;
}
.prop-cell {
  flex: 1;
  padding: 0.14in 0.24in 0.14in;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  position: relative;
}
.prop-cell + .prop-cell { border-left: 1px solid #C4C4C4; }
.prop-cell svg { margin-bottom: 2px; display: block; }
.prop-addr-1 { font-size: 12pt; font-weight: 400; color: #1A1714; line-height: 1.2; }
.prop-addr-2 { font-size: 12pt; font-weight: 400; color: #1A1714; }
.prop-lbl    { font-size: 12pt; font-weight: 400; letter-spacing: 0.06em; text-transform: uppercase; color: #1A1714; }
.prop-val    { font-size: 12pt; font-weight: 400; color: #1A1714; }

/* ══ CONGRATULATIONS — bridging header/property ══ */
.congrats-wrap {
  padding: 0.06in 0.7in 0.04in;
}
.congrats-text {
  font-size: 35pt;
  color: #1A1714;
  line-height: 1;
}

/* ══ SECTION 3: BODY ══ */
.body-wrap {
  padding: 0.1in 0.7in 0;
}
.body-grid {
  display: grid;
  grid-template-columns: 3.85in 2.84in;
  gap: 0;
  column-gap: 0.3in;
}
.col-head {
  font-size: 27pt;
  color: #1A1714;
  line-height: 1;
  margin-bottom: 0.06in;
}

/* Timeline card */
.tl-card {
  background: #DDDDDD;
  border-radius: 2px;
  padding: 0.04in 0.14in 0.06in;
}
.tl-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.07in 0;
  border-bottom: 1px solid #C4C4C4;
}
.tl-row:last-child { border-bottom: none; }
.tl-key { font-size: 13pt; font-weight: 400; text-transform: uppercase; color: #1A1714; letter-spacing: 0.04em; }
.tl-val { font-size: 13pt; font-weight: 400; color: #1A1714; text-align: right; }

/* Contacts — white background */
.ct-block { padding: 0.06in 0; }
.ct-block:last-child { padding-bottom: 0; }
.ct-label   { font-size: 15pt; font-weight: 400; text-transform: uppercase; color: #1A1714; letter-spacing: 0.04em; margin-bottom: 1px; }
.ct-company { font-size: 12pt; color: #1A1714; line-height: 1.35; }
.ct-addr    { font-size: 12pt; color: #1A1714; line-height: 1.35; }
.ct-person  { font-size: 12pt; color: #1A1714; line-height: 1.35; }
.ct-detail  { font-size: 12pt; color: #1A1714; line-height: 1.35; }

/* ══ BOTTOM SECTION ══ */
.bottom-wrap {
  padding: 0.08in 0.7in 0;
  display: grid;
  grid-template-columns: 3.85in 2.84in;
  gap: 0;
  column-gap: 0.3in;
}
.note-para { font-size: 11pt; line-height: 1.55; color: #1A1714; }
.note-para + .note-para { margin-top: 0.07in; }
.notes-card {
  background: #DDDDDD;
  border-radius: 2px;
  padding: 0.1in 0.14in;
}

/* ══ AGENT FOOTER ══ */
.agent-wrap {
  padding: 0.08in 0.7in 0;
  display: flex;
  align-items: flex-end;
  gap: 0.16in;
}
.agent-photo { width: 1.75in; height: auto; display: block; flex-shrink: 0; }
.agent-right {
  flex: 1;
  padding-bottom: 0.1in;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.agent-please {
  font-size: 8.6pt;
  color: #1A1714;
  margin-bottom: 0.08in;
  letter-spacing: 0.01em;
}
.agent-line  { font-size: 11pt; color: #1A1714; line-height: 1.7; }
.agent-brand {
  margin-top: 0.1in;
  display: flex;
  align-items: center;
  gap: 0.14in;
}
.agent-name-first {
  font-family: 'Montserrat', sans-serif;
  font-size: 16pt;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #1A1714;
  line-height: 1.1;
}
.agent-name-last {
  font-family: 'Montserrat', sans-serif;
  font-size: 9pt;
  font-weight: 400;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: #666;
  margin-top: 2px;
}
.agent-sig-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  border-left: 1px solid #CCC;
  padding-left: 0.14in;
}
.agent-sig-name {
  font-size: 7pt;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #1A1714;
  margin-top: 3px;
  text-align: center;
}
"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>We Are Officially Under Contract</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
{font_face}
{css}
</style>
</head>
<body>

<!-- ① WARM HEADER BAND -->
<div class="hdr">
  <span></span>
  <span class="hdr-tagline">we are officially under contract!!</span>
</div>

<!-- ② "CONGRATULATIONS" — bridges header into property band -->
<div class="congrats-wrap" style="background:#DDDDDD;">
  <span class="script congrats-text">Congratulations</span>
</div>

<!-- ③ PROPERTY BAND -->
<div class="prop-band">
  <div class="prop-cell">
    {ICON_HOUSE}
    <div class="prop-addr-1">{prop["address_line1"]}</div>
    <div class="prop-addr-2">{prop["address_line2"]}</div>
  </div>
  <div class="prop-cell">
    {ICON_DOLLAR}
    <div class="prop-lbl">Purchase Price</div>
    <div class="prop-val">{prop["purchase_price"]}</div>
  </div>
  <div class="prop-cell">
    {ICON_CASH}
    <div class="prop-lbl">Earnest Money</div>
    <div class="prop-val">{prop["earnest_money"]}</div>
  </div>
</div>

<!-- ④ BODY: TIMELINE + CONTACTS -->
<div class="body-wrap">
  <div class="body-grid">

    <!-- LEFT: TIMELINE -->
    <div>
      <div class="col-head script">Here's the Timeline</div>
      <div class="tl-card">{tl_rows}</div>
    </div>

    <!-- RIGHT: CONTACTS -->
    <div>
      <div class="col-head script">Contacts</div>
      {contact_html("Title Company",    co["title_company"])}
      {contact_html("Lender",           co["lender"])}
      {contact_html("Home Inspections", co["home_inspections"])}
      {contact_html("Survey Company",   co["survey_company"])}
    </div>

  </div>
</div>

<!-- ⑤ NOTES + HOME INSURANCE -->
<div class="bottom-wrap">
  <div>
    <div class="col-head script">Notes</div>
    <div class="notes-card">{notes_html}</div>
  </div>
  <div style="padding-top:0.45in;">
    {contact_html("Home Insurance", co["home_insurance"])}
  </div>
</div>

<!-- ⑥ AGENT FOOTER -->
<div class="agent-wrap">
  <img class="agent-photo" src="{photo_uri}" alt="{ag['name']}">
  <div class="agent-right">
    <div class="agent-please script">Please let me know if you have any questions!</div>
    <div class="agent-line">{ag["phone"]}</div>
    <div class="agent-line">{ag["email"]}</div>
    <div class="agent-line">{ag["website"]}</div>
    <div class="agent-brand">
      <div>
        <div class="agent-name-first">Diana</div>
        <div class="agent-name-last">Dominguez</div>
      </div>
      <div class="agent-sig-block">
        {ICON_SIGNATURE}
        <span class="agent-sig-name">Signature&nbsp;Properties</span>
      </div>
    </div>
  </div>
</div>

</body>
</html>"""


async def build(data_path: Path, out_path: Path):
    with open(data_path) as f:
        d = json.load(f)

    photo_rel  = d["agent"].get("photo", "assets/dd-bodyshot-small-white.png")
    photo_file = data_path.parent / photo_rel
    uri        = photo_data_uri(photo_file) if photo_file.exists() else ""
    font_face  = brittany_font_face()

    html = build_html(d, uri, font_face)

    html_path = out_path.parent / "_contract_tmp.html"
    html_path.write_text(html, encoding="utf-8")

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page    = await browser.new_page()
        await page.goto(f"file://{html_path.resolve()}")
        await page.wait_for_load_state("networkidle")
        await page.pdf(
            path=str(out_path),
            format="Letter",
            print_background=True,
            margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
        )
        await browser.close()

    html_path.unlink()
    print(f"Saved: {out_path}  ({out_path.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA)
    parser.add_argument("--out",  type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()
    asyncio.run(build(args.data, args.out))
