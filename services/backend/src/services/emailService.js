import sgMail from '@sendgrid/mail';
import logger from '../utils/logger.js';

// Initialize SendGrid with API key from environment
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@skulmanager.org';
const FROM_NAME = process.env.FROM_NAME || 'Skul Manager';

// Set API key if available
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
} else {
  logger.warn('SENDGRID_API_KEY not configured. Emails will be logged but not sent.');
}

// Email templates
const templates = {
  notification: (data) => ({
    subject: data.subject || 'New Notification from School',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6, #6366f1); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
          .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 12px 12px; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📚 Skul Manager</h1>
          </div>
          <div class="content">
            <h2 style="color: #1f2937; margin-top: 0;">${data.title || 'Notification'}</h2>
            <p style="color: #4b5563;">${data.message}</p>
            ${data.actionUrl ? `<a href="${data.actionUrl}" class="button">View Details</a>` : ''}
          </div>
          <div class="footer">
            <p>This is an automated message from Skul Manager.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `${data.title || 'Notification'}\n\n${data.message}`
  }),

  forgotPassword: (data) => ({
    subject: 'Reset Your Password - Skul Manager',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6, #6366f1); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; margin: 24px 0; font-weight: 600; font-size: 16px; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 12px 12px; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin-top: 20px; border-radius: 4px; font-size: 14px; color: #92400e; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>🔐 Password Reset</h1></div>
          <div class="content">
            <p>Hello <strong>${data.name || 'User'}</strong>,</p>
            <p>We received a request to reset your password for your Skul Manager account. Click the button below to set a new password:</p>
            <div style="text-align: center;">
              <a href="${data.resetLink}" class="button">Reset My Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6b7280; font-size: 13px;">${data.resetLink}</p>
            <div class="warning">
              ⚠️ This link expires in <strong>1 hour</strong>. If you did not request a password reset, please ignore this email — your password will remain unchanged.
            </div>
          </div>
          <div class="footer"><p>Skul Manager - School Management System</p></div>
        </div>
      </body>
      </html>
    `,
    text: `Hello ${data.name || 'User'},\n\nReset your password by visiting:\n${data.resetLink}\n\nThis link expires in 1 hour.\n\nIf you did not request this, ignore this email.\n\nSkul Manager`
  }),

  passwordReset: (data) => ({
    subject: 'Password Reset - Skul Manager',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #ddd; }
          .code { background: #1f2937; color: #10b981; padding: 15px; font-size: 24px; text-align: center; letter-spacing: 4px; border-radius: 8px; margin: 20px 0; font-family: monospace; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>Password Reset</h1></div>
          <div class="content">
            <p>Hello <strong>${data.name || 'User'}</strong>,</p>
            <p>Your password has been reset. Your new temporary password is:</p>
            <div class="code">${data.tempPassword}</div>
            <p style="color: #dc2626;">Please change this password immediately after logging in.</p>
            <p><a href="https://skulmanager.org/login" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login Now</a></p>
          </div>
          <div class="footer"><p>Skul Manager - School Management System</p></div>
        </div>
      </body>
      </html>
    `,
    text: `Hello ${data.name || 'User'},\n\nYour password has been reset.\nNew password: ${data.tempPassword}\n\nPlease change it after logging in.\n\nLogin: https://skulmanager.org/login`
  }),

  welcome: (data) => ({
    subject: 'Welcome to Skul Manager!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #ddd; }
          .credentials { background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>Welcome to Skul Manager!</h1></div>
          <div class="content">
            <p>Hello <strong>${data.name}</strong>,</p>
            <p>Your account has been created.</p>
            <div class="credentials">
              <p><strong>Email:</strong> ${data.email}</p>
              <p><strong>Password:</strong> ${data.password}</p>
              <p><strong>Role:</strong> ${data.role}</p>
            </div>
            <p>Please login and change your password.</p>
            <p><a href="https://skulmanager.org/login" style="background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login Now</a></p>
          </div>
          <div class="footer"><p>Skul Manager - School Management System</p></div>
        </div>
      </body>
      </html>
    `,
    text: `Welcome ${data.name}!\n\nEmail: ${data.email}\nPassword: ${data.password}\nRole: ${data.role}\n\nLogin: https://skulmanager.org/login`
  }),

  announcement: (data) => ({
    subject: `Announcement: ${data.title}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #8b5cf6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #ddd; }
          .message { background: ${data.priority === 'high' ? '#fef2f2' : '#eff6ff'}; padding: 20px; border-left: 4px solid ${data.priority === 'high' ? '#dc2626' : '#3b82f6'}; border-radius: 0 8px 8px 0; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>School Announcement</h1></div>
          <div class="content">
            <div class="message">
              <h2>${data.title}</h2>
              <p>${data.message}</p>
            </div>
            <p style="margin-top: 20px; color: #666;">Posted by: ${data.sender || 'Administration'}</p>
          </div>
          <div class="footer"><p>Skul Manager - School Management System</p></div>
        </div>
      </body>
      </html>
    `,
    text: `ANNOUNCEMENT: ${data.title}\n\n${data.message}\n\nFrom: ${data.sender || 'Administration'}`
  }),

  feeReminder: (data) => ({
    subject: 'Fee Payment Reminder',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #ddd; }
          .amount { font-size: 32px; color: #dc2626; text-align: center; margin: 20px 0; font-weight: bold; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>Fee Payment Reminder</h1></div>
          <div class="content">
            <p>Dear Parent/Guardian,</p>
            <p>This is a reminder about outstanding fees for:</p>
            <p><strong>Student:</strong> ${data.studentName}<br><strong>Class:</strong> ${data.className || 'N/A'}<br><strong>Due:</strong> ${data.dueDate}</p>
            <div class="amount">KES ${data.amount.toLocaleString()}</div>
            <p><a href="https://skulmanager.org/app/my-fees" style="background: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Pay Now</a></p>
          </div>
          <div class="footer"><p>Skul Manager - School Management System</p></div>
        </div>
      </body>
      </html>
    `,
    text: `Fee Reminder\n\nStudent: ${data.studentName}\nAmount: KES ${data.amount.toLocaleString()}\nDue: ${data.dueDate}`
  }),

  message: (data) => ({
    subject: `New Message: ${data.subject || 'You have a message'}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #06b6d4; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #ddd; }
          .message-box { background: #f0fdfa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>New Message</h1></div>
          <div class="content">
            <p>Hello ${data.recipientName || 'there'},</p>
            <p>You have a new message:</p>
            <div class="message-box">
              <p><strong>From:</strong> ${data.senderName || 'A user'}</p>
              <p>${data.message}</p>
            </div>
            <p><a href="https://skulmanager.org/app/communication" style="background: #06b6d4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View & Reply</a></p>
          </div>
          <div class="footer"><p>Skul Manager - School Management System</p></div>
        </div>
      </body>
      </html>
    `,
    text: `New Message\n\nFrom: ${data.senderName}\n\n${data.message}\n\nReply at: https://skulmanager.org/app/communication`
  })
};

// Send email using SendGrid
export const sendEmail = async (to, templateName, data) => {
  const template = templates[templateName];
  if (!template) {
    logger.error(`Email template '${templateName}' not found`);
    return { success: false, error: 'Template not found' };
  }

  const { subject, html, text } = template(data);

  if (!SENDGRID_API_KEY) {
    logger.info('Email logged (SendGrid not configured):', { to, subject, templateName });
    return { success: true, simulated: true };
  }

  const msg = {
    to: Array.isArray(to) ? to : [to],
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject,
    html,
    text
  };

  try {
    const response = await sgMail.send(msg);
    logger.info('Email sent via SendGrid:', { to: msg.to, subject, statusCode: response[0].statusCode });
    return { success: true, statusCode: response[0].statusCode };
  } catch (error) {
    logger.error('SendGrid error:', { message: error.message, response: error.response?.body });
    return { success: false, error: error.message };
  }
};

// Send bulk emails
export const sendBulkEmails = async (recipients, templateName, data) => {
  const results = [];
  for (const recipient of recipients) {
    const result = await sendEmail(recipient.email, templateName, { ...data, name: recipient.name || recipient.email });
    results.push({ email: recipient.email, ...result });
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  return results;
};

export default { sendEmail, sendBulkEmails, templates: Object.keys(templates) };
