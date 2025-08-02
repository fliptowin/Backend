const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');

// No rate limit middleware for round-status to ensure reliable game timing
router.get('/round-status', (req, res, next) => {
  // Set cache headers for performance optimization
  // Cache for a very short time (1 second) to reduce load but maintain near real-time updates
  res.set('Cache-Control', 'public, max-age=1');
  next();
}, gameController.getRoundStatus);

module.exports = router;
