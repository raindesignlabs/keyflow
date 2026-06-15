#!/usr/bin/env python3.12
"""
RDL AI Assistant email watcher for Diana Dominguez.
Handles two job types:
  1. Closing Timeline — subject contains "closing timeline"
  2. Property Survey (contract) — subject contains "contract"

Run via Hermes cronjob (every 3 min) or manually.
"""

import subprocess
import re
import json
import tempfile
from pathlib import Path
import sys
import os
import smtplib
import traceback
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

# Import build functions correctly
BASE_DIR = Path(__file__).parent          # dominguez-diana/
RDL_DIR = BASE_DIR.parent.parent         # rdl-ai-assistant/
sys.path.insert(0, str(BASE_DIR))
sys.path.insert(0, str(RDL_DIR))

from build_closing_timeline import fill_template, convert_to_pdf
from timeline_jobs import get_job, init_db, record_failure, should_process, update_job, upsert_received
from generate_property_survey import PropertySurveyPDF
from rdl_jobs import (
    get_job as rdl_get_job,
    init_db as rdl_init_db,
    record_failure as rdl_record_failure,
    should_process as rdl_should_process,
    update_job as rdl_update_job,
    upsert_received as rdl_upsert_received,
)

# Constants
EMAIL_CMD = '/home/james/.hermes/profiles/rdl/home/.local/bin/himalaya'
PROCESSED_FILE = BASE_DIR / 'processed_emails.txt'
CONTRACT_ALERTS_FILE = BASE_DIR / 'processed_contract_alerts.txt'
WORK_DIR = BASE_DIR
SOURCE_EMAIL_DIR = WORK_DIR / 'source-emails'
CONTRACT_ATTACHMENTS_DIR = WORK_DIR / 'contract-attachments'

# Job type for property survey
JOB_TYPE_SURVEY = "property_survey"
CLIENT_ID = "dominguez-diana"

# Email routing (from welcome-to-contract-rules.md)
SMTP_HOST = 'smtp.hostinger.com'
SMTP_PORT = 465
SMTP_USER = 'assistant@raindesignlabs.net'
SMTP_PASS = 'jiJEs9-!!jdJK99882'
SEND_TO = 'james@raindesignlabs.net'
CC_TO = ''
SEND_FROM = 'RDL Assistant <assistant@raindesignlabs.net>'

# Agent profile (constant across transactions)
AGENT = {
    "name": "Diana Dominguez",
    "title": "REALTOR®",
    "brokerage": "Signature Properties",
    "phone": "325.829.2839",
    "email": "Diana.dominguez@icloud.com",
    "website": "www.pcsingtolittlerock.com",
    "photo": "assets/dd-bodyshot-small-white.png"
}


def get_processed_emails() -> set:
    if PROCESSED_FILE.exists():
        return set(line.strip() for line in PROCESSED_FILE.read_text().splitlines() if line.strip())
    return set()


def get_processed_contract_alerts() -> set:
    if CONTRACT_ALERTS_FILE.exists():
        return set(line.strip() for line in CONTRACT_ALERTS_FILE.read_text().splitlines() if line.strip())
    return set()


def mark_contract_alerted(email_id: str):
    with open(CONTRACT_ALERTS_FILE, 'a') as f:
        f.write(f"{email_id}\n")


def mark_processed(email_id: str):
    with open(PROCESSED_FILE, 'a') as f:
        f.write(f"{email_id}\n")


def get_email_list() -> str:
    result = subprocess.run(
        [EMAIL_CMD, 'envelope', 'list', '--account', 'rdl', '--max-width', '300'],
        capture_output=True, text=True
    )
    return result.stdout


def get_email_body(email_id: str) -> str:
    result = subprocess.run(
        [EMAIL_CMD, 'message', 'read', str(email_id), '--account', 'rdl'],
        capture_output=True, text=True
    )
    return result.stdout


def parse_email_to_json(body: str, client_name: str = "Client") -> dict:
    """
    Parse a closing timeline email into JSON using Ollama LLM (gemma4:e4b).
    Falls back to regex if Ollama is unavailable.
    """

    # Try LLM first
    try:
        data = _parse_with_llm(body)
        if data:
            return data
    except Exception as e:
        print(f"  ⚠️  LLM parse failed ({e}), falling back to regex")

    # Regex fallback
    return _parse_with_regex(body)


