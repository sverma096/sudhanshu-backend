const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.status(401).send("Access denied");

  try {
    const decoded = jwt.verify(token, "SECRET");
    req.user = decoded;
    next();
  } catch {
    res.status(400).send("Invalid token");
  }
};
