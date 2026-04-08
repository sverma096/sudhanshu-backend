const mongoose = require("mongoose");

module.exports = mongoose.model("History", {
  userId: String,
  tool: String,
  date: { type: Date, default: Date.now }
});