def _parse_with_llm(body: str) -> dict | None:
    """Use Ollama gemma4:e4b to extract structured data from email."""

    prompt = """Extract the following information from this real estate closing timeline email and return ONLY valid JSON (no markdown, no explanation).

Required JSON schema:
{
  "property": {
    "address_line1": "street address only",
    "address_line2": "City, ST ZIPCODE",
    "purchase_price": "$XXX,XXX",
    "earnest_money": "$X,XXX"
  },
  "timeline": {
    "effective_date": "MON DD, YYYY (ALL CAPS month)",
    "earnest_money_due": "PENDING or N/A or date",
    "inspection_date": "date or PENDING",
    "inspection_period_ends": "date or PENDING",
    "appraisal_date": "date or PENDING",
    "final_walk_through": "date or PENDING",
    "closing_date": "date or PENDING"
  },
  "contacts": {
    "title_company": {"company":"","address":"","contact_name":"","phone":"","email":""},
    "lender": {"company":"","address":"","contact_name":"","phone":"","email":""},
    "home_inspections": {"company":"","address":"","contact_name":"","phone":"","email":""},
    "survey_company": {"company":"","contact_name":"","phone":"","email":"","note":""},
    "home_insurance": {"company":"","address":"","contact_name":"","phone":"","email":""}
  },
  "notes": ["any notes from the email"]
}

Rules:
- Dates: convert to ALL CAPS month format like "OCT 28, 2025". Remove leading zeros (use "OCT 2" not "OCT 02").
- If earnest money is $0, set earnest_money_due to "N/A". Otherwise set to "PENDING" unless a specific date is given.
- Address: split into street (address_line1) and city/state/zip (address_line2).
- For survey_company, put the note/status in the "note" field. Phone and email are usually empty.
- If any field is missing or not mentioned, use empty string "".
- Return ONLY the JSON object, nothing else.
- NOTES RULE (critical): The "notes" field is an array of up to 12 short strings. Each note must be a COMPLETE SENTENCE under 60 characters. Never cut off mid-sentence. If a note is too long, rewrite it shorter as a full sentence — do not truncate mid-word. Look for a "Notes" or "Additional Notes" section from the sender FIRST. If notes exist, condense them prioritizing: (1) any holds, delays, or obstacles affecting timeline dates (e.g. appraisal on hold, repair negotiations stalled, title issues), (2) any pending actions or contingencies, (3) any other relevant details. Use as many notes as needed (up to 12). Write in professional third-person tone. Be concise — trim filler words to fit. If NO notes section exists in the email, output exactly: ["We will contact you if there are any changes or delays in the dates listed above."]

EMAIL:
""" + body

    # Use Ollama HTTP API for reliable output
    import urllib.request

    payload = json.dumps({
        "model": "gemma4:e2b",
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.1}
    }).encode()

    req = urllib.request.Request(
        "http://localhost:11434/api/generate",
        data=payload,
        headers={"Content-Type": "application/json"}
    )

    with urllib.request.urlopen(req, timeout=300) as resp:
        result = json.loads(resp.read().decode())

    raw = result.get("response", "").strip()

    if not raw:
        raise RuntimeError("Ollama returned empty response")

    # Extract JSON from response (handle preamble text and markdown code blocks)
    if '```json' in raw:
        raw = raw.split('```json')[1].split('```')[0].strip()
    elif '```' in raw:
        raw = raw.split('```')[1].split('```')[0].strip()

    # Find the JSON object (first { to last })
    start = raw.find('{')
    end = raw.rfind('}')
    if start >= 0 and end > start:
        raw = raw[start:end+1]

    data = json.loads(raw)

    # Clean notes: remove incomplete sentences (cut-off text from LLM)
    cleaned = []
    for note in data.get('notes', []):
        if not note:
            continue
        note = note.strip()
        # Remove trailing incomplete sentence (doesn't end with . ! ?)
        # Split into sentences, keep only complete ones
        sentences = re.split(r'(?<=[.!?])\s+', note)
        complete = ' '.join(s for s in sentences if re.search(r'[.!?]$', s.strip()))
        if complete:
            cleaned.append(complete)
        elif note:  # no period at all — add one
            cleaned.append(note.rstrip('.,;:') + '.')
    data['notes'] = cleaned

    # Normalize date format: ensure ALL CAPS month
    for key, val in data.get('timeline', {}).items():
        if isinstance(val, str) and val and val not in ('PENDING', 'N/A', 'TBD'):
            # "Nov 2, 2025" → "NOV 2, 2025"
            m = re.match(r'(\w{3})\w*\s+(\d{1,2}),?\s+(\d{4})', val)
            if m:
                month, day, year = m.groups()
                data['timeline'][key] = f"{month.upper()} {int(day)}, {year}"

    # Validate required structure
    for section in ('property', 'timeline', 'contacts'):
        if section not in data:
            raise ValueError(f"Missing section: {section}")

    for sub in ('title_company', 'lender', 'home_inspections', 'survey_company', 'home_insurance'):
        if sub not in data['contacts']:
            data['contacts'][sub] = {"company":"","address":"","contact_name":"","phone":"","email":""}

    # Inject agent info
    data['agent'] = AGENT

    # Apply earnest money rule
    em = data['property'].get('earnest_money', '$0').replace('$','').replace(',','').strip()
    if em in ('0', '0.00', ''):
        data['timeline']['earnest_money_due'] = 'N/A'
    elif not data['timeline'].get('earnest_money_due') or data['timeline']['earnest_money_due'] in ('N/A', '', 'TBD'):
        data['timeline']['earnest_money_due'] = 'PENDING'

    return data


