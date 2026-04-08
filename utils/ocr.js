const Tesseract = require("tesseract.js");

exports.runOCR = async (req, res) => {
  const result = await Tesseract.recognize(req.file.buffer, "eng");
  res.json({ text: result.data.text });
};
