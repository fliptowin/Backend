const User = require('../models/User');
const TransactionRequest = require('../models/TransactionRequest');

/**
 * Get all users with optional filtering
 * Admin can filter by email, phone, userId, or no filter to get all users
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { accessKey } = req.body;
    const { email, phone, userId, sort } = req.query;
    
    // Validate admin access key
    if (accessKey !== process.env.ADMIN_SECRET) {
      return res.status(410).json({ msg: 'Invalid access key' });
    }

    // Build filter object
    const filter = {};
    if (email) filter.email = { $regex: email, $options: 'i' }; // Case-insensitive search
    if (phone) filter.phone = { $regex: phone, $options: 'i' };
    if (userId) filter.userId = userId;

    // Build sort options
    const sortOption = {};
    if (sort === 'balance-high') {
      sortOption.walletBalance = -1;
    } else if (sort === 'balance-low') {
      sortOption.walletBalance = 1;
    } else if (sort === 'recent') {
      sortOption.createdAt = -1;
    } else if (sort === 'oldest') {
      sortOption.createdAt = 1;
    } else {
      // Default sort by userId
      sortOption.userId = 1;
    }
    
    // Get users with selected fields (exclude password and sensitive info)
    const users = await User.find(filter)
      .select('userId email phone walletBalance currentBalance createdAt')
      .sort(sortOption);
    
    // Calculate total users and total balance
    const totalUsers = users.length;
    const totalBalance = users.reduce((acc, user) => {
      return acc + user.walletBalance + user.currentBalance;
    }, 0);

    res.json({
      totalUsers,
      totalBalance,
      users
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * Get detailed user information with transaction history
 * Admin can get detailed info about a specific user
 */
exports.getUserDetails = async (req, res) => {
  try {
    const { accessKey } = req.body;
    const { userId } = req.params;
    
    // Validate admin access key
    if (accessKey !== process.env.ADMIN_SECRET) {
      return res.status(410).json({ msg: 'Invalid access key' });
    }

    if (!userId) {
      return res.status(400).json({ msg: 'User ID is required' });
    }

    // Get user details
    const user = await User.findOne({ userId }).select('-password');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Get user's transaction history
    const transactions = await TransactionRequest.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      user,
      transactions,
      stats: {
        totalBalance: user.walletBalance + user.currentBalance,
        pendingRequests: transactions.filter(t => t.status === 'submitted').length
      }
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * Get system stats
 * Admin can get overall system statistics
 */
exports.getSystemStats = async (req, res) => {
  try {
    const { accessKey } = req.body;
    
    // Validate admin access key
    if (accessKey !== process.env.ADMIN_SECRET) {
      return res.status(410).json({ msg: 'Invalid access key' });
    }

    // Get counts
    const totalUsers = await User.countDocuments({});
    const pendingDeposits = await TransactionRequest.countDocuments({ 
      type: 'deposit',
      status: 'submitted'
    });
    const pendingWithdrawals = await TransactionRequest.countDocuments({ 
      type: 'withdrawal',
      status: 'submitted'
    });
    
    // Get total balance across all users
    const balanceStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalWalletBalance: { $sum: '$walletBalance' },
          totalCurrentBalance: { $sum: '$currentBalance' }
        }
      }
    ]);
    
    const totalWalletBalance = balanceStats[0]?.totalWalletBalance || 0;
    const totalCurrentBalance = balanceStats[0]?.totalCurrentBalance || 0;

    res.json({
      userStats: {
        totalUsers
      },
      transactionStats: {
        pendingDeposits,
        pendingWithdrawals
      },
      balanceStats: {
        totalWalletBalance,
        totalCurrentBalance,
        totalBalance: totalWalletBalance + totalCurrentBalance
      }
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * Change user password by admin
 * Admin can change any user's password using admin access key
 */
exports.changeUserPassword = async (req, res) => {
  try {
    const { accessKey, userId, password, confirmPassword } = req.body;
    
    // Validate admin access key
    if (accessKey !== process.env.ADMIN_SECRET) {
      return res.status(410).json({ msg: 'Invalid access key' });
    }

    // Validate passwords
    if (!password || !confirmPassword) {
      return res.status(400).json({ msg: 'Password and confirm password are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ msg: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ msg: 'Password must be at least 6 characters long' });
    }

    // Find user by userId
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Hash the new password and update
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    user.password = hashedPassword;
    await user.save();

    res.json({
      msg: 'Password updated successfully',
      userId: user.userId,
      email: user.email
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: 'Server error' });
  }
};
