mergePDF,
splitPDF,
compressPDF,
pdfToWord,
wordToPDF,
pdfToJpg,
jpgToPDF,
rotatePDF,
addPdfWatermark,
removePdfPages
const { PDFDocument, degrees, rgb, StandardFonts } = require("pdf-lib");
const PDFKit = require("pdfkit");
const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");
const { Document, Packer, Paragraph } = require("docx");

function parsePageList(input, maxPages) {
  if (!input) return [];
  const parts = String(input).split(",");
  const pages = new Set();

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.includes("-")) {
      const [a, b] = trimmed.split("-").map(Number);
      if (!Number.isNaN(a) && !Number.isNaN(b)) {
        const start = Math.max(1, Math.min(a, b));
        const end = Math.min(maxPages, Math.max(a, b));
        for (let i = start; i <= end; i++) pages.add(i - 1);
      }
    } else {
      const n = Number(trimmed);
      if (!Number.isNaN(n) && n >= 1 && n <= maxPages) pages.add(n - 1);
    }
  }

  return [...pages].sort((a, b) => a - b);
}

exports.mergePDF = async (req, res) => {
  try {
    if (!req.files || req.files.length < 2) {
      return res.status(400).json({ success: false, message: "Upload at least 2 PDF files." });
    }

    const mergedPdf = await PDFDocument.create();

    for (const file of req.files) {
      const pdf = await PDFDocument.load(file.buffer);
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach((page) => mergedPdf.addPage(page));
    }

    const pdfBytes = await mergedPdf.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=merged.pdf");
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    res.status(500).json({ success: false, message: "Merge PDF failed", error: err.message });
  }
};

exports.splitPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Upload a PDF file." });
    }

    const pdf = await PDFDocument.load(req.file.buffer);
    const totalPages = pdf.getPageCount();
    const pagesToKeep = parsePageList(req.body.pages, totalPages);

    if (!pagesToKeep.length) {
      return res.status(400).json({
        success: false,
        message: "Provide pages like 1,3,5-7 in body.pages",
      });
    }

    const newPdf = await PDFDocument.create();
    const copied = await newPdf.copyPages(pdf, pagesToKeep);
    copied.forEach((page) => newPdf.addPage(page));

    const out = await newPdf.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=split.pdf");
    res.send(Buffer.from(out));
  } catch (err) {
    res.status(500).json({ success: false, message: "Split PDF failed", error: err.message });
  }
};

exports.compressPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Upload a PDF file." });
    }

    const pdf = await PDFDocument.load(req.file.buffer);
    const out = await pdf.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: 50,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=compressed.pdf");
    res.send(Buffer.from(out));
  } catch (err) {
    res.status(500).json({ success: false, message: "Compress PDF failed", error: err.message });
  }
};

exports.pdfToWord = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Upload a PDF file." });
    }

    const parsed = await pdfParse(req.file.buffer);
    const text = parsed.text || "";
    const paragraphs = text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => new Paragraph(line));

    const doc = new Document({
      sections: [{ properties: {}, children: paragraphs.length ? paragraphs : [new Paragraph("")] }],
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", "attachment; filename=converted.docx");
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: "PDF to Word failed", error: err.message });
  }
};

exports.wordToPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Upload a DOCX file." });
    }

    const result = await mammoth.extractRawText({ buffer: req.file.buffer });
    const text = result.value || "";

    const doc = new PDFKit({ margin: 40 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=converted.pdf");
      res.send(pdfBuffer);
    });

    doc.fontSize(12).text(text || "No text found in DOCX.", {
      width: 520,
      align: "left",
    });
    doc.end();
  } catch (err) {
    res.status(500).json({ success: false, message: "Word to PDF failed", error: err.message });
  }
};

exports.pdfToJpg = async (req, res) => {
  res.status(501).json({
    success: false,
    message:
      "PDF to JPG is not enabled in this lightweight backend. It needs a PDF raster engine such as Poppler or Ghostscript on the server.",
  });
};

exports.jpgToPDF = async (req, res) => {
  try {
    if (!req.files || !req.files.length) {
      return res.status(400).json({ success: false, message: "Upload one or more JPG images." });
    }

    const pdf = await PDFDocument.create();

    for (const file of req.files) {
      const jpg = await pdf.embedJpg(file.buffer);
      const page = pdf.addPage([jpg.width, jpg.height]);
      page.drawImage(jpg, {
        x: 0,
        y: 0,
        width: jpg.width,
        height: jpg.height,
      });
    }

    const bytes = await pdf.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=images.pdf");
    res.send(Buffer.from(bytes));
  } catch (err) {
    res.status(500).json({ success: false, message: "JPG to PDF failed", error: err.message });
  }
};

exports.rotatePDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Upload a PDF file." });
    }

    const angle = Number(req.body.angle || 90);
    const pdf = await PDFDocument.load(req.file.buffer);

    pdf.getPages().forEach((page) => {
      page.setRotation(degrees(angle));
    });

    const bytes = await pdf.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=rotated.pdf");
    res.send(Buffer.from(bytes));
  } catch (err) {
    res.status(500).json({ success: false, message: "Rotate PDF failed", error: err.message });
  }
};

exports.addPdfWatermark = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Upload a PDF file." });
    }

    const text = req.body.text || "WATERMARK";
    const pdf = await PDFDocument.load(req.file.buffer);
    const font = await pdf.embedFont(StandardFonts.Helvetica);

    for (const page of pdf.getPages()) {
      const { width, height } = page.getSize();
      page.drawText(text, {
        x: width / 5,
        y: height / 2,
        size: 40,
        font,
        rotate: degrees(45),
        color: rgb(0.75, 0.75, 0.75),
        opacity: 0.45,
      });
    }

    const bytes = await pdf.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=watermarked.pdf");
    res.send(Buffer.from(bytes));
  } catch (err) {
    res.status(500).json({ success: false, message: "PDF watermark failed", error: err.message });
  }
};

exports.removePdfPages = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Upload a PDF file." });
    }

    const pdf = await PDFDocument.load(req.file.buffer);
    const totalPages = pdf.getPageCount();
    const toRemove = new Set(parsePageList(req.body.pages, totalPages));

    if (!toRemove.size) {
      return res.status(400).json({
        success: false,
        message: "Provide body.pages like 2,4,6-8 to remove.",
      });
    }

    const newPdf = await PDFDocument.create();
    const keepIndexes = [];
    for (let i = 0; i < totalPages; i++) {
      if (!toRemove.has(i)) keepIndexes.push(i);
    }

    const copied = await newPdf.copyPages(pdf, keepIndexes);
    copied.forEach((page) => newPdf.addPage(page));

    const out = await newPdf.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=pages-removed.pdf");
    res.send(Buffer.from(out));
  } catch (err) {
    res.status(500).json({ success: false, message: "Remove PDF pages failed", error: err.message });
  }
};
