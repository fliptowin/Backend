// Load environment variables FIRST
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const hpp = require('hpp');
const fs = require('fs');
const path = require('path');
const config = require('./config/config');
const logger = require('./config/logger');
const security = require('./middleware/security');

// Create required directories if they don't exist
const createDirectories = () => {
  const dirs = ['logs', 'public', 'public/uploads'];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
};

// Create directories before anything else
createDirectories();

const app = express();

// Add uncaught exception handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  try {
    if (logger && typeof logger.error === 'function') {
      logger.error('Uncaught Exception:', error);
    }
  } catch (e) {
    console.error('Logger error:', e);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  try {
    if (logger && typeof logger.error === 'function') {
      logger.error('Unhandled Rejection:', { reason, promise });
    }
  } catch (e) {
    console.error('Logger error:', e);
  }
  process.exit(1);
});

try {
  // Trust proxy (important for production behind reverse proxy)
  app.set('trust proxy', 1);

  // Security middleware
  app.use(security.helmet);

  // Compression middleware
  app.use(compression());

  // CORS configuration
  // app.use(cors({
  //   origin: config.cors.origin,
  //   credentials: config.cors.credentials,
  //   methods: ['GET', 'POST', 'PUT', 'DELETE'],
  //   allowedHeaders: ['Content-Type', 'Authorization'],
  //   maxAge: 86400 // 24 hours
  // }));
  app.use(cors());

  console.log('✅ Basic middleware configured successfully');
} catch (error) {
  console.error('❌ Error configuring basic middleware:', error);
  process.exit(1);
}

try {
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

  console.log('✅ Security and parsing middleware configured successfully');
} catch (error) {
  console.error('❌ Error configuring security middleware:', error);
  process.exit(1);
}

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

try {
  // API routes
  app.use('/api/auth', require('./routes/authRoutes'));
  app.use('/api/balance', require('./routes/balanceRoutes'));
  app.use('/api/play', require('./routes/playRoutes'));
  app.use('/api/withdraw', require('./routes/withdrawRoutes'));
  app.use('/api/deposit', require('./routes/depositRoutes'));
  app.use('/api/admin', require('./routes/adminRoutes'));
  app.use('/api/help', require('./routes/helpRoutes'));

  console.log('✅ API routes configured successfully');
} catch (error) {
  console.error('❌ Error configuring routes:', error);
  console.error('Route error details:', error.message);
  process.exit(1);
}

// Health check endpoint (simple version)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Simple root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'FlipToWin Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Simple test endpoint
app.get('/test', (req, res) => {
  res.json({
    message: 'Test endpoint working',
    environment: process.env.NODE_ENV,
    port: process.env.PORT,
    mongoUri: process.env.MONGO_URI ? 'configured' : 'missing'
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
  console.log('SIGTERM received, shutting down gracefully');
  if (logger && typeof logger.info === 'function') {
    logger.info('SIGTERM received, shutting down gracefully');
  }
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    if (logger && typeof logger.info === 'function') {
      logger.info('MongoDB connection closed');
    }
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  if (logger && typeof logger.info === 'function') {
    logger.info('SIGINT received, shutting down gracefully');
  }
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    if (logger && typeof logger.info === 'function') {
      logger.info('MongoDB connection closed');
    }
    process.exit(0);
  });
});

// Database connection with retry logic
const connectDB = async () => {
  try {
    // Remove deprecated options
    const conn = await mongoose.connect(config.database.uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4,
      bufferCommands: false
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    
    // Start server only after successful DB connection
    const server = app.listen(config.app.port, '0.0.0.0', () => {
      logger.info(`Server running on port ${config.app.port} in ${config.app.env} mode`);
      console.log(`✅ Server successfully started on port ${config.app.port}`);
    });

    // Handle server errors
    server.on('error', (error) => {
      logger.error('Server error:', error);
      console.error('Server error:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${config.app.port} is already in use`);
        process.exit(1);
      }
    });

    return server;

  } catch (error) {
    logger.error('Database connection failed:', error);
    console.error('Database connection failed:', error);
    
    // Only retry a few times, then exit
    if (!global.dbRetryCount) {
      global.dbRetryCount = 0;
    }
    
    if (global.dbRetryCount < 3) {
      global.dbRetryCount++;
      console.log(`Retrying database connection... (${global.dbRetryCount}/3)`);
      setTimeout(() => {
        connectDB();
      }, 5000);
    } else {
      console.error('Max database connection retries reached. Exiting...');
      process.exit(1);
    }
  }
};

// Connect to database
console.log('🚀 Starting FlipToWin Backend...');
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Port: ${config.app.port}`);
console.log(`MongoDB URI: ${config.database.uri ? 'configured' : 'MISSING'}`);
console.log(`JWT Secret: ${config.security.jwt.secret ? 'configured' : 'MISSING'}`);

connectDB();

module.exports = app;
