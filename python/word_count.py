import sys
from pathlib import Path
import pdfplumber
from PIL import Image
import pytesseract
from pdf2image import convert_from_path
from utils import temp_output, print_result

file_path = sys.argv[1]
ext = Path(file_path).suffix.lower()
text = ""

if ext == ".pdf":
    with pdfplumber.open(file_path) as pdf:
        text = "\n".join((page.extract_text() or "") for page in pdf.pages)
elif ext in [".png", ".jpg", ".jpeg", ".tiff", ".bmp"]:
    text = pytesseract.image_to_string(Image.open(file_path))
else:
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        text = f.read()

words = [w for w in text.split() if w.strip()]
chars = len(text)

out = temp_output(".txt")
with open(out, "w", encoding="utf-8") as f:
    f.write(f"Words: {len(words)}\nCharacters: {chars}\n")
print_result(out, "word-count.txt")
