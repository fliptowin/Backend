const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const config = require('../config/config');
const logger = require('../config/logger');

// General rate limiter
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { msg: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.security.rateLimitExceeded(req.ip, req.originalUrl);
      res.status(429).json({ msg: message });
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.originalUrl === '/health' || req.originalUrl === '/api/health';
    }
  });
};

// Strict rate limiter for authentication endpoints
const authRateLimiter = createRateLimiter(
  config.rateLimiting.windowMs,
  config.rateLimiting.loginMaxAttempts,
  'Too many authentication attempts, please try again later'
);

// Game play rate limiter
const gameRateLimiter = createRateLimiter(
  60000, // 1 minute
  config.rateLimiting.playMaxAttempts,
  'Too many game requests, please slow down'
);

// General API rate limiter
const apiRateLimiter = createRateLimiter(
  config.rateLimiting.windowMs,
  config.rateLimiting.maxRequests,
  config.rateLimiting.message
);

// Helmet configuration for security headers
const helmetConfig = {
  ...config.helmet,
  crossOriginEmbedderPolicy: false, // Allow embedding for payment widgets
  crossOriginResourcePolicy: { policy: 'cross-origin' }
};

// XSS sanitization middleware
const xssProtection = (req, res, next) => {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      for (const key in req.body) {
        if (typeof req.body[key] === 'string') {
          req.body[key] = xss(req.body[key]);
        }
      }
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      for (const key in req.query) {
        if (typeof req.query[key] === 'string') {
          req.query[key] = xss(req.query[key]);
        }
      }
    }

    next();
  } catch (error) {
    logger.errorWithContext('XSS protection error', error, { 
      method: req.method, 
      url: req.originalUrl 
    });
    next();
  }
};

// IP whitelisting middleware (optional)
const ipWhitelist = (whitelist = []) => {
  return (req, res, next) => {
    if (whitelist.length === 0) {
      return next(); // No whitelist configured
    }

    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (whitelist.includes(clientIP)) {
      next();
    } else {
      logger.security.suspiciousActivity(
        null, 
        'IP_NOT_WHITELISTED', 
        clientIP, 
        { url: req.originalUrl }
      );
      res.status(403).json({ msg: 'Access denied' });
    }
  };
};

// Suspicious activity detection
const suspiciousActivityDetector = (req, res, next) => {
  const userAgent = req.get('User-Agent');
  const ip = req.ip;
  
  // Check for suspicious user agents
  const suspiciousUserAgents = [
    'sqlmap',
    'nikto',
    'nessus',
    'openvas',
    'nmap',
    'masscan'
  ];
  
  if (userAgent && suspiciousUserAgents.some(agent => 
    userAgent.toLowerCase().includes(agent)
  )) {
    logger.security.suspiciousActivity(
      null,
      'SUSPICIOUS_USER_AGENT',
      ip,
      { userAgent, url: req.originalUrl }
    );    return res.status(403).json({ msg: 'Access denied' });
  }
    // Check for SQL injection patterns in query params
  const sqlInjectionPatterns = [
    /(\b(drop|exec|union|select|insert|update|delete)\b)|(')|(--)|(;)/i,
    /(script|javascript|vbscript|onload|onerror|onclick)/i
  ];

  const queryString = JSON.stringify(req.query);
  const bodyString = JSON.stringify(req.body);

  for (const pattern of sqlInjectionPatterns) {
    if (pattern.test(queryString) || pattern.test(bodyString)) {
      logger.security.suspiciousActivity(
        req.userId || null,
        'POSSIBLE_INJECTION_ATTEMPT',
        ip,
        { url: req.originalUrl, query: req.query, body: req.body }
      );
      return res.status(400).json({ msg: 'Invalid request format' });
    }
  }

  next();
};

// Request size limiter
const requestSizeLimiter = (limit = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.get('content-length') || '0');
    const maxSize = parseInt(limit) * 1024 * 1024; // Convert MB to bytes

    if (contentLength > maxSize) {
      logger.security.suspiciousActivity(
        req.userId || null,
        'REQUEST_TOO_LARGE',
        req.ip,
        { contentLength, maxSize, url: req.originalUrl }
      );
      return res.status(413).json({ msg: 'Request entity too large' });
    }

    next();
  };
};

module.exports = {
  helmet: helmet(helmetConfig),
  mongoSanitize: mongoSanitize(),
  xssProtection,
  apiRateLimiter,
  authRateLimiter,
  gameRateLimiter,
  ipWhitelist,
  suspiciousActivityDetector,
  requestSizeLimiter
};
