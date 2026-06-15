#!/usr/bin/env python3.12
"""
Email Forwarding Guide - Other Email Provider
Generic step-by-step guide for providers not covered by the main guides.
"""

from fpdf import FPDF
from pathlib import Path

LOGO = "/home/james/my_claude/projects/rain-design-labs/website/assets/rdl-logo-horiz-transparent.png"
OUTPUT = "/home/james/my_claude/projects/rdl-ai-assistant/email-forwarding-guides/other-forwarding-guide.pdf"

CYAN = (0, 179, 234)
GRAY = (128, 130, 133)
DARK = (45, 48, 55)
WHITE = (255, 255, 255)
GREEN = (76, 175, 80)
LIGHT_CARD = (248, 249, 251)
LIGHT_BORDER = (220, 224, 230)
WARM = (255, 248, 220)


class OtherGuidePDF(FPDF):
    def __init__(self):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.set_auto_page_break(auto=True, margin=20)

    def header(self):
        if Path(LOGO).exists():
            self.image(LOGO, x=15, y=10, w=50)
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
        self.ln(30)
        self.set_font("Helvetica", "B", 24)
        self.set_text_color(*DARK)
        self.cell(0, 12, "How to Forward Your", new_x="LMARGIN", new_y="NEXT", align="C")
        self.cell(0, 12, "Email to Rain Design Labs", new_x="LMARGIN", new_y="NEXT", align="C")
        self.ln(18)
        self.set_font("Helvetica", "", 14)
        self.set_text_color(*GRAY)
        self.multi_cell(0, 8, "Use this guide if you use a smaller or custom email provider. Most providers follow the same basic steps.", align="C")
        self.ln(18)

        self.set_font("Helvetica", "B", 16)
        self.set_text_color(*CYAN)
        self.cell(0, 10, "Forward your email to:", new_x="LMARGIN", new_y="NEXT", align="C")
        self.set_font("Helvetica", "B", 18)
        self.set_text_color(*DARK)
        self.cell(0, 10, "assistant@raindesignlabs.net", new_x="LMARGIN", new_y="NEXT", align="C")
        self.ln(28)

        self.note_box(
            "If your provider uses different labels, look for words like Settings, Preferences, Rules, Filters, Accounts, Mailboxes, or Forwarding."
        )

        self.ln(15)
        self.set_font("Helvetica", "B", 12)
        self.set_text_color(*DARK)
        self.cell(0, 8, "Need help? We're here for you!", new_x="LMARGIN", new_y="NEXT", align="C")
        self.set_font("Helvetica", "", 11)
        self.set_text_color(*GRAY)
        self.cell(0, 7, "Call: (360) 306-7579", new_x="LMARGIN", new_y="NEXT", align="C")
        self.cell(0, 7, "Email: help@raindesignlabs.net", new_x="LMARGIN", new_y="NEXT", align="C")

    def step_heading(self, num, title):
        self.add_page()
        self.ln(10)
        self.set_font("Helvetica", "B", 14)
        self.set_fill_color(*CYAN)
        self.set_text_color(*WHITE)
        self.cell(0, 10, f"  Step {num}: {title}  ", fill=True, new_x="LMARGIN", new_y="NEXT")
        self.set_fill_color(*WHITE)
        self.ln(5)

    def body_text(self, text):
        self.set_font("Helvetica", "", 11)
        self.set_text_color(*DARK)
        self.multi_cell(0, 6, text)
        self.ln(3)

    def bullet(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(*DARK)
        self.cell(5, 5, "-")
        self.multi_cell(170, 5, text)
        self.ln(1)

    def note_box(self, text):
        self.ln(5)
        self.set_fill_color(*WARM)
        self.set_draw_color(*GREEN)
        self.set_line_width(0.3)
        y = self.get_y()
        h = max(12, len(text) // 75 * 5 + 10)
        self.rect(15, y, 180, h, style="DF")
        self.set_xy(20, y + 3)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(*DARK)
        self.multi_cell(170, 5, text)
        self.set_y(y + h + 5)

    def screenshot_card(self, title, bullets):
        self.ln(5)
        y = self.get_y()
        h = 94
        self.set_fill_color(*LIGHT_CARD)
        self.set_draw_color(*LIGHT_BORDER)
        self.set_line_width(0.4)
        self.rect(18, y - 2, 174, h, style="DF")

        self.set_xy(25, y + 4)
        self.set_font("Helvetica", "B", 12)
        self.set_text_color(*DARK)
        self.cell(0, 7, title, new_x="LMARGIN", new_y="NEXT")

        self.set_x(25)
        self.set_font("Helvetica", "", 10)
        self.set_text_color(*GRAY)
        for item in bullets:
            self.set_x(28)
            self.cell(4, 5, "-")
            self.multi_cell(150, 5, item)
            self.ln(1)

        self.set_y(y + h - 14)
        self.set_font("Helvetica", "I", 9)
        self.set_text_color(*GRAY)
        self.cell(0, 5, title, new_x="LMARGIN", new_y="NEXT", align="C")
        self.ln(3)

    def success_page(self):
        self.add_page()
        self.ln(40)
        self.set_font("Helvetica", "B", 28)
        self.set_text_color(*GREEN)
        self.cell(0, 15, "SUCCESS", new_x="LMARGIN", new_y="NEXT", align="C")
        self.ln(10)
        self.set_font("Helvetica", "B", 20)
        self.set_text_color(*DARK)
        self.cell(0, 12, "You're All Set!", new_x="LMARGIN", new_y="NEXT", align="C")
        self.ln(15)
        self.set_font("Helvetica", "", 12)
        self.set_text_color(*GRAY)
        self.cell(0, 7, "Your email is now being forwarded to", new_x="LMARGIN", new_y="NEXT", align="C")
        self.cell(0, 7, "assistant@raindesignlabs.net", new_x="LMARGIN", new_y="NEXT", align="C")
        self.ln(26)
        self.cell(0, 7, "What happens next:", new_x="LMARGIN", new_y="NEXT", align="C")
        self.ln(10)
        self.bullet("We'll test the forwarding to make sure it works")
        self.bullet("You'll get a confirmation email from us")
        self.bullet("If your provider needs a code or approval, we'll tell you exactly what to click")
        self.ln(24)
        self.cell(0, 7, "Questions? We're here to help!", new_x="LMARGIN", new_y="NEXT", align="C")
        self.ln(5)
        self.set_font("Helvetica", "B", 11)
        self.cell(0, 7, "(360) 306-7579  |  help@raindesignlabs.net", new_x="LMARGIN", new_y="NEXT", align="C")


def build():
    pdf = OtherGuidePDF()
    pdf.title_page()

    pdf.step_heading(1, "Open Your Email Settings")
    pdf.body_text("Sign in to your email account in a web browser.")
    pdf.body_text("Look for a gear icon, profile menu, or button labeled 'Settings' or 'Preferences'.")
    pdf.body_text("If you see a simple menu first, click the option that opens full settings.")
    pdf.screenshot_card(
        "What to look for in your email app",
        [
            "Gear icon or menu near the top right",
            "Settings, Preferences, or Options",
            "A link like View all settings or More settings",
        ],
    )

    pdf.step_heading(2, "Find the Forwarding Area")
    pdf.body_text("Inside settings, look for sections called Mail, Accounts, Mailboxes, Rules, Filters, or Forwarding.")
    pdf.body_text("Some providers place forwarding under 'Accounts' or 'Mailboxes' instead of a main Forwarding page.")
    pdf.screenshot_card(
        "Common labels for forwarding menus",
        [
            "Forwarding",
            "Mail Forwarding",
            "Rules or Filters",
            "Accounts or Mailboxes",
        ],
    )

    pdf.step_heading(3, "Add the Forwarding Address")
    pdf.body_text("Look for a button or link like 'Add forwarding address', 'Create forwarding rule', or 'Forward mail to'.")
    pdf.body_text("Enter this email address exactly:")
    pdf.ln(5)
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(*CYAN)
    pdf.cell(0, 8, "assistant@raindesignlabs.net", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(5)
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(*DARK)
    pdf.body_text("If your provider asks whether to keep a copy in your inbox, choose yes.")
    pdf.note_box("Some providers send a verification email or code before forwarding turns on. That is normal.")
    pdf.screenshot_card(
        "Typical forwarding form",
        [
            "Field for forwarding email address",
            "Option to keep a copy in your inbox",
            "Save, Add, Verify, or Continue button",
        ],
    )

    pdf.step_heading(4, "Save or Turn It On")
    pdf.body_text("Click Save, Apply, Done, or Turn On.")
    pdf.body_text("If you created a rule, make sure it applies to all incoming mail unless we set something more specific for you.")
    pdf.screenshot_card(
        "Before you finish",
        [
            "Forwarding is enabled",
            "assistant@raindesignlabs.net is listed as the destination",
            "A copy stays in your inbox if that option exists",
        ],
    )

    pdf.step_heading(5, "Watch for Verification")
    pdf.body_text("Some providers activate forwarding right away. Others send a confirmation email or ask you to approve the forwarding address.")
    pdf.body_text("If you see a prompt for verification, finish that step or contact us and we'll help you through it.")
    pdf.note_box("If these labels do not match your provider, send us a screenshot of your settings page and we will guide you the rest of the way.")

    pdf.success_page()
    pdf.output(OUTPUT)
    print(f"Other provider guide saved to: {OUTPUT}")


if __name__ == "__main__":
    build()
