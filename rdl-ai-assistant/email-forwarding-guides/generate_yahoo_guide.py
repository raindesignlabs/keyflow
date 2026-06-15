#!/usr/bin/env python3.12
"""
Email Forwarding Guide - Yahoo Mail
Step-by-step guide for clients to forward Yahoo Mail to assistant@raindesignlabs.net
"""

from fpdf import FPDF
from pathlib import Path

LOGO = "/home/james/my_claude/projects/rain-design-labs/website/assets/rdl-logo-horiz-transparent.png"
OUTPUT = "/home/james/my_claude/projects/rdl-ai-assistant/email-forwarding-guides/yahoo-forwarding-guide.pdf"
ASSETS = [
    "/home/james/my_claude/projects/rdl-ai-assistant/email-forwarding-guides/assets/yahoo-cand-1.png",
    "/home/james/my_claude/projects/rdl-ai-assistant/email-forwarding-guides/assets/yahoo-cand-2.png",
    "/home/james/my_claude/projects/rdl-ai-assistant/email-forwarding-guides/assets/yahoo-cand-3.png",
    "/home/james/my_claude/projects/rdl-ai-assistant/email-forwarding-guides/assets/yahoo-cand-5.png",
]

CYAN = (0, 179, 234)
GRAY = (128, 130, 133)
DARK = (45, 48, 55)
WHITE = (255, 255, 255)
GREEN = (76, 175, 80)


class YahooGuidePDF(FPDF):
    def __init__(self):
        super().__init__(orientation='P', unit='mm', format='A4')
        self.set_auto_page_break(auto=True, margin=20)
        self.screenshot_index = 0

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
        self.cell(0, 12, "Yahoo Mail to Rain Design Labs", new_x="LMARGIN", new_y="NEXT", align="C")
        self.ln(20)
        self.set_font("Helvetica", "", 14)
        self.set_text_color(*GRAY)
        self.cell(0, 8, "Don't worry - this is easy and takes about 2 minutes!", new_x="LMARGIN", new_y="NEXT", align="C")
        self.ln(30)

        self.set_font("Helvetica", "B", 16)
        self.set_text_color(*CYAN)
        self.cell(0, 10, "Forward your email to:", new_x="LMARGIN", new_y="NEXT", align="C")
        self.set_font("Helvetica", "B", 18)
        self.set_text_color(*DARK)
        self.cell(0, 10, "assistant@raindesignlabs.net", new_x="LMARGIN", new_y="NEXT", align="C")
        self.ln(40)

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
        self.set_fill_color(255, 248, 220)
        self.set_draw_color(*GREEN)
        self.set_line_width(0.3)
        y = self.get_y()
        self.rect(15, y, 180, max(10, len(text) // 80 * 5 + 8), style='DF')
        self.set_xy(20, y + 3)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(*DARK)
        self.multi_cell(170, 5, text)
        self.set_y(y + max(10, len(text) // 80 * 5 + 8) + 5)

    def screenshot_placeholder(self, label):
        self.ln(5)
        image_path = ASSETS[self.screenshot_index] if self.screenshot_index < len(ASSETS) else None
        self.screenshot_index += 1
        if image_path and Path(image_path).exists():
            y = self.get_y()
            self.set_fill_color(248, 249, 251)
            self.set_draw_color(220, 224, 230)
            self.set_line_width(0.4)
            self.rect(18, y - 2, 174, 99, style='DF')
            self.image(image_path, x=20, y=y, w=170)
            self.set_y(y + 95)
            self.set_font("Helvetica", "I", 9)
            self.set_text_color(*GRAY)
            self.cell(0, 5, label, new_x="LMARGIN", new_y="NEXT", align="C")
            self.ln(3)
            return
        self.set_fill_color(245, 245, 245)
        self.set_draw_color(*GRAY)
        self.set_line_width(0.5)
        y = self.get_y()
        self.rect(20, y, 170, 100, style='DF')
        self.set_xy(20, y + 45)
        self.set_font("Helvetica", "I", 11)
        self.set_text_color(*GRAY)
        self.multi_cell(170, 6, f"[SCREENSHOT: {label}]", align="C")
        self.set_y(y + 110)

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
        self.ln(30)
        self.cell(0, 7, "What happens next:", new_x="LMARGIN", new_y="NEXT", align="C")
        self.ln(10)
        self.bullet("We'll test the forwarding to make sure it works")
        self.bullet("You'll get a confirmation email from us")
        self.bullet("Your AI Assistant will start helping you right away")
        self.ln(30)
        self.cell(0, 7, "Questions? We're here to help!", new_x="LMARGIN", new_y="NEXT", align="C")
        self.ln(5)
        self.set_font("Helvetica", "B", 11)
        self.cell(0, 7, "(360) 306-7579  |  help@raindesignlabs.net", new_x="LMARGIN", new_y="NEXT", align="C")


def build():
    pdf = YahooGuidePDF()

    # Title page
    pdf.title_page()

    # Step 1
    pdf.step_heading(1, "Open Yahoo Mail Settings")
    pdf.body_text("Go to mail.yahoo.com and sign in to your account.")
    pdf.body_text("Click the gear icon (Settings) near the top right of the screen.")
    pdf.body_text("Click 'More Settings' from the dropdown menu.")
    pdf.screenshot_placeholder("Yahoo Mail - Settings menu")

    # Step 2
    pdf.step_heading(2, "Find Mailboxes Section")
    pdf.body_text("In the settings window, look at the left sidebar.")
    pdf.body_text("Click on 'Mailboxes' to open mailbox options.")
    pdf.body_text("Scroll down to find the 'Forwarding' section.")
    pdf.screenshot_placeholder("Yahoo Mail - Mailboxes section")

    # Step 3
    pdf.step_heading(3, "Add Forwarding Address")
    pdf.body_text("Click the button that says 'Add forwarding address' or similar.")
    pdf.body_text("Enter this email address:")
    pdf.ln(5)
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(*CYAN)
    pdf.cell(0, 8, "assistant@raindesignlabs.net", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(5)
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(*DARK)
    pdf.body_text("Click 'Verify' or 'Next'.")
    pdf.body_text("Yahoo will send a verification code.")
    pdf.note_box("We'll receive the verification email and confirm it on our end - no action needed from you!")

    # Step 4
    pdf.step_heading(4, "Choose Forwarding Settings")
    pdf.body_text("Once verified, choose how you want emails handled:")
    pdf.bullet("Keep a copy in your Yahoo inbox (recommended)")
    pdf.bullet("Forward all incoming emails")
    pdf.body_text("This way you still see your emails while we help you!")
    pdf.screenshot_placeholder("Yahoo Mail - Forwarding options")

    # Step 5
    pdf.step_heading(5, "Save and Verify")
    pdf.body_text("Click 'Save' or 'Done' to save your settings.")
    pdf.body_text("Yahoo may show a confirmation message.")
    pdf.body_text("Your email forwarding is now active!")
    pdf.screenshot_placeholder("Yahoo Mail - Save confirmation")

    # Success page
    pdf.success_page()

    pdf.output(OUTPUT)
    print(f"Yahoo guide saved to: {OUTPUT}")


if __name__ == "__main__":
    build()