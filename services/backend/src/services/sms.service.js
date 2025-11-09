const twilio = require('twilio');
const { createClient } = require('redis');
const logger = require('../utils/logger');

class SMSService {
  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    
    this.redis = createClient({
      url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
    });
    this.redis.connect();
  }

  async sendSMS(to, message) {
    try {
      // Rate limiting check
      const key = `sms:${to}:${Date.now()}`;
      const count = await this.redis.keys(`sms:${to}:*`);
      
      if (count.length >= 5) { // Max 5 SMS per day per number
        throw new Error('SMS rate limit exceeded for this number');
      }

      const result = await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_FROM_NUMBER,
        to: `+91${to}` // Assuming Indian numbers, adjust as needed
      });

      await this.redis.setEx(key, 86400, 'sent'); // 24 hour expiry

      logger.info(`SMS sent to ${to}: ${message.substring(0, 50)}...`);
      return result;
    } catch (error) {
      logger.error('SMS sending failed:', error);
      throw error;
    }
  }

  async sendAttendanceSMS(parentPhone, studentName, date, status) {
    const message = `Attendance Alert: ${studentName} was ${status} on ${date}. Please contact school if incorrect.`;
    return this.sendSMS(parentPhone, message);
  }

  async sendFeeReminderSMS(parentPhone, studentName, amount, dueDate) {
    const message = `Fee Reminder: Pay ₹${amount} for ${studentName} by ${dueDate}. Avoid late fees. ${process.env.FRONTEND_URL}/payments`;
    return this.sendSMS(parentPhone, message);
  }

  async sendEmergencyAlertSMS(parentPhone, studentName, message) {
    const smsMessage = `URGENT - ${studentName}: ${message}. Please contact school immediately.`;
    return this.sendSMS(parentPhone, smsMessage);
  }
}

module.exports = new SMSService();
