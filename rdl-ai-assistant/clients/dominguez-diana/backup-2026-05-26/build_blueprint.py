#!/usr/bin/env python3.12
"""Generate Diana Dominguez's AI Adoption Blueprint PDF - RDL branded.
Client-facing version with current tools, recommendations, and alternatives.
"""

from fpdf import FPDF
from pathlib import Path
import datetime
import sys
import json

# Paths
LOGO = "/home/james/my_claude/projects/rain-design-labs/website/assets/rdl-logo-horiz-transparent.png"
OUTPUT = "/home/james/my_claude/clients/dominguez-diana/diana-dominguez-ai-adoption-blueprint.pdf"
META = "/home/james/my_claude/clients/dominguez-diana/meta.json"

# Brand colors
CYAN = (0, 179, 234)
GRAY = (128, 130, 133)
DARK = (45, 48, 55)
WHITE = (255, 255, 255)
DIVIDER = (220, 222, 224)
GREEN = (34, 139, 34)
ORANGE = (255, 140, 0)


class BlueprintPDF(FPDF):
    def __init__(self):
        super().__init__(orientation='P', unit='mm', format='A4')
        self.set_auto_page_break(auto=True, margin=20)

    def header(self):
        if Path(LOGO).exists():
            self.image(LOGO, x=15, y=10, w=55)
        self.set_draw_color(*CYAN)
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
        self.set_text_color(*GRAY)
        self.cell(90, 4, "Rain Design Labs  |  AI Adoption Blueprint  |  Confidential")
        self.cell(0, 4, f"Page {self.page_no()}", align="R")

    def section_heading(self, text):
        self.set_font("Helvetica", "B", 13)
        self.set_text_color(*CYAN)
        self.cell(0, 8, text.upper(), new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(*CYAN)
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
        self.set_fill_color(*CYAN)
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

    def divider_line(self):
        self.set_draw_color(*DIVIDER)
        self.set_line_width(0.2)
        self.line(15, self.get_y(), 195, self.get_y())
        self.ln(3)

    def highlight_box(self, text):
        self.set_font("Helvetica", "B", 9)
        lines = len(text) // 80 + 1
        h = max(8, lines * 5 + 3)
        if self.get_y() + h > 275:
            self.add_page()
        self.set_fill_color(240, 249, 255)
        self.set_draw_color(*CYAN)
        self.set_line_width(0.3)
        y = self.get_y()
        self.rect(15, y, 180, h, style='DF')
        self.set_xy(19, y + 1.5)
        self.set_text_color(*CYAN)
        self.multi_cell(172, 5, text)
        self.set_y(y + h + 2)

    def table_row(self, cols, widths, bold=False, fill_color=None, text_color=None):
        if fill_color:
            self.set_fill_color(*fill_color)
        if text_color:
            self.set_text_color(*text_color)
        else:
            self.set_text_color(*DARK)
        style = "B" if bold else ""
        self.set_font("Helvetica", style, 9)
        for i, val in enumerate(cols):
            self.cell(widths[i], 6, val, border=0, fill=fill_color is not None)
        self.ln()


def load_recommendations():
    """Load tool recommendations from meta.json if available."""
    try:
        meta = json.loads(Path(META).read_text())
        return meta.get("tool_recommendations", {})
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def build():
    pdf = BlueprintPDF()
    today = datetime.date.today().strftime("%B %d, %Y")

    # -- PAGE 1: COVER --
    pdf.add_page()
    pdf.ln(35)
    pdf.set_font("Helvetica", "B", 28)
    pdf.set_text_color(*DARK)
    pdf.cell(0, 14, "AI Adoption Blueprint", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(3)
    pdf.set_draw_color(*CYAN)
    pdf.set_line_width(0.8)
    pdf.line(65, pdf.get_y(), 145, pdf.get_y())
    pdf.ln(6)
    pdf.set_font("Helvetica", "", 16)
    pdf.set_text_color(*GRAY)
    pdf.cell(0, 9, "Prepared for", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_text_color(*DARK)
    pdf.cell(0, 11, "Diana Dominguez", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.set_font("Helvetica", "", 13)
    pdf.set_text_color(*GRAY)
    pdf.cell(0, 7, "Signature Properties  |  Little Rock, AR", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(16)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*DARK)
    pdf.cell(0, 6, today, new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.cell(0, 6, "Rain Design Labs", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.set_text_color(*CYAN)
    pdf.cell(0, 6, "raindesignlabs.net", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(8)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*GRAY)
    pdf.cell(0, 5, "Confidential - for client review only", new_x="LMARGIN", new_y="NEXT", align="C")

    # -- PAGE 2: EXECUTIVE SUMMARY + PROFILE + CURRENT STATE --
    pdf.add_page()
    pdf.section_heading("Executive Summary")
    pdf.body_text(
        "Diana Dominguez is a Realtor at Signature Properties in Little Rock, AR, specializing in "
        "military PCS relocations. She serves a niche but high-turnover market where response speed "
        "and personal connection drive conversions."
    )
    pdf.body_text(
        "This blueprint identifies the highest-impact opportunities for AI adoption in her business, "
        "ranked by revenue impact and ease of implementation. The recommended starting point is an "
        "AI Front Desk - a managed lead-response system that acknowledges every incoming lead within "
        "seconds, qualifies intent, and hands off warm prospects to Diana for the personal touch she excels at."
    )
    pdf.highlight_box("Recommended starting tier: AI Front Desk - Starter Plan ($799/mo, first month free)")
    pdf.ln(3)

    pdf.section_heading("Business Profile")
    pdf.bullet("Signature Properties - Little Rock, AR", "Company:")
    pdf.bullet("Diana L. Dominguez, Realtor (14 years experience)", "Agent:")
    pdf.bullet("Military PCS families relocating to/from Little Rock", "Niche:")
    pdf.bullet("pcsingtolittlerock.com", "Website:")
    pdf.bullet("325.829.2839  |  diana.dominguez@icloud.com", "Contact:")
    pdf.bullet("Lead response, showing intake, buyer/seller follow-up, PCS guidance", "Core Activities:")
    pdf.bullet("8-11 active clients at peak season", "Capacity:")
    pdf.ln(1)

    pdf.section_heading("Current State Assessment")
    pdf.body_text("Based on the onboarding interview, Diana's current workflow is manual across the board:")
    pdf.bullet("Leads come from her website only - she responds manually to each")
    pdf.bullet("She has written response templates (warm, casual tone) but copies/pastes them by hand")
    pdf.bullet("No CRM is in use - lead tracking lives in her inbox and text messages")
    pdf.bullet("Social media content is created ad-hoc with no scheduling or calendar - her biggest time sink")
    pdf.bullet("Past client follow-up is inconsistent - no automated nurture system")
    pdf.bullet("No after-hours or weekend lead coverage")
    pdf.bullet("Calendar (Cozi) and email (Yahoo/iCloud) can't connect to automation tools")
    pdf.ln(1)
    pdf.highlight_box(
        "Key gap: 78% of real estate sales go to the first-responding agent (NAR 2025). "
        "Diana cannot sustain sub-5-minute response times while managing 8-11 active clients."
    )
    pdf.ln(3)

    # -- PAGE 3: RECOMMENDATIONS --
    pdf.add_page()
    pdf.section_heading("AI Recommendations")
    pdf.body_text("Ranked by revenue impact and implementation ease. Each maps to a specific AI Employee role.")
    pdf.ln(1)

    pdf.sub_heading("1. AI Front Desk - Lead Response Automation  (Priority: Critical)")
    pdf.body_text(
        "An AI-powered lead responder that acknowledges every new lead within seconds, 24/7, using "
        "Diana's existing warm tone. Qualifies intent (buying vs renting, timeline, orders status) and "
        "escalates to Diana for personal follow-up."
    )
    pdf.bullet("Diana's existing message style - friendly, warm, imperfect", "Tone:")
    pdf.bullet("Covers website chat, Facebook Messenger, Instagram DM, and SMS", "Channels:")
    pdf.bullet("Every lead acknowledged in under 60 seconds", "Impact:")
    pdf.bullet("Diana reviews all qualified leads before any commitment is made", "Escalation:")
    pdf.ln(2)

    pdf.sub_heading("2. AI Follow-Up Coordinator - Lead Nurturing & Tracking  (Priority: High)")
    pdf.body_text(
        "Tracks conversations and sends timely follow-ups when Diana is busy with showings. "
        "Prevents leads from going cold during busy weeks."
    )
    pdf.bullet("Automated lead routing with touchpoint tracking and follow-up sequences", "Features:")
    pdf.bullet("Email triage with draft replies ready for Diana's review", "Also included:")
    pdf.bullet("No lead falls through the cracks during busy showing weeks", "Impact:")
    pdf.ln(2)

    pdf.sub_heading("3. AI Social Media Manager - Content & Scheduling  (Priority: Medium)")
    pdf.body_text(
        "Automated content generation and scheduling. Creates posts from listings, market reports, "
        "and PCS-specific content, then schedules across Facebook, Instagram, and TikTok."
    )
    pdf.bullet("Unlimited post creation, listing-to-social conversion, editorial calendar", "Features:")
    pdf.bullet("Consistent online presence without hours of manual content creation", "Impact:")
    pdf.bullet("4 scheduled posts per week (minimum), plus listing-specific content", "Output:")
    pdf.ln(2)

    pdf.sub_heading("4. AI Past-Client Nurture - Referral Engine  (Priority: Medium)")
    pdf.body_text(
        "Automated monthly home value reports for past clients. 64% of sellers would reuse their "
        "agent but only 25% do - usually because the agent stopped reaching out."
    )
    pdf.bullet("Automated monthly equity reports and market updates sent to past clients", "Features:")
    pdf.bullet("Referral generation from satisfied military families who PCS every 2-3 years", "Impact:")
    pdf.ln(2)

    # -- PAGE 4: CURRENT TOOL STACK + RECOMMENDATIONS --
    pdf.add_page()
    pdf.section_heading("Your Current Setup")
    pdf.body_text(
        "Based on your onboarding form, here's what you're using today and our recommended upgrades. "
        "Tools marked 'keep' are already good - we'll connect them to the AI workflows."
    )
    pdf.ln(1)

    tool_rows = [
        ("Email", "Yahoo / iCloud", "Upgrade", "Professional email that works with automation"),
        ("Calendar", "Cozi", "Upgrade", "Connects to your CRM and AI tools"),
        ("CRM", "None", "Add", "Lead tracking, routing, follow-up sequences"),
        ("Showings", "ShowingTime", "Keep", "Industry standard, included with MLS"),
        ("Transactions", "Form Simplicity", "Keep", "Free via association, handles e-signatures"),
        ("Social Media", "Manual (all platforms)", "Automate", "Auto-respond + schedule content"),
        ("Website", "pcsingtolittlerock.com", "Keep", "Add AI lead capture, keep the site"),
    ]

    col_w2 = [32, 38, 22, 88]
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(*CYAN)
    pdf.set_text_color(*WHITE)
    for i, h in enumerate(["Category", "Current Tool", "Action", "Recommendation"]):
        pdf.cell(col_w2[i], 7, h, border=1, fill=True, align="C")
    pdf.ln()

    for row in tool_rows:
        action = row[2]
        for i, val in enumerate(row):
            if i == 2:
                if action == "Keep":
                    pdf.set_text_color(*GREEN)
                elif action == "Upgrade":
                    pdf.set_text_color(*CYAN)
                elif action == "Add":
                    pdf.set_text_color(*ORANGE)
                else:
                    pdf.set_text_color(*CYAN)
                pdf.set_font("Helvetica", "B", 9)
            else:
                pdf.set_text_color(*DARK)
                pdf.set_font("Helvetica", "", 9)
            pdf.cell(col_w2[i], 6, val, border=0)
        pdf.ln()
    pdf.ln(2)

    pdf.highlight_box(
        "Key insight: 5 of your 7 tools are keepers. We're adding a CRM + automation, "
        "not replacing your workflow."
    )
    pdf.ln(3)

    pdf.section_heading("Upgrade Details")
    pdf.ln(1)

    pdf.sub_heading("Calendar: Cozi to Google Calendar")
    pdf.body_text(
        "Cozi is a great family organizer, but it doesn't connect to CRM, showing tools, or AI assistants. "
        "Google Calendar is free and works with all your business tools. Your Cozi stays active for family stuff - "
        "we just move business scheduling to Google."
    )
    pdf.bullet("Free, industry standard", "Google Calendar:")
    pdf.bullet("Client self-scheduling with auto-timezone (great for PCS families overseas)", "Calendly ($0-$16/mo):")
    pdf.ln(2)

    pdf.sub_heading("Email: Yahoo/iCloud to Professional Inbox")
    pdf.body_text(
        "Personal email providers can't connect to automation tools. We recommend a professional inbox "
        "that connects to your CRM and AI tools. Your Yahoo/iCloud stays active - we forward everything."
    )
    pdf.bullet("Professional email + calendar + drive ($7.80/mo)", "Google Workspace:")
    pdf.bullet("Free option - forward Yahoo to new inbox, keep old address for personal use", "Or:")
    pdf.ln(2)

    pdf.sub_heading("CRM: Adding Your First (Currently None)")
    pdf.body_text(
        "You noted you 'should' use a CRM. That's the single biggest gap in your workflow right now. "
        "A real estate CRM tracks every lead, automates follow-ups, and ensures nothing slips through."
    )
    pdf.bullet("Built for real estate, best ROI for solo agents", "Recommended:")
    pdf.bullet("Simpler/cheaper but less real estate-specific", "Alternative:")
    pdf.ln(2)

    pdf.highlight_box(
        "Good news: Your ShowingTime and Form Simplicity accounts link directly to the new CRM. "
        "Showing requests are tracked automatically. Transaction paperwork is filed when deals go to contract."
    )
    pdf.ln(3)

    # -- PAGE 5: ROADMAP + PRICING --
    pdf.add_page()
    pdf.section_heading("Implementation Roadmap")
    pdf.body_text("Start with one high-value workflow, then expand once Diana trusts the handoff.")
    pdf.ln(1)

    pdf.sub_heading("Phase 1 - AI Front Desk (Week 1-2)")
    pdf.bullet("Configure lead response on website + Facebook + Instagram")
    pdf.bullet("Set up lead qualification flow using Diana's message templates")
    pdf.bullet("Establish escalation rules - all situations reviewed by Diana before commitment")
    pdf.bullet("Test with real leads, refine tone and questions")
    pdf.ln(1)

    pdf.sub_heading("Phase 2 - Follow-Up System (Week 3-4)")
    pdf.bullet("Set up CRM with lead routing and automated sequences")
    pdf.bullet("Connect email assistant to Diana's inbox for triage")
    pdf.bullet("Migrate calendar to Google, connect to CRM and showing tools")
    pdf.bullet("Create automated follow-up sequences for different lead stages")
    pdf.ln(1)

    pdf.sub_heading("Phase 3 - Social & Nurture (Week 5-6)")
    pdf.bullet("Configure social content engine with Diana's branding")
    pdf.bullet("Set up past-client monthly reports")
    pdf.bullet("Launch content calendar with first month of scheduled posts")
    pdf.bullet("Link Form Simplicity so transactions are created from CRM deals automatically")
    pdf.ln(3)

    pdf.section_heading("Investment Summary")
    pdf.ln(1)

    # RDL Service Fee table - client-facing
    col_w = [80, 40, 60]
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(*CYAN)
    pdf.set_text_color(*WHITE)
    for i, h in enumerate(["Service Tier", "Monthly Fee", "What You Get"]):
        pdf.cell(col_w[i], 7, h, border=1, fill=True, align="C")
    pdf.ln()

    pdf.set_text_color(*DARK)
    tiers = [
        ("Starter (Recommended)", "$799 - $1,500", "1 AI role, monthly review"),
        ("Ops Assistant (Popular)", "$2,000 - $3,500", "Multiple workflows, weekly optimization"),
        ("AI Department", "$5,000+", "Full AI team, priority support"),
    ]
    for row in tiers:
        for i, val in enumerate(row):
            bold = "B" if i == 0 and "Recommended" in val else ""
            pdf.set_font("Helvetica", bold, 9)
            pdf.cell(col_w[i], 6, val, border=0)
        pdf.ln()

    pdf.ln(3)
    pdf.highlight_box("First month FREE  |  10% military discount  |  No contracts")
    pdf.ln(4)

    # Next Steps
    pdf.section_heading("Next Steps")
    pdf.bullet("Review this blueprint and note any questions or adjustments", "Step 1:")
    pdf.bullet("Schedule a 30-minute strategy call to finalize the first workflow", "Step 2:")
    pdf.bullet("RDL installs and configures the AI Front Desk (Phase 1)", "Step 3:")
    pdf.bullet("Test with real leads for one week - your first month is free", "Step 4:")
    pdf.bullet("Review results together and decide on Phase 2 expansion", "Step 5:")
    pdf.ln(3)

    pdf.section_heading("Contact")
    pdf.bullet("james@raindesignlabs.net", "Email:")
    pdf.bullet("(360) 306-7579 (calls only)", "Phone:")
    pdf.bullet("raindesignlabs.net", "Web:")
    pdf.ln(5)

    pdf.set_draw_color(*CYAN)
    pdf.set_line_width(0.5)
    pdf.line(65, pdf.get_y(), 145, pdf.get_y())
    pdf.ln(4)
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(*GRAY)
    pdf.cell(0, 5, "Rain Design Labs - AI that makes sense. Design that drives results.", new_x="LMARGIN", new_y="NEXT", align="C")

    pdf.output(OUTPUT)
    print(f"Blueprint saved to: {OUTPUT}")
    return OUTPUT


if __name__ == "__main__":
    build()
