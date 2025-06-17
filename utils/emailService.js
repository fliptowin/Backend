const nodemailer = require('nodemailer');
const config = require('../config/config');

class EmailService {
  constructor() {
    this.transporter = null;
    this.enabled = config.email.enabled;
    
    if (this.enabled) {
      try {
        // Enhanced configuration for Hostinger
        const transportConfig = {
          host: config.email.host,
          port: config.email.port,
          secure: config.email.secure, // true for 465, false for other ports
          auth: config.email.auth,
          connectionTimeout: config.email.connectionTimeout || 30000,
          greetingTimeout: config.email.greetingTimeout || 30000,
          socketTimeout: config.email.socketTimeout || 30000,
          logger: false, // Set to true for debugging
          debug: false, // Set to true for debugging
        };        // Don't use 'service' for custom SMTP like Hostinger
        if (config.email.service !== 'hostinger') {
          transportConfig.service = config.email.service;
        }

        this.transporter = nodemailer.createTransport(transportConfig);
        
        console.log('✅ Email transporter created successfully');
        console.log(`📧 SMTP Host: ${config.email.host}:${config.email.port}`);
        console.log(`🔐 Secure: ${config.email.secure}`);
        
      } catch (error) {
        console.warn('❌ Failed to create email transporter:', error.message);
        this.enabled = false;
      }
    } else {
      console.warn('⚠️ Email service not enabled - missing configuration');
    }
  }
  async sendEmail(options) {
    if (!this.enabled) {
      console.warn('Email service not configured, skipping email send');
      return { success: false, message: 'Email service not configured' };
    }

    try {
      // Test connection before sending
      await this.testConnection();
      
      const emailOptions = {
        from: options.from || config.email.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text
      };

      console.log(`📧 Sending email to: ${emailOptions.to}`);
      const result = await this.transporter.sendMail(emailOptions);
      console.log('✅ Email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Failed to send email:', error.message);
      return { success: false, message: error.message };
    }
  }

  async testConnection() {
    if (!this.enabled || !this.transporter) {
      throw new Error('Email service not configured');
    }

    try {
      await this.transporter.verify();
      console.log('✅ SMTP connection verified');
      return true;
    } catch (error) {
      console.error('❌ SMTP connection failed:', error.message);
      throw error;
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
