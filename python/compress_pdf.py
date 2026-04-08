import sys
import fitz
from utils import temp_output, print_result

file_path = sys.argv[1]
doc = fitz.open(file_path)
out = temp_output(".pdf")
doc.save(out, garbage=4, deflate=True, clean=True)
print_result(out, "compressed.pdf")
