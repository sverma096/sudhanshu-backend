import sys
import fitz
from utils import temp_output, print_result, zip_files

file_path = sys.argv[1]
doc = fitz.open(file_path)
generated = []
for i, page in enumerate(doc, start=1):
    pix = page.get_pixmap(colorspace=fitz.csGRAY, alpha=False)
    img_path = temp_output(".png")
    pix.save(img_path)
    generated.append((img_path, f"page-{i}.png"))
zip_path, zip_name = zip_files(generated, "grayscale-pages.zip")
print_result(zip_path, zip_name)
