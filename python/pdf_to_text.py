import sys
import pdfplumber
from utils import temp_output, print_result

file_path = sys.argv[1]
parts = []
with pdfplumber.open(file_path) as pdf:
    for page in pdf.pages:
        parts.append(page.extract_text() or "")
text = "\n\n".join(parts)

out = temp_output(".txt")
with open(out, "w", encoding="utf-8") as f:
    f.write(text)
print_result(out, "output.txt")
