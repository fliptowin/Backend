const User = require('../models/User');
const TransactionRequest = require('../models/TransactionRequest');
const emailService = require('../utils/emailService');
const logger = require('../config/logger');
const fs = require('fs');
const path = require('path');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

exports.requestDeposit = async (req, res) => {
  try {
    const { userId, amount } = req.body;
    const paymentProof = req.file;

    if (!paymentProof) {
      return res.status(400).json({ msg: 'Payment screenshot is required' });
    }

    if (!amount || isNaN(Number(amount))) {
      return res.status(400).json({ msg: 'Valid amount is required' });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Save file to disk
    const fileExtension = path.extname(paymentProof.originalname);
    const fileName = `${userId}-${Date.now()}${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);
    
    // fs.writeFileSync(filePath, paymentProof.buffer);

    // Create transaction request record
    const transactionRequest = await TransactionRequest.create({
      userId: userId,
      type: "deposit",
      amount: Number(amount),
      status: "submitted",
      paymentProofPath: `uploads/${fileName}`    });

    // Send email notification to admin
    try {
      const adminEmail = process.env.EMAIL || process.env.EMAIL_USER;
      if (adminEmail) {
        await emailService.sendDepositNotification(adminEmail, {
          requestId: transactionRequest._id,
          userId,
          amount,
          utrNumber: 'N/A' // Add UTR if available
        });
      }
    } catch (emailError) {
      logger.warn('Failed to send deposit notification email:', emailError);
      // Don't fail the deposit request if email fails
    }

    res.json({ 
      msg: 'Deposit request submitted successfully',
      requestId: transactionRequest._id
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Get user's deposit history
exports.getUserDepositHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const deposits = await TransactionRequest.find({ 
      userId: userId,
      type: "deposit"
    }).sort({ createdAt: -1 });

    res.json(deposits);
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Admin: Get all deposit requests
exports.getAllDepositRequests = async (req, res) => {
  try {
    const { accessKey } = req.body;
    
    if (accessKey !== process.env.ADMIN_SECRET) {
      return res.status(410).json({ msg: 'Invalid access key' });
    }
    
    const { status } = req.query;
    const filter = { type: "deposit" };
    
    if (status) {
      filter.status = status;
    }
    
    const deposits = await TransactionRequest.find(filter)
      .sort({ createdAt: -1 });
      
    res.json(deposits);
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Admin: Get deposit requests for specific user
exports.getUserDepositsForAdmin = async (req, res) => {
  try {
    const { userId, accessKey } = req.body;
    const { status } = req.query;
    
    if (accessKey !== process.env.ADMIN_SECRET) {
      return res.status(410).json({ msg: 'Invalid access key' });
    }

    if (!userId) {
      return res.status(400).json({ msg: 'User ID is required' });
    }
    
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    const filter = {
      userId: userId,
      type: "deposit"
    };
    
    if (status && ["submitted", "processed", "rejected"].includes(status)) {
      filter.status = status;
    }
    
    const deposits = await TransactionRequest.find(filter).sort({ createdAt: -1 });
    
    res.json({
      deposits,
      user: {
        userId: user.userId,
        email: user.email,
        walletBalance: user.walletBalance,
        currentBalance: user.currentBalance,
        totalBalance: user.walletBalance + user.currentBalance
      }
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Admin: Process deposit request
exports.processDepositRequest = async (req, res) => {
  try {
    const { requestId, status, notes, accessKey } = req.body;
    
    if (accessKey !== process.env.ADMIN_SECRET) {
      return res.status(410).json({ msg: 'Invalid access key' });
    }
    
    if (!["processed", "rejected"].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status' });
    }
    
    const depositRequest = await TransactionRequest.findById(requestId);
    if (!depositRequest) {
      return res.status(404).json({ msg: 'Deposit request not found' });
    }
    
    if (depositRequest.status !== "submitted") {
      return res.status(400).json({ msg: 'Request already processed' });
    }
    
    // Update request status
    depositRequest.status = status;
    depositRequest.notes = notes;
    depositRequest.processedAt = new Date();
    
    await depositRequest.save();
    
    // Add funds if approved
    if (status === "processed") {
      const user = await User.findOne({ userId: depositRequest.userId });
      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }
      
      user.walletBalance += depositRequest.amount;
      await user.save();
    }
    
    res.json({ 
      msg: `Deposit request ${status === "processed" ? "approved" : "rejected"}`,
      depositRequest
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: 'Server error' });
  }
};