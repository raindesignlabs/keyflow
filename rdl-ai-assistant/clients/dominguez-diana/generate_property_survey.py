#!/usr/bin/env python3
"""
Property Survey PDF Generator — Diana Dominguez Signature Properties
Input: JSON (property-survey-schema.json) → Output: Branded PDF
"""

import json, sys
from pathlib import Path
from fpdf import FPDF

# ── Brand Colors ─────────────────────────────────────────────────────────────
BLACK      = (0, 0, 0)
DARK_GRAY  = (34, 31, 32)
TAUPE      = (191, 183, 175)
RED_ACCENT = (183, 2, 0)
COOL_GRAY  = (243, 245, 248)
MID_GRAY   = (128, 128, 128)
WHITE      = (255, 255, 255)

PAGE_W     = 8.5
PAGE_H     = 11.0
MARGIN     = 0.55

FONT_DIR   = Path(__file__).parent / "assets" / "fonts"
ASSETS_DIR = Path(__file__).parent / "assets"


def load_fonts(pdf):
    """Register Montserrat family. fpdf2 only supports '' / 'B' / 'I' / 'BI'."""
    for name, style, file in [
        ("Montserrat",      "",  "Montserrat-Regular.ttf"),
        ("Montserrat",      "B", "Montserrat-Bold.ttf"),
        ("MontserratSB",    "",  "Montserrat-SemiBold.ttf"),
        ("MontserratLight", "",  "Montserrat-Light.ttf"),
    ]:
        p = FONT_DIR / file
        if p.exists():
            pdf.add_font(name, style, str(p))


