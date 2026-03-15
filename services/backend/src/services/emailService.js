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

  reportCard: (data) => ({
    subject: `CBC Report Card — ${data.studentName} | ${data.term} ${data.academicYear}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f6f9; }
          .container { max-width: 620px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 32px 30px; text-align: center; border-radius: 12px 12px 0 0; }
          .header h1 { margin: 0 0 6px; font-size: 22px; }
          .header p { margin: 0; opacity: 0.85; font-size: 14px; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .greeting { font-size: 16px; color: #374151; margin-bottom: 16px; }
          .student-card { background: #f0f4ff; border: 1px solid #c7d2fe; border-radius: 10px; padding: 20px; margin: 20px 0; }
          .student-card h2 { margin: 0 0 4px; font-size: 18px; color: #1e1b4b; }
          .student-card .meta { color: #6b7280; font-size: 13px; margin: 0 0 16px; }
          .grade-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
          .grade-badge { display: inline-block; padding: 6px 18px; border-radius: 20px; font-weight: 700; font-size: 16px; background: #4f46e5; color: white; }
          .stat-grid { display: flex; gap: 12px; margin: 16px 0; }
          .stat-box { flex: 1; background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center; }
          .stat-box .val { font-size: 22px; font-weight: 700; color: #1f2937; }
          .stat-box .lbl { font-size: 11px; color: #9ca3af; margin-top: 2px; }
          .comment-box { background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 14px 16px; margin-top: 16px; }
          .comment-box p { margin: 0; font-size: 14px; color: #78350f; font-style: italic; }
          .cta { display: block; width: fit-content; margin: 24px auto 0; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; }
          .footer { background: #f3f4f6; padding: 18px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 12px 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 CBC Report Card</h1>
            <p>${data.schoolName}</p>
          </div>
          <div class="content">
            <p class="greeting">Dear <strong>${data.guardianName}</strong>,</p>
            <p style="color:#4b5563;">The CBC Report Card for <strong>${data.term} ${data.academicYear}</strong> is now available for your child:</p>

            <div class="student-card">
              <h2>${data.studentName}</h2>
              <p class="meta">Class: ${data.className} &bull; ${data.term} ${data.academicYear}</p>

              <div class="grade-row">
                <span style="font-size:14px;color:#374151;font-weight:600;">Overall Grade:</span>
                <span class="grade-badge">${data.overallGrade}</span>
              </div>

              <div class="stat-grid">
                <div class="stat-box">
                  <div class="val" style="color:#16a34a;">${data.daysPresent}</div>
                  <div class="lbl">Days Present</div>
                </div>
                <div class="stat-box">
                  <div class="val" style="color:#dc2626;">${data.daysAbsent}</div>
                  <div class="lbl">Days Absent</div>
                </div>
              </div>

              ${data.teacherComment ? `
              <div class="comment-box">
                <p style="font-size:11px;font-weight:700;color:#92400e;margin-bottom:6px;">CLASS TEACHER'S COMMENT</p>
                <p>"${data.teacherComment}"</p>
              </div>` : ''}
            </div>

            <p style="color:#4b5563;font-size:14px;">Log in to SkulManager to view the full report card including all learning areas, values, and competencies.</p>
            <a href="${data.loginUrl}" class="cta">View Full Report Card</a>
          </div>
          <div class="footer">
            <p>This message was sent by ${data.schoolName} via Skul Manager.</p>
            <p style="margin-top:4px;">Please do not reply to this email — contact the school office directly.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text:
      `Dear ${data.guardianName},\n\n` +
      `The CBC Report Card for ${data.term} ${data.academicYear} is available for ${data.studentName}.\n\n` +
      `Class: ${data.className}\nOverall Grade: ${data.overallGrade}\n` +
      `Days Present: ${data.daysPresent} | Days Absent: ${data.daysAbsent}\n` +
      (data.teacherComment ? `\nTeacher's Comment:\n"${data.teacherComment}"\n` : '') +
      `\nView the full report card at: ${data.loginUrl}\n\n` +
      `${data.schoolName}`,
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
