import sys, os, re
from PIL import Image
import pytesseract
from pdf2image import convert_from_path
from openpyxl import Workbook
from utils import temp_output, print_result

file_path = sys.argv[1]
wb = Workbook()
ws = wb.active
ws.title = "OCR"
row_idx = 1

if file_path.lower().endswith(".pdf"):
    images = convert_from_path(file_path)
else:
    images = [Image.open(file_path)]

for img in images:
    text = pytesseract.image_to_string(img)
    for line in text.splitlines():
        cols = [c for c in re.split(r"\t+|\s{2,}", line.strip()) if c]
        if not cols:
            continue
        for col_idx, val in enumerate(cols, start=1):
            ws.cell(row=row_idx, column=col_idx, value=val)
        row_idx += 1

out = temp_output(".xlsx")
wb.save(out)
print_result(out, "ocr-output.xlsx")
