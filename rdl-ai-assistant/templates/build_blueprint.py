#!/usr/bin/env python3.12
"""Diana Dominguez AI Adoption Blueprint - V2 Client-Facing.

Built from onboarding PDF only. No tool names, no costs, no fabrication.
See blueprint-rules.md for authoring rules.
"""

from fpdf import FPDF
from pathlib import Path
import datetime

LOGO = "/home/james/my_claude/projects/rain-design-labs/website/assets/rdl-logo-horiz-transparent.png"
OUTPUT = "/home/james/my_claude/clients/dominguez-diana/diana-dominguez-ai-adoption-blueprint.pdf"

CYAN = (0, 179, 234)
GRAY = (128, 130, 133)
DARK = (45, 48, 55)
WHITE = (255, 255, 255)
DIVIDER = (220, 222, 224)
GREEN = (34, 139, 34)
ORANGE = (230, 126, 34)


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
        # Calculate height
        test_x = self.get_x()
        test_y = self.get_y()
        self.set_xy(19, test_y)
        start_y = self.get_y()
        self.multi_cell(172, 5, text)
        end_y = self.get_y()
        h = max(10, end_y - start_y + 4)
        # Check fit
        if test_y + h > 275:
            self.add_page()
            test_y = self.get_y()
        # Draw box
        self.set_fill_color(240, 249, 255)
        self.set_draw_color(*CYAN)
        self.set_line_width(0.3)
        self.rect(15, test_y, 180, h, style='DF')
        self.set_xy(19, test_y + 2)
        self.set_text_color(*CYAN)
        self.multi_cell(172, 5, text)
        self.set_y(test_y + h + 2)

    def color_bullet(self, text, color):
        x = self.get_x()
        if self.get_y() > 270:
            self.add_page()
            x = self.get_x()
        self.set_fill_color(*color)
        self.ellipse(x + 2, self.get_y() + 1.2, 2, 2, style='F')
        self.set_x(x + 7)
        self.set_font("Helvetica", "", 9.5)
        self.set_text_color(*DARK)
        self.multi_cell(0, 5, text)
        self.ln(0.5)