def _parse_with_regex(body: str) -> dict:
    """Regex-based fallback parser."""

    def find_field(label: str, text: str, default: str = "") -> str:
        patterns = [
            rf'{label}\s*:?\s*(.+)',
            rf'{label}\s*\n\s*(.+)',
        ]
        for pat in patterns:
            match = re.search(pat, text, re.IGNORECASE)
            if match:
                val = match.group(1).strip()
                if val:
                    return val
        return default

    def find_date(label: str, text: str) -> str:
        raw = find_field(label, body, "PENDING")
        if raw in ("PENDING", "TBD", "N/A", ""):
            return raw
        match = re.match(r'(\w{3})\w*\s+(\d{1,2}),?\s+(\d{4})', raw.strip())
        if match:
            month, day, year = match.groups()
            return f"{month.upper()} {int(day)}, {year}"
        return raw.upper()

    # Parse property
    addr_raw = find_field(r'Property Address', body)
    address_line1 = addr_raw.strip() if addr_raw else ""

    # Try to split "742 Evergreen Terrace, Little Rock, AR 72201"
    m = re.match(r'(.+?),\s*([A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5})', address_line1)
    if m:
        address_line1 = m.group(1).strip()
        address_line2 = m.group(2).strip()
    else:
        address_line2 = ""

    purchase_price = find_field(r'Purchase Price', body, "TBD")
    earnest_money = find_field(r'Earnest Money', body, "$0")
    if purchase_price and not purchase_price.startswith('$'):
        purchase_price = f"${purchase_price}"
    if earnest_money and earnest_money not in ("$0", "$0.00") and not earnest_money.startswith('$'):
        earnest_money = f"${earnest_money}"

    # Parse dates
    earnest_money_due = "PENDING"
    em_val = earnest_money.replace('$', '').replace(',', '').strip()
    if em_val in ('0', '0.00', ''):
        earnest_money_due = "N/A"

    data = {
        "property": {
            "address_line1": address_line1,
            "address_line2": address_line2,
            "purchase_price": purchase_price,
            "earnest_money": earnest_money,
        },
        "timeline": {
            "effective_date": find_date(r'Effective Date', body),
            "earnest_money_due": earnest_money_due,
            "inspection_date": find_date(r'Inspection Date(?!.*Period)', body),
            "inspection_period_ends": find_date(r'Inspection Period Ends', body),
            "appraisal_date": find_date(r'Appraisal Date', body),
            "final_walk_through": find_date(r'Final Walk-Through', body),
            "closing_date": find_date(r'Closing Date', body),
        },
        "contacts": {
            "title_company": {"company":"","address":"","contact_name":"","phone":"","email":""},
            "lender": {"company":"","address":"","contact_name":"","phone":"","email":""},
            "home_inspections": {"company":"","address":"","contact_name":"","phone":"","email":""},
            "survey_company": {"company":"","contact_name":"","phone":"","email":"","note":"Order pending client survey authorization."},
            "home_insurance": {"company":"","address":"","contact_name":"","phone":"","email":""},
        },
        "notes": [],
        "agent": AGENT,
    }

    return data


