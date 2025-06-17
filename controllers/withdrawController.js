const User = require("../models/User");
const TransactionRequest = require("../models/TransactionRequest");
const emailService = require('../utils/emailService');
const logger = require('../config/logger');

exports.requestWithdraw = async (req, res) => {
  try {
    const { 
      userId,
      name,
      bankName,
      ifscCode,
      accountNumber,
      confirmAccountNumber,
      withdrawalAmount,
      upiId 
    } = req.body;

    // Validate required fields
    if (!userId || !withdrawalAmount || !name) {
      return res.status(400).json({ msg: 'User ID, name, and withdrawal amount are required' });
    }

    // Either bank details or UPI ID is required
    if (!upiId && (!bankName || !ifscCode || !accountNumber)) {
      return res.status(400).json({ msg: 'Either bank details or UPI ID is required' });
    }

    // Validate account numbers match if provided
    if (accountNumber && confirmAccountNumber && accountNumber !== confirmAccountNumber) {
      return res.status(400).json({ msg: 'Account numbers do not match' });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const totalBalance = user.walletBalance + user.currentBalance;
    const withdrawAmount = Number(withdrawalAmount);
    
    if (withdrawAmount <= 0) {
      return res.status(400).json({ msg: 'Withdrawal amount must be greater than 0' });
    }
    
    if (withdrawAmount > totalBalance) {
      return res.status(400).json({ msg: 'Insufficient balance' });
    }

    // Create transaction request
    const transactionRequest = await TransactionRequest.create({
      userId,
      type: "withdrawal",
      amount: withdrawAmount,
      status: "submitted",
      bankDetails: {
        name,
        bankName,
        ifscCode,
        accountNumber: accountNumber || "N/A"
      },
      upiId    });

    // Send email notification to admin
    try {
      const adminEmail = process.env.EMAIL || process.env.EMAIL_USER;
      if (adminEmail) {
        await emailService.sendWithdrawalNotification(adminEmail, {
          requestId: transactionRequest._id,
          userId,
          amount: withdrawAmount,
          upiId
        });
      }
    } catch (emailError) {
      logger.warn('Failed to send withdrawal notification email:', emailError);
      // Don't fail the withdrawal request if email fails
    }

    res.json({ 
      msg: 'Withdrawal request submitted successfully',
      requestId: transactionRequest._id
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Get user's withdrawal history
exports.getUserWithdrawalHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const withdrawals = await TransactionRequest.find({ 
      userId: userId,
      type: "withdrawal"
    }).sort({ createdAt: -1 });

    res.json(withdrawals);
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Admin: Get all withdrawal requests
exports.getAllWithdrawalRequests = async (req, res) => {
  try {
    const { accessKey } = req.body;
    
    if (accessKey !== process.env.ADMIN_SECRET) {
      return res.status(410).json({ msg: 'Invalid access key' });
    }
    
    const { status } = req.query;
    const filter = { type: "withdrawal" };
    
    if (status) {
      filter.status = status;
    }
    
    const withdrawals = await TransactionRequest.find(filter)
      .sort({ createdAt: -1 });
      
    res.json(withdrawals);
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Admin: Process withdrawal request
exports.processWithdrawalRequest = async (req, res) => {
  try {
    const { requestId, status, notes, accessKey } = req.body;
    
    if (accessKey !== process.env.ADMIN_SECRET) {
      return res.status(410).json({ msg: 'Invalid access key' });
    }
    
    if (!["processed", "rejected"].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status' });
    }
    
    const withdrawalRequest = await TransactionRequest.findById(requestId);
    if (!withdrawalRequest) {
      return res.status(404).json({ msg: 'Withdrawal request not found' });
    }
    
    if (withdrawalRequest.status !== "submitted") {
      return res.status(400).json({ msg: 'Request already processed' });
    }
    
    // Update request status
    withdrawalRequest.status = status;
    withdrawalRequest.notes = notes;
    withdrawalRequest.processedAt = new Date();
    
    await withdrawalRequest.save();
    
    // Deduct funds if approved
    if (status === "processed") {
      const user = await User.findOne({ userId: withdrawalRequest.userId });
      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }
      
      // Calculate how to reduce from wallet and current balance
      const totalNeeded = withdrawalRequest.amount;
      const walletBalance = user.walletBalance;
      
      if (walletBalance >= totalNeeded) {
        user.walletBalance -= totalNeeded;
      } else {
        user.currentBalance -= (totalNeeded - walletBalance);
        user.walletBalance = 0;
      }
      
      await user.save();
    }
    
    res.json({ 
      msg: `Withdrawal request ${status === "processed" ? "approved" : "rejected"}`,
      withdrawalRequest
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Admin: Get withdrawal requests for specific user
exports.getUserWithdrawalsForAdmin = async (req, res) => {
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
      type: "withdrawal"
    };
    
    if (status && ["submitted", "processed", "rejected"].includes(status)) {
      filter.status = status;
    }
    
    const withdrawals = await TransactionRequest.find(filter).sort({ createdAt: -1 });
    
    res.json({
      withdrawals,
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