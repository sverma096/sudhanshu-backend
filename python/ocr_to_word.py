import sys, os
from PIL import Image
import pytesseract
from pdf2image import convert_from_path
from docx import Document
from utils import temp_output, print_result

file_path = sys.argv[1]
doc = Document()

if file_path.lower().endswith(".pdf"):
    images = convert_from_path(file_path)
else:
    images = [Image.open(file_path)]

for img in images:
    text = pytesseract.image_to_string(img)
    for para in text.split("\n"):
        doc.add_paragraph(para)

out = temp_output(".docx")
doc.save(out)
print_result(out, "ocr-output.docx")
