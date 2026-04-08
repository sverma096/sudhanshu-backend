const { PDFDocument } = require("pdf-lib");

exports.mergePDF = async (req, res) => {
  const mergedPdf = await PDFDocument.create();

  for (const file of req.files) {
    const pdf = await PDFDocument.load(file.buffer);
    const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    pages.forEach((page) => mergedPdf.addPage(page));
  }

  const pdfBytes = await mergedPdf.save();

  res.setHeader("Content-Type", "application/pdf");
  res.send(pdfBytes);
};
