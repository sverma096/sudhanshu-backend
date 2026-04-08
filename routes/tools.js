const router = require("express").Router();
const multer = require("multer");
const auth = require("../middleware/auth");
const History = require("../models/History");

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
  },
});

// PDF tools
const {
  mergePDF,
  splitPDF,
  compressPDF,
  pdfToWord,
  wordToPDF,
  pdfToJpg,
  jpgToPDF,
  rotatePDF,
  addPdfWatermark,
  removePdfPages,
} = require("../utils/pdf");

// Image tools
const {
  resizeImage,
  compressImage,
  jpgToPng,
  pngToJpg,
  cropImage,
  rotateImage,
  addImageWatermark,
  imageToPDF,
} = require("../utils/image");

// Excel tools
const {
  excelToJson,
  jsonToExcel,
  csvToExcel,
  removeDuplicatesExcel,
  splitSheets,
  mergeSheets,
  analyzeExcel,
} = require("../utils/excel");

// AI tools
const {
  runOCR,
  summarizeText,
  extractInvoiceData,
  parseResume,
  extractTextFromImage,
} = require("../utils/ai");

// Utility tools
const {
  compressFile,
  renameFile,
  extractZip,
  convertFile,
  encodeBase64,
} = require("../utils/misc");

async function saveHistory(userId, tool) {
  try {
    await History.create({ userId, tool });
  } catch (err) {
    console.error("History save failed:", err.message);
  }
}

