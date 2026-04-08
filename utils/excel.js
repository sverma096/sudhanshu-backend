excelToJson,
jsonToExcel,
csvToExcel,
removeDuplicatesExcel,
splitSheets,
mergeSheets,
analyzeExcel
const XLSX = require("xlsx");

function sendWorkbook(res, wb, filename) {
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
  res.send(buffer);
}

exports.excelToJson = async (req, res) => {
  try {
    const wb = XLSX.read(req.file.buffer, { type: "buffer" });
    const out = {};

    wb.SheetNames.forEach((name) => {
      out[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: "" });
    });

    res.json({ success: true, data: out });
  } catch (err) {
    res.status(500).json({ success: false, message: "Excel to JSON failed", error: err.message });
  }
};

exports.jsonToExcel = async (req, res) => {
  try {
    const text = req.file.buffer.toString("utf8");
    const data = JSON.parse(text);

    const rows = Array.isArray(data) ? data : data.data || [];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

    sendWorkbook(res, wb, "json-to-excel.xlsx");
  } catch (err) {
    res.status(500).json({ success: false, message: "JSON to Excel failed", error: err.message });
  }
};

exports.csvToExcel = async (req, res) => {
  try {
    const csv = req.file.buffer.toString("utf8");
    const wb = XLSX.read(csv, { type: "string" });
    sendWorkbook(res, wb, "csv-to-excel.xlsx");
  } catch (err) {
    res.status(500).json({ success: false, message: "CSV to Excel failed", error: err.message });
  }
};

exports.removeDuplicatesExcel = async (req, res) => {
  try {
    const wb = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = wb.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" });

    const seen = new Set();
    const uniqueRows = rows.filter((row) => {
      const key = JSON.stringify(row);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const outWb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(uniqueRows);
    XLSX.utils.book_append_sheet(outWb, ws, "Unique");

    sendWorkbook(res, outWb, "duplicates-removed.xlsx");
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Remove duplicates failed",
      error: err.message,
    });
  }
};

exports.splitSheets = async (req, res) => {
  try {
    const wb = XLSX.read(req.file.buffer, { type: "buffer" });
    const sourceSheet = wb.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sourceSheet], { defval: "" });

    const column = req.body.column;
    if (!column) {
      return res.status(400).json({
        success: false,
        message: "Provide body.column to split sheets by a column name.",
      });
    }

    const grouped = {};
    for (const row of rows) {
      const key = String(row[column] ?? "Blank");
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    }

    const outWb = XLSX.utils.book_new();
    Object.entries(grouped).forEach(([key, data]) => {
      const safeName = key.slice(0, 31) || "Sheet";
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(outWb, ws, safeName);
    });

    sendWorkbook(res, outWb, "split-sheets.xlsx");
  } catch (err) {
    res.status(500).json({ success: false, message: "Split sheets failed", error: err.message });
  }
};

exports.mergeSheets = async (req, res) => {
  try {
    if (!req.files || !req.files.length) {
      return res.status(400).json({ success: false, message: "Upload Excel files to merge." });
    }

    const mergedRows = [];

    for (const file of req.files) {
      const wb = XLSX.read(file.buffer, { type: "buffer" });
      const firstSheet = wb.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[firstSheet], { defval: "" });
      mergedRows.push(...rows);
    }

    const outWb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(mergedRows);
    XLSX.utils.book_append_sheet(outWb, ws, "Merged");

    sendWorkbook(res, outWb, "merged-sheets.xlsx");
  } catch (err) {
    res.status(500).json({ success: false, message: "Merge sheets failed", error: err.message });
  }
};

exports.analyzeExcel = async (req, res) => {
  try {
    const wb = XLSX.read(req.file.buffer, { type: "buffer" });
    const firstSheet = wb.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[firstSheet], { defval: "" });

    let numericCellCount = 0;
    let total = 0;
    let min = Infinity;
    let max = -Infinity;

    for (const row of rows) {
      for (const value of Object.values(row)) {
        if (typeof value === "number" && Number.isFinite(value)) {
          numericCellCount++;
          total += value;
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      }
    }

    res.json({
      success: true,
      rows: rows.length,
      columns: rows[0] ? Object.keys(rows[0]).length : 0,
      numericCellCount,
      total,
      average: numericCellCount ? total / numericCellCount : 0,
      min: numericCellCount ? min : null,
      max: numericCellCount ? max : null,
      insight:
        rows.length > 0
          ? "File processed successfully. This is a basic numeric analysis of the first worksheet."
          : "Workbook was empty or had no data rows.",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "AI Excel failed", error: err.message });
  }
};
