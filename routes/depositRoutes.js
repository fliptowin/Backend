const express = require('express');
const router = express.Router();
const { 
  requestDeposit,
  getUserDepositHistory,
  getAllDepositRequests,
  getUserDepositsForAdmin,
  processDepositRequest
} = require('../controllers/depositController');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');

// User routes
router.post('/request', auth, upload.single('paymentProof'), requestDeposit);
router.get('/history/:userId', auth, getUserDepositHistory);

// Admin routes
router.post('/admin/list', getAllDepositRequests);
router.post('/admin/user-deposits', getUserDepositsForAdmin);
router.post('/admin/process', processDepositRequest);

module.exports = router;