const crypto = require('crypto');
const config = require('../config/config');

const ROUND_DURATION_MS = 17000; // 10 seconds per round
const BETTING_LOCK_MS = 0;       // No betting lock period

/**
 * Calculate the current round ID based on the server's time
 * This ensures all users are synchronized to the same global rounds
 * @returns {number} The current round ID
 */
function getCurrentRoundId() {
  // Ensure we get the latest timestamp for accurate round ID
  const now = Date.now();
  return Math.floor(now / ROUND_DURATION_MS);
}

/**
 * Calculates the absolute timestamp when the next round will start
 * This is the key for client synchronization regardless of network latency
 * @returns {number} UNIX timestamp in milliseconds when the next round starts
 */
function getNextRoundStartTime() {
  // Ensure we get the latest timestamp
  const now = Date.now();
  
  // Calculate the current round's end time (which is the next round's start time)
  // We use the current timestamp and find the next round boundary
  const currentRoundId = Math.floor(now / ROUND_DURATION_MS);
  const nextRoundId = currentRoundId + 1;
  const nextRoundStartTime = nextRoundId * ROUND_DURATION_MS;
  
  return nextRoundStartTime;
}

/**
 * Checks if betting is currently allowed based on the server time
 * With betting lock removed, this always returns true
 * @returns {boolean} Whether betting is currently allowed
 */
function isBettingAllowed() {
  return true; // Betting is always allowed now
}

/**
 * Generates a deterministic, verifiable result for a specific round ID
 * Uses HMAC with a server secret to ensure the result is tamper-proof
 * @param {number} roundId - The round ID to get the result for
 * @returns {'head' | 'tail'} The coin flip result for the round
 */
function getRoundResult(roundId) {
  // Use JWT secret or a dedicated game secret
  const secret = config.jwtSecret || 'default-secret-key'; 
  
  // Create an HMAC using SHA-256
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(roundId.toString());
  const hash = hmac.digest('hex');
  
  // Use the first byte of the hash to determine the outcome
  return (parseInt(hash.substring(0, 2), 16) % 2 === 0) ? 'head' : 'tail';
}

module.exports = {
  getCurrentRoundId,
  getNextRoundStartTime,
  isBettingAllowed,
  getRoundResult,
  ROUND_DURATION_MS,
  BETTING_LOCK_MS
};
