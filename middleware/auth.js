const jwt = require('jsonwebtoken');
const config = require('../config/config');
const logger = require('../config/logger');
const User = require('../models/User');

// Enhanced authentication middleware
const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        msg: 'No token provided, authorization denied',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token || token.length < 10) {
      return res.status(401).json({ 
        msg: 'Invalid token format',
        code: 'INVALID_TOKEN_FORMAT'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, config.security.jwt.secret, {
      algorithms: [config.security.jwt.algorithm]
    });

    // Check if user still exists and is active
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      logger.security.suspiciousActivity(
        decoded.id,
        'TOKEN_USER_NOT_FOUND',
        req.ip,
        { url: req.originalUrl }
      );
      return res.status(401).json({ 
        msg: 'User no longer exists',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user account is active (if you have user status)
    if (user.status && user.status === 'inactive') {
      return res.status(401).json({ 
        msg: 'Account is inactive',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Attach user info to request
    req.userId = decoded.id;
    req.user = user;
    
    // Log successful authentication for monitoring
    logger.security.loginAttempt(user.userId, req.ip, true);
    
    next();
  } catch (err) {
    logger.security.loginAttempt(null, req.ip, false);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        msg: 'Token has expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (err.name === 'JsonWebTokenError') {
      logger.security.suspiciousActivity(
        null,
        'INVALID_JWT_TOKEN',
        req.ip,
        { url: req.originalUrl, error: err.message }
      );
      return res.status(401).json({ 
        msg: 'Invalid token',
        code: 'TOKEN_INVALID'
      });
    }

    logger.errorWithContext('Authentication middleware error', err, {
      ip: req.ip,
      url: req.originalUrl,
      userAgent: req.get('User-Agent')
    });

    res.status(401).json({ 
      msg: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (token && token.length >= 10) {
      const decoded = jwt.verify(token, config.security.jwt.secret, {
        algorithms: [config.security.jwt.algorithm]
      });

      const user = await User.findById(decoded.id).select('-password');
      
      if (user) {
        req.userId = decoded.id;
        req.user = user;
      }
    }
    
    next();
  } catch (err) {
    // Ignore authentication errors in optional auth
    next();
  }
};

// Admin authentication
const adminAuth = async (req, res, next) => {
  try {
    // First run regular auth
    await new Promise((resolve, reject) => {
      auth(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Check if user is admin
    if (!req.user || !req.user.isAdmin) {
      logger.security.suspiciousActivity(
        req.userId,
        'UNAUTHORIZED_ADMIN_ACCESS',
        req.ip,
        { url: req.originalUrl }
      );
      return res.status(403).json({ 
        msg: 'Access denied. Admin privileges required.',
        code: 'ADMIN_REQUIRED'
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { 
  auth, 
  optionalAuth, 
  adminAuth 
};