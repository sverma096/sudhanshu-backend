const router = require("express").Router();
const multer = require("multer");
const auth = require("../middleware/auth");
const optionalAuth = require("../middleware/optionalAuth");
const History = require("../models/History");
 
const storage = multer.memoryStorage();
 
// ─────────────────────────────────────────────
// FILE SIZE LIMITS
// ─────────────────────────────────────────────
const FREE_LIMIT_MB = 25;        // Guest users: up to 25MB free
const AUTH_LIMIT_MB = 100;       // Logged-in users: up to 100MB
 
const uploadFree = multer({ storage, limits: { fileSize: FREE_LIMIT_MB * 1024 * 1024 } });
const uploadAuth = multer({ storage, limits: { fileSize: AUTH_LIMIT_MB * 1024 * 1024 } });
 
// ─────────────────────────────────────────────
// MIDDLEWARE: Gate large files behind login
// ─────────────────────────────────────────────
function fileSizeGate(req, res, next) {
  const files = req.files || (req.file ? [req.file] : []);
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const totalMB = totalSize / (1024 * 1024);
 
  if (totalMB > FREE_LIMIT_MB && !req.user) {
    return res.status(401).json({
      error: `Files above ${FREE_LIMIT_MB}MB require a free account. Please create an account or sign in to continue.`,
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
    return res.status(413).json({
      error: `File too large. Maximum size is ${req.user ? AUTH_LIMIT_MB : FREE_LIMIT_MB}MB.`,
    });
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
  if (!userId) return; // Guests don't get history
  try {
    await History.create({ userId, tool });
  } catch (err) {
    console.error("History save failed:", err.message);
  }
}
 
// ─────────────────────────────────────────────
// ROUTE WRAPPER
// Saves history only for logged-in users, handles errors globally
// ─────────────────────────────────────────────
function withHistory(toolName, handler) {
  return async (req, res, next) => {
    try {
      if (req.user) await saveHistory(req.user.id, toolName);
      return handler(req, res, next);
    } catch (err) {
      console.error(`${toolName} route error:`, err);
      return res.status(500).json({
        success: false,
        message: `${toolName} failed`,
        error: err.message,
      });
    }
  };
}
 
// ─────────────────────────────────────────────
// HELPER: Build a free route (single file)
// optionalAuth → upload → fileSizeGate → tool
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
 
// ─────────────────────────────────────────────
// HELPER: Build an auth-required route
// auth → upload (high limit) → tool
// ─────────────────────────────────────────────
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
   📄 PDF TOOLS (10)
   All free up to 10MB, login required above 10MB
============================================================= */
 
router.post("/merge-pdf",          ...freeRouteArray("Merge PDF", mergePDF));
router.post("/split-pdf",          ...freeRoute("Split PDF", splitPDF));
router.post("/compress-pdf",       ...freeRoute("Compress PDF", compressPDF));
router.post("/pdf-to-word",        ...freeRoute("PDF to Word", pdfToWord));
router.post("/word-to-pdf",        ...freeRoute("Word to PDF", wordToPDF));
router.post("/pdf-to-jpg",         ...freeRoute("PDF to JPG", pdfToJpg));
router.post("/jpg-to-pdf",         ...freeRouteArray("JPG to PDF", jpgToPDF));
router.post("/rotate-pdf",         ...freeRoute("Rotate PDF", rotatePDF));
router.post("/pdf-watermark",      ...freeRoute("Add PDF Watermark", addPdfWatermark));
router.post("/remove-pdf-pages",   ...freeRoute("Remove PDF Pages", removePdfPages));
 
/* =============================================================
   🖼 IMAGE TOOLS (8)
============================================================= */
 
router.post("/resize-image",       ...freeRoute("Resize Image", resizeImage));
router.post("/compress-image",     ...freeRoute("Compress Image", compressImage));
router.post("/jpg-to-png",         ...freeRoute("JPG to PNG", jpgToPng));
router.post("/png-to-jpg",         ...freeRoute("PNG to JPG", pngToJpg));
router.post("/crop-image",         ...freeRoute("Crop Image", cropImage));
router.post("/rotate-image",       ...freeRoute("Rotate Image", rotateImage));
router.post("/image-watermark",    ...freeRoute("Add Image Watermark", addImageWatermark));
router.post("/image-to-pdf",       ...freeRouteArray("Image to PDF", imageToPDF));
 
/* =============================================================
   📊 EXCEL TOOLS (7)
============================================================= */
 
router.post("/excel-to-json",          ...freeRoute("Excel to JSON", excelToJson));
router.post("/json-to-excel",          ...freeRoute("JSON to Excel", jsonToExcel));
router.post("/csv-to-excel",           ...freeRoute("CSV to Excel", csvToExcel));
router.post("/excel-remove-duplicates",...freeRoute("Excel Remove Duplicates", removeDuplicatesExcel));
router.post("/excel-split-sheets",     ...freeRoute("Excel Split Sheets", splitSheets));
router.post("/excel-merge-sheets",     ...freeRouteArray("Excel Merge Sheets", mergeSheets));
router.post("/excel-ai",               ...authRoute("AI Excel Analyzer", analyzeExcel)); // AI = always auth
 
/* =============================================================
   🤖 AI TOOLS (5) — Always require login (expensive operations)
============================================================= */
 
router.post("/ocr",                ...authRoute("OCR", runOCR));
router.post("/summarize-text",     ...authRoute("Summarize Text", summarizeText));
router.post("/extract-invoice",    ...authRoute("Extract Invoice Data", extractInvoiceData));
router.post("/parse-resume",       ...authRoute("Parse Resume", parseResume));
router.post("/extract-image-text", ...authRoute("Extract Image Text", extractTextFromImage));
 
/* =============================================================
   🔧 UTILITY TOOLS (5)
============================================================= */
 
router.post("/compress-file",  ...freeRoute("Compress File", compressFile));
router.post("/rename-file",    ...freeRoute("Rename File", renameFile));
router.post("/extract-zip",    ...freeRoute("Extract ZIP", extractZip));
router.post("/convert-file",   ...freeRoute("Convert File", convertFile));
router.post("/base64",         ...freeRoute("Base64 Encoder", encodeBase64));
 
module.exports = router;
 