function withHistory(toolName, handler) {
  return async (req, res, next) => {
    try {
      await saveHistory(req.user.id, toolName);
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

/* =========================
   PDF TOOLS (10)
========================= */

// 1. Merge PDF
router.post(
  "/merge-pdf",
  auth,
  upload.array("files", 20),
  withHistory("Merge PDF", mergePDF)
);

// 2. Split PDF
router.post(
  "/split-pdf",
  auth,
  upload.single("file"),
  withHistory("Split PDF", splitPDF)
);

// 3. Compress PDF
router.post(
  "/compress-pdf",
  auth,
  upload.single("file"),
  withHistory("Compress PDF", compressPDF)
);

// 4. PDF to Word
router.post(
  "/pdf-to-word",
  auth,
  upload.single("file"),
  withHistory("PDF to Word", pdfToWord)
);

// 5. Word to PDF
router.post(
  "/word-to-pdf",
  auth,
  upload.single("file"),
  withHistory("Word to PDF", wordToPDF)
);

// 6. PDF to JPG
router.post(
  "/pdf-to-jpg",
  auth,
  upload.single("file"),
  withHistory("PDF to JPG", pdfToJpg)
);

// 7. JPG to PDF
router.post(
  "/jpg-to-pdf",
  auth,
  upload.array("files", 20),
  withHistory("JPG to PDF", jpgToPDF)
);

// 8. Rotate PDF
router.post(
  "/rotate-pdf",
  auth,
  upload.single("file"),
  withHistory("Rotate PDF", rotatePDF)
);

// 9. Add PDF Watermark
router.post(
  "/pdf-watermark",
  auth,
  upload.single("file"),
  withHistory("Add PDF Watermark", addPdfWatermark)
);

// 10. Remove PDF Pages
router.post(
  "/remove-pdf-pages",
  auth,
  upload.single("file"),
  withHistory("Remove PDF Pages", removePdfPages)
);

/* =========================
   IMAGE TOOLS (8)
========================= */

// 11. Resize Image
router.post(
  "/resize-image",
  auth,
  upload.single("file"),
  withHistory("Resize Image", resizeImage)
);

// 12. Compress Image
router.post(
  "/compress-image",
  auth,
  upload.single("file"),
  withHistory("Compress Image", compressImage)
);

// 13. JPG to PNG
router.post(
  "/jpg-to-png",
  auth,
  upload.single("file"),
  withHistory("JPG to PNG", jpgToPng)
);

// 14. PNG to JPG
router.post(
  "/png-to-jpg",
  auth,
  upload.single("file"),
  withHistory("PNG to JPG", pngToJpg)
);

// 15. Crop Image
router.post(
  "/crop-image",
  auth,
  upload.single("file"),
  withHistory("Crop Image", cropImage)
);

// 16. Rotate Image
router.post(
  "/rotate-image",
  auth,
  upload.single("file"),
  withHistory("Rotate Image", rotateImage)
);

// 17. Add Image Watermark
router.post(
  "/image-watermark",
  auth,
  upload.single("file"),
  withHistory("Add Image Watermark", addImageWatermark)
);

// 18. Image to PDF
router.post(
  "/image-to-pdf",
  auth,
  upload.array("files", 20),
  withHistory("Image to PDF", imageToPDF)
);

/* =========================
   EXCEL TOOLS (7)
========================= */

// 19. Excel to JSON
router.post(
  "/excel-to-json",
  auth,
  upload.single("file"),
  withHistory("Excel to JSON", excelToJson)
);

// 20. JSON to Excel
router.post(
  "/json-to-excel",
  auth,
  upload.single("file"),
  withHistory("JSON to Excel", jsonToExcel)
);

// 21. CSV to Excel
router.post(
  "/csv-to-excel",
  auth,
  upload.single("file"),
  withHistory("CSV to Excel", csvToExcel)
);

// 22. Remove Duplicates from Excel
router.post(
  "/excel-remove-duplicates",
  auth,
  upload.single("file"),
  withHistory("Excel Remove Duplicates", removeDuplicatesExcel)
);

// 23. Split Sheets
router.post(
  "/excel-split-sheets",
  auth,
  upload.single("file"),
  withHistory("Excel Split Sheets", splitSheets)
);

// 24. Merge Sheets
router.post(
  "/excel-merge-sheets",
  auth,
  upload.array("files", 20),
  withHistory("Excel Merge Sheets", mergeSheets)
);

// 25. AI Excel Analyzer
router.post(
  "/excel-ai",
  auth,
  upload.single("file"),
  withHistory("AI Excel Analyzer", analyzeExcel)
);

/* =========================
   AI TOOLS (5)
========================= */

// 26. OCR
router.post(
  "/ocr",
  auth,
  upload.single("file"),
  withHistory("OCR", runOCR)
);

// 27. Text Summarizer
router.post(
  "/summarize-text",
  auth,
  upload.single("file"),
  withHistory("Summarize Text", summarizeText)
);

// 28. Invoice Data Extractor
router.post(
  "/extract-invoice",
  auth,
  upload.single("file"),
  withHistory("Extract Invoice Data", extractInvoiceData)
);

// 29. Resume Parser
router.post(
  "/parse-resume",
  auth,
  upload.single("file"),
  withHistory("Parse Resume", parseResume)
);

// 30. Image Text Extractor
router.post(
  "/extract-image-text",
  auth,
  upload.single("file"),
  withHistory("Extract Image Text", extractTextFromImage)
);

/* =========================
   UTILITY TOOLS (5)
========================= */

// 31. File Compressor
router.post(
  "/compress-file",
  auth,
  upload.single("file"),
  withHistory("Compress File", compressFile)
);

// 32. Rename File
router.post(
  "/rename-file",
  auth,
  upload.single("file"),
  withHistory("Rename File", renameFile)
);

// 33. ZIP Extractor
router.post(
  "/extract-zip",
  auth,
  upload.single("file"),
  withHistory("Extract ZIP", extractZip)
);

// 34. General File Converter
router.post(
  "/convert-file",
  auth,
  upload.single("file"),
  withHistory("Convert File", convertFile)
);

// 35. Base64 Encoder
router.post(
  "/base64",
  auth,
  upload.single("file"),
  withHistory("Base64 Encoder", encodeBase64)
);

module.exports = router;
