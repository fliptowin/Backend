const express = require('express');
const router = express.Router();
const { 
  getAllUsers,
  getUserDetails,
  getSystemStats,
  changeUserPassword
} = require('../controllers/adminController');

// Admin routes
router.post('/users', getAllUsers);
router.post('/user/:userId', getUserDetails);
router.post('/stats', getSystemStats);
router.post('/change-password', changeUserPassword);

module.exports = router;
