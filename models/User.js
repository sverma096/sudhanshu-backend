const mongoose = require("mongoose");

module.exports = mongoose.model("User", {
  email: { type: String, required: true },
  password: { type: String, required: true }
});
