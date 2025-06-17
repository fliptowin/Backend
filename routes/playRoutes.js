const express = require('express');
const router = express.Router();
const { play } = require('../controllers/playController');
const { auth } = require('../middleware/auth');

router.post('/flip', auth, play);

module.exports = router;