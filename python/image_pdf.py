import sys, json
from PIL import Image
from utils import temp_output, print_result

files = json.loads(sys.argv[1])
images = []
for fp in files:
    img = Image.open(fp)
    if img.mode != "RGB":
        img = img.convert("RGB")
    images.append(img)

if not images:
    raise ValueError("No images supplied")

out = temp_output(".pdf")
first, rest = images[0], images[1:]
first.save(out, save_all=True, append_images=rest)
print_result(out, "images.pdf")
