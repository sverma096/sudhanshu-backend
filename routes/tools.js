const router = require("express").Router();
const multer = require("multer");
const auth = require("../middleware/auth");
const optionalAuth = require("../middleware/optionalAuth");
const History = require("../models/History");

const storage = multer.memoryStorage();

// ─────────────────────────────────────────────
// FILE SIZE LIMITS
// ─────────────────────────────────────────────
const FREE_LIMIT_MB = 25;       // Guests: free up to 25MB
const AUTH_LIMIT_MB = 100;      // Logged-in users: up to 100MB

const uploadFree = multer({ storage, limits: { fileSize: FREE_LIMIT_MB * 1024 * 1024 } });
const uploadAuth = multer({ storage, limits: { fileSize: AUTH_LIMIT_MB * 1024 * 1024 } });

// ─────────────────────────────────────────────
// MIDDLEWARE: Block large files for guests
// ─────────────────────────────────────────────
function fileSizeGate(req, res, next) {
  const files = req.files || (req.file ? [req.file] : []);
  const totalMB = files.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024);

  if (totalMB > FREE_LIMIT_MB && !req.user) {
    return res.status(401).json({
      error: `Files above ${FREE_LIMIT_MB}MB require a free account. Please create an account or sign in.`,
      requiresLogin: true,
    });
  }
  next();
}

// ─────────────────────────────────────────────
// MULTER ERROR HANDLER
// ─────────────────────────────────────────────
function handleMulterError(err, req, res, next) {
  if (err && err.code === "LIMIT_FILE_SIZE") {
    const limit = req.user ? AUTH_LIMIT_MB : FREE_LIMIT_MB;
    return res.status(413).json({ error: `File too large. Maximum allowed size is ${limit}MB.` });
  }
  next(err);
}

// ─────────────────────────────────────────────
// TOOL IMPORTS
// ─────────────────────────────────────────────
const { mergePDF, splitPDF, compressPDF, pdfToWord, wordToPDF, pdfToJpg, jpgToPDF, rotatePDF, addPdfWatermark, removePdfPages } = require("../utils/pdf");
const { resizeImage, compressImage, jpgToPng, pngToJpg, cropImage, rotateImage, addImageWatermark, imageToPDF } = require("../utils/image");
const { excelToJson, jsonToExcel, csvToExcel, removeDuplicatesExcel, splitSheets, mergeSheets, analyzeExcel } = require("../utils/excel");
const { runOCR, summarizeText, extractInvoiceData, parseResume, extractTextFromImage } = require("../utils/ai");
const { compressFile, renameFile, extractZip, convertFile, encodeBase64 } = require("../utils/misc");

// ─────────────────────────────────────────────
// HISTORY HELPER
// ─────────────────────────────────────────────
async function saveHistory(userId, tool) {
  if (!userId) return; // Skip for guests
  try {
    await History.create({ userId, tool });
  } catch (err) {
    console.error("History save failed:", err.message);
  }
}

// ─────────────────────────────────────────────
// ROUTE WRAPPER — saves history + catches errors
// ─────────────────────────────────────────────
function withHistory(toolName, handler) {
  return async (req, res, next) => {
    try {
      if (req.user) await saveHistory(req.user.id, toolName);
      return handler(req, res, next);
    } catch (err) {
      console.error(`${toolName} error:`, err);
      return res.status(500).json({ error: `${toolName} failed. Please try again.` });
    }
  };
}

// ─────────────────────────────────────────────
// ROUTE BUILDERS
// Free tools: optionalAuth → upload (25MB) → fileSizeGate → handler
// Auth tools: auth → upload (100MB) → handler
// ─────────────────────────────────────────────
function freeRoute(toolName, handler) {
  return [
    optionalAuth,
    (req, res, next) => uploadFree.single("file")(req, res, (err) => {
      if (err) return handleMulterError(err, req, res, next);
      next();
    }),
    fileSizeGate,
    withHistory(toolName, handler),
  ];
}

function freeRouteArray(toolName, handler) {
  return [
    optionalAuth,
    (req, res, next) => uploadFree.array("files", 20)(req, res, (err) => {
      if (err) return handleMulterError(err, req, res, next);
      next();
    }),
    fileSizeGate,
    withHistory(toolName, handler),
  ];
}

