// services/emailService.js - COMPLETE WITH ACCOUNT DELETION EMAIL
const { google } = require('googleapis');

class EmailService {
  constructor() {
    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET || !process.env.GMAIL_REFRESH_TOKEN) {
      console.warn('⚠️  Gmail API credentials not configured. Email functionality will be disabled.');
      this.gmail = null;
      return;
    }

    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        'https://developers.google.com/oauthplayground'
      );

      oauth2Client.setCredentials({
        refresh_token: process.env.GMAIL_REFRESH_TOKEN
      });

      this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      this.fromEmail = process.env.GMAIL_FROM_EMAIL || process.env.SMTP_USER;
      
      console.log('✅ Email service initialized with Gmail API');
    } catch (error) {
      console.error('❌ Failed to initialize Gmail API:', error.message);
      this.gmail = null;
    }
  }

  createMessage(to, subject, htmlContent, fromName = 'Airstream') {
    const from = fromName ? `${fromName} <${this.fromEmail}>` : this.fromEmail;
    
    const messageParts = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      htmlContent
    ];

    const message = messageParts.join('\n');
    
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return encodedMessage;
  }

  async sendEmail(to, subject, htmlContent, fromName = 'Airstream') {
    if (!this.gmail) {
      console.warn('Email service not available. Skipping email.');
      return false;
    }

    try {
      const encodedMessage = this.createMessage(to, subject, htmlContent, fromName);

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage
        }
      });

      console.log(`✅ Email sent successfully to ${to} (Message ID: ${response.data.id})`);
      return true;
    } catch (error) {
      console.error('❌ Error sending email:', error.message);
      if (error.response) {
        console.error('Error details:', error.response.data);
      }
      return false;
    }
  }

  async sendVerificationEmail(user, token) {
    if (!this.gmail) {
      console.warn('Email service not available. Skipping verification email.');
      return false;
    }

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Airstream!</h1>
          </div>
          <div class="content">
            <h2>Hi ${user.username},</h2>
            <p>Thank you for signing up! We're excited to have you on board.</p>
            <p>To complete your registration and start using Airstream, please verify your email address by clicking the button below:</p>
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
            <p><strong>This link will expire in 24 hours.</strong></p>
            <p>If you didn't create an account with Airstream, you can safely ignore this email.</p>
            <p>Best regards,<br>The Airstream Team</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Airstream. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(
      user.email,
      'Verify Your Email - Airstream',
      htmlContent,
      'Airstream'
    );
  }

  async sendPasswordResetEmail(user, token) {
    if (!this.gmail) {
      console.warn('Email service not available. Skipping password reset email.');
      return false;
    }

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #f5576c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hi ${user.username},</h2>
            <p>We received a request to reset your password for your Airstream account.</p>
            <p>Click the button below to choose a new password:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; color: #f5576c;">${resetUrl}</p>
            <div class="warning">
              <strong>⚠️ Important:</strong>
              <ul>
                <li>This link will expire in 10 minutes</li>
                <li>For security reasons, you can only use this link once</li>
                <li>If you didn't request this reset, please ignore this email</li>
              </ul>
            </div>
            <p>Best regards,<br>The Airstream Team</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Airstream. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(
      user.email,
      'Password Reset Request - Airstream',
      htmlContent,
      'Airstream'
    );
  }

  async sendWelcomeEmail(user) {
    if (!this.gmail) {
      console.warn('Email service not available. Skipping welcome email.');
      return false;
    }
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .feature { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #667eea; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Welcome to Airstream!</h1>
          </div>
          <div class="content">
            <h2>Hi ${user.username},</h2>
            <p>Your email has been verified successfully! You now have full access to all Airstream features.</p>
            
            <h3>What you can do now:</h3>
            <div class="feature">
              <strong>📤 Upload Files</strong><br>
              Upload and organize your files securely in the cloud
            </div>
            <div class="feature">
              <strong>📁 Create Folders</strong><br>
              Organize your files with custom folders and categories
            </div>
            <div class="feature">
              <strong>🔗 Share Files</strong><br>
              Generate secure links to share your files with others
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/workspace" class="button">Go to Dashboard</a>
            </div>
            
            <p>Happy file managing!<br>The Airstream Team</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Airstream. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(
      user.email,
      'Welcome to Airstream! 🎉',
      htmlContent,
      'Airstream'
    );
  }

  // NEW: Send account deletion confirmation email
  async sendAccountDeletionEmail(user, token) {
    if (!this.gmail) {
      console.warn('Email service not available. Skipping account deletion email.');
      return false;
    }

    const deletionUrl = `${process.env.FRONTEND_URL}/confirm-account-deletion?token=${token}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #dc2626; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Account Deletion Request</h1>
          </div>
          <div class="content">
            <h2>Hi ${user.username},</h2>
            <p>We received a request to permanently delete your Airstream account.</p>
            
            <div class="warning">
              <strong>⚠️ This action cannot be undone!</strong>
              <p>If you proceed, the following will be permanently deleted:</p>
              <ul>
                <li>Your account and profile information</li>
                <li>All uploaded files and folders</li>
                <li>All shared links and file access</li>
                <li>Your entire file storage</li>
              </ul>
            </div>

            <p>If you're sure you want to delete your account, click the button below to confirm:</p>
            
            <div style="text-align: center;">
              <a href="${deletionUrl}" class="button">Confirm Account Deletion</a>
            </div>
            
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; color: #dc2626;">${deletionUrl}</p>
            
            <p><strong>This link will expire in 24 hours.</strong></p>
            
            <p>If you didn't request account deletion, please ignore this email and your account will remain active. We recommend changing your password if you didn't make this request.</p>
            
            <p>We're sorry to see you go.<br>The Airstream Team</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Airstream. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(
      user.email,
      'Confirm Account Deletion - Airstream',
      htmlContent,
      'Airstream'
    );
  }
}

module.exports = new EmailService();
