// services/emailService.js - Updated for Brevo API
const axios = require('axios');

class EmailService {
  constructor() {
    // Check if Brevo API key is configured
    if (!process.env.BREVO_API_KEY) {
      console.warn('⚠️  Brevo API key not configured. Email functionality will be disabled.');
      this.apiKey = null;
      return;
    }

    this.apiKey = process.env.BREVO_API_KEY;
    this.apiUrl = 'https://api.brevo.com/v3/smtp/email';
    console.log('✅ Email service initialized with Brevo API');
  }

  /**
   * Send email via Brevo API
   */
  async sendEmail(to, subject, htmlContent, fromName = 'Airstream') {
    if (!this.apiKey) {
      console.warn('Email service not available. Skipping email.');
      return false;
    }

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          sender: {
            name: fromName,
            email: process.env.BREVO_FROM_EMAIL || 'noreply@airstream.com'
          },
          to: [
            {
              email: to,
              name: to.split('@')[0]
            }
          ],
          subject: subject,
          htmlContent: htmlContent
        },
        {
          headers: {
            'accept': 'application/json',
            'api-key': this.apiKey,
            'content-type': 'application/json'
          }
        }
      );

      console.log(`Email sent successfully to ${to}`);
      return true;
    } catch (error) {
      console.error('Error sending email:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(user, token) {
    if (!this.apiKey) {
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

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user, token) {
    if (!this.apiKey) {
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

  /**
   * Send welcome email after verification
   */
  async sendWelcomeEmail(user) {
    if (!this.apiKey) {
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
              <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
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
}

module.exports = new EmailService();