def send_email(pdf_path: str, client_name: str):
    """Send the PDF to Diana with CC to James."""
    msg = MIMEMultipart()
    msg['From'] = SEND_FROM
    msg['To'] = SEND_TO
    msg['Cc'] = CC_TO
    msg['Subject'] = f'Closing Timeline — {client_name}'
    msg['Reply-To'] = 'assistant@raindesignlabs.net'

    body = f"""Hi Diana,

Attached is the Closing Timeline for {client_name}.

Please review and let us know if any changes are needed.

Best,
RDL Assistant"""

    msg.attach(MIMEText(body, 'plain'))

    with open(pdf_path, 'rb') as f:
        part = MIMEBase('application', 'pdf')
        part.set_payload(f.read())
        encoders.encode_base64(part)
        filename = f'closing-timeline-{client_name.lower().replace(" ", "-")}.pdf'
        part.add_header('Content-Disposition', 'attachment', filename=filename)
        msg.attach(part)

    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)

    print(f"  📧 Sent to: {SEND_TO}")
    print(f"  📧 CC: {CC_TO}")


# ── Contract / Property Survey Helpers ───────────────────────────────────

def download_attachments(email_id: str, dest_dir: Path) -> list[Path]:
    """Download all attachments for an email via himalaya. Returns list of file paths."""
    dest_dir.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        [EMAIL_CMD, 'attachment', 'download', str(email_id),
         '--account', 'rdl', '-d', str(dest_dir)],
        capture_output=True, text=True
    )
    # himalaya downloads to dest_dir; find what's there now
    downloaded = sorted(dest_dir.glob('*'), key=lambda p: p.stat().st_mtime, reverse=True)
    # Only return files created in the last 10 seconds (just downloaded)
    import time
    recent = [p for p in downloaded if time.time() - p.stat().st_mtime < 10 and p.is_file()]
    return recent


def extract_text_from_file(filepath: Path) -> str:
    """Extract text from PDF, DOCX, or plain text files."""
    ext = filepath.suffix.lower()
    if ext == '.pdf':
        import fitz  # pymupdf
        doc = fitz.open(str(filepath))
        text = "\n".join(page.get_text() for page in doc)
        doc.close()
        return text
    elif ext in ('.docx', '.doc'):
        import docx
        doc = docx.Document(str(filepath))
        return "\n".join(para.text for para in doc.paragraphs)
    elif ext in ('.txt', '.text', '.rtf'):
        return filepath.read_text(errors='replace')
    else:
        # Try reading as text anyway
        try:
            return filepath.read_text(errors='replace')
        except Exception:
            return ""


