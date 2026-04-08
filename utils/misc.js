compressFile,
renameFile,
extractZip,
convertFile,
encodeBase64
const AdmZip = require("adm-zip");
const zlib = require("zlib");

exports.compressFile = async (req, res) => {
  try {
    const gz = zlib.gzipSync(req.file.buffer);

    res.setHeader("Content-Type", "application/gzip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${req.file.originalname || "file"}.gz`
    );
    res.send(gz);
  } catch (err) {
    res.status(500).json({ success: false, message: "Compress file failed", error: err.message });
  }
};

exports.renameFile = async (req, res) => {
  try {
    const newName = req.body.newName || `renamed_${req.file.originalname || "file"}`;

    res.setHeader("Content-Type", req.file.mimetype || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${newName}"`);
    res.send(req.file.buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: "Rename file failed", error: err.message });
  }
};

exports.extractZip = async (req, res) => {
  try {
    const zip = new AdmZip(req.file.buffer);
    const entries = zip.getEntries().map((entry) => ({
      name: entry.entryName,
      size: entry.header.size,
      isDirectory: entry.isDirectory,
    }));

    res.json({
      success: true,
      files: entries,
      note: "This endpoint lists ZIP contents. Returning all extracted files directly is better handled with server storage or a second download step.",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Extract ZIP failed", error: err.message });
  }
};

exports.convertFile = async (req, res) => {
  try {
    res.status(501).json({
      success: false,
      message:
        "Generic file converter is not implemented because conversion depends on source and target formats. Build dedicated converters instead.",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Convert file failed", error: err.message });
  }
};

exports.encodeBase64 = async (req, res) => {
  try {
    const base64 = req.file.buffer.toString("base64");
    res.json({
      success: true,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      base64,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Base64 encode failed", error: err.message });
  }
};
