const express = require('express');
const router = express.Router();
const { getBalance, takeout, updateBalance } = require('../controllers/balanceController');
const { auth } = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

router.post('/get-balance', auth, getBalance);
router.post('/takeout', auth, takeout);
router.post('/update', adminAuth, updateBalance);

module.exports = router;