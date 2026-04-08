resizeImage,
compressImage,
jpgToPng,
pngToJpg,
cropImage,
rotateImage,
addImageWatermark,
imageToPDF
const sharp = require("sharp");
const { PDFDocument } = require("pdf-lib");

exports.resizeImage = async (req, res) => {
  try {
    const width = Number(req.body.width || 300);
    const height = Number(req.body.height || 300);

    const buffer = await sharp(req.file.buffer)
      .resize(width, height, { fit: "contain" })
      .png()
      .toBuffer();

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", "attachment; filename=resized.png");
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: "Resize image failed", error: err.message });
  }
};

exports.compressImage = async (req, res) => {
  try {
    const quality = Number(req.body.quality || 70);
    const buffer = await sharp(req.file.buffer).jpeg({ quality }).toBuffer();

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Content-Disposition", "attachment; filename=compressed.jpg");
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: "Compress image failed", error: err.message });
  }
};

exports.jpgToPng = async (req, res) => {
  try {
    const buffer = await sharp(req.file.buffer).png().toBuffer();
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", "attachment; filename=converted.png");
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: "JPG to PNG failed", error: err.message });
  }
};

exports.pngToJpg = async (req, res) => {
  try {
    const quality = Number(req.body.quality || 90);
    const buffer = await sharp(req.file.buffer)
      .flatten({ background: "#ffffff" })
      .jpeg({ quality })
      .toBuffer();

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Content-Disposition", "attachment; filename=converted.jpg");
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: "PNG to JPG failed", error: err.message });
  }
};

exports.cropImage = async (req, res) => {
  try {
    const left = Number(req.body.left || 0);
    const top = Number(req.body.top || 0);
    const width = Number(req.body.width || 200);
    const height = Number(req.body.height || 200);

    const buffer = await sharp(req.file.buffer)
      .extract({ left, top, width, height })
      .png()
      .toBuffer();

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", "attachment; filename=cropped.png");
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: "Crop image failed", error: err.message });
  }
};

exports.rotateImage = async (req, res) => {
  try {
    const angle = Number(req.body.angle || 90);
    const buffer = await sharp(req.file.buffer).rotate(angle).png().toBuffer();

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", "attachment; filename=rotated.png");
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: "Rotate image failed", error: err.message });
  }
};

exports.addImageWatermark = async (req, res) => {
  try {
    const text = req.body.text || "WATERMARK";
    const meta = await sharp(req.file.buffer).metadata();

    const svg = `
      <svg width="${meta.width}" height="${meta.height}">
        <text x="50%" y="50%"
              font-size="48"
              fill="rgba(255,255,255,0.45)"
              text-anchor="middle"
              transform="rotate(-30, ${meta.width / 2}, ${meta.height / 2})"
              font-family="Arial, sans-serif">
          ${text}
        </text>
      </svg>
    `;

    const buffer = await sharp(req.file.buffer)
      .composite([{ input: Buffer.from(svg), gravity: "center" }])
      .png()
      .toBuffer();

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", "attachment; filename=watermarked.png");
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: "Image watermark failed", error: err.message });
  }
};

exports.imageToPDF = async (req, res) => {
  try {
    if (!req.files || !req.files.length) {
      return res.status(400).json({ success: false, message: "Upload one or more images." });
    }

    const pdf = await PDFDocument.create();

    for (const file of req.files) {
      const isPng = file.mimetype === "image/png";
      const embedded = isPng
        ? await pdf.embedPng(file.buffer)
        : await pdf.embedJpg(file.buffer);

      const page = pdf.addPage([embedded.width, embedded.height]);
      page.drawImage(embedded, {
        x: 0,
        y: 0,
        width: embedded.width,
        height: embedded.height,
      });
    }

    const bytes = await pdf.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=images.pdf");
    res.send(Buffer.from(bytes));
  } catch (err) {
    res.status(500).json({ success: false, message: "Image to PDF failed", error: err.message });
  }
};
