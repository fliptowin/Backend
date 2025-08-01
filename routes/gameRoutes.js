const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');

// Route to get the round status for synchronizing timers across all clients
router.get('/round-status', gameController.getRoundStatus);

module.exports = router;
