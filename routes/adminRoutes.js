const express = require('express');
const router = express.Router();
const { 
  getAllUsers,
  getUserDetails,
  getSystemStats,
  changeUserPassword,
  deactivateUser
} = require('../controllers/adminController');

// Admin routes
router.post('/users', getAllUsers);
router.post('/user/:userId', getUserDetails);
router.post('/stats', getSystemStats);
router.post('/change-password', changeUserPassword);
router.post('/deactivate-user', deactivateUser);

module.exports = router;
