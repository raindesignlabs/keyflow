#!/usr/bin/env python3.12
"""Generate Diana Dominguez's AI Adoption Blueprint PDF - RDL branded."""

from fpdf import FPDF
from pathlib import Path
import json
import datetime

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
        self.set_fill_color(240, 249, 255)
        self.set_draw_color(*CYAN)
        self.set_line_width(0.3)
        y = self.get_y()
        self.rect(15, y, 180, h, style='DF')
        self.set_xy(19, y + 1.5)
        self.set_text_color(*CYAN)
        self.multi_cell(172, 5, text)
        self.set_y(y + h + 2)


def build():
    pdf = BlueprintPDF()
    
    # Load client data from meta.json
    meta = {}
    if Path(META).exists():
        with open(META, 'r') as f:
            meta = json.load(f)
    
    client_name = meta.get('full_name', 'Client').title()
    company = meta.get('company', '')
    tools = meta.get('tools', {})
    
    today = datetime.date.today().strftime("%B %d, %Y")

    # -- COVER PAGE --
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
    pdf.cell(0, 11, client_name, new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.set_font("Helvetica", "", 13)
    pdf.set_text_color(*GRAY)
    if company:
        pdf.cell(0, 7, f"{company}", new_x="LMARGIN", new_y="NEXT", align="C")
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
        f"{client_name} is a real estate professional specializing in military PCS relocations. "
        "The target market is niche but high-turnover, where response speed and personal connection drive conversions."
    )
    pdf.body_text(
        "This blueprint identifies the highest-impact opportunities for AI adoption, ranked by revenue impact "
        "and implementation ease. Rain Design Labs KeyFlow software provides a managed lead-response system that "
        "acknowledges every incoming lead within seconds, qualifies intent, and hands off warm prospects for "
        "personal follow-up."
    )
    pdf.highlight_box("Recommended starting tier: AI Front Desk - Starter Plan ($799/mo, first month free)")
    pdf.ln(3)

    pdf.section_heading("Business Profile")
    if company:
        pdf.bullet(f"{company}", "Company:")
    pdf.bullet(f"{client_name}", "Agent:")
    pdf.bullet("Military PCS families relocating to/from Little Rock", "Niche:")
    website = tools.get('website_idx', meta.get('website', ''))
    if website:
        pdf.bullet(website, "Website:")
    email = meta.get('email', '')
    phone = meta.get('phone', '')
    if email or phone:
        contact_parts = []
        if email:
            contact_parts.append(email)
        if phone:
            contact_parts.append(phone)
        pdf.bullet(" | ".join(contact_parts), "Contact:")
    pdf.bullet("Lead response, showing intake, buyer/seller follow-up, PCS guidance", "Core Activities:")
    pdf.ln(1)

    pdf.section_heading("Current State Assessment")
    pdf.body_text("Based on the onboarding interview, the current workflow is manual across the board:")
    
    # Build current state from tools
    current_tools = []
    for category, value in tools.items():
        if value and value.lower() not in ('n/a', 'na', 'none', 'non', 'no', '-'):
            if category == 'crm' and value.lower() in ('none', 'non', 'no'):
                current_tools.append("No CRM in use - lead tracking lives in inbox and text messages")
            elif category == 'social_media':
                current_tools.append(f"Social media presence on {value}")
            elif category == 'showing_management':
                current_tools.append(f"Showing coordination via {value}")
            elif category == 'transaction_management':
                current_tools.append(f"Transaction management via {value}")
            elif category == 'email_provider':
                current_tools.append(f"Email: {value}")
            elif category == 'calendar':
                current_tools.append(f"Calendar: {value}")
    
    for item in current_tools:
        pdf.bullet(item)
    
    # Add generic current state items
    pdf.bullet("Lead responses sent manually via text/email")
    pdf.bullet("No automated follow-up system")
    pdf.bullet("Social media content created ad-hoc with no scheduling")
    pdf.bullet("No past-client nurture or referral system")
    pdf.bullet("No after-hours or weekend lead coverage")
    pdf.ln(1)
    pdf.highlight_box("Key gap: 78% of real estate sales go to the first-responding agent (NAR 2025). Sub-5-minute response times are not sustainable while managing active clients.")
    pdf.ln(3)

    # -- PAGE 3: RECOMMENDATIONS --
    pdf.add_page()
    pdf.section_heading("AI Recommendations")
    pdf.body_text("Ranked by revenue impact and implementation ease. Each maps to a specific AI Employee role powered by Rain Design Labs KeyFlow software.")
    pdf.ln(1)

    pdf.sub_heading("1. AI Front Desk - Lead Response Automation  (Priority: Critical)")
    pdf.body_text(
        "Rain Design Labs KeyFlow software acknowledges every new lead within seconds, 24/7, across your "
        "website, Facebook, Instagram DM, and SMS. Qualifies intent (buying vs renting, timeline, orders status) "
        "and escalates qualified prospects for personal follow-up."
    )
    pdf.bullet("Friendly, warm tone matching your communication style", "Tone:")
    pdf.bullet("Every lead acknowledged in under 60 seconds", "Impact:")
    pdf.bullet("You review all qualified leads before any commitment is made", "Escalation:")
    pdf.bullet("Works with your existing website and social channels", "Integration:")
    pdf.ln(2)

    pdf.sub_heading("2. AI Follow-Up Coordinator - Lead Nurturing & Tracking  (Priority: High)")
    pdf.body_text(
        "Tracks conversations and sends timely follow-ups when you're busy with showings. Prevents leads from "
        "going cold during busy weeks. KeyFlow integrates with your calendar and showing tools."
    )
    pdf.bullet("No lead falls through the cracks during busy showing weeks", "Impact:")
    pdf.bullet("Email drafts suggested for follow-up, saving ~2 hours/week", "Benefit:")
    pdf.bullet("Touchpoint tracking across all communication channels", "Feature:")
    pdf.ln(2)

    pdf.sub_heading("3. AI Social Media Manager - Content & Scheduling  (Priority: Medium)")
    pdf.body_text(
        "Automated content generation and scheduling. Creates posts from listings, market reports, and "
        "PCS-specific content, then schedules across Facebook, Instagram, and TikTok. KeyFlow maintains "
        "consistent online presence without manual content creation."
    )
    pdf.bullet("Consistent online presence without hours of manual content creation", "Impact:")
    pdf.bullet("4 scheduled posts per week (minimum), plus listing-specific content", "Output:")
    pdf.ln(2)

    pdf.sub_heading("4. AI Past-Client Nurture - Referral Engine  (Priority: Medium)")
    pdf.body_text(
        "Automated monthly home value and market reports sent to past clients. 64% of sellers would reuse their "
        "agent but only 25% do -- usually because the agent stopped reaching out. This fixes that."
    )
    pdf.bullet("Referral generation from satisfied military families who PCS every 2-3 years", "Impact:")
    pdf.bullet("Monthly equity and market reports sent automatically", "Output:")
    pdf.ln(2)

    # -- PAGE 4: IMPLEMENTATION ROADMAP + PRICING --
    pdf.add_page()
    pdf.section_heading("Implementation Roadmap")
    pdf.body_text("Start with one high-value workflow, then expand once you trust the handoff. Rain Design Labs KeyFlow software powers each phase.")
    pdf.ln(1)

    pdf.sub_heading("Phase 1 - AI Front Desk (Week 1-2)")
    pdf.bullet("Configure KeyFlow for website + Facebook + Instagram DM + SMS")
    pdf.bullet("Set up lead qualification flow using your existing message templates")
    pdf.bullet("Configure escalation rules -- all situations reviewed by you before commitment")
    pdf.bullet("Test with real leads, refine tone and questions")
    pdf.ln(1)

    pdf.sub_heading("Phase 2 - Follow-Up System (Week 3-4)")
    pdf.bullet("Set up CRM with lead routing")
    pdf.bullet("Connect KeyFlow email triage to your inbox")
    pdf.bullet("Create automated follow-up sequences for different lead stages")
    pdf.ln(1)

    pdf.sub_heading("Phase 3 - Social & Nurture (Week 5-6)")
    pdf.bullet("Configure KeyFlow social content generation with your branding")
    pdf.bullet("Set up past-client monthly reports")
    pdf.bullet("Launch content calendar with first month of scheduled posts")
    pdf.ln(3)

    pdf.section_heading("Your Current Setup")
    pdf.body_text("Here's what you have now and how KeyFlow works with each:")
    pdf.ln(1)

    # Build current setup table from tools
    setup_data = []
    for category, value in tools.items():
        if not value or value.lower() in ('n/a', 'na', 'none', 'non', 'no', '-'):
            continue
        
        label_map = {
            'email_provider': 'Email',
            'calendar': 'Calendar',
            'crm': 'CRM',
            'showing_management': 'Showings',
            'transaction_management': 'Transactions',
            'social_media': 'Social Media',
            'website_idx': 'Website/IDX',
        }
        
        label = label_map.get(category, category.replace('_', ' ').title())
        
        # Determine action and note
        action = 'Keep'
        note = ''
        
        if category == 'email_provider':
            if 'yahoo' in value.lower() or 'icloud' in value.lower():
                action = 'Add'
                note = 'Set up forwarding to KeyFlow for automation'
            else:
                action = 'Keep'
                note = 'Works with KeyFlow'
        elif category == 'calendar':
            if 'cozi' in value.lower():
                action = 'Add'
                note = 'Keep for family; add business calendar for KeyFlow'
            else:
                action = 'Keep'
                note = 'Works with KeyFlow'
        elif category == 'showing_management':
            action = 'Keep'
            note = 'Works with KeyFlow'
        elif category == 'transaction_management':
            action = 'Keep'
            note = 'Works with KeyFlow'
        elif category == 'social_media':
            action = 'Keep'
            note = 'KeyFlow handles automated content'
        elif category == 'website_idx':
            action = 'Keep'
            note = 'KeyFlow adds lead capture to existing site'
        elif category == 'crm':
            if value.lower() in ('none', 'non', 'no', 'n/a'):
                action = 'Add'
                note = 'KeyFlow includes CRM functionality'
            else:
                action = 'Keep'
                note = 'Works with KeyFlow'
        
        # Use full value -- do NOT truncate
        setup_data.append((label, value, action, note))
    
    # Add CRM if missing
    if not any('CRM' in row[0] for row in setup_data):
        setup_data.append(('CRM', 'None', 'Add', 'KeyFlow includes CRM functionality'))
    
    # Add Lead Management (always add)
    setup_data.append(('Lead Management', 'Manual (text/email)', 'Upgrade', 'KeyFlow handles 24/7 automated response'))
    
    # Draw table with proper text wrapping
    # Column widths must sum to 175 (page width 210 - margins 15*2)
    col_w = [32, 45, 22, 76]
    x_table = 15  # Left margin for table
    line_h = 4.5  # Line height for wrapped text
    cell_pad = 2  # Vertical padding top/bottom per cell
    
    # Helper: count lines a string needs in a given column width
    def count_lines(text, col_width, font_size=8):
        pdf.set_font("Helvetica", "", font_size)
        # Use GetStringWidth for accurate measurement
        words = str(text).split(' ')
        lines = 1
        current_line = ''
        for word in words:
            test = (current_line + ' ' + word).strip()
            if pdf.get_string_width(test) > (col_width - 4):  # 2mm padding each side
                lines += 1
                current_line = word
            else:
                current_line = test
        return lines
    
    # Header row
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_fill_color(*CYAN)
    pdf.set_text_color(*WHITE)
    x_pos = x_table
    for i, h in enumerate(["Tool", "Current", "Action", "KeyFlow Integration"]):
        pdf.set_xy(x_pos, pdf.get_y())
        pdf.cell(col_w[i], 7, h, border=1, fill=True, align="C")
        x_pos += col_w[i]
    pdf.ln(7)
    
    # Data rows
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*DARK)
    
    for row in setup_data:
        # Calculate line counts for each cell
        line_counts = [count_lines(val, col_w[i]) for i, val in enumerate(row)]
        max_lines = max(line_counts)
        row_height = max_lines * line_h + cell_pad * 2
        
        y_start = pdf.get_y()
        
        # Check page break -- if row won't fit, add new page + re-draw header
        if y_start + row_height > 275:
            pdf.add_page()
            pdf.set_font("Helvetica", "B", 8)
            pdf.set_fill_color(*CYAN)
            pdf.set_text_color(*WHITE)
            x_pos = x_table
            for i, h in enumerate(["Tool", "Current", "Action", "KeyFlow Integration"]):
                pdf.set_xy(x_pos, pdf.get_y())
                pdf.cell(col_w[i], 7, h, border=1, fill=True, align="C")
                x_pos += col_w[i]
            pdf.ln(7)
            pdf.set_font("Helvetica", "", 8)
            pdf.set_text_color(*DARK)
            y_start = pdf.get_y()
        
        # Draw cell borders as rectangles first
        x_pos = x_table
        for i in range(len(row)):
            pdf.rect(x_pos, y_start, col_w[i], row_height)
            x_pos += col_w[i]
        
        # Draw text inside cells
        x_pos = x_table
        for i, val in enumerate(row):
            pdf.set_xy(x_pos + 2, y_start + cell_pad)  # 2mm left padding
            align = "L" if i == 3 else "C"
            if line_counts[i] == 1:
                pdf.set_xy(x_pos + 2, y_start + (row_height - line_h) / 2)
                pdf.cell(col_w[i] - 4, line_h, str(val), border=0, align=align)
            else:
                pdf.multi_cell(col_w[i] - 4, line_h, str(val), border=0, align=align)
            x_pos += col_w[i]
        
        # Advance to next row -- single positioning only
        pdf.set_xy(x_table, y_start + row_height)
    
    pdf.ln(3)
    
    # Good news highlight
    good_news = "Good news: KeyFlow coordinates your existing showing and transaction tools with your new automated workflows."
    pdf.highlight_box(good_news)
    pdf.ln(3)

    pdf.section_heading("Investment Summary")
    pdf.ln(1)

    # RDL Service Fee table
    pdf.sub_heading("RDL Service Fee")
    pdf.body_text("Rain Design Labs manages installation, monitoring, optimization, and ongoing support of KeyFlow software.")

    col_w = [80, 40, 60]
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(*CYAN)
    pdf.set_text_color(*WHITE)
    for i, h in enumerate(["Tier", "Monthly", "Includes"]):
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
    pdf.bullet("RDL installs and configures KeyFlow AI Front Desk (Phase 1)", "Step 3:")
    pdf.bullet("Test with real leads for one week - your first month is free", "Step 4:")
    pdf.bullet("Review results together and decide on Phase 2 expansion", "Step 5:")
    pdf.ln(3)

    pdf.section_heading("Contact")
    pdf.bullet("james@raindesignlabs.net", "Email:")
    pdf.bullet("(360) 306-7579", "Phone:")
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


if __name__ == "__main__":
    build()