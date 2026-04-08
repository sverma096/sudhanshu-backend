import sys, json, os
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.colors import Color, black
from io import BytesIO
from pathlib import Path
from utils import temp_output, print_result, zip_files, parse_pages

def merge(file_list_json):
    files = json.loads(file_list_json)
    writer = PdfWriter()
    for fp in files:
        reader = PdfReader(fp)
        for page in reader.pages:
            writer.add_page(page)
    out = temp_output(".pdf")
    with open(out, "wb") as f:
        writer.write(f)
    print_result(out, "merged.pdf")

def split(file_path):
    reader = PdfReader(file_path)
    generated = []
    for i, page in enumerate(reader.pages, start=1):
        writer = PdfWriter()
        writer.add_page(page)
        out = temp_output(".pdf")
        with open(out, "wb") as f:
            writer.write(f)
        generated.append((out, f"page-{i}.pdf"))
    zip_path, zip_name = zip_files(generated, "split-pages.zip")
    print_result(zip_path, zip_name)

def extract(file_path, page_range):
    reader = PdfReader(file_path)
    pages = parse_pages(page_range, len(reader.pages))
    if not pages:
        raise ValueError("No valid pages in pageRange")
    writer = PdfWriter()
    for idx in pages:
        writer.add_page(reader.pages[idx])
    out = temp_output(".pdf")
    with open(out, "wb") as f:
        writer.write(f)
    print_result(out, "extracted-pages.pdf")

def delete(file_path, page_range):
    reader = PdfReader(file_path)
    to_delete = set(parse_pages(page_range, len(reader.pages)))
    writer = PdfWriter()
    for i, page in enumerate(reader.pages):
        if i not in to_delete:
            writer.add_page(page)
    out = temp_output(".pdf")
    with open(out, "wb") as f:
        writer.write(f)
    print_result(out, "pages-deleted.pdf")

def reorder(file_path, page_range):
    reader = PdfReader(file_path)
    order = parse_pages(page_range, len(reader.pages))
    if not order:
        raise ValueError("No valid pages in pageRange")
    writer = PdfWriter()
    for idx in order:
        writer.add_page(reader.pages[idx])
    out = temp_output(".pdf")
    with open(out, "wb") as f:
        writer.write(f)
    print_result(out, "reordered.pdf")

def rotate(file_path, rotation):
    reader = PdfReader(file_path)
    writer = PdfWriter()
    deg = int(rotation)
    for page in reader.pages:
        page.rotate(deg)
        writer.add_page(page)
    out = temp_output(".pdf")
    with open(out, "wb") as f:
        writer.write(f)
    print_result(out, "rotated.pdf")

def _make_overlay(text, width, height, page_no=None):
    packet = BytesIO()
    c = canvas.Canvas(packet, pagesize=(float(width), float(height)))
    if text:
        c.saveState()
        c.setFillColor(Color(0.85, 0.35, 0.05, alpha=0.18))
        c.setFont("Helvetica-Bold", 38)
        c.translate(width/4, height/2)
        c.rotate(35)
        c.drawString(0, 0, text)
        c.restoreState()
    if page_no is not None:
        c.setFillColor(black)
        c.setFont("Helvetica", 10)
        c.drawString(20, 20, f"Page {page_no}")
    c.save()
    packet.seek(0)
    return PdfReader(packet)

def watermark(file_path, text):
    reader = PdfReader(file_path)
    writer = PdfWriter()
    for page in reader.pages:
        overlay_reader = _make_overlay(text, float(page.mediabox.width), float(page.mediabox.height))
        overlay_page = overlay_reader.pages[0]
        page.merge_page(overlay_page)
        writer.add_page(page)
    out = temp_output(".pdf")
    with open(out, "wb") as f:
        writer.write(f)
    print_result(out, "watermarked.pdf")

def page_numbers(file_path):
    reader = PdfReader(file_path)
    writer = PdfWriter()
    for i, page in enumerate(reader.pages, start=1):
        overlay_reader = _make_overlay("", float(page.mediabox.width), float(page.mediabox.height), i)
        overlay_page = overlay_reader.pages[0]
        page.merge_page(overlay_page)
        writer.add_page(page)
    out = temp_output(".pdf")
    with open(out, "wb") as f:
        writer.write(f)
    print_result(out, "page-numbered.pdf")

if __name__ == "__main__":
    action = sys.argv[1]
    if action == "merge":
        merge(sys.argv[2])
    elif action == "split":
        split(sys.argv[2])
    elif action == "extract":
        extract(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "")
    elif action == "delete":
        delete(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "")
    elif action == "reorder":
        reorder(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "")
    elif action == "rotate":
        rotate(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "90")
    elif action == "watermark":
        watermark(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "CAHELPER")
    elif action == "page_numbers":
        page_numbers(sys.argv[2])
    else:
        raise ValueError("Unsupported action")
