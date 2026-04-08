import sys
import fitz
from utils import temp_output, print_result, zip_files

file_path = sys.argv[1]
thumb_mode = len(sys.argv) > 2 and sys.argv[2] == "--thumbs"

doc = fitz.open(file_path)
generated = []
for i, page in enumerate(doc, start=1):
    matrix = fitz.Matrix(1.0, 1.0) if thumb_mode else fitz.Matrix(2.0, 2.0)
    pix = page.get_pixmap(matrix=matrix, alpha=False)
    img_path = temp_output(".jpg")
    pix.save(img_path)
    generated.append((img_path, f"page-{i}.jpg"))

zip_path, zip_name = zip_files(generated, "thumbnails.zip" if thumb_mode else "pdf-to-jpg.zip")
print_result(zip_path, zip_name)
