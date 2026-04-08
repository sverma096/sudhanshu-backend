import sys, json
from pypdf import PdfReader
from utils import temp_output, print_result

file_path = sys.argv[1]
reader = PdfReader(file_path)
meta = reader.metadata or {}

data = {
    "pages": len(reader.pages),
    "title": meta.get("/Title", ""),
    "author": meta.get("/Author", ""),
    "subject": meta.get("/Subject", ""),
    "creator": meta.get("/Creator", ""),
    "producer": meta.get("/Producer", "")
}

out = temp_output(".json")
with open(out, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)
print_result(out, "metadata.json")
