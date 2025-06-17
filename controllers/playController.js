const User = require('../models/User');
const gameState = require('../utils/gameState');
const logger = require('../config/logger');
const config = require('../config/config');

exports.play = async (req, res) => {
  const startTime = Date.now();
  const { userId, face, amount } = req.body;

  try {
    // Enhanced input validation
    if (!userId || !face || amount === undefined) {
      return res.status(400).json({ 
        success: false,
        msg: 'Missing required fields' 
      });
    }

    if (!['head', 'tail'].includes(face)) {
      return res.status(400).json({ 
        success: false,
        msg: 'Invalid face selection' 
      });
    }

    if (typeof amount !== 'number' || amount <= 0 || amount > (config.game?.maxBetAmount || 10000)) {
      return res.status(400).json({ 
        success: false,
        msg: `Invalid bet amount` 
      });
    }

    // Use lean query for better performance
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        msg: 'User not found' 
      });
    }

    const totalBalance = user.walletBalance + user.currentBalance;
    if (totalBalance < amount) {
      return res.status(400).json({ 
        success: false,
        msg: 'Insufficient balance' 
      });
    }    // Validate and fix any data corruption before processing
    gameState.validateAndFixUser(userId);

    // Get the predetermined game result (enforces our 5W/7L ratio)
    const gameResult = gameState.getRandomResult(userId);
    
    // CRITICAL: The pattern determines the outcome, not the coin flip
    // We manipulate the coin flip to match the desired outcome for realism
    const userWon = (gameResult === 'win');
    
    let coinFlip;
    if (userWon) {
      // If user should win, make sure coin matches their choice
      coinFlip = face;
    } else {
      // If user should lose, make coin opposite of their choice
      coinFlip = (face === 'head') ? 'tail' : 'head';
      
      // Add some randomness - occasionally let them guess right but still lose
      // This adds realism without breaking the ratio (very small chance)
      const entropy = Math.random();
      if (entropy < 0.05) { // 5% chance
        coinFlip = face; // They guessed right but still lose (house always wins sometimes)
      }
    }
    
    // Determine if user's face choice matches final coin flip
    const faceMatch = (coinFlip === face);    // Update balances efficiently
    const balanceChange = userWon ? amount : -amount;
    user.currentBalance += balanceChange;

    // Ensure balance doesn't go negative
    if ((user.currentBalance + user.walletBalance) < 0) {
      return res.status(400).json({ 
        success: false,
        msg: 'Bet amount would exceed total balance' 
      });
    }

    // Update game history with actual result (should always match pattern now)
    const actualGameResult = userWon ? 'win' : 'lose';
    
    if (!user.gameHistory) {
      user.gameHistory = [];
    }
    
    if (user.gameHistory.length >= 12) {
      user.gameHistory.shift();
    }
    user.gameHistory.push(actualGameResult);    // Add result to user-specific game state for pattern tracking
    gameState.addResult(userId, actualGameResult);
    
    // Save user data
    await user.save();

    // Log game event for monitoring
    if (logger) {
      logger.info('Game played', {
        userId,
        result: actualGameResult,
        amount,
        balanceChange,
        newBalance: user.currentBalance,
        duration: Date.now() - startTime
      });
    }

    // Return clean response
    res.json({
      success: true,
      result: userWon ? 'win' : 'lose',
      coinFlip,
      faceMatch,
      currentBalance: user.currentBalance,
      walletBalance: user.walletBalance,
      totalBalance: user.currentBalance + user.walletBalance
    });

  } catch (error) {
    if (logger) {
      logger.error('Play controller error', {
        userId,
        error: error.message,
        duration: Date.now() - startTime
      });
    }
    
    res.status(500).json({ 
      success: false,
      msg: 'Internal server error' 
    });
  }
};