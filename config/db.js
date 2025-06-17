const mongoose = require('mongoose');
const config = require('./config');
const logger = require('./logger');

class Database {
  constructor() {
    this.connected = false;
    this.retryCount = 0;
    this.maxRetries = 5;
    this.retryDelay = 5000; // 5 seconds
  }

  async connect() {
    try {
      // Configure mongoose settings
      mongoose.set('strictQuery', false);
      
      // Add connection event listeners
      mongoose.connection.on('connected', () => {
        logger.info('MongoDB connected successfully');
        this.connected = true;
        this.retryCount = 0;
      });

      mongoose.connection.on('error', (err) => {
        logger.errorWithContext('MongoDB connection error', err);
        this.connected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.connected = false;
        
        // Attempt to reconnect
        if (this.retryCount < this.maxRetries) {
          this.retryCount++;
          logger.info(`Attempting to reconnect to MongoDB... (${this.retryCount}/${this.maxRetries})`);
          
          setTimeout(() => {
            this.connect();
          }, this.retryDelay);
        } else {
          logger.error('Max reconnection attempts reached. Exiting...');
          process.exit(1);
        }
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected successfully');
        this.connected = true;
        this.retryCount = 0;
      });

      // Handle process termination
      process.on('SIGINT', this.gracefulShutdown.bind(this));
      process.on('SIGTERM', this.gracefulShutdown.bind(this));

      // Connect to MongoDB
      await mongoose.connect(config.database.uri, config.database.options);
      
      // Log successful connection
      logger.info('Database connection established', {
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name
      });

    } catch (error) {
      logger.errorWithContext('Failed to connect to MongoDB', error);
      
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        logger.info(`Retrying connection... (${this.retryCount}/${this.maxRetries})`);
        
        setTimeout(() => {
          this.connect();
        }, this.retryDelay);
      } else {
        logger.error('Max connection attempts reached. Exiting...');
        process.exit(1);
      }
    }
  }

  async gracefulShutdown(signal) {
    logger.info(`Received ${signal}. Closing MongoDB connection...`);
    
    try {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
      process.exit(0);
    } catch (error) {
      logger.errorWithContext('Error during graceful shutdown', error);
      process.exit(1);
    }
  }

  // Health check
  isConnected() {
    return this.connected && mongoose.connection.readyState === 1;
  }

  // Get connection stats
  getStats() {
    if (!this.isConnected()) {
      return { connected: false };
    }

    return {
      connected: true,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      database: mongoose.connection.name,
      readyState: mongoose.connection.readyState,
      collections: Object.keys(mongoose.connection.collections).length
    };
  }
}

module.exports = new Database();