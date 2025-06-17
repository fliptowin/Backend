const config = require('../config/config');
const logger = require('../config/logger');

class GameState {
  constructor() {
    this.userCycles = new Map();
    this.maxGames = config.game.maxGames;
    this.maxWins = config.game.maxWins;
    this.maxLosses = config.game.maxLosses;
    this.maxCacheSize = 10000; // Maximum number of users to keep in memory
    this.lastCleanup = Date.now();
    this.cleanupInterval = 3600000; // 1 hour
    
    // Start periodic cleanup
    this.startPeriodicCleanup();
  }

  // Periodic cleanup to prevent memory leaks
  startPeriodicCleanup() {
    setInterval(() => {
      this.cleanupInactiveUsers();
    }, this.cleanupInterval);
  }

  // Clean up inactive users to prevent memory bloat
  cleanupInactiveUsers() {
    const now = Date.now();
    const inactiveThreshold = 24 * 60 * 60 * 1000; // 24 hours
    let cleanedCount = 0;

    for (const [userId, cycle] of this.userCycles.entries()) {
      const lastActivity = cycle.lastActivity || cycle.createdAt || now;
      
      if (now - lastActivity > inactiveThreshold) {
        this.userCycles.delete(userId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} inactive user cycles`);
    }

    // If still too many users, clean oldest ones
    if (this.userCycles.size > this.maxCacheSize) {
      const sortedUsers = Array.from(this.userCycles.entries())
        .sort((a, b) => (a[1].lastActivity || 0) - (b[1].lastActivity || 0));
      
      const toRemove = this.userCycles.size - this.maxCacheSize;
      for (let i = 0; i < toRemove; i++) {
        this.userCycles.delete(sortedUsers[i][0]);
      }
      
      logger.warn(`Removed ${toRemove} user cycles due to memory limit`);
    }
  }

  // Get or create a user's game cycle with memory management
  getUserCycle(userId) {
    if (!this.userCycles.has(userId)) {
      // Check if we're approaching memory limits
      if (this.userCycles.size >= this.maxCacheSize) {
        this.cleanupInactiveUsers();
      }

      const newCycle = {
        gameHistory: [],
        cyclePattern: this.generatePattern(),
        currentPosition: 0,
        createdAt: Date.now(),
        lastActivity: Date.now()
      };
      
      this.userCycles.set(userId, newCycle);
      
      // Only log in development
      if (config.app.isDevelopment) {
        logger.debug(`Created new cycle for user ${userId}`, {
          pattern: newCycle.cyclePattern
        });
      }
    } else {
      // Update last activity
      this.userCycles.get(userId).lastActivity = Date.now();
    }
    
    return this.userCycles.get(userId);
  }

  // Optimized pattern generation
  generatePattern() {
    // Use a more efficient shuffling algorithm
    const pattern = new Array(this.maxGames);
    
    // Fill with wins and losses
    let index = 0;
    for (let i = 0; i < this.maxWins; i++) {
      pattern[index++] = 'win';
    }
    for (let i = 0; i < this.maxLosses; i++) {
      pattern[index++] = 'lose';
    }
    
    // Fisher-Yates shuffle - more efficient than multiple shuffles
    for (let i = pattern.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pattern[i], pattern[j]] = [pattern[j], pattern[i]];
    }
    
    // Validate pattern (minimal validation for performance)
    const wins = pattern.filter(r => r === 'win').length;
    if (wins !== this.maxWins) {
      logger.error('Invalid pattern generated', { wins, expected: this.maxWins });
      // Return a guaranteed valid pattern
      return this.createFailsafePattern();
    }
    
    return pattern;
  }

  // Failsafe pattern in case of generation issues
  createFailsafePattern() {
    const pattern = [];
    for (let i = 0; i < this.maxWins; i++) pattern.push('win');
    for (let i = 0; i < this.maxLosses; i++) pattern.push('lose');
    
    // Simple shuffle
    for (let i = pattern.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pattern[i], pattern[j]] = [pattern[j], pattern[i]];
    }
    
    return pattern;
  }

  // Optimized result generation with minimal logging
  getRandomResult(userId) {
    const startTime = Date.now();
    const userCycle = this.getUserCycle(userId);
    
    // Reset cycle if completed
    if (userCycle.currentPosition >= this.maxGames) {
      userCycle.gameHistory = [];
      userCycle.cyclePattern = this.generatePattern();
      userCycle.currentPosition = 0;
      userCycle.lastActivity = Date.now();
    }

    // Get result from pattern
    const patternResult = userCycle.cyclePattern[userCycle.currentPosition];
    
    // Current state calculations
    const currentWins = userCycle.gameHistory.filter(r => r === 'win').length;
    const currentLosses = userCycle.gameHistory.filter(r => r === 'lose').length;
    const remainingWins = this.maxWins - currentWins;
    const remainingLosses = this.maxLosses - currentLosses;
    const remainingGames = this.maxGames - userCycle.currentPosition;
    
    // Safety overrides with minimal logging
    if (patternResult === 'win' && remainingWins <= 0) {
      if (config.app.isDevelopment) {
        logger.warn('Pattern override: forcing lose', { userId, remainingWins });
      }
      return 'lose';
    }
    
    if (patternResult === 'lose' && remainingLosses <= 0) {
      if (config.app.isDevelopment) {
        logger.warn('Pattern override: forcing win', { userId, remainingLosses });
      }
      return 'win';
    }
    
    // End-game forcing
    if (remainingGames === remainingWins && remainingWins > 0) {
      return 'win';
    }
    
    if (remainingGames === remainingLosses && remainingLosses > 0) {
      return 'lose';
    }
    
    // Log performance for slow operations
    const duration = Date.now() - startTime;
    if (duration > 10) {
      logger.performance.dbQuery('getRandomResult', duration);
    }
    
    return patternResult;
  }

  // Optimized result tracking
  addResult(userId, actualResult) {
    const userCycle = this.getUserCycle(userId);
    
    // Prevent adding results beyond cycle length
    if (userCycle.currentPosition >= this.maxGames) {
      logger.error('Attempted to add result beyond cycle limit', {
        userId,
        position: userCycle.currentPosition,
        maxGames: this.maxGames
      });
      return;
    }
    
    // Add to history and advance position
    userCycle.gameHistory.push(actualResult);
    userCycle.currentPosition++;
    userCycle.lastActivity = Date.now();
    
    // Validation - only log errors in production
    const currentWins = userCycle.gameHistory.filter(r => r === 'win').length;
    const currentLosses = userCycle.gameHistory.filter(r => r === 'lose').length;
    
    // Check for corruption
    if (currentWins > this.maxWins || currentLosses > this.maxLosses) {
      logger.error('Game state corruption detected', {
        userId,
        currentWins,
        currentLosses,
        maxWins: this.maxWins,
        maxLosses: this.maxLosses
      });
      this.resetUser(userId);
      return;
    }
    
    // Only log cycle completion, not every game
    if (userCycle.currentPosition === this.maxGames) {
      const isValid = currentWins === this.maxWins && currentLosses === this.maxLosses;
      
      if (!isValid) {
        logger.error('Invalid cycle completion', {
          userId,
          currentWins,
          currentLosses,
          expected: `${this.maxWins}W/${this.maxLosses}L`
        });
      } else if (config.app.isDevelopment) {
        logger.info('Cycle completed successfully', {
          userId,
          wins: currentWins,
          losses: currentLosses
        });
      }
    }
  }

  // Get user state with minimal computation
  getUserState(userId) {
    const userCycle = this.getUserCycle(userId);
    const currentWins = userCycle.gameHistory.filter(r => r === 'win').length;
    const currentLosses = userCycle.gameHistory.filter(r => r === 'lose').length;
    
    return {
      gamesPlayed: userCycle.currentPosition,
      currentWins,
      currentLosses,
      remainingWins: this.maxWins - currentWins,
      remainingLosses: this.maxLosses - currentLosses,
      cycleComplete: userCycle.currentPosition >= this.maxGames
    };
  }

  // Reset user with logging
  resetUser(userId) {
    if (this.userCycles.has(userId)) {
      this.userCycles.delete(userId);
      logger.info('User cycle reset', { userId });
    }
  }

  // Validate and fix user cycle
  validateAndFixUser(userId) {
    const userCycle = this.getUserCycle(userId);
    const currentWins = userCycle.gameHistory.filter(r => r === 'win').length;
    const currentLosses = userCycle.gameHistory.filter(r => r === 'lose').length;
    const totalGames = userCycle.gameHistory.length;
    
    let needsReset = false;
    
    // Check for corruption
    if (currentWins > this.maxWins || 
        currentLosses > this.maxLosses || 
        totalGames > this.maxGames ||
        userCycle.currentPosition !== totalGames ||
        userCycle.cyclePattern.length !== this.maxGames) {
      needsReset = true;
    }
    
    if (needsReset) {
      logger.warn('User cycle corruption detected and fixed', {
        userId,
        currentWins,
        currentLosses,
        totalGames,
        position: userCycle.currentPosition
      });
      this.resetUser(userId);
      return true;
    }
    
    return false;
  }

  // Get cycle stats for monitoring
  getCycleStats(userId) {
    const userCycle = this.getUserCycle(userId);
    const currentWins = userCycle.gameHistory.filter(r => r === 'win').length;
    const currentLosses = userCycle.gameHistory.filter(r => r === 'lose').length;
    
    return {
      expectedWins: this.maxWins,
      expectedLosses: this.maxLosses,
      currentWins,
      currentLosses,
      remainingWins: this.maxWins - currentWins,
      remainingLosses: this.maxLosses - currentLosses,
      isValid: (currentWins <= this.maxWins && currentLosses <= this.maxLosses),
      position: userCycle.currentPosition
    };
  }
  // Get system stats for monitoring
  getSystemStats() {
    return {
      totalUsers: this.userCycles.size,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      lastCleanup: this.lastCleanup,
      maxCacheSize: this.maxCacheSize
    };
  }
  // Main function to get next game result for a user
  getNextResult(userId) {
    console.log(`\n=== GETTING RESULT FOR USER ${userId} ===`);
    const userCycle = this.getUserCycle(userId);
    
    console.log(`Current position: ${userCycle.currentPosition}/${this.maxGames}`);
    console.log(`History length: ${userCycle.gameHistory.length}`);
    
    // Reset cycle if completed
    if (userCycle.currentPosition >= this.maxGames) {
      console.log(`🔄 Resetting cycle - position ${userCycle.currentPosition} >= ${this.maxGames}`);
      userCycle.gameHistory = [];
      userCycle.cyclePattern = this.generatePattern();
      userCycle.currentPosition = 0;
      console.log(`New pattern generated:`, userCycle.cyclePattern);
    }

    // CRITICAL: Validate pattern integrity
    const patternWins = userCycle.cyclePattern.filter(r => r === 'win').length;
    const patternLosses = userCycle.cyclePattern.filter(r => r === 'lose').length;
    
    if (patternWins !== this.maxWins || patternLosses !== this.maxLosses) {
      console.error(`❌ CORRUPTED PATTERN! Wins: ${patternWins}, Losses: ${patternLosses}`);
      userCycle.cyclePattern = this.generatePattern();
      console.log(`Fixed pattern:`, userCycle.cyclePattern);
    }

    // Get result from pre-determined pattern
    const patternResult = userCycle.cyclePattern[userCycle.currentPosition];
    
    console.log(`Pattern position ${userCycle.currentPosition} says: ${patternResult}`);
    
    // Current state validation
    const currentWins = userCycle.gameHistory.filter(r => r === 'win').length;
    const currentLosses = userCycle.gameHistory.filter(r => r === 'lose').length;    const remainingWins = this.maxWins - currentWins;
    const remainingLosses = this.maxLosses - currentLosses;
    const remainingGames = this.maxGames - userCycle.currentPosition;
    console.log(`Current state: ${currentWins}W/${currentLosses}L`);
    console.log(`Remaining: ${remainingWins}W/${remainingLosses}L in ${remainingGames} games`);
    
    // CRITICAL: Safety overrides to prevent corruption
    if (patternResult === 'win' && remainingWins <= 0) {
      console.log(`❌ OVERRIDE: Pattern says WIN but no wins remaining! Forcing LOSE`);
      return 'lose';
    }
    
    if (patternResult === 'lose' && remainingLosses <= 0) {
      console.log(`❌ OVERRIDE: Pattern says LOSE but no losses remaining! Forcing WIN`);
      return 'win';
    }
    
    // End-game forcing to guarantee exact ratio
    if (remainingGames === remainingWins && remainingWins > 0) {
      console.log(`🎯 END-GAME: Forcing WIN - all ${remainingGames} remaining must be wins`);
      return 'win';
    }
      if (remainingGames === remainingLosses && remainingLosses > 0) {
      console.log(`🎯 END-GAME: Forcing LOSE - all ${remainingGames} remaining must be losses`);  
      return 'lose';
    }
    
    // If we reach here, the pattern result is safe to use
    console.log(`✅ Using safe pattern result: ${patternResult}`);
    console.log(`=== END GETTING RESULT ===\n`);
    return patternResult;
  }

  // Track the actual result
  addResult(userId, actualResult) {
    const userCycle = this.getUserCycle(userId);
    
    console.log(`\n=== ADDING RESULT FOR USER ${userId} ===`);
    console.log(`Before: Position ${userCycle.currentPosition}, History length: ${userCycle.gameHistory.length}`);
    console.log(`Adding result: ${actualResult}`);
    
    // CRITICAL: Prevent adding results beyond cycle length
    if (userCycle.currentPosition >= this.maxGames) {
      console.error(`❌ PREVENTED: Trying to add result beyond cycle limit!`);
      console.error(`Position: ${userCycle.currentPosition}, Max: ${this.maxGames}`);
      return; // Don't add the result
    }
    
    // Add to history and advance position
    userCycle.gameHistory.push(actualResult);
    userCycle.currentPosition++;
    
    const currentWins = userCycle.gameHistory.filter(r => r === 'win').length;
    const currentLosses = userCycle.gameHistory.filter(r => r === 'lose').length;
    
    console.log(`After: Position ${userCycle.currentPosition}, History length: ${userCycle.gameHistory.length}`);
    console.log(`Current totals: ${currentWins} wins, ${currentLosses} losses`);
    console.log(`Expected pattern result was: ${userCycle.cyclePattern[userCycle.currentPosition - 1]}`);
    console.log(`Actual result was: ${actualResult}`);
    
    // CRITICAL: Check for immediate corruption
    if (currentWins > this.maxWins) {
      console.error(`❌ CORRUPTION: Too many wins! ${currentWins}/${this.maxWins}`);
      this.resetUser(userId);
      return;
    }
    
    if (currentLosses > this.maxLosses) {
      console.error(`❌ CORRUPTION: Too many losses! ${currentLosses}/${this.maxLosses}`);
      this.resetUser(userId);
      return;
    }
      // Validate pattern consistency - this should ALWAYS match now
    if (userCycle.cyclePattern[userCycle.currentPosition - 1] !== actualResult) {
      console.error(`🚨 CRITICAL ERROR: Result ${actualResult} doesn't match pattern ${userCycle.cyclePattern[userCycle.currentPosition - 1]}`);
      console.error(`This should NEVER happen! The controller logic is broken!`);
      console.error(`Position: ${userCycle.currentPosition - 1}, Pattern:`, userCycle.cyclePattern);
      console.error(`History:`, userCycle.gameHistory);
    } else {
      console.log(`✅ Pattern consistency verified: ${actualResult} matches expected`);
    }
      // Track pattern adherence (should always be 100% now)
    const adherenceStats = this.trackPatternAdherence(userId, userCycle.cyclePattern[userCycle.currentPosition - 1], actualResult);
    if (adherenceStats.deviations > 0) {
      console.error(`🚨 Pattern adherence failure! Deviations: ${adherenceStats.deviations}/${adherenceStats.totalGames}`);
    }
    
    // Check if cycle is complete
    if (userCycle.currentPosition === this.maxGames) {
      console.log(`\n🏁 CYCLE COMPLETE for user ${userId}:`);
      console.log(`Final: ${currentWins} wins, ${currentLosses} losses`);
      console.log(`Pattern was:`, userCycle.cyclePattern);
      console.log(`History was:`, userCycle.gameHistory);
      console.log(`Pattern vs History match:`, 
        userCycle.cyclePattern.every((p, i) => p === userCycle.gameHistory[i]));
      
      if (currentWins !== this.maxWins || currentLosses !== this.maxLosses) {
        console.error(`❌ ERROR: Invalid cycle! Expected ${this.maxWins}W/${this.maxLosses}L, got ${currentWins}W/${currentLosses}L`);      } else {
        console.log(`✅ Cycle completed successfully with correct ${this.maxWins}W/${this.maxLosses}L ratio`);
      }
    }
    
    console.log(`=== END ADDING RESULT ===\n`);
  }

  // Track pattern adherence
  trackPatternAdherence(userId, expectedResult, actualResult) {
    const userCycle = this.getUserCycle(userId);
    
    if (!userCycle.patternAdherence) {
      userCycle.patternAdherence = {
        deviations: 0,
        totalGames: 0
      };
    }
    
    userCycle.patternAdherence.totalGames++;
    
    if (expectedResult !== actualResult) {
      userCycle.patternAdherence.deviations++;
      console.log(`📊 Pattern deviation ${userCycle.patternAdherence.deviations}/${userCycle.patternAdherence.totalGames} for user ${userId}`);
        // If too many deviations, warn about ratio breaking
      if (userCycle.patternAdherence.deviations > 2) {
        console.warn(`🚨 High pattern deviation for user ${userId}! This may break the 5:7 ratio.`);
      }
    }
    
    return {
      deviations: userCycle.patternAdherence.deviations,
      totalGames: userCycle.patternAdherence.totalGames,
      adherenceRate: ((userCycle.patternAdherence.totalGames - userCycle.patternAdherence.deviations) / userCycle.patternAdherence.totalGames * 100).toFixed(1)
    };
  }

  // Get user's current state for debugging
  getUserState(userId) {
    const userCycle = this.getUserCycle(userId);
    const currentWins = userCycle.gameHistory.filter(r => r === 'win').length;
    const currentLosses = userCycle.gameHistory.filter(r => r === 'lose').length;
    
    return {
      gamesPlayed: userCycle.currentPosition,
      currentWins,
      currentLosses,
      remainingWins: this.maxWins - currentWins,
      remainingLosses: this.maxLosses - currentLosses,
      gameHistory: userCycle.gameHistory,
      pattern: userCycle.cyclePattern,
      cycleComplete: userCycle.currentPosition >= this.maxGames
    };
  }

  // Reset a specific user's cycle
  resetUser(userId) {
    this.userCycles.delete(userId);
    console.log(`🔄 Reset user ${userId}`);
  }

  // Force reset all users (for fixing corruption)
  resetAllUsers() {
    console.log(`🔄 FORCE RESET: Clearing all user cycles`);
    this.userCycles.clear();
  }

  // Validate and fix any corrupted user cycle
  validateAndFixUser(userId) {
    const userCycle = this.getUserCycle(userId);
    const currentWins = userCycle.gameHistory.filter(r => r === 'win').length;
    const currentLosses = userCycle.gameHistory.filter(r => r === 'lose').length;
    const totalGames = userCycle.gameHistory.length;
    
    console.log(`\n=== VALIDATING USER ${userId} ===`);
    console.log(`Current state: ${currentWins}W/${currentLosses}L in ${totalGames} games`);
    console.log(`Position: ${userCycle.currentPosition}`);
    
    let needsReset = false;
    
    // Check for various corruption scenarios
    if (currentWins > this.maxWins) {
      console.log(`❌ Too many wins: ${currentWins}/${this.maxWins}`);
      needsReset = true;
    }
    
    if (currentLosses > this.maxLosses) {
      console.log(`❌ Too many losses: ${currentLosses}/${this.maxLosses}`);
      needsReset = true;
    }
    
    if (totalGames > this.maxGames) {
      console.log(`❌ Too many games: ${totalGames}/${this.maxGames}`);
      needsReset = true;
    }
    
    if (userCycle.currentPosition !== totalGames) {
      console.log(`❌ Position mismatch: position=${userCycle.currentPosition}, history=${totalGames}`);
      needsReset = true;
    }
    
    if (userCycle.cyclePattern.length !== this.maxGames) {
      console.log(`❌ Pattern length wrong: ${userCycle.cyclePattern.length}/${this.maxGames}`);
      needsReset = true;
    }
    
    if (needsReset) {
      console.log(`🔧 FIXING: Resetting corrupted user ${userId}`);
      this.resetUser(userId);
      return true; // User was reset
    } else {
      console.log(`✅ User ${userId} is valid`);
      return false; // User is valid
    }
  }

  // Get cycle validation info
  getCycleStats(userId) {
    const userCycle = this.getUserCycle(userId);
    const currentWins = userCycle.gameHistory.filter(r => r === 'win').length;
    const currentLosses = userCycle.gameHistory.filter(r => r === 'lose').length;
    
    return {
      expectedWins: this.maxWins,
      expectedLosses: this.maxLosses,
      currentWins,
      currentLosses,
      remainingWins: this.maxWins - currentWins,
      remainingLosses: this.maxLosses - currentLosses,
      isValid: (currentWins <= this.maxWins && currentLosses <= this.maxLosses),
      gameHistory: userCycle.gameHistory,
      pattern: userCycle.cyclePattern,
      position: userCycle.currentPosition
    };
  }
}

module.exports = new GameState();
