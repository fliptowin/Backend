const express = require('express');
const router = express.Router();
const {
  submitQuery,
  getUserQueries,
  getAllQueries,
  markQueryAsOpened,
  getUserQueriesForAdmin
} = require('../controllers/helpController');
const { auth } = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// User routes (JWT authenticated)
router.post('/submit', auth, submitQuery);
router.get('/user-queries/:userId', auth, getUserQueries);

// Admin routes (admin access key authenticated)
router.post('/admin/all', getAllQueries);
router.post('/admin/mark-opened', markQueryAsOpened);
router.post('/admin/user-queries', getUserQueriesForAdmin);

module.exports = router;
