const { body, param, query, validationResult } = require('express-validator');
const Joi = require('joi');
const config = require('../config/config');
const logger = require('../config/logger');

// Express validator error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    logger.warn('Validation failed', {
      errors: errors.array(),
      ip: req.ip,
      url: req.originalUrl,
      body: req.body
    });

    return res.status(400).json({
      msg: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

// User registration validation
const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address')
    .isLength({ max: 255 })
    .withMessage('Email must be less than 255 characters'),
  
  body('phone')
    .isMobilePhone()
    .withMessage('Must be a valid phone number')
    .isLength({ min: 10, max: 15 })
    .withMessage('Phone number must be between 10-15 digits'),
  
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8-128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, lowercase letter, number, and special character'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  
  body('referralId')
    .optional()
    .isAlphanumeric()
    .isLength({ min: 6, max: 6 })
    .withMessage('Referral ID must be 6 alphanumeric characters'),
  
  handleValidationErrors
];

// User login validation
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ max: 128 })
    .withMessage('Password too long'),
  
  handleValidationErrors
];

// Game play validation
const validateGamePlay = [
  body('userId')
    .isAlphanumeric()
    .isLength({ min: 6, max: 6 })
    .withMessage('Invalid user ID format'),
  
  body('face')
    .isIn(['head', 'tail'])
    .withMessage('Face must be either "head" or "tail"'),
  
  body('amount')
    .isFloat({ min: config.game.minBetAmount, max: config.game.maxBetAmount })
    .withMessage(`Bet amount must be between ${config.game.minBetAmount} and ${config.game.maxBetAmount}`)
    .custom((value) => {
      // Ensure amount has at most 2 decimal places
      if (!/^\d+(\.\d{1,2})?$/.test(value.toString())) {
        throw new Error('Amount can have at most 2 decimal places');
      }
      return true;
    }),
  
  handleValidationErrors
];

// Password reset validation
const validatePasswordReset = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  
  handleValidationErrors
];

// OTP verification validation
const validateOTPVerification = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  
  body('otp')
    .isNumeric()
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits'),
  
  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8-128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, lowercase letter, number, and special character'),
  
  handleValidationErrors
];

// Balance/transaction validation
const validateTransaction = [
  body('amount')
    .isFloat({ min: 0.01, max: 100000 })
    .withMessage('Amount must be between 0.01 and 100000')
    .custom((value) => {
      if (!/^\d+(\.\d{1,2})?$/.test(value.toString())) {
        throw new Error('Amount can have at most 2 decimal places');
      }
      return true;
    }),
  
  body('type')
    .optional()
    .isIn(['deposit', 'withdrawal'])
    .withMessage('Type must be either "deposit" or "withdrawal"'),
  
  handleValidationErrors
];

// Admin validation
const validateAdminAction = [
  body('action')
    .isIn(['approve', 'reject', 'suspend', 'activate'])
    .withMessage('Invalid action'),
  
  body('reason')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Reason must be less than 500 characters'),
  
  handleValidationErrors
];

// User ID parameter validation
const validateUserId = [
  param('userId')
    .isAlphanumeric()
    .isLength({ min: 6, max: 6 })
    .withMessage('Invalid user ID format'),
  
  handleValidationErrors
];

// JOI schema for complex validation
const gamePlayJoiSchema = Joi.object({
  userId: Joi.string().alphanum().length(6).required(),
  face: Joi.string().valid('head', 'tail').required(),
  amount: Joi.number().min(config.game.minBetAmount).max(config.game.maxBetAmount).precision(2).required()
});

// JOI validation middleware
const validateWithJoi = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      logger.warn('JOI validation failed', {
        errors: error.details,
        ip: req.ip,
        url: req.originalUrl
      });

      return res.status(400).json({
        msg: 'Validation failed',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }))
      });
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateGamePlay,
  validatePasswordReset,
  validateOTPVerification,
  validateTransaction,
  validateAdminAction,
  validateUserId,
  gamePlayJoiSchema,
  validateWithJoi,
  handleValidationErrors
};
