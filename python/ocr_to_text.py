import sys, os
from PIL import Image
import pytesseract
from pdf2image import convert_from_path
from utils import temp_output, print_result

file_path = sys.argv[1]
text_parts = []

if file_path.lower().endswith(".pdf"):
    images = convert_from_path(file_path)
else:
    images = [Image.open(file_path)]

for img in images:
    text_parts.append(pytesseract.image_to_string(img))

out = temp_output(".txt")
with open(out, "w", encoding="utf-8") as f:
    f.write("\n\n".join(text_parts))
print_result(out, "ocr-output.txt")
