const mongoose = require("mongoose");

const transactionRequestSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ["deposit", "withdrawal"],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ["submitted", "processed", "rejected"],
    default: "submitted"
  },
  bankDetails: {
    name: String,
    bankName: String,
    ifscCode: String,
    accountNumber: String
  },
  upiId: String,
  paymentProofPath: String,
  processedBy: String,
  processedAt: Date,
  notes: String
}, {
  timestamps: true
});

module.exports = mongoose.model("TransactionRequest", transactionRequestSchema);
