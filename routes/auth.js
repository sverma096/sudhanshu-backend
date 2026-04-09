
Copy

const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
 
const JWT_SECRET = process.env.JWT_SECRET || "SECRET"; // Use env var in production!
 
// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
 
    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required." });
 
    if (password.length < 6)
      return res.status(400).json({ error: "Password must be at least 6 characters." });
 
    const existing = await User.findOne({ email });
    if (existing)
      return res.status(409).json({ error: "Email already registered." });
 
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hash });
 
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });
 
    // ✅ Never return password hash
    res.status(201).json({ token, email: user.email });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});
 
// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
 
    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required." });
 
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ error: "No account found with this email." });
 
    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(400).json({ error: "Incorrect password." });
 
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });
 
    res.json({ token, email: user.email });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});
 
module.exports = router;
 
