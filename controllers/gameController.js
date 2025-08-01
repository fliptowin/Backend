const gameRound = require('../utils/gameRound');

/**
 * Provides the client with essential timing information to synchronize their game clocks.
 * Uses absolute timestamps to overcome network latency issues.
 */
exports.getRoundStatus = (req, res) => {
  const currentRoundId = gameRound.getCurrentRoundId();
  const nextRoundStartTime = gameRound.getNextRoundStartTime();
  
  res.json({
    success: true,
    currentRoundId,
    nextRoundStartTime,
    roundDuration: gameRound.ROUND_DURATION_MS,
    lockTime: gameRound.BETTING_LOCK_MS,
    serverTime: Date.now() // So client can calculate any clock drift
  });
};
