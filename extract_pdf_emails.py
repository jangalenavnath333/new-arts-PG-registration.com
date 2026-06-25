import PyPDF2
import re
import json

def extract_emails(pdf_path):
    emails = []
    try:
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    found = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text)
                    emails.extend(found)
    except Exception as e:
        print(f"Error reading {pdf_path}: {e}")
    return [e.lower() for e in emails]

ca_emails = extract_emails('c:/CET EXAM ONLINE/MSC CA Attendance.pdf')
cs_emails = extract_emails('c:/CET EXAM ONLINE/MSC CS Attendance.pdf')

all_emails = list(set(ca_emails + cs_emails))
print(f"Total unique emails found: {len(all_emails)}")

with open('c:/CET EXAM ONLINE/pdf_emails.json', 'w') as f:
    json.dump(all_emails, f)
print("Saved to pdf_emails.json")
