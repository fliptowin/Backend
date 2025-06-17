const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Debug environment loading
console.log('MONGO_URI loaded:', process.env.MONGO_URI ? 'YES' : 'NO');
console.log('JWT_SECRET loaded:', process.env.JWT_SECRET ? 'YES' : 'NO');

// Validate required environment variables
const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET'
];

// Optional email variables (only required if using email features)
const optionalEmailVars = ['EMAIL_USER', 'EMAIL_PASS', 'EMAIL'];
const emailVarsPresent = (process.env.EMAIL_USER && process.env.EMAIL_PASS) || (process.env.EMAIL && process.env.EMAIL_PASS);

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

if (!emailVarsPresent) {
  console.warn('Warning: Email variables not configured. Email features will be disabled.');
}

const config = {
  // Application
  app: {
    name: 'FlipToWin Backend',
    version: '1.0.0',
    env: process.env.NODE_ENV || 'development',
    host: process.env.HOST || '0.0.0.0',
    port: parseInt(process.env.PORT) || 5000,
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development'
  },

  // Database
  database: {
    uri: process.env.MONGO_URI,
    options: {
      maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE) || 10,
      minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE) || 5,
      connectTimeoutMS: parseInt(process.env.MONGO_CONNECT_TIMEOUT_MS) || 10000,
      serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS) || 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      bufferMaxEntries: 0,
      retryWrites: true,
      w: 'majority',
      readPreference: 'primaryPreferred'
    }
  },

  // Security
  security: {
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRE || '24h',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
      algorithm: 'HS256'
    },
    bcrypt: {
      rounds: parseInt(process.env.BCRYPT_ROUNDS) || 12
    },
    session: {
      secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
      maxAge: parseInt(process.env.SESSION_MAX_AGE) || 86400000, // 24h
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'strict'
    }
  },

  // Rate Limiting
  rateLimiting: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    loginMaxAttempts: parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 5,
    playMaxAttempts: parseInt(process.env.PLAY_RATE_LIMIT_MAX) || 50,
    message: 'Too many requests from this IP, please try again later'
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: process.env.CORS_CREDENTIALS === 'true',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400 // 24h
  },
  // Email
  email: {
    enabled: emailVarsPresent,
    service: process.env.EMAIL_SERVICE || 'gmail',
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || process.env.EMAIL,
      pass: process.env.EMAIL_PASS
    },
    from: process.env.EMAIL_FROM || process.env.EMAIL || 'FlipToWin Support <noreply@fliptowin.com>',
    timeout: 10000,
    maxRetries: 3
  },

  // Game Settings
  game: {
    maxBetAmount: parseInt(process.env.GAME_MAX_BET_AMOUNT) || 1000,
    minBetAmount: parseInt(process.env.GAME_MIN_BET_AMOUNT) || 1,
    maxConcurrentPlays: parseInt(process.env.GAME_MAX_CONCURRENT_PLAYS) || 3,
    maxGames: 12,
    maxWins: 5,
    maxLosses: 7,
    gameHistoryLimit: 12
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB) || 0,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
    datePattern: 'YYYY-MM-DD',
    format: process.env.NODE_ENV === 'production' ? 'json' : 'simple'
  },

  // Security Headers
  helmet: {
    enabled: process.env.HELMET_ENABLED !== 'false',
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  },

  // Monitoring
  monitoring: {
    enabled: process.env.ENABLE_METRICS === 'true',
    port: parseInt(process.env.METRICS_PORT) || 9090
  }
};

module.exports = config;