def parse_contract_to_survey_json(text: str) -> dict:
    """
    Use Ollama LLM to extract property survey data from contract text.
    Returns JSON matching the property-survey-schema.json structure.
    """
    import urllib.request

    prompt = """You are a real estate data extractor. Extract information from this contract text and return ONLY valid JSON matching this exact schema. Use empty strings for any fields not found.

Required JSON schema:
{
  "property": {
    "address": "full street address, city, state, zip",
    "mls_number": "",
    "listing_agent": ""
  },
  "home_overview": {
    "year_built": "",
    "year_purchased": "",
    "bedrooms": "",
    "full_bathrooms": "",
    "half_bathrooms": "",
    "garage_type": "",
    "garage_capacity": "",
    "square_footage": "",
    "lot_size": "",
    "stories": ""
  },
  "utilities": {
    "electric_provider": "",
    "electric_average_bill": "",
    "water_provider": "",
    "water_average_bill": "",
    "trash_provider": "",
    "trash_average_bill": "",
    "internet_provider": "",
    "internet_average_bill": "",
    "internet_speed": "",
    "gas_provider": "",
    "gas_average_bill": ""
  },
  "major_systems": {
    "heating_type": "",
    "heating_age": "",
    "cooling_type": "",
    "cooling_age": "",
    "water_heater_type": "",
    "roof_age": "",
    "roof_type": ""
  },
  "appliances": {
    "refrigerator": "",
    "washer_dryer": "",
    "garage_door_remotes": "",
    "other": ""
  },
  "exterior_lot": {
    "septic_or_sewer": "",
    "septic_tank_size": "",
    "septic_last_cleaned": "",
    "water_source": "",
    "fence": "",
    "sprinkler_system": "",
    "pool": ""
  },
  "security_smart": {
    "security_system": "",
    "cameras": "",
    "smart_features": ""
  },
  "service_contracts": {
    "termite_company": "",
    "termite_annual_cost": "",
    "other": ""
  },
  "hoa_financial": {
    "insurance_company": "",
    "insurance_annual_premium": "",
    "annual_property_taxes": "",
    "hoa_name": "",
    "hoa_annual_fee": "",
    "hoa_frequency": ""
  },
  "items_to_negotiate": "",
  "marketing": {
    "prompt": "What do you love most about your home and neighborhood?",
    "response": ""
  },
  "metadata": {
    "prepared_for": "",
    "prepared_by": "Diana Dominguez — Signature Properties",
    "date_prepared": "",
    "disclaimer": "Information provided is believed to be accurate but is not guaranteed. Buyers should independently verify all details."
  }
}

Rules:
- Extract any property details you can find from the contract.
- For fields not mentioned, use empty string "".
- Address should include full street, city, state, zip if available.
- The "items_to_negotiate" field is a free-text string of items that will remain with the property or need negotiation.
- Return ONLY the JSON object, no explanation, no markdown fences.

CONTRACT TEXT:
""" + text

    payload = json.dumps({
        "model": "gemma4:e2b",
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.1}
    }).encode()

    req = urllib.request.Request(
        "http://localhost:11434/api/generate",
        data=payload,
        headers={"Content-Type": "application/json"}
    )

    with urllib.request.urlopen(req, timeout=300) as resp:
        result = json.loads(resp.read().decode())

    raw = result.get("response", "").strip()
    if not raw:
        raise RuntimeError("Ollama returned empty response for contract parsing")

    # Extract JSON from response
    if '```json' in raw:
        raw = raw.split('```json')[1].split('```')[0].strip()
    elif '```' in raw:
        raw = raw.split('```')[1].split('```')[0].strip()

    start = raw.find('{')
    end = raw.rfind('}')
    if start >= 0 and end > start:
        raw = raw[start:end+1]

    data = json.loads(raw)
    return data


def send_survey_email(pdf_path: str, client_name: str):
    """Send the property survey PDF to Diana with CC to James."""
    msg = MIMEMultipart()
    msg['From'] = SEND_FROM
    msg['To'] = SEND_TO
    msg['Cc'] = CC_TO
    msg['Subject'] = f'Property Survey — {client_name}'
    msg['Reply-To'] = 'assistant@raindesignlabs.net'

    body = f"""Hi Diana,

Attached is the Property Survey (Your Contract Summary) for {client_name}.

Please review and let us know if any changes are needed.

Best,
RDL Assistant"""

    msg.attach(MIMEText(body, 'plain'))

    with open(pdf_path, 'rb') as f:
        part = MIMEBase('application', 'pdf')
        part.set_payload(f.read())
        encoders.encode_base64(part)
        filename = f'property-survey-{client_name.lower().replace(" ", "-")}.pdf'
        part.add_header('Content-Disposition', 'attachment', filename=filename)
        msg.attach(part)

    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)

    print(f"  📧 Sent to: {SEND_TO}")
    print(f"  📧 CC: {CC_TO}")


