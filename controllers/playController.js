const User = require('../models/User');
const gameRound = require('../utils/gameRound');
const logger = require('../config/logger');
const config = require('../config/config');
const crypto = require('crypto');

exports.play = async (req, res) => {
  const startTime = Date.now();
  const { userId, face, amount } = req.body;

  try {
    // Capture the round ID at the very beginning of request processing
    // This ensures we use the same round ID throughout the entire function
    const currentRoundId = gameRound.getCurrentRoundId();
    
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
    }
    
    // Check if betting is currently allowed (not in the 2-second lock period)
    if (!gameRound.isBettingAllowed()) {
      return res.status(400).json({
        success: false,
        msg: 'Betting is locked for this round. Please wait for the next round.'
      });
    }
    
    // Get the deterministic result for this round (same for all users)
    // Using the round ID we captured at the beginning
    const coinFlip = gameRound.getRoundResult(currentRoundId);
    
    // Determine if user won based on their face selection
    const userWon = (face === coinFlip);
      // Determine if user's face choice matches final coin flip
    const faceMatch = (coinFlip === face);

    // Update balances based on game result
    if (userWon) {
      // Win: Add winnings to current balance
      const winnings = amount;
      user.currentBalance += winnings;
    } else {
      // Lose: Deduct from wallet balance directly, keep current balance unchanged
      user.walletBalance -= amount;
      user.currentBalance = 0;
      
      // Ensure wallet balance doesn't go negative
      if (user.walletBalance < 0) {
        return res.status(400).json({ 
          success: false,
          msg: 'Insufficient wallet balance for this bet' 
        });
      }
    }    // Double-check total balance consistency
    const finalTotalBalance = user.currentBalance + user.walletBalance;
    if (finalTotalBalance < 0) {
      return res.status(400).json({ 
        success: false,
        msg: 'Balance calculation error' 
      });
    }

    // No need to track game history anymore as requested
    const actualGameResult = userWon ? 'win' : 'lose';
    
    // Save user data
    await user.save();    // Log game event for monitoring
    if (logger) {
      logger.info('Game played', {
        userId,
        roundId: currentRoundId,
        userChoice: face,
        roundOutcome: coinFlip,
        result: actualGameResult,
        amount,
        balanceChangeType: userWon ? 'currentBalance' : 'walletBalance',
        balanceChange: userWon ? amount : -amount,
        newCurrentBalance: user.currentBalance,
        newWalletBalance: user.walletBalance,
        duration: Date.now() - startTime
      });
    }

    // Get next round information for client synchronization
    const nextRoundStartTime = gameRound.getNextRoundStartTime();

    // Return clean response with next game timing information
    res.json({
      success: true,
      result: userWon ? 'win' : 'lose',
      coinFlip,
      faceMatch,
      currentBalance: user.currentBalance,
      walletBalance: user.walletBalance,
      totalBalance: user.currentBalance + user.walletBalance,
      nextGame: {
        currentRoundId,
        nextRoundStartTime,
        roundDuration: gameRound.ROUND_DURATION_MS,
        lockTime: gameRound.BETTING_LOCK_MS,
        serverTime: Date.now()
      }
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