function authRoute(toolName, handler) {
  return [
    auth,
    (req, res, next) => uploadAuth.single("file")(req, res, (err) => {
      if (err) return handleMulterError(err, req, res, next);
      next();
    }),
    withHistory(toolName, handler),
  ];
}

function authRouteArray(toolName, handler) {
  return [
    auth,
    (req, res, next) => uploadAuth.array("files", 20)(req, res, (err) => {
      if (err) return handleMulterError(err, req, res, next);
      next();
    }),
    withHistory(toolName, handler),
  ];
}

/* =============================================================
   📄 PDF TOOLS — Free up to 25MB, login required above 25MB
============================================================= */
router.post("/merge-pdf",           ...freeRouteArray("Merge PDF", mergePDF));
router.post("/split-pdf",           ...freeRoute("Split PDF", splitPDF));
router.post("/compress-pdf",        ...freeRoute("Compress PDF", compressPDF));
router.post("/pdf-to-word",         ...freeRoute("PDF to Word", pdfToWord));
router.post("/word-to-pdf",         ...freeRoute("Word to PDF", wordToPDF));
router.post("/pdf-to-jpg",          ...freeRoute("PDF to JPG", pdfToJpg));
router.post("/jpg-to-pdf",          ...freeRouteArray("JPG to PDF", jpgToPDF));
router.post("/rotate-pdf",          ...freeRoute("Rotate PDF", rotatePDF));
router.post("/pdf-watermark",       ...freeRoute("Watermark PDF", addPdfWatermark));
router.post("/remove-pdf-pages",    ...freeRoute("Remove PDF Pages", removePdfPages));

/* =============================================================
   🖼 IMAGE TOOLS — Free up to 25MB, login required above 25MB
============================================================= */
router.post("/resize-image",        ...freeRoute("Resize Image", resizeImage));
router.post("/compress-image",      ...freeRoute("Compress Image", compressImage));
router.post("/jpg-to-png",          ...freeRoute("JPG to PNG", jpgToPng));
router.post("/png-to-jpg",          ...freeRoute("PNG to JPG", pngToJpg));
router.post("/crop-image",          ...freeRoute("Crop Image", cropImage));
router.post("/rotate-image",        ...freeRoute("Rotate Image", rotateImage));
router.post("/image-watermark",     ...freeRoute("Watermark Image", addImageWatermark));
router.post("/image-to-pdf",        ...freeRouteArray("Image to PDF", imageToPDF));

/* =============================================================
   📊 EXCEL TOOLS — Free up to 25MB, login required above 25MB
   Exception: AI Excel Analyzer always requires login
============================================================= */
router.post("/excel-to-json",           ...freeRoute("Excel to JSON", excelToJson));
router.post("/json-to-excel",           ...freeRoute("JSON to Excel", jsonToExcel));
router.post("/csv-to-excel",            ...freeRoute("CSV to Excel", csvToExcel));
router.post("/excel-remove-duplicates", ...freeRoute("Remove Duplicates", removeDuplicatesExcel));
router.post("/excel-split-sheets",      ...freeRoute("Split Sheets", splitSheets));
router.post("/excel-merge-sheets",      ...freeRouteArray("Merge Sheets", mergeSheets));
router.post("/excel-ai",                ...authRoute("AI Excel Analyzer", analyzeExcel));

/* =============================================================
   🤖 AI TOOLS — Always require login (server-side AI processing)
============================================================= */
router.post("/ocr",                 ...authRoute("OCR", runOCR));
router.post("/summarize-text",      ...authRoute("Summarize Text", summarizeText));
router.post("/extract-invoice",     ...authRoute("Invoice Extractor", extractInvoiceData));
router.post("/parse-resume",        ...authRoute("Resume Parser", parseResume));
router.post("/extract-image-text",  ...authRoute("Image to Text", extractTextFromImage));

/* =============================================================
   🔧 UTILITY TOOLS — Free up to 25MB, login required above 25MB
============================================================= */
router.post("/compress-file",       ...freeRoute("Compress File", compressFile));
router.post("/rename-file",         ...freeRoute("Rename File", renameFile));
router.post("/extract-zip",         ...freeRoute("Extract ZIP", extractZip));
router.post("/convert-file",        ...freeRoute("Convert File", convertFile));
router.post("/base64",              ...freeRoute("Base64 Encoder", encodeBase64));

module.exports = router;
 
