import sys
from pypdf import PdfReader, PdfWriter
from utils import temp_output, print_result

file_path = sys.argv[1]
password = sys.argv[2] if len(sys.argv) > 2 else "1234"

reader = PdfReader(file_path)
writer = PdfWriter()
for page in reader.pages:
    writer.add_page(page)
writer.encrypt(password)

out = temp_output(".pdf")
with open(out, "wb") as f:
    writer.write(f)
print_result(out, "protected.pdf")