def process_contract_email(email_id: str, subject: str, sender: str, body: str):
    """
    Full pipeline for a contract email:
    1. Download attachments (if any)
    2. Extract text from attachment or use email body
    3. Parse with Ollama into property survey schema
    4. Generate branded PDF
    5. Email to Diana for approval
    """
    rdl_init_db()

    # Extract client name from subject (e.g. "contract for JUDE BARLOW SR")
    name_match = re.search(r'(?:for|from)\s+(.+?)(?:\s*\(test\))?\s*$', subject, re.IGNORECASE)
    client_name = name_match.group(1).strip().title() if name_match else f"Client-{email_id}"
    display_name = client_name

    # Check if already processed
    if not rdl_should_process(email_id, JOB_TYPE_SURVEY):
        return

    rdl_upsert_received(email_id, JOB_TYPE_SURVEY, CLIENT_ID, subject, display_name)
    print(f"\n📧 Processing contract: {subject} (ID: {email_id})")
    print(f"  From: {sender}")
    print(f"  Client: {client_name}")

    try:
        # Step 1: Save source email
        rdl_update_job(email_id, JOB_TYPE_SURVEY, 'reading_email', 'Reading source email')
        source_path = SOURCE_EMAIL_DIR / f'contract-email-{email_id}.txt'
        source_path.parent.mkdir(parents=True, exist_ok=True)
        source_path.write_text(body, encoding='utf-8')
        rdl_update_job(email_id, JOB_TYPE_SURVEY, 'source_saved', 'Source email saved',
                       source_email_path=str(source_path))

        # Step 2: Try downloading attachments
        rdl_update_job(email_id, JOB_TYPE_SURVEY, 'downloading', 'Checking for attachments')
        contract_text = ""
        attachment_path = ""

        attachments = download_attachments(email_id, CONTRACT_ATTACHMENTS_DIR / email_id)
        if attachments:
            print(f"  📎 Found {len(attachments)} attachment(s)")
            for att in attachments:
                ext = att.suffix.lower()
                if ext in ('.pdf', '.docx', '.doc', '.txt', '.rtf'):
                    print(f"  📎 Extracting: {att.name}")
                    extracted = extract_text_from_file(att)
                    if extracted.strip():
                        contract_text += extracted + "\n\n"
                    attachment_path = str(att)

        # Fallback to email body if no attachment or empty extraction
        if not contract_text.strip():
            print("  📝 No usable attachment — using email body as contract text")
            contract_text = body

        if not contract_text.strip():
            raise ValueError("No contract text found (empty attachment + empty email body)")

        if attachment_path:
            rdl_update_job(email_id, JOB_TYPE_SURVEY, 'attachment_downloaded',
                           f'Attachment: {Path(attachment_path).name}',
                           source_attachment_path=attachment_path)

        # Step 3: Parse with Ollama into property survey schema
        rdl_update_job(email_id, JOB_TYPE_SURVEY, 'parsing',
                       'Parsing contract into property survey JSON')
        data = parse_contract_to_survey_json(contract_text)

        json_path = WORK_DIR / f'survey-data-{client_name.lower().replace(" ", "-")}.json'
        with open(json_path, 'w') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        rdl_update_job(email_id, JOB_TYPE_SURVEY, 'parsed', 'JSON saved',
                       json_path=str(json_path))
        print(f"  📄 Data saved: {json_path.name}")

        # Step 4: Generate PDF
        rdl_update_job(email_id, JOB_TYPE_SURVEY, 'building_pdf', 'Building PDF')
        pdf_path = WORK_DIR / f'property-survey-{client_name.lower().replace(" ", "-")}.pdf'
        pdf = PropertySurveyPDF(data)
        pdf.build()
        pdf.output(str(pdf_path))

        size_kb = pdf_path.stat().st_size / 1024
        rdl_update_job(email_id, JOB_TYPE_SURVEY, 'pdf_built',
                       f'PDF generated ({size_kb:.0f} KB)', pdf_path=str(pdf_path))
        print(f"  ✅ PDF generated: {pdf_path.name} ({size_kb:.0f} KB)")

        # Step 5: Send approval email
        rdl_update_job(email_id, JOB_TYPE_SURVEY, 'sending_approval',
                       'Sending approval email to Diana')
        send_survey_email(str(pdf_path), client_name)
        rdl_update_job(email_id, JOB_TYPE_SURVEY, 'approval_sent',
                       'Approval email sent to Diana', pdf_path=str(pdf_path))

        # Keep legacy file in sync
        mark_contract_alerted(email_id)

    except Exception as exc:
        error = ''.join(traceback.format_exception(exc)).strip()
        rdl_record_failure(email_id, JOB_TYPE_SURVEY, error, retryable=True)
        print(f"  ❌ Failed: {exc}")


