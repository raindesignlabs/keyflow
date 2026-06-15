#!/bin/bash
# Generate all email forwarding guides

cd "$(dirname "$0")"

echo "Generating Gmail guide..."
python3.12 generate_gmail_guide.py

echo "Generating iCloud guide..."
python3.12 generate_icloud_guide.py

echo "Generating Yahoo guide..."
python3.12 generate_yahoo_guide.py

echo "Generating Outlook guide..."
python3.12 generate_outlook_guide.py

echo "Generating Other provider guide..."
python3.12 generate_other_guide.py

echo "Generating combined client guide..."
python3.12 generate_combined_forwarding_guide.py

echo "All guides generated!"
ls -lh *.pdf