class PropertySurveyPDF(FPDF):
    def __init__(self, data):
        super().__init__(unit="in", format="Letter")
        self.data = data
        self.set_auto_page_break(auto=False)
        self.set_margins(MARGIN, MARGIN, MARGIN)
        load_fonts(self)

    # fpdf2 calls this on add_page — we handle footers manually at end
    def footer(self):
        pass

    def build(self):
        self.add_page()
        self._header_block()
        self._property_address()
        sections = [
            ("HOME OVERVIEW",              "home_overview"),
            ("UTILITIES (AVERAGE MONTHLY)", "utilities"),
            ("MAJOR SYSTEMS",              "major_systems"),
            ("APPLIANCES",                 "appliances"),
            ("EXTERIOR & LOT",             "exterior_lot"),
            ("SECURITY & SMART FEATURES",  "security_smart"),
            ("SERVICE CONTRACTS",          "service_contracts"),
            ("HOA & FINANCIAL",            "hoa_financial"),
        ]
        for title, key in sections:
            self._section(title, self.data.get(key, {}))
        self._negotiation_section()
        self._marketing_section()
        # Stamp footers on all pages
        total = self.pages_count
        for pg in range(1, total + 1):
            self.page = pg
            self._draw_page_footer()
        return self

    # ── Page Header (black bar + logo left + title) ───────────────────────────
    def _header_block(self):
        self.set_fill_color(*BLACK)
        self.rect(0, 0, PAGE_W, 0.55, "F")

        # Horizontal logo on the left, properly proportioned (3.87:1 aspect)
        logo = ASSETS_DIR / "dominguez-logo-light.png"
        if not logo.exists():
            logo = ASSETS_DIR / "dominguez-logo.png"
        if logo.exists():
            # Keep aspect ratio: height=0.35 → width=0.35*3.87≈1.35
            logo_h = 0.35
            logo_w = logo_h * 3.87
            self.image(str(logo), x=MARGIN + 0.05, y=0.10, w=logo_w, h=logo_h)

        # Title text centered in header
        self.set_xy(0, 0.12)
        self.set_font("Montserrat", "B", 14)
        self.set_text_color(*WHITE)
        self.cell(PAGE_W, 0.32, "Your Contract Summary", align="C")

        # Red accent line below header
        self.set_fill_color(*RED_ACCENT)
        self.rect(0, 0.55, PAGE_W, 0.018, "F")
        self.set_y(0.70)

    # ── Continuation header for page 2+ ──────────────────────────────────────
    def _cont_header(self):
        self.set_fill_color(*BLACK)
        self.rect(0, 0, PAGE_W, 0.22, "F")
        self.set_fill_color(*RED_ACCENT)
        self.rect(0, 0.22, PAGE_W, 0.012, "F")
        self.set_y(0.35)
        prop = self.data.get("property", {})
        self.set_font("Montserrat", "B", 7)
        self.set_text_color(*MID_GRAY)
        self.cell(0, 0.18, f"PROPERTY SURVEY  —  {prop.get('address', '')}",
                  new_x="LMARGIN", new_y="NEXT", align="C")
        self.set_y(self.get_y() + 0.08)

    # ── Property Address ─────────────────────────────────────────────────────
    def _property_address(self):
        addr = self.data.get("property", {}).get("address", "—")
        self.set_font("Montserrat", "B", 12)
        self.set_text_color(*BLACK)
        self.cell(0, 0.28, addr, new_x="LMARGIN", new_y="NEXT", align="L")
        # divider
        self.set_draw_color(*TAUPE)
        self.set_line_width(0.005)
        self.line(MARGIN + 2, self.get_y() + 0.06, PAGE_W - MARGIN - 2, self.get_y() + 0.06)
        self.set_y(self.get_y() + 0.18)

    # ── Generic Section ──────────────────────────────────────────────────────
    def _section(self, title, fields):
        if not fields:
            return
        filtered = [(k, v) for k, v in fields.items() if v]
        if not filtered:
            return

        row_h = 0.24
        card_h = len(filtered) * row_h + 0.1
        need = 0.15 + 0.22 + card_h + 0.08  # gap + title + card + spacing

        if self.get_y() + need > PAGE_H - 0.7:
            self.add_page()
            self._cont_header()

        # Title
        self.set_y(self.get_y() + 0.12)
        self.set_font("Montserrat", "B", 8)
        self.set_text_color(*DARK_GRAY)
        self.cell(0, 0.2, title, new_x="LMARGIN", new_y="NEXT")

        # Card
        cx = MARGIN
        cy = self.get_y()
        cw = PAGE_W - 2 * MARGIN

        self.set_fill_color(*COOL_GRAY)
        self.rect(cx, cy, cw, card_h, "F")

        label_w = 2.5
        val_x = cx + label_w + 0.15
        val_w = cw - label_w - 0.3
        y = cy + 0.05

        for key, val in filtered:
            label = key.replace("_", " ").title()

            # thin divider line between rows
            if y > cy + 0.06:
                self.set_draw_color(220, 220, 220)
                self.set_line_width(0.003)
                self.line(cx + 0.1, y - 0.01, cx + cw - 0.1, y - 0.01)

            self.set_xy(cx + 0.1, y)
            self.set_font("MontserratSB", "", 7)
            self.set_text_color(*MID_GRAY)
            self.cell(label_w, row_h, label)

            self.set_xy(val_x, y)
            self.set_font("Montserrat", "", 7.5)
            self.set_text_color(*BLACK)
            if len(str(val)) > 65:
                self.multi_cell(val_w, row_h * 0.55, str(val))
            else:
                self.cell(val_w, row_h, str(val))
            y += row_h

        self.set_y(cy + card_h + 0.04)

    # ── Negotiation Section ──────────────────────────────────────────────────
    def _negotiation_section(self):
        text = self.data.get("items_to_negotiate", "")
        if not text:
            return
        lines = max(1, len(text) // 80 + 1)
        card_h = lines * 0.2 + 0.12
        need = 0.15 + 0.22 + card_h + 0.08

        if self.get_y() + need > PAGE_H - 0.7:
            self.add_page()
            self._cont_header()

        self.set_y(self.get_y() + 0.12)
        self.set_font("Montserrat", "B", 8)
        self.set_text_color(*DARK_GRAY)
        self.cell(0, 0.2, "ITEMS TO REMAIN / NEGOTIATE", new_x="LMARGIN", new_y="NEXT")

        cx, cy = MARGIN, self.get_y()
        cw = PAGE_W - 2 * MARGIN
        self.set_fill_color(*COOL_GRAY)
        self.rect(cx, cy, cw, card_h, "F")

        self.set_xy(cx + 0.1, cy + 0.05)
        self.set_font("Montserrat", "", 7.5)
        self.set_text_color(*BLACK)
        self.multi_cell(cw - 0.2, 0.2, text)
        self.set_y(cy + card_h + 0.04)

    # ── Marketing Section ────────────────────────────────────────────────────
    def _marketing_section(self):
        mkt = self.data.get("marketing", {})
        if not mkt:
            return
        prompt = mkt.get("prompt", "")
        response = mkt.get("response", "")
        combined = prompt + response
        lines = max(2, len(combined) // 70 + 2)
        card_h = lines * 0.2 + 0.18
        need = 0.15 + 0.22 + card_h + 0.08

        if self.get_y() + need > PAGE_H - 0.7:
            self.add_page()
            self._cont_header()

        self.set_y(self.get_y() + 0.12)
        self.set_font("Montserrat", "B", 8)
        self.set_text_color(*DARK_GRAY)
        self.cell(0, 0.2, "SELLER SPOTLIGHT", new_x="LMARGIN", new_y="NEXT")

        cx, cy = MARGIN, self.get_y()
        cw = PAGE_W - 2 * MARGIN
        self.set_fill_color(*COOL_GRAY)
        self.rect(cx, cy, cw, card_h, "F")

        self.set_xy(cx + 0.1, cy + 0.06)
        self.set_font("MontserratSB", "", 7)
        self.set_text_color(*MID_GRAY)
        self.multi_cell(cw - 0.2, 0.2, f'"{prompt}"')

        self.set_x(cx + 0.1)
        self.set_font("Montserrat", "", 7.5)
        self.set_text_color(*BLACK)
        self.multi_cell(cw - 0.2, 0.2, response)
        self.set_y(cy + card_h + 0.04)

    # ── Footer (drawn at bottom of each page) ────────────────────────────────
    def _draw_page_footer(self):
        y = PAGE_H - 0.4
        self.set_draw_color(*TAUPE)
        self.set_line_width(0.005)
        self.line(MARGIN, y, PAGE_W - MARGIN, y)

        self.set_xy(MARGIN, y + 0.04)
        self.set_font("Montserrat", "", 5.5)
        self.set_text_color(*MID_GRAY)
        meta = self.data.get("metadata", {})
        agent = meta.get("prepared_by", "Diana Dominguez — Signature Properties")
        self.cell(0, 0.13, f"{agent}  |  (325) 829-2839  |  pcsingtolittlerock.com",
                  align="C", new_x="LMARGIN", new_y="NEXT")

        disc = meta.get("disclaimer", "")
        if disc:
            self.set_x(MARGIN)
            self.set_font("Montserrat", "", 4.5)
            self.multi_cell(0, 0.1, disc, align="C")


def main():
    if len(sys.argv) < 2:
        print("Usage: python generate_property_survey.py <input.json> [output.pdf]")
        sys.exit(1)

    inp = Path(sys.argv[1])
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else inp.with_suffix(".pdf")

    with open(inp) as f:
        data = json.load(f)

    pdf = PropertySurveyPDF(data)
    pdf.build()
    pdf.output(str(out))
    print(f"✓ Generated: {out}  ({out.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
