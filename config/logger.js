const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const config = require('./config');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

winston.addColors(colors);

// Format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// File transport with rotation
const fileRotateTransport = new DailyRotateFile({
  filename: 'logs/app-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: config.logging.maxSize,
  maxFiles: config.logging.maxFiles,
  format: format,
  level: config.logging.level
});

// Error file transport
const errorFileTransport = new DailyRotateFile({
  filename: 'logs/error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: config.logging.maxSize,
  maxFiles: config.logging.maxFiles,
  format: format,
  level: 'error'
});

// Create transports array
const transports = [
  fileRotateTransport,
  errorFileTransport
];

// Add console transport for development
if (config.app.isDevelopment) {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug'
    })
  );
}

// Create logger
const logger = winston.createLogger({
  level: config.logging.level,
  levels,
  format,
  transports,
  exitOnError: false,
  handleExceptions: true,
  handleRejections: true
});

// Security logging helpers
logger.security = {
  loginAttempt: (userId, ip, success) => {
    logger.info('Login attempt', {
      userId,
      ip,
      success,
      timestamp: new Date().toISOString(),
      event: 'LOGIN_ATTEMPT'
    });
  },
  
  gamePlay: (userId, amount, result, ip) => {
    logger.info('Game play', {
      userId,
      amount,
      result,
      ip,
      timestamp: new Date().toISOString(),
      event: 'GAME_PLAY'
    });
  },
  
  suspiciousActivity: (userId, activity, ip, details) => {
    logger.warn('Suspicious activity detected', {
      userId,
      activity,
      ip,
      details,
      timestamp: new Date().toISOString(),
      event: 'SUSPICIOUS_ACTIVITY'
    });
  },
  
  rateLimitExceeded: (ip, endpoint) => {
    logger.warn('Rate limit exceeded', {
      ip,
      endpoint,
      timestamp: new Date().toISOString(),
      event: 'RATE_LIMIT_EXCEEDED'
    });
  }
};

// Performance logging
logger.performance = {
  dbQuery: (query, duration) => {
    if (duration > 1000) { // Log slow queries (>1s)
      logger.warn('Slow database query', {
        query,
        duration,
        timestamp: new Date().toISOString(),
        event: 'SLOW_DB_QUERY'
      });
    }
  },
  
  apiResponse: (method, url, duration, statusCode) => {
    logger.http('API Response', {
      method,
      url,
      duration,
      statusCode,
      timestamp: new Date().toISOString(),
      event: 'API_RESPONSE'
    });
  }
};

// Error logging with context
logger.errorWithContext = (message, error, context = {}) => {
  logger.error(message, {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    context,
    timestamp: new Date().toISOString()
  });
};

module.exports = logger;
