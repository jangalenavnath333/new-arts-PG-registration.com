import PyPDF2
import re
import json

def extract_names(pdf_path, prefix):
    names = []
    try:
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    for line in text.split('\n'):
                        match = re.search(fr'{prefix}-\d+\s+(.*)', line)
                        if match:
                            names.append(match.group(1).strip())
    except Exception as e:
        print(f"Error reading {pdf_path}: {e}")
    return [n.lower() for n in names]

ca_names = extract_names('c:/CET EXAM ONLINE/MSC CA Attendance.pdf', 'MSC-CA')
cs_names = extract_names('c:/CET EXAM ONLINE/MSC CS Attendance.pdf', 'MSC-CS')

all_names = list(set(ca_names + cs_names))
print(f"Total unique names found in CA: {len(ca_names)}")
print(f"Total unique names found in CS: {len(cs_names)}")
print(f"Total unique names overall: {len(all_names)}")

with open('c:/CET EXAM ONLINE/pdf_names.json', 'w') as f:
    json.dump(all_names, f)
print("Saved to pdf_names.json")
