const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { execFile } = require("child_process");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const upload = multer({ dest: "temp/" });
const uploadMany = upload.array("files", 20);

function safeUnlink(filePath) {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (e) {}
}

function cleanupUploaded(req) {
  if (req.file) safeUnlink(req.file.path);
  if (req.files && Array.isArray(req.files)) {
    req.files.forEach((f) => safeUnlink(f.path));
  }
}

function runPython(scriptName, args, res, cleanupFiles = []) {
  const scriptPath = path.join(__dirname, "python", scriptName);
  execFile("python3", [scriptPath, ...args], (error, stdout, stderr) => {
    if (error) {
      cleanupFiles.forEach(safeUnlink);
      return res.status(500).send(stderr || error.message || "Processing failed");
    }

    let meta = {};
    try {
      meta = JSON.parse(stdout || "{}");
    } catch (e) {
      cleanupFiles.forEach(safeUnlink);
      return res.status(500).send("Invalid processor output");
    }

    const outputPath = meta.output_path;
    const downloadName = meta.download_name || path.basename(outputPath || "output.bin");
    if (!outputPath || !fs.existsSync(outputPath)) {
      cleanupFiles.forEach(safeUnlink);
      return res.status(500).send("Output file not created");
    }

    res.download(outputPath, downloadName, () => {
      safeUnlink(outputPath);
      cleanupFiles.forEach(safeUnlink);
    });
  });
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    app: "CAHELPER backend",
    status: "running",
    implemented_routes: [
      "/merge", "/split", "/extract", "/delete-pages", "/reorder", "/rotate",
      "/watermark", "/page-numbers", "/image-to-pdf", "/jpg-to-pdf",
      "/pdf-to-word", "/pdf-to-excel", "/pdf-to-text", "/ocr-word",
      "/ocr-excel", "/ocr-text", "/compress", "/grayscale", "/protect",
      "/unlock", "/word-count", "/metadata", "/pdf-to-jpg", "/thumbnails",
      "/blank"
    ]
  });
});

app.post("/merge", uploadMany, (req, res) => {
  if (!req.files || req.files.length < 2) return res.status(400).send("Upload at least 2 files");
  runPython("pdf_ops.py", ["merge", JSON.stringify(req.files.map(f => f.path))], res, req.files.map(f => f.path));
});

app.post("/split", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("Upload a PDF file");
  runPython("pdf_ops.py", ["split", req.file.path], res, [req.file.path]);
});

app.post("/extract", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("Upload a PDF file");
  const pageRange = req.body.pageRange || "";
  runPython("pdf_ops.py", ["extract", req.file.path, pageRange], res, [req.file.path]);
});

app.post("/delete-pages", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("Upload a PDF file");
  const pageRange = req.body.pageRange || "";
  runPython("pdf_ops.py", ["delete", req.file.path, pageRange], res, [req.file.path]);
});

app.post("/reorder", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("Upload a PDF file");
  const pageRange = req.body.pageRange || "";
  runPython("pdf_ops.py", ["reorder", req.file.path, pageRange], res, [req.file.path]);
});

app.post("/rotate", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("Upload a PDF file");
  const rotation = req.body.rotation || "90";
  runPython("pdf_ops.py", ["rotate", req.file.path, rotation], res, [req.file.path]);
});

app.post("/watermark", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("Upload a PDF file");
  const text = req.body.watermarkText || "CAHELPER";
  runPython("pdf_ops.py", ["watermark", req.file.path, text], res, [req.file.path]);
});

app.post("/page-numbers", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("Upload a PDF file");
  runPython("pdf_ops.py", ["page_numbers", req.file.path], res, [req.file.path]);
});

app.post("/image-to-pdf", uploadMany, (req, res) => {
  if (!req.files || !req.files.length) return res.status(400).send("Upload one or more images");
  runPython("image_pdf.py", [JSON.stringify(req.files.map(f => f.path))], res, req.files.map(f => f.path));
});

app.post("/jpg-to-pdf", uploadMany, (req, res) => {
  if (!req.files || !req.files.length) return res.status(400).send("Upload one or more JPG files");
  runPython("image_pdf.py", [JSON.stringify(req.files.map(f => f.path))], res, req.files.map(f => f.path));
});

app.post("/pdf-to-word", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("Upload a PDF file");
  runPython("pdf_to_word.py", [req.file.path], res, [req.file.path]);
});

app.post("/pdf-to-excel", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("Upload a PDF file");
  runPython("pdf_to_excel.py", [req.file.path], res, [req.file.path]);
});

app.post("/pdf-to-text", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("Upload a PDF file");
  runPython("pdf_to_text.py", [req.file.path], res, [req.file.path]);
});

app.post("/ocr-word", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("Upload a file");
  runPython("ocr_to_word.py", [req.file.path], res, [req.file.path]);
});

app.post("/ocr-excel", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("Upload a file");
  runPython("ocr_to_excel.py", [req.file.path], res, [req.file.path]);
});

app.post("/ocr-text", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("Upload a file");
  runPython("ocr_to_text.py", [req.file.path], res, [req.file.path]);
});

app.post("/compress", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("Upload a PDF file");
  runPython("compress_pdf.py", [req.file.path], res, [req.file.path]);
});

app.post("/grayscale", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("Upload a PDF file");
  runPython("grayscale_pdf.py", [req.file.path], res, [req.file.path]);
});

app.post("/protect", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("Upload a PDF file");
  const password = req.body.password || "1234";
  runPython("protect_pdf.py", [req.file.path, password], res, [req.file.path]);
});

app.post("/unlock", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("Upload a PDF file");
  const password = req.body.password || "";
  runPython("unlock_pdf.py", [req.file.path, password], res, [req.file.path]);
});

app.post("/word-count", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("Upload a file");
  runPython("word_count.py", [req.file.path], res, [req.file.path]);
});

app.post("/metadata", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("Upload a PDF file");
  runPython("metadata_pdf.py", [req.file.path], res, [req.file.path]);
});

app.post("/pdf-to-jpg", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("Upload a PDF file");
  runPython("pdf_to_jpg.py", [req.file.path], res, [req.file.path]);
});

app.post("/thumbnails", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("Upload a PDF file");
  runPython("pdf_to_jpg.py", [req.file.path, "--thumbs"], res, [req.file.path]);
});

app.post("/blank", (req, res) => {
  runPython("blank_pdf.py", [], res, []);
});

// Placeholder routes for tools that need more UI/params or heavier engines.
[
  "/pdf-to-ppt", "/crop", "/resize", "/redact", "/sign", "/flatten",
  "/compare", "/html-to-pdf", "/markdown-to-pdf", "/zip-to-pdf"
].forEach((route) => {
  app.post(route, uploadMany, (req, res) => {
    cleanupUploaded(req);
    res.status(501).send("Route scaffolded but not yet implemented in this starter backend.");
  });
});

app.use((err, req, res, next) => {
  cleanupUploaded(req);
  res.status(500).send(err.message || "Server error");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`CAHELPER backend running on port ${PORT}`);
});
