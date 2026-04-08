import os
import json
import tempfile
import zipfile
from pathlib import Path

TEMP_DIR = Path("/app/temp") if Path("/app/temp").exists() else Path("temp")
TEMP_DIR.mkdir(exist_ok=True)

def temp_output(suffix):
    fd, path = tempfile.mkstemp(suffix=suffix, dir=str(TEMP_DIR))
    os.close(fd)
    return path

def print_result(output_path, download_name=None):
    print(json.dumps({
        "output_path": output_path,
        "download_name": download_name or os.path.basename(output_path)
    }))

def zip_files(file_paths, zip_name="output.zip"):
    zip_path = temp_output(".zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
      for file_path, arc_name in file_paths:
        zf.write(file_path, arc_name)
    return zip_path, zip_name

def parse_pages(range_str, page_count):
    if not range_str:
        return []
    result = []
    seen = set()
    for part in range_str.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            a, b = part.split("-", 1)
            try:
                a = int(a.strip())
                b = int(b.strip())
            except:
                continue
            start = min(a, b)
            end = max(a, b)
            for n in range(start, end + 1):
                idx = n - 1
                if 0 <= idx < page_count and idx not in seen:
                    seen.add(idx)
                    result.append(idx)
        else:
            try:
                n = int(part)
                idx = n - 1
                if 0 <= idx < page_count and idx not in seen:
                    seen.add(idx)
                    result.append(idx)
            except:
                continue
    return result
