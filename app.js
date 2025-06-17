// Load environment variables FIRST
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const hpp = require('hpp');
const config = require('./config/config');
const logger = require('./config/logger');
const security = require('./middleware/security');

const app = express();

// Trust proxy (important for production behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(security.helmet);

// Compression middleware
app.use(compression());

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 hours
}));

// Rate limiting
app.use(security.apiRateLimiter);

// Body parsing with size limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Data sanitization
app.use(security.mongoSanitize);
app.use(hpp());

// Request logging
app.use((req, res, next) => {
  req.startTime = Date.now();
  logger.info('Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Static files with security headers
app.use('/uploads', express.static('public/uploads', {
  maxAge: '1d',
  setHeaders: (res, path) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

// API routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/balance', require('./routes/balanceRoutes'));
app.use('/api/play', require('./routes/playRoutes'));
app.use('/api/withdraw', require('./routes/withdrawRoutes'));
app.use('/api/deposit', require('./routes/depositRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/help', require('./routes/helpRoutes'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Response time logging
app.use((req, res, next) => {
  const duration = Date.now() - req.startTime;
  logger.info('Response', {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    duration: `${duration}ms`
  });
  next();
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });
  res.status(error.status || 500).json({
    success: false,
    message: config.app.env === 'production' ? 'Internal server error' : error.message
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  mongoose.connection.close(() => {
    logger.info('MongoDB connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  mongoose.connection.close(() => {
    logger.info('MongoDB connection closed');
    process.exit(0);
  });
});

// Database connection with retry logic
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.database.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);    // Start server
    const server = app.listen(config.app.port, () => {
      logger.info(`Server running on port ${config.app.port} in ${config.app.env} mode`);
    });

    // Handle server errors
    server.on('error', (error) => {
      logger.error('Server error:', error);
    });

  } catch (error) {
    logger.error('Database connection failed:', error);
    process.exit(1);
  }
};

// Connect to database
connectDB();

module.exports = app;
