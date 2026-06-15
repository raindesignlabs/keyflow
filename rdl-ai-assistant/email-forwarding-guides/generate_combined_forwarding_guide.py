#!/usr/bin/env python3.12
"""Build one combined client-facing email forwarding guide with provider selector page."""

from pathlib import Path
from fpdf import FPDF
import subprocess

BASE = Path("/home/james/my_claude/projects/rdl-ai-assistant/email-forwarding-guides")
LOGO = Path("/home/james/my_claude/projects/rain-design-labs/website/assets/rdl-logo-horiz-transparent.png")
INTRO_PDF = BASE / "combined-forwarding-guide-intro.pdf"
OUTPUT_PDF = BASE / "client-email-forwarding-guide.pdf"

GUIDES = [
    ("Gmail", BASE / "gmail-forwarding-guide.pdf", 7),
    ("iCloud Mail", BASE / "icloud-forwarding-guide.pdf", 7),
    ("Yahoo Mail", BASE / "yahoo-forwarding-guide.pdf", 7),
    ("Outlook / Hotmail / Microsoft 365", BASE / "outlook-forwarding-guide.pdf", 6),
    ("Other email provider", BASE / "other-forwarding-guide.pdf", 7),
]

CYAN = (0, 179, 234)
GRAY = (128, 130, 133)
DARK = (45, 48, 55)
WHITE = (255, 255, 255)
LIGHT_CARD = (248, 249, 251)
LIGHT_BORDER = (220, 224, 230)
GREEN = (76, 175, 80)
WARM = (255, 248, 220)


class SelectorPDF(FPDF):
    def header(self):
        if LOGO.exists():
            self.image(str(LOGO), x=15, y=10, w=50)
        self.set_draw_color(*CYAN)
        self.set_line_width(0.5)
        self.line(15, 21, 195, 21)
        self.ln(12)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(*GRAY)
        self.cell(0, 5, "Rain Design Labs | Email Forwarding Guide", align="C")

    def title_page(self):
        self.add_page()
        self.ln(24)
        self.set_font("Helvetica", "B", 24)
        self.set_text_color(*DARK)
        self.cell(0, 12, "Set Up Email Forwarding to", new_x="LMARGIN", new_y="NEXT", align="C")
        self.cell(0, 12, "Rain Design Labs", new_x="LMARGIN", new_y="NEXT", align="C")
        self.ln(10)

        self.set_font("Helvetica", "", 13)
        self.set_text_color(*GRAY)
        self.multi_cell(0, 7, "Find your email provider below and go to the listed page. If you are not sure, use the 'Other email provider' section at the end.", align="C")
        self.ln(10)

        self.selector_box()
        self.help_box()

    def selector_box(self):
        y = self.get_y()
        self.set_fill_color(*LIGHT_CARD)
        self.set_draw_color(*LIGHT_BORDER)
        self.set_line_width(0.4)
        self.rect(18, y, 174, 122, style="DF")

        self.set_xy(25, y + 8)
        self.set_font("Helvetica", "B", 16)
        self.set_text_color(*CYAN)
        self.cell(0, 8, "Choose your email provider", new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

        page = 2
        row_y = y + 22
        for name, _, pages in GUIDES:
            self.set_xy(28, row_y)
            self.set_fill_color(*WHITE)
            self.set_draw_color(*LIGHT_BORDER)
            self.rect(28, row_y, 154, 16, style="DF")
            self.set_xy(34, row_y + 4)
            self.set_font("Helvetica", "B", 12)
            self.set_text_color(*DARK)
            self.cell(110, 6, name)
            self.set_font("Helvetica", "", 11)
            self.set_text_color(*GRAY)
            self.cell(0, 6, f"Start on page {page}", align="R")
            row_y += 20
            page += pages

        self.set_y(y + 130)

    def help_box(self):
        y = self.get_y()
        self.set_fill_color(*WARM)
        self.set_draw_color(*GREEN)
        self.set_line_width(0.3)
        self.rect(18, y, 174, 28, style="DF")
        self.set_xy(24, y + 5)
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(*DARK)
        self.cell(0, 6, "Need help?")
        self.ln(7)
        self.set_x(24)
        self.set_font("Helvetica", "", 10)
        self.multi_cell(160, 5, "Call (360) 306-7579 or email help@raindesignlabs.net. If your screen looks different, send us a screenshot and we will guide you.")


def build_intro():
    pdf = SelectorPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.title_page()
    pdf.output(str(INTRO_PDF))


def verify_inputs():
    missing = [str(path) for _, path, _ in GUIDES if not path.exists()]
    if missing:
        raise FileNotFoundError("Missing guide PDFs: " + ", ".join(missing))


def merge_pdfs():
    cmd = [
        "pdfunite",
        str(INTRO_PDF),
        *[str(path) for _, path, _ in GUIDES],
        str(OUTPUT_PDF),
    ]
    subprocess.run(cmd, check=True)


def build():
    verify_inputs()
    build_intro()
    merge_pdfs()
    print(f"Combined guide saved to: {OUTPUT_PDF}")


if __name__ == "__main__":
    build()
