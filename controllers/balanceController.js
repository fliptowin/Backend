const User = require('../models/User');

exports.getBalance = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findOne({ userId });
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json({
      walletBalance: user.walletBalance,
      currentBalance: user.currentBalance
    });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.takeout = async (req, res) => {
  const { userId } = req.body;

  try {
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Update balances
    user.walletBalance += user.currentBalance;
    user.currentBalance = 0;
    
    await user.save();

    res.json({
      walletBalance: user.walletBalance,
      currentBalance: user.currentBalance,
      totalBalance: user.walletBalance + user.currentBalance
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.updateBalance = async (req, res) => {
  const { userId, amount, accessKey } = req.body;

  try {
    if (accessKey !== process.env.ADMIN_SECRET) {
      return res.status(410).json({ msg: 'Invalid access key' });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    user.walletBalance += Number(amount);
    await user.save();

    res.json({
      walletBalance: user.walletBalance,
      currentBalance: user.currentBalance,
      totalBalance: user.walletBalance + user.currentBalance
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: 'Server error' });
  }
};