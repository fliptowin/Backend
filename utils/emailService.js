const nodemailer = require('nodemailer');
const config = require('../config/config');

class EmailService {  constructor() {
    this.transporter = null;
    this.enabled = config.email.enabled;
    
    if (this.enabled) {
      try {
        this.transporter = nodemailer.createTransport({
          service: config.email.service,
          host: config.email.host,
          port: config.email.port,
          secure: config.email.secure,
          auth: config.email.auth,
        });
      } catch (error) {
        console.warn('Failed to create email transporter:', error.message);
        this.enabled = false;
      }
    }
  }

  async sendEmail(options) {
    if (!this.enabled) {
      console.warn('Email service not configured, skipping email send');
      return { success: false, message: 'Email service not configured' };
    }

    try {
      const emailOptions = {
        from: options.from || config.email.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text
      };

      const result = await this.transporter.sendMail(emailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Failed to send email:', error);
      return { success: false, message: error.message };
    }
  }

  async sendOTP(email, otp) {
    return this.sendEmail({
      to: email,
      subject: "Your OTP Code",
      html: `<h3>Your OTP is: <b>${otp}</b></h3>`
    });
  }

  async sendWithdrawalNotification(adminEmail, withdrawalData) {
    const { requestId, userId, amount, upiId } = withdrawalData;
    
    return this.sendEmail({
      to: adminEmail,
      subject: `Withdrawal Request - ${userId}`,
      html: `
        <h2>New Withdrawal Request</h2>
        <p><strong>Request ID:</strong> ${requestId}</p>
        <p><strong>User ID:</strong> ${userId}</p>
        <p><strong>Amount:</strong> ₹${amount}</p>
        <p><strong>UPI ID:</strong> ${upiId}</p>
        <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
      `
    });
  }

  async sendDepositNotification(adminEmail, depositData) {
    const { requestId, userId, amount, utrNumber } = depositData;
    
    return this.sendEmail({
      to: adminEmail,
      subject: `Deposit Request - ${userId}`,
      html: `
        <h2>New Deposit Request</h2>
        <p><strong>Request ID:</strong> ${requestId}</p>
        <p><strong>User ID:</strong> ${userId}</p>
        <p><strong>Amount:</strong> ₹${amount}</p>
        <p><strong>UTR Number:</strong> ${utrNumber}</p>
        <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
      `
    });
  }

  async sendHelpQuery(adminEmail, queryData) {
    const { queryId, userId, subject, message } = queryData;
    
    return this.sendEmail({
      to: adminEmail,
      subject: `Help Query - ${subject}`,
      html: `
        <h2>New Help Query</h2>
        <p><strong>Query ID:</strong> ${queryId}</p>
        <p><strong>User ID:</strong> ${userId}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong> ${message}</p>
        <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
      `
    });
  }
}

module.exports = new EmailService();
