const gameRound = require('../utils/gameRound');

/**
 * Provides the client with essential timing information to synchronize their game clocks.
 * Uses absolute timestamps to overcome network latency issues.
 */
exports.getRoundStatus = (req, res) => {
  // Get the server time first to ensure all calculations use the same base time
  const serverTime = Date.now();
  
  // Calculate currentRoundId and nextRoundStartTime using the same server time
  // to ensure consistency
  const currentRoundId = Math.floor(serverTime / gameRound.ROUND_DURATION_MS);
  const nextRoundStartTime = (currentRoundId + 1) * gameRound.ROUND_DURATION_MS;
  
  res.json({
    success: true,
    currentRoundId,
    nextRoundStartTime,
    roundDuration: gameRound.ROUND_DURATION_MS,
    lockTime: gameRound.BETTING_LOCK_MS,
    serverTime // Use the exact same timestamp for serverTime
  });
};
