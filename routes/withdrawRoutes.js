const express = require('express');
const router = express.Router();
const { 
  requestWithdraw,
  getUserWithdrawalHistory,
  getAllWithdrawalRequests,
  getUserWithdrawalsForAdmin,
  processWithdrawalRequest
} = require('../controllers/withdrawController');
const { auth } = require('../middleware/auth');

// User routes
router.post('/request', auth, requestWithdraw);
router.get('/history/:userId', auth, getUserWithdrawalHistory);

// Admin routes
router.post('/admin/list', getAllWithdrawalRequests);
router.post('/admin/user-withdrawals', getUserWithdrawalsForAdmin);
router.post('/admin/process', processWithdrawalRequest);

module.exports = router;