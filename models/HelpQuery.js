const mongoose = require("mongoose");

const helpQuerySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  isOpened: {
    type: Boolean,
    default: false
  },
  adminNotes: {
    type: String,
    default: ""
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("HelpQuery", helpQuerySchema);