def main():
    print("🔍 Checking for closing timeline emails...")
    init_db()
    SOURCE_EMAIL_DIR.mkdir(exist_ok=True)

    emails_output = get_email_list()
    processed = get_processed_emails()
    contract_alerted = get_processed_contract_alerts()
    failures: list[str] = []

    lines = emails_output.strip().split('\n')

    for line in lines[2:]:  # Skip header rows
        parts = line.split('|')
        if len(parts) < 6:
            continue

        email_id = parts[1].strip()
        subject = parts[3].strip()
        sender = parts[4].strip()

        is_closing_timeline = re.search(r'closing\s*time\s*line', subject, re.IGNORECASE)

        # Contract / property survey handling
        if (not is_closing_timeline) and re.search(r'\bcontracts?\b', subject, re.IGNORECASE) and email_id not in contract_alerted:
            body = get_email_body(email_id)
            process_contract_email(email_id, subject, sender, body)
            mark_contract_alerted(email_id)
            continue

        # Match "closing timeline" or "closing time line" in subject
        if not is_closing_timeline:
            continue

        # Legacy guard: old processed_emails.txt entries should not replay just
        # because the SQLite DB is new. Once a DB job exists, SQLite controls it.
        if email_id in processed and get_job(email_id) is None:
            continue

        if not should_process(email_id):
            continue

        print(f"\n📧 Found: {subject} (ID: {email_id})")

        # Extract client name from subject (e.g. "closing timeline for JUDE BARLOW SR")
        name_match = re.search(r'for\s+(.+?)(?:\s*\(test\))?\s*$', subject, re.IGNORECASE)
        client_name = name_match.group(1).strip().title() if name_match else f"Client-{email_id}"
        upsert_received(email_id, subject, client_name)

        try:
            update_job(email_id, 'reading_email', 'Reading source email')
            body = get_email_body(email_id)
            source_path = SOURCE_EMAIL_DIR / f'email-{email_id}.txt'
            source_path.write_text(body, encoding='utf-8')
            update_job(email_id, 'source_saved', 'Source email saved', source_email_path=str(source_path))

            update_job(email_id, 'parsing', 'Parsing email into structured JSON')
            data = parse_email_to_json(body, client_name)

            json_path = WORK_DIR / f'data-{client_name.lower().replace(" ", "-")}.json'
            with open(json_path, 'w') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            update_job(email_id, 'parsed', 'Structured JSON saved', json_path=str(json_path))
            print(f"  📄 Data saved: {json_path.name}")

            update_job(email_id, 'building_pdf', 'Building and QAing PDF')
            pptx_path = fill_template(data)
            pdf_path = WORK_DIR / f'closing-timeline-{client_name.lower().replace(" ", "-")}.pdf'
            convert_to_pdf(pptx_path, str(pdf_path))

            # Cleanup temp PPTX
            Path(pptx_path).unlink(missing_ok=True)

            size_kb = pdf_path.stat().st_size / 1024
            update_job(email_id, 'pdf_built', f'PDF generated ({size_kb:.0f} KB)', pdf_path=str(pdf_path))
            print(f"  ✅ PDF generated: {pdf_path.name} ({size_kb:.0f} KB)")

            update_job(email_id, 'sending_approval', 'Sending approval email to Diana')
            send_email(str(pdf_path), client_name)
            update_job(email_id, 'approval_sent', 'Approval email sent to Diana', pdf_path=str(pdf_path))

            # Keep legacy file in sync for manual operators/scripts that still inspect it.
            mark_processed(email_id)

        except Exception as exc:
            error = ''.join(traceback.format_exception(exc)).strip()
            record_failure(email_id, error, retryable=True)
            print(f"  ❌ Failed: {exc}")
            failures.append(f"{email_id}: {exc}")

    if failures:
        print("\n❌ One or more closing timeline jobs failed:")
        for failure in failures:
            print(f"- {failure}")
        sys.exit(1)

    print("\n✅ Check complete")


if __name__ == '__main__':
    main()
