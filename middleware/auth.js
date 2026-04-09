const jwt = require("jsonwebtoken");

// Strict auth — blocks unauthenticated requests entirely
module.exports = function (req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Extract from "Bearer <token>"

  if (!token)
    return res.status(401).json({ error: "Access denied. Please log in." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "SECRET");
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token. Please log in again." });
  }
};
