runOCR,
summarizeText,
extractInvoiceData,
parseResume,
extractTextFromImage
const Tesseract = require("tesseract.js");
const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");

async function extractTextFromUploadedFile(file) {
  if (!file) return "";

  const type = file.mimetype || "";

  if (type.includes("pdf")) {
    const parsed = await pdfParse(file.buffer);
    return parsed.text || "";
  }

  if (
    type.includes("wordprocessingml") ||
    type.includes("application/msword") ||
    file.originalname.toLowerCase().endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value || "";
  }

  if (type.startsWith("image/")) {
    const result = await Tesseract.recognize(file.buffer, "eng");
    return result.data.text || "";
  }

  return file.buffer.toString("utf8");
}

exports.runOCR = async (req, res) => {
  try {
    const result = await Tesseract.recognize(req.file.buffer, "eng");
    res.json({ success: true, text: result.data.text || "" });
  } catch (err) {
    res.status(500).json({ success: false, message: "OCR failed", error: err.message });
  }
};

exports.summarizeText = async (req, res) => {
  try {
    const text = await extractTextFromUploadedFile(req.file);
    const clean = text.replace(/\s+/g, " ").trim();

    if (!clean) {
      return res.json({ success: true, summary: "No readable text found." });
    }

    const sentences = clean
      .split(/(?<=[.!?])\s+/)
      .filter(Boolean);

    const summary = sentences.slice(0, 5).join(" ");
    res.json({
      success: true,
      summary,
      note: "This is a lightweight extractive summary based on the first few sentences.",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Summarize text failed", error: err.message });
  }
};

exports.extractInvoiceData = async (req, res) => {
  try {
    const text = await extractTextFromUploadedFile(req.file);

    const invoiceNumber =
      text.match(/invoice\s*(no|number)?[:#]?\s*([A-Z0-9\-\/]+)/i)?.[2] || null;

    const date =
      text.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/)?.[1] || null;

    const total =
      text.match(/\b(total|grand total|amount due)\b[^0-9]*([0-9,]+(?:\.\d{1,2})?)/i)?.[2] || null;

    res.json({
      success: true,
      extracted: {
        invoiceNumber,
        date,
        total,
      },
      rawTextPreview: text.slice(0, 1000),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Extract invoice data failed",
      error: err.message,
    });
  }
};

exports.parseResume = async (req, res) => {
  try {
    const text = await extractTextFromUploadedFile(req.file);

    const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || null;
    const phone = text.match(/(\+?\d[\d\s\-()]{7,}\d)/)?.[0] || null;

    const lines = text.split("\n").map((x) => x.trim()).filter(Boolean);
    const name = lines[0] || null;

    res.json({
      success: true,
      parsed: {
        name,
        email,
        phone,
        textPreview: text.slice(0, 1500),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Parse resume failed", error: err.message });
  }
};

exports.extractTextFromImage = async (req, res) => {
  try {
    const result = await Tesseract.recognize(req.file.buffer, "eng");
    res.json({
      success: true,
      text: result.data.text || "",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Extract image text failed",
      error: err.message,
    });
  }
};
