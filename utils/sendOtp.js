const emailService = require('./emailService');

exports.sendOTP = async (email, otp) => {
  return emailService.sendOTP(email, otp);
};
