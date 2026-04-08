# CAHELPER Backend

This backend is ready to deploy on Render as a Docker web service.

## What works in this starter backend
- Merge PDF
- Split PDF
- Extract Pages
- Delete Pages
- Reorder Pages
- Rotate PDF
- Add Watermark
- Add Page Numbers
- Image/JPG to PDF
- PDF to Word
- PDF to Excel
- PDF to Text
- OCR to Word
- OCR to Excel
- OCR to Text
- Compress PDF
- Grayscale PDF
- Protect PDF
- Unlock PDF
- Word Count
- Metadata
- PDF to JPG / Thumbnails
- Blank PDF

## Scaffolded but not fully implemented
These routes return 501 for now:
- /pdf-to-ppt
- /crop
- /resize
- /redact
- /sign
- /flatten
- /compare
- /html-to-pdf
- /markdown-to-pdf
- /zip-to-pdf

## Deploy on Render
1. Push all files to a GitHub repo.
2. In Render, create a new Web Service.
3. Choose Docker as the runtime.
4. Connect the repo and deploy.
5. Use the Render URL in your frontend if frontend and backend are separate.

## Notes
- Files are stored only in `/app/temp` during processing.
- Outputs and uploads are deleted after each response.
