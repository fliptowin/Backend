const express = require("express");
const router = express.Router();
const auth = require("../controllers/authController");
const { auth: authMiddleware } = require("../middleware/auth");

router.post("/signup", auth.signup);
router.post("/login", auth.login);
router.post("/forgot-password", auth.forgotPassword);
router.post("/verify-otp", auth.verifyOTP);
router.get("/status", authMiddleware, auth.checkUserStatus);

module.exports = router;