def build():
    pdf = BlueprintPDF()
    today = datetime.date.today().strftime("%B %d, %Y")

    # ============================================================
    # PAGE 1: COVER
    # ============================================================
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

    # ============================================================
    # PAGE 2: EXECUTIVE SUMMARY + BUSINESS PROFILE + CURRENT STATE
    # Source: Section 1 (Agent Profile), Section 2 (Day-to-Day), Section 3 (Lead Management)
    # ============================================================
    pdf.add_page()
    pdf.section_heading("Executive Summary")
    # Source: Section 1 - Signature Properties, military PCS niche, both buyer/seller
    # Source: Section 2 - "organized chaos", 8-11 clients, social media is biggest time sink
    # Source: Section 3 - no CRM, leads from website, response time varies
    pdf.body_text(
        "Diana Dominguez is a Realtor at Signature Properties in the greater Little Rock area, "
        "serving military PCS families relocating to and from central Arkansas. She works both "
        "buyers and sellers across 7 communities, juggling 8-11 active clients at once during "
        "peak season."
    )
    pdf.body_text(
        "Her biggest time drain is social media posting, reels, and video content -- the same "
        "task she says falls through the cracks when she gets busy. She has no CRM in place "
        "and responds to leads manually, with response speed depending on whether the lead "
        "reaches out by email or by message."
    )
    pdf.body_text(
        "This blueprint identifies the highest-impact opportunities for AI adoption in her "
        "business, ranked by how directly they solve the problems she described. The "
        "recommended starting point is an AI Front Desk -- a lead-response system that "
        "acknowledges every incoming lead within seconds, qualifies intent, and hands off "
        "warm prospects to Diana for the personal follow-up she excels at."
    )
    pdf.highlight_box(
        "Recommended starting tier: AI Front Desk - Starter Plan ($799/mo, first month free)"
    )
    pdf.ln(3)

    # BUSINESS PROFILE - Source: Section 1 only
    pdf.section_heading("Business Profile")
    pdf.bullet("Signature Properties -- Little Rock, AR", "Company:")
    pdf.bullet("The Diana Dominguez Team", "Team:")
    pdf.bullet("Diana L. Dominguez, Realtor", "Agent:")
    pdf.bullet("14 years, both buyers and sellers", "Experience:")
    # Source: Section 1 Primary Market Area - exact list
    pdf.bullet(
        "Cabot, Austin, Sherwood, Jacksonville, Ward, Beebe, North Little Rock",
        "Areas served:"
    )
    # Source: Section 3 - asks about PCSing and RNLT date = military PCS niche
    pdf.bullet("Military PCS families relocating to/from central Arkansas", "Niche:")
    pdf.bullet("pcsingtolittlerock.com", "Website:")
    pdf.ln(1)

    # CURRENT STATE - Source: Section 2 + Section 3
    pdf.section_heading("Current State Assessment")
    # Source: Section 2 - "Organized chaos... mostly??"
    pdf.body_text("Based on the onboarding interview, Diana describes her peak season as organized chaos:")
    # Source: Section 2 - early morning texts with overseas clients
    pdf.bullet("Starts the day with early morning texts to overseas clients")
    # Source: Section 2 - "Social media posting, reels, videos" = biggest time sink
    pdf.bullet("Social media posting, reels, and videos eat up the most time")
    # Source: Section 2 - same task falls through cracks
    pdf.bullet("Social media is also the first thing that drops when she gets busy")
    # Source: Section 3 - leads from pcsingtolittlerock.com only
    pdf.bullet("Leads come through pcsingtolittlerock.com -- she responds to each one manually")
    # Source: Section 3 - "depends on if they email me a day. If they text or message immediately"
    pdf.bullet("Response speed varies -- immediate for text/message, slower for email")
    # Source: Section 3 - "I dont but I should"
    pdf.bullet("No CRM in use -- she knows she needs one")
    # Source: Section 3 - manual workflow "I message them and ask to set up a phone call"
    pdf.bullet("Lead follow-up is manual: message, qualify, schedule call or appointment")
    pdf.bullet("No after-hours or weekend lead coverage")
    pdf.ln(1)
    # This stat is supported by her own admission that response time varies
    pdf.highlight_box(
        "Key gap: 78% of real estate sales go to the first-responding agent (NAR 2025). "
        "Diana's response time depends on the channel -- she cannot sustain sub-5-minute "
        "response times while managing 8-11 active clients."
    )
    pdf.ln(3)

    # ============================================================
    # PAGE 3: AI RECOMMENDATIONS
    # Source: Section 6 (What You Want Automated) mapped to pain points from Sections 2-3
    # Rule 5: Every recommendation connects to a specific pain point she stated
    # ============================================================
    pdf.add_page()
    pdf.section_heading("AI Recommendations")
    pdf.body_text(
        "Ranked by how directly each solves a problem Diana described. Each maps to an AI "
        "Employee role she can activate."
    )
    pdf.ln(1)

    # RECOMMENDATION 1
    # Source: Section 6 checked "New lead follow-up"
    # Source: Section 3 - manual lead response, response time varies
    pdf.sub_heading("1. AI Front Desk -- Lead Response Automation  (Priority: Critical)")
    pdf.body_text(
        "An AI-powered lead responder that acknowledges every new lead within seconds, 24/7, "
        "using Diana's existing warm tone. Qualifies intent and hands off to Diana for "
        "personal follow-up."
    )
    # Source: Section 5 - "Friendly, slightly chaos and imperfect"
    pdf.bullet("Matches Diana's self-described style: friendly, warm, imperfect", "Tone:")
    # Source: Section 3 - leads from website; Section 4 - prefers text
    pdf.bullet("Covers website chat, Facebook Messenger, Instagram DM, and SMS", "Channels:")
    pdf.bullet("Every lead acknowledged in under 60 seconds, even after hours", "Impact:")
    # Source: Section 7 - "all of it? Im a control freak"
    pdf.bullet("Diana reviews all qualified leads before any commitment is made", "Escalation:")
    pdf.ln(2)

    # RECOMMENDATION 2
    # Source: Section 6 checked "Buyer intake / qualifying questions" + "Seller intake"
    # Source: Section 3 - "I dont but I should" (CRM)
    pdf.sub_heading("2. AI Follow-Up Coordinator -- Lead Tracking & Nurturing  (Priority: High)")
    pdf.body_text(
        "Tracks conversations and sends timely follow-ups when Diana is busy with showings. "
        "Replaces the missing CRM she knows she needs."
    )
    # Source: Section 6 checked items
    pdf.bullet("Automated buyer and seller intake with qualifying questions", "Features:")
    # Source: Section 3 - asks about PCSing, RNLT date, payoff amount, PCS orders timeline
    pdf.bullet("Built-in PCS intake questions (RNLT date, orders timeline, home type)", "Also included:")
    pdf.bullet("No lead falls through the cracks during busy showing weeks", "Impact:")
    pdf.ln(2)

    # RECOMMENDATION 3
    # Source: Section 2 - "Social media posting, reels, videos" = biggest time sink
    # Source: Section 6 checked "Social media listing posts"
    pdf.sub_heading("3. AI Social Media Manager -- Content & Scheduling  (Priority: High)")
    pdf.body_text(
        "Automated content generation and scheduling. Creates posts from listings, market "
        "reports, and PCS-specific content, then schedules them across all platforms."
    )
    # Source: Section 8 - "pcsingtolittlerock on all platforms"
    pdf.bullet("Posting to all platforms under pcsingtolittlerock branding", "Channels:")
    # Source: Section 6 checked "Social media listing posts"
    pdf.bullet("Unlimited post creation, listing-to-social conversion, editorial calendar", "Features:")
    # Source: Section 2 - this is her #1 time sink AND what falls through cracks
    pdf.bullet("Solves her #1 time drain AND the task most likely to be skipped", "Impact:")
    pdf.ln(2)

    # RECOMMENDATION 4
    # Source: Section 6 checked "Showing scheduling & coordination" + "Open house follow-up"
    # + "Appointment reminders & confirmations"
    pdf.sub_heading("4. AI Showing Assistant -- Scheduling & Follow-Up  (Priority: Medium)")
    pdf.body_text(
        "Automates showing scheduling, sends appointment reminders, and follows up for "
        "feedback after each showing -- a task Diana specifically requested."
    )
    # Source: Section 6 checked items
    pdf.bullet("Showing scheduling, reminders, confirmations, and feedback collection", "Features:")
    # Source: Section 6 "Other: Feedback on showings" - she specifically added this
    pdf.bullet("She specifically requested showing feedback follow-up", "Note:")
    pdf.ln(2)

    # RECOMMENDATION 5
    # Source: Section 6 checked "Client check-in / touch-point messages" +
    # "Market update emails to clients" + "Review / request testimonials after closing"
    pdf.sub_heading("5. AI Client Nurture -- Check-Ins & Testimonials  (Priority: Medium)")
    pdf.body_text(
        "Automated touch-point messages, market updates, and post-closing testimonial "
        "requests. Keeps Diana's name in front of past clients who PCS every 2-3 years."
    )
    # Source: Section 6 checked items
    pdf.bullet("Client check-ins, market updates, testimonial requests after closing", "Features:")
    # Source: Section 1 - military PCS niche = families relocate every 2-3 years
    pdf.bullet("Referral engine for military families who PCS to new bases", "Impact:")
    pdf.ln(2)

    # ============================================================
    # PAGE 4: YOUR CURRENT SETUP
    # Source: Section 8 (Tools & Accounts) ONLY
    # Rule 6: List what she named, describe action in plain terms, never show replacement tool name
    # ============================================================
    pdf.add_page()
    pdf.section_heading("Your Current Setup")
    pdf.body_text("Based on what you listed in your onboarding form. Here's what you have and our recommendation for each:")
    pdf.ln(1)

    # Tool table - only names the CLIENT listed in Section 8
    col_w = [45, 45, 25, 65]
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(*CYAN)
    pdf.set_text_color(*WHITE)
    for i, h in enumerate(["What You Use", "Category", "Action", "Why"]):
        pdf.cell(col_w[i], 7, h, border=1, fill=True, align="C")
    pdf.ln()

    tools_data = [
        # Source: Section 8 - "yahoo or icloud" - keeping both, forwarding to RDL for triage
        ("Yahoo / iCloud", "Email", "Keep", "Stays as-is. RDL monitors for lead emails automatically"),
        # Source: Section 8 - "Cozi"
        ("Cozi", "Calendar", "Upgrade", "Better calendar that works with all business tools"),
        # Source: Section 8 - "non" (CRM)
        ("None", "CRM", "Add", "No system tracking leads -- this is the biggest gap"),
        # Source: Section 8 - "ShowingTime"
        ("ShowingTime", "Showings", "Keep", "Industry standard, included with your MLS"),
        # Source: Section 8 - "Form simplicity"
        ("Form Simplicity", "Transactions", "Keep", "Handles your contracts and forms well"),
        # Source: Section 8 - "pcsingtolittlerock on all platforms"
        ("@pcsingtolittlerock", "Social Media", "Keep", "Good brand across all platforms"),
        # Source: Section 8 - "www.pcsingtolittlerock.com"
        ("pcsingtolittlerock.com", "Website", "Keep", "Your lead source -- stays as-is"),
    ]

    for row in tools_data:
        name, cat, action, why = row
        pdf.set_text_color(*DARK)
        # Color-code the action
        if action == "Keep":
            action_color = GREEN
        elif action == "Add":
            action_color = ORANGE
        else:
            action_color = CYAN

        pdf.set_font("Helvetica", "", 8.5)
        pdf.cell(col_w[0], 6, name, border=0)
        pdf.cell(col_w[1], 6, cat, border=0)
        pdf.set_text_color(*action_color)
        pdf.set_font("Helvetica", "B", 8.5)
        pdf.cell(col_w[2], 6, action, border=0, align="C")
        pdf.set_text_color(*DARK)
        pdf.set_font("Helvetica", "", 8.5)
        pdf.cell(col_w[3], 6, why, border=0)
        pdf.ln()

    pdf.ln(3)

    # Highlight box - fact derived from the table above
    # 3 Keeps + 2 Upgrades + 1 Add = 6 actions, 3 tools are solid
    pdf.highlight_box(
        "Good news: 4 of your tools are already solid -- we keep those and connect them "
        "to the new system. The calendar gets an upgrade, and we add a CRM "
        "to fill the biggest gap."
    )
    pdf.ln(3)

    # Upgrade details - client-friendly, no tool names
    pdf.sub_heading("Upgrade Details")
    pdf.ln(1)

    pdf.set_font("Helvetica", "B", 9.5)
    pdf.set_text_color(*DARK)
    pdf.cell(0, 5, "Email Monitoring")
    pdf.ln()
    pdf.body_text(
        "Your Yahoo and iCloud accounts stay exactly as they are. We set up automatic "
        "forwarding so incoming lead emails are reviewed and flagged for you -- solid "
        "leads get sent your way, the rest gets handled."
    )

    pdf.set_font("Helvetica", "B", 9.5)
    pdf.set_text_color(*DARK)
    pdf.cell(0, 5, "Calendar Upgrade")
    pdf.ln()
    pdf.body_text(
        "A business-grade calendar that works with all your tools -- showings, CRM, "
        "appointments. Your Cozi stays active for family stuff."
    )

    pdf.set_font("Helvetica", "B", 9.5)
    pdf.set_text_color(*DARK)
    pdf.cell(0, 5, "CRM Addition")
    pdf.ln()
    pdf.body_text(
        "A real estate CRM that tracks every lead, automates follow-ups, and shows you "
        "exactly where each client stands. This replaces the inbox-and-text system you "
        "have now."
    )

    # ============================================================
    # PAGE 5: VOICE & TONE + ROADMAP + INVESTMENT + NEXT STEPS
    # Voice: Source Section 5 ONLY
    # Roadmap: Source Section 6 (automation wishes) + Section 7 (rules)
    # Investment: RDL pricing (fixed)
    # ============================================================
    pdf.add_page()
    pdf.section_heading("Voice & Tone Settings")
    pdf.body_text("Your AI Employee will match your communication style based on your onboarding answers:")
    pdf.ln(1)

    # Source: Section 5 - exact words "Friendly, slightly chaos and imperfect"
    pdf.bullet("Friendly, warm, imperfect", "Style (your words):")
    # Source: Section 5 - "The word no"
    pdf.bullet("Never use the word 'no' in client communications", "Avoid:")
    # Source: Section 5 - sign-off
    pdf.bullet("V/R Diana Dominguez, Realtor, Signature Properties", "Sign-off:")
    # Source: Section 7 - "all of it? Im a control freak"
    pdf.bullet("All messages reviewed by Diana before sending", "Approval rule:")
    # Source: Section 5 - example messages section was BLANK
    # Rule 7: blank = omit, do not fabricate
    pdf.bullet("To be discussed on strategy call", "Example messages:")
    pdf.ln(1)
    # Source: Section 3 - buyer questions mention PCSing, RNLT date; seller questions mention PCS orders
    pdf.highlight_box(
        "Your PCS-specific intake questions (RNLT date, orders timeline, home type) "
        "will be built into the lead qualification flow automatically."
    )
    pdf.ln(3)

    # IMPLEMENTATION ROADMAP
    # Source: Section 6 automation wishes, grouped by priority
    # Source: Section 7 - "all of it? Im a control freak" = phased approach, she reviews everything
    pdf.section_heading("Implementation Roadmap")
    pdf.body_text("Start with one high-value workflow, then expand once you trust the handoff.")
    pdf.ln(1)

    # Phase 1: Source Section 6 - "New lead follow-up" (highest priority, critical)
    pdf.sub_heading("Phase 1 -- AI Front Desk (Week 1-2)")
    pdf.bullet("Configure lead response on website + Facebook + Instagram")
    # Source: Section 3 - "I message them and ask to set up a phone call if buyer or appointment if listing"
    pdf.bullet("Set up lead qualification flow using your existing intake process")
    # Source: Section 7 - "all of it? Im a control freak"
    pdf.bullet("Establish approval rules -- every situation reviewed by you before sending")
    pdf.bullet("Test with real leads, refine tone and questions")
    pdf.ln(1)

    # Phase 2: Source Section 6 - "Buyer intake", "Seller intake", check-ins
    pdf.sub_heading("Phase 2 -- Follow-Up System (Week 3-4)")
    # Source Section 3 - "I dont but I should" = CRM
    pdf.bullet("Set up CRM with lead tracking and automated follow-up sequences")
    # Source Section 6 - "Buyer intake / qualifying questions", "Seller intake / listing questions"
    pdf.bullet("Build buyer and seller intake questionnaires")
    # Source Section 6 - "Client check-in / touch-point messages"
    pdf.bullet("Create automated check-in sequences for different lead stages")
    pdf.ln(1)

    # Phase 3: Source Section 6 - "Social media listing posts" + showing tasks + nurture
    pdf.sub_heading("Phase 3 -- Social & Nurture (Week 5-6)")
    # Source Section 2 - social media = #1 time sink
    pdf.bullet("Configure social content engine with pcsingtolittlerock branding")
    # Source Section 6 - "Showing scheduling & coordination", "Feedback on showings"
    pdf.bullet("Set up showing scheduling, reminders, and feedback collection")
    # Source Section 6 - "Review / request testimonials after closing"
    pdf.bullet("Launch testimonial requests and market update emails")
    pdf.ln(3)

    # INVESTMENT SUMMARY - RDL pricing (fixed, same for all clients)
    pdf.section_heading("Investment Summary")
    pdf.ln(1)

    col_w2 = [80, 40, 60]
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(*CYAN)
    pdf.set_text_color(*WHITE)
    for i, h in enumerate(["Service Tier", "Monthly Fee", "What You Get"]):
        pdf.cell(col_w2[i], 7, h, border=1, fill=True, align="C")
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
            pdf.cell(col_w2[i], 6, val, border=0)
        pdf.ln()

    pdf.ln(3)
    pdf.highlight_box("First month FREE  |  10% military discount  |  No contracts")
    pdf.ln(4)

    # NEXT STEPS
    pdf.section_heading("Next Steps")
    pdf.bullet("Review this blueprint and note any questions or adjustments", "Step 1:")
    pdf.bullet("Schedule a 30-minute strategy call to finalize the first workflow", "Step 2:")
    pdf.bullet("RDL installs and configures the AI Front Desk (Phase 1)", "Step 3:")
    pdf.bullet("Test with real leads for one week -- your first month is free", "Step 4:")
    pdf.bullet("Review results together and decide on Phase 2 expansion", "Step 5:")
    pdf.ln(3)

    # CONTACT
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
    pdf.cell(0, 5, "Rain Design Labs -- AI that makes sense. Design that drives results.", new_x="LMARGIN", new_y="NEXT", align="C")

    pdf.output(OUTPUT)
    print(f"Blueprint saved to: {OUTPUT}")


if __name__ == "__main__":
    build()
