const mongoose = require("mongoose");
const ShortUniqueId = require('short-unique-id');

const uid = new ShortUniqueId({ length: 6 });


const userSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    default: () => uid.rnd().toUpperCase(),
    unique: true,
    uppercase: true
  },
  email: { 
    type: String, 
    unique: true 
  },
  phone: { 
    type: String, 
    unique: true 
  },
  password: String,
  referralId: {
    type: String,
    default: null
  },
  walletBalance: {
    type: Number,
    default: 0
  },
  currentBalance: {
    type: Number,
    default: 0
  },
  otp: String,
  otpExpires: Date,
}, {
  timestamps: true
});

module.exports = mongoose.model("User", userSchema);