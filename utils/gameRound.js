const crypto = require('crypto');
const config = require('../config/config');

const ROUND_DURATION_MS = 10000; // 10 seconds per round
const BETTING_LOCK_MS = 0;       // No betting lock period

/**
 * Calculate the current round ID based on the server's time
 * This ensures all users are synchronized to the same global rounds
 * @returns {number} The current round ID
 */
function getCurrentRoundId() {
  return Math.floor(Date.now() / ROUND_DURATION_MS);
}

/**
 * Calculates the absolute timestamp when the next round will start
 * This is the key for client synchronization regardless of network latency
 * @returns {number} UNIX timestamp in milliseconds when the next round starts
 */
function getNextRoundStartTime() {
  const currentRoundId = getCurrentRoundId();
  return (currentRoundId + 1) * ROUND_DURATION_MS;
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
