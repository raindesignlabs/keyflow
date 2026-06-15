#!/usr/bin/env python3.12
"""Generate INTERNAL-ONLY operations sheet for James.
Contains tool names, costs, tokens, and all privileged info.
NEVER send to client."""

from fpdf import FPDF
from pathlib import Path
import datetime

LOGO = "/home/james/my_claude/projects/rain-design-labs/website/assets/rdl-logo-horiz-transparent.png"
OUTPUT = "/home/james/my_claude/clients/dominguez-diana/diana-dominguez-INTERNAL-ops-sheet.pdf"

CYAN = (0, 179, 234)
GRAY = (128, 130, 133)
DARK = (45, 48, 55)
WHITE = (255, 255, 255)
DIVIDER = (220, 222, 224)
RED = (220, 50, 50)


class OpsPDF(FPDF):
    def __init__(self):
        super().__init__(orientation='P', unit='mm', format='A4')
        self.set_auto_page_break(auto=True, margin=20)

    def header(self):
        if Path(LOGO).exists():
            self.image(LOGO, x=15, y=10, w=55)
        self.set_draw_color(*RED)
        self.set_line_width(0.5)
        self.line(15, 21, 195, 21)
        self.ln(16)

    def footer(self):
        self.set_y(-13)
        self.set_draw_color(*DIVIDER)
        self.set_line_width(0.2)
        self.line(15, self.get_y(), 195, self.get_y())
        self.ln(1.5)
        self.set_font("Helvetica", "", 7)
        self.set_text_color(*RED)
        self.cell(0, 4, "INTERNAL - DO NOT SHARE WITH CLIENT", align="C")

    def section_heading(self, text):
        self.set_font("Helvetica", "B", 13)
        self.set_text_color(*DARK)
        self.cell(0, 8, text.upper(), new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(*DARK)
        self.set_line_width(0.4)
        self.line(self.get_x(), self.get_y(), self.get_x() + 45, self.get_y())
        self.ln(3)

    def sub_heading(self, text):
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(*DARK)
        self.cell(0, 7, text, new_x="LMARGIN", new_y="NEXT")

    def body_text(self, text):
        self.set_font("Helvetica", "", 9.5)
        self.set_text_color(*DARK)
        self.multi_cell(0, 5, text)
        self.ln(1.5)

    def bullet(self, text, bold_prefix=""):
        x = self.get_x()
        if self.get_y() > 270:
            self.add_page()
            x = self.get_x()
        self.set_fill_color(*DARK)
        self.ellipse(x + 2, self.get_y() + 1.2, 2, 2, style='F')
        self.set_x(x + 7)
        if bold_prefix:
            self.set_font("Helvetica", "B", 9.5)
            self.set_text_color(*DARK)
            w = self.get_string_width(bold_prefix + " ")
            self.cell(w, 5, bold_prefix + " ")
            self.set_font("Helvetica", "", 9.5)
            self.multi_cell(0, 5, text)
        else:
            self.set_font("Helvetica", "", 9.5)
            self.set_text_color(*DARK)
            self.multi_cell(0, 5, text)
        self.ln(0.5)


def build():
    pdf = OpsPDF()
    today = datetime.date.today().strftime("%B %d, %Y")

    # -- HEADER --
    pdf.add_page()
    pdf.ln(5)
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_text_color(*RED)
    pdf.cell(0, 10, "INTERNAL OPERATIONS SHEET", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(*DARK)
    pdf.cell(0, 8, "Diana Dominguez - AI Adoption Blueprint", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*GRAY)
    pdf.cell(0, 6, f"Generated: {today}  |  FOR JAMES ONLY", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(5)

    # -- CLIENT INFO --
    pdf.section_heading("Client Profile")
    pdf.bullet("Diana L. Dominguez", "Name:")
    pdf.bullet("diana.dominguez@icloud.com", "Email:")
    pdf.bullet("325.829.2839", "Phone:")
    pdf.bullet("Signature Properties / The Herk Group", "Company:")
    pdf.bullet("pcsingtolittlerock.com", "Website:")
    pdf.bullet("Realtor - military PCS families, Little Rock AR", "Niche:")
    pdf.bullet("Starter Plan ($799-$1,500/mo)", "Recommended Tier:")
    pdf.bullet("First month free. 10% military discount if applicable.", "Notes:")
    pdf.ln(3)

    # -- TOOL STACK WITH COSTS --
    pdf.section_heading("Tool Stack & Costs")
    pdf.body_text("Per-client subscriptions. No sharing across clients.")

    col_w = [55, 22, 30, 83]
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(*DARK)
    pdf.set_text_color(*WHITE)
    for i, h in enumerate(["Tool", "Cost/mo", "Category", "What It Does"]):
        pdf.cell(col_w[i], 7, h, border=1, fill=True, align="C")
    pdf.ln()

    pdf.set_text_color(*DARK)
    tools = [
        ("ManyChat", "$15", "Lead Response", "Website chat + FB/IG DM + SMS auto-responder"),
        ("Follow Up Boss", "$69", "CRM", "Lead routing, touchpoint tracking, follow-up sequences"),
        ("RealEstateContent.ai", "$99", "Social Media", "Unlimited posts, listing-to-social, editorial calendar"),
        ("alfred_", "$25", "Email", "Inbox triage, draft replies, follow-up tracking"),
        ("Homebot", "$25", "Past Client", "Monthly equity reports, market updates, referral engine"),
    ]
    for row in tools:
        for i, val in enumerate(row):
            pdf.set_font("Helvetica", "", 8.5)
            pdf.cell(col_w[i], 6, val, border=0)
        pdf.ln()

    # Total
    pdf.set_draw_color(*DARK)
    pdf.set_line_width(0.3)
    pdf.line(15, pdf.get_y(), 195, pdf.get_y())
    pdf.ln(1)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(col_w[0], 6, "TOTAL")
    pdf.cell(col_w[1], 6, "$233/mo")
    pdf.ln(6)

    # -- MARGIN ANALYSIS --
    pdf.section_heading("Margin Analysis")
    pdf.body_text("RDL pays tool costs from the client service fee.")

    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(*CYAN)
    pdf.set_text_color(*WHITE)
    col2 = [95, 45, 50]
    for i, h in enumerate(["Scenario", "Revenue", "Tool Cost"]):
        pdf.cell(col2[i], 7, h, border=1, fill=True, align="C")
    pdf.ln()

    pdf.set_text_color(*DARK)
    scenarios = [
        ("Starter at $799/mo", "$799", "$233 (29%)"),
        ("Starter at $1,500/mo", "$1,500", "$233 (16%)"),
        ("Ops Assistant at $2,000/mo", "$2,000", "$233 (12%)"),
    ]
    for row in scenarios:
        for i, val in enumerate(row):
            pdf.set_font("Helvetica", "", 9)
            pdf.cell(col2[i], 6, val, border=0)
        pdf.ln()
    pdf.ln(1)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*DARK)
    pdf.cell(0, 5, "Gross margin at Starter low end ($799): $566/mo (71%)")
    pdf.ln()
    pdf.cell(0, 5, "Gross margin at Starter high end ($1,500): $1,267/mo (84%)")
    pdf.ln(6)

    # -- IMPLEMENTATION CHECKLIST --
    pdf.section_heading("Implementation Checklist")
    pdf.sub_heading("Phase 1 - AI Front Desk (Week 1-2)")
    pdf.bullet("Set up ManyChat account, connect FB page + IG + website widget")
    pdf.bullet("Build lead qualification flow from Diana's email templates")
    pdf.bullet("Configure escalation to Diana's phone/email")
    pdf.bullet("Test with 5-10 simulated leads, then go live")
    pdf.ln(1)

    pdf.sub_heading("Phase 2 - Follow-Up System (Week 3-4)")
    pdf.bullet("Create Follow Up Boss account, import existing leads")
    pdf.bullet("Set up alfred_ on diana.dominguez@icloud.com")
    pdf.bullet("Build 3-4 follow-up sequences (new lead, showing follow-up, post-close, cold lead)")
    pdf.ln(1)

    pdf.sub_heading("Phase 3 - Social & Nurture (Week 5-6)")
    pdf.bullet("Set up RealEstateContent.ai with Signature Properties branding")
    pdf.bullet("Create Homebot account, import past client list")
    pdf.bullet("Build first month content calendar")
    pdf.ln(3)

    # -- CREDS & ACCESS --
    pdf.section_heading("Credentials & Access (Track Separately)")
    pdf.body_text("Store all client tool credentials in ~/.openclaw/credentials/ or 1Password. Never in this file.")
    pdf.bullet("ManyChat - account email, API key")
    pdf.bullet("Follow Up Boss - account email, API key")
    pdf.bullet("RealEstateContent.ai - account email")
    pdf.bullet("alfred_ - account email, connected inbox")
    pdf.bullet("Homebot - account email, MLS connection")

    pdf.output(OUTPUT)
    print(f"Internal ops sheet saved to: {OUTPUT}")


if __name__ == "__main__":
    build()
