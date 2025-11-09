const nodemailer = require('nodemailer');
const { createClient } = require('redis');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    this.redis = createClient({
      url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
    });
    this.redis.connect();
  }

  async sendEmail(to, subject, html, attachments = []) {
    try {
      const result = await this.transporter.sendMail({
        from: `"${process.env.DEFAULT_SCHOOL_NAME || 'School Management'}" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
        attachments
      });

      // Store in Redis for rate limiting
      const key = `email:${to}:${Date.now()}`;
      await this.redis.setEx(key, 86400, 'sent'); // 24 hour expiry

      logger.info(`Email sent to ${to}: ${subject}`);
      return result;
    } catch (error) {
      logger.error('Email sending failed:', error);
      throw error;
    }
  }

  async sendPasswordResetEmail(email, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    
    const html = `
      <h1>Password Reset Request</h1>
      <p>We received a request to reset your password. Click the link below to reset it:</p>
      <a href="${resetUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    return this.sendEmail(email, 'Password Reset Request', html);
  }

  async sendAttendanceNotification(parentEmail, studentName, date, status) {
    const html = `
      <h1>Attendance Alert</h1>
      <p>Dear Parent,</p>
      <p>Your child <strong>${studentName}</strong> was marked <strong>${status}</strong> on ${date}.</p>
      <p>Please contact the school if you have any concerns.</p>
    `;

    return this.sendEmail(parentEmail, 'Attendance Notification', html);
  }

  async sendFeeReminderEmail(parentEmail, studentName, invoiceNumber, amount, dueDate) {
    const html = `
      <h1>Fee Payment Reminder</h1>
      <p>Dear Parent,</p>
      <p>This is a reminder that fee payment is due for <strong>${studentName}</strong>.</p>
      <ul>
        <li>Invoice Number: ${invoiceNumber}</li>
        <li>Amount Due: ₹${amount}</li>
        <li>Due Date: ${dueDate}</li>
      </ul>
      <p>Please make the payment to avoid late fees.</p>
      <a href="${process.env.FRONTEND_URL}/payments" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Pay Now</a>
    `;

    return this.sendEmail(parentEmail, 'Fee Payment Reminder', html);
  }

  async sendExamResultNotification(parentEmail, studentName, examName, grade) {
    const html = `
      <h1>Exam Results Published</h1>
      <p>Dear Parent,</p>
      <p>Results for <strong>${examName}</strong> have been published.</p>
      <p><strong>${studentName}</strong> has scored <strong>${grade}</strong>.</p>
      <p>Detailed results are available in the parent portal.</p>
      <a href="${process.env.FRONTEND_URL}/results" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Results</a>
    `;

    return this.sendEmail(parentEmail, 'Exam Results Published', html);
  }
}

module.exports = new EmailService();
