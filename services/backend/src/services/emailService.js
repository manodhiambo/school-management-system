import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

// Create transporter - configure based on your email provider
const createTransporter = () => {
  // For production, use your SMTP provider (Gmail, SendGrid, etc.)
  // For development/testing, you can use Ethereal or Mailtrap
  
  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  };

  // Only create transporter if credentials are provided
  if (!config.auth.user || !config.auth.pass) {
    logger.warn('Email credentials not configured. Emails will be logged but not sent.');
    return null;
  }

  return nodemailer.createTransport(config);
};

let transporter = null;

// Initialize transporter
const initTransporter = () => {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
};

// Email templates
const templates = {
  notification: (data) => ({
    subject: data.subject || 'New Notification from School',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6, #6366f1); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📚 School Management System</h1>
          </div>
          <div class="content">
            <h2>${data.title || 'Notification'}</h2>
            <p>${data.message}</p>
            ${data.actionUrl ? `<a href="${data.actionUrl}" class="button">View Details</a>` : ''}
          </div>
          <div class="footer">
            <p>This is an automated message from your School Management System.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `${data.title || 'Notification'}\n\n${data.message}\n\n${data.actionUrl ? `View details: ${data.actionUrl}` : ''}`
  }),

  passwordReset: (data) => ({
    subject: 'Password Reset - School Management System',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6, #6366f1); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 10px 10px; }
          .code { background: #e5e7eb; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; border-radius: 6px; margin: 20px 0; }
          .warning { color: #dc2626; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset</h1>
          </div>
          <div class="content">
            <p>Hello ${data.name || 'User'},</p>
            <p>Your password has been ${data.isNewPassword ? 'set' : 'reset'} by the administrator.</p>
            <p>Your new temporary password is:</p>
            <div class="code">${data.tempPassword}</div>
            <p class="warning">⚠️ Please change this password immediately after logging in for security reasons.</p>
            <p>If you did not request this change, please contact the school administrator immediately.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from your School Management System.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Hello ${data.name || 'User'},\n\nYour password has been ${data.isNewPassword ? 'set' : 'reset'}.\n\nYour new temporary password is: ${data.tempPassword}\n\nPlease change this password immediately after logging in.\n\nIf you did not request this change, please contact the school administrator.`
  }),

  welcome: (data) => ({
    subject: 'Welcome to School Management System',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 10px 10px; }
          .credentials { background: #e5e7eb; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome!</h1>
          </div>
          <div class="content">
            <p>Hello ${data.name},</p>
            <p>Your account has been created on the School Management System.</p>
            <div class="credentials">
              <p><strong>Email:</strong> ${data.email}</p>
              <p><strong>Temporary Password:</strong> ${data.password}</p>
              <p><strong>Role:</strong> ${data.role}</p>
            </div>
            <p>Please login and change your password immediately.</p>
            ${data.loginUrl ? `<a href="${data.loginUrl}" class="button">Login Now</a>` : ''}
          </div>
          <div class="footer">
            <p>This is an automated message from your School Management System.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Hello ${data.name},\n\nYour account has been created.\n\nEmail: ${data.email}\nTemporary Password: ${data.password}\nRole: ${data.role}\n\nPlease login and change your password immediately.`
  }),

  announcement: (data) => ({
    subject: `📢 ${data.title}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 10px 10px; }
          .priority-high { border-left: 4px solid #dc2626; padding-left: 15px; }
          .priority-normal { border-left: 4px solid #3b82f6; padding-left: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📢 Announcement</h1>
          </div>
          <div class="content">
            <div class="${data.priority === 'high' ? 'priority-high' : 'priority-normal'}">
              <h2>${data.title}</h2>
              <p>${data.message}</p>
            </div>
            <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
              Posted by: ${data.sender || 'Administration'}<br>
              Date: ${new Date().toLocaleDateString()}
            </p>
          </div>
          <div class="footer">
            <p>This is an automated message from your School Management System.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `ANNOUNCEMENT: ${data.title}\n\n${data.message}\n\nPosted by: ${data.sender || 'Administration'}\nDate: ${new Date().toLocaleDateString()}`
  }),

  feeReminder: (data) => ({
    subject: '💰 Fee Payment Reminder',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 10px 10px; }
          .amount { font-size: 28px; font-weight: bold; color: #dc2626; text-align: center; margin: 20px 0; }
          .details { background: #fef2f2; padding: 15px; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💰 Fee Payment Reminder</h1>
          </div>
          <div class="content">
            <p>Dear Parent/Guardian,</p>
            <p>This is a reminder that there is an outstanding fee balance for:</p>
            <div class="details">
              <p><strong>Student:</strong> ${data.studentName}</p>
              <p><strong>Class:</strong> ${data.className || 'N/A'}</p>
              <p><strong>Due Date:</strong> ${data.dueDate}</p>
            </div>
            <div class="amount">KES ${data.amount.toLocaleString()}</div>
            <p>Please make the payment at your earliest convenience to avoid any inconvenience.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from your School Management System.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Fee Payment Reminder\n\nStudent: ${data.studentName}\nClass: ${data.className || 'N/A'}\nAmount Due: KES ${data.amount.toLocaleString()}\nDue Date: ${data.dueDate}\n\nPlease make the payment at your earliest convenience.`
  })
};

// Send email function
export const sendEmail = async (to, templateName, data) => {
  const trans = initTransporter();
  
  const template = templates[templateName];
  if (!template) {
    logger.error(`Email template '${templateName}' not found`);
    return { success: false, error: 'Template not found' };
  }

  const { subject, html, text } = template(data);

  const mailOptions = {
    from: process.env.SMTP_FROM || '"School Management System" <noreply@school.com>',
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html,
    text
  };

  // If no transporter (credentials not configured), log the email
  if (!trans) {
    logger.info('Email would be sent (no SMTP configured):', {
      to: mailOptions.to,
      subject: mailOptions.subject,
      templateName
    });
    return { success: true, simulated: true };
  }

  try {
    const info = await trans.sendMail(mailOptions);
    logger.info('Email sent:', { messageId: info.messageId, to: mailOptions.to });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Email send error:', error);
    return { success: false, error: error.message };
  }
};

// Send bulk emails
export const sendBulkEmails = async (recipients, templateName, data) => {
  const results = [];
  for (const recipient of recipients) {
    const result = await sendEmail(
      recipient.email,
      templateName,
      { ...data, name: recipient.name || recipient.email }
    );
    results.push({ email: recipient.email, ...result });
    
    // Add small delay between emails to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return results;
};

export default {
  sendEmail,
  sendBulkEmails,
  templates: Object.keys(templates)
};
