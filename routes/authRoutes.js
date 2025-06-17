const express = require("express");
const router = express.Router();
const auth = require("../controllers/authController");

router.post("/signup", auth.signup);
router.post("/login", auth.login);
router.post("/forgot-password", auth.forgotPassword);
router.post("/verify-otp", auth.verifyOTP);

module.exports = router;
