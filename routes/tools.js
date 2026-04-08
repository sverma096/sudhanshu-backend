const router = require("express").Router();
const multer = require("multer");
const upload = multer();

const auth = require("../middleware/auth");
const History = require("../models/History");

const { mergePDF } = require("../utils/pdf");
const { runOCR } = require("../utils/ocr");

// Save history wrapper
async function saveHistory(userId, tool) {
  await History.create({ userId, tool });
}

router.post("/merge-pdf", auth, upload.array("files"), async (req, res) => {
  await saveHistory(req.user.id, "Merge PDF");
  mergePDF(req, res);
});

router.post("/ocr", auth, upload.single("file"), async (req, res) => {
  await saveHistory(req.user.id, "OCR");
  runOCR(req, res);
});

module.exports = router;
