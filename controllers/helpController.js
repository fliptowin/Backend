const HelpQuery = require('../models/HelpQuery');
const User = require('../models/User');
const emailService = require('../utils/emailService');
const logger = require('../config/logger');

// User endpoint to submit a help query
exports.submitQuery = async (req, res) => {
  try {
    const { userId, subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ msg: 'Subject and message are required' });
    }

    // Get user details for the email
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Create help query in database
    const helpQuery = await HelpQuery.create({
      userId,
      email: user.email,
      subject,
      message,
      isOpened: false    });

    // Send email notification to admin
    try {
      const adminEmail = process.env.EMAIL || process.env.EMAIL_USER;
      if (adminEmail) {
        await emailService.sendHelpQuery(adminEmail, {
          queryId: helpQuery._id,
          userId,
          subject,
          message
        });
      }
    } catch (emailError) {
      logger.warn('Failed to send help query notification email:', emailError);
      // Don't fail the help query if email fails
    }

    res.status(201).json({
      msg: 'Your query has been submitted successfully',
      queryId: helpQuery._id
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// User endpoint to get their own queries
exports.getUserQueries = async (req, res) => {
  try {
    const { userId } = req.params;

    const queries = await HelpQuery.find({ userId })
      .sort({ createdAt: -1 });

    res.json(queries);
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Admin endpoint to get all queries with filters
exports.getAllQueries = async (req, res) => {
  try {
    const { accessKey } = req.body;
    const { isOpened, days } = req.query;
    
    // Validate admin access key
    if (accessKey !== process.env.ADMIN_SECRET) {
      return res.status(410).json({ msg: 'Invalid access key' });
    }

    // Build filter object
    const filter = {};
    
    // Filter by isOpened status if provided
    if (isOpened !== undefined) {
      filter.isOpened = isOpened === 'true';
    }
    
    // Filter by days if provided
    if (days) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days));
      filter.createdAt = { $gte: daysAgo };
    }
    
    const queries = await HelpQuery.find(filter)
      .sort({ createdAt: -1 });
    
    res.json({
      total: queries.length,
      unopened: queries.filter(q => !q.isOpened).length,
      queries
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Admin endpoint to mark a query as opened/read
exports.markQueryAsOpened = async (req, res) => {
  try {
    const { queryId, accessKey, adminNotes } = req.body;
    
    // Validate admin access key
    if (accessKey !== process.env.ADMIN_SECRET) {
      return res.status(410).json({ msg: 'Invalid access key' });
    }
    
    const query = await HelpQuery.findById(queryId);
    if (!query) {
      return res.status(404).json({ msg: 'Query not found' });
    }
    
    // Update query status and add admin notes if provided
    query.isOpened = true;
    if (adminNotes) {
      query.adminNotes = adminNotes;
    }
    
    await query.save();
    
    res.json({
      msg: 'Query marked as opened',
      query
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Admin endpoint to get queries by user ID
exports.getUserQueriesForAdmin = async (req, res) => {
  try {
    const { userId, accessKey } = req.body;
    
    // Validate admin access key
    if (accessKey !== process.env.ADMIN_SECRET) {
      return res.status(410).json({ msg: 'Invalid access key' });
    }

    if (!userId) {
      return res.status(400).json({ msg: 'User ID is required' });
    }
    
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    const queries = await HelpQuery.find({ userId })
      .sort({ createdAt: -1 });
    
    res.json({
      queries,
      user: {
        userId: user.userId,
        email: user.email
      }
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: 'Server error' });
  }
};
