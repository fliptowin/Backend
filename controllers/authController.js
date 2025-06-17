const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendOTP } = require("../utils/sendOtp");

exports.signup = async (req, res) => {
  const { email, phone, password, confirmPassword, referralId } = req.body;
  if (password !== confirmPassword) return res.status(400).json({ msg: "Passwords do not match" });

  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ 
      email, 
      phone, 
      password: hashed,
      referralId: referralId || null 
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.status(201).json({ msg: "User created", token, userId: user.userId });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(409).json({ msg: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists` });
    }
    res.status(500).json({ msg: "Internal server error" });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ msg: "Invalid credentials" });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
  res.json({ token, userId: user.userId });
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ msg: "User not found" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.otp = otp;
  user.otpExpires = Date.now() + 10 * 60 * 1000;
  await user.save();

  await sendOTP(email, otp);
  res.json({ msg: "OTP sent to email" });
};

exports.verifyOTP = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const user = await User.findOne({ email });
  if (!user || user.otp !== otp || Date.now() > user.otpExpires)
    return res.status(400).json({ msg: "Invalid or expired OTP" });

  user.password = await bcrypt.hash(newPassword, 10);
  user.otp = null;
  user.otpExpires = null;
  await user.save();
  res.json({ msg: "Password updated" });
};
