// controllers/authController.js - UPDATED WITH ACCOUNT DELETION
const crypto = require('crypto');
const User = require('../models/User');
const Folder = require('../models/Folder');
const DriveMapping = require('../models/DriveMapping');
const emailService = require('../services/emailService');
const { generateTokens, verifyRefreshToken } = require('../middleware/auth');
const { initDriveClient } = require('../config/drive');

const { drive } = initDriveClient();

/**
 * Register new user
 */
const signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ 
        error: 'Please provide username, email, and password' 
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters long' 
      });
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return res.status(400).json({ 
        error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
      });
    }

    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      return res.status(400).json({ error: 'Username already taken' });
    }

    const user = new User({
      username,
      email,
      password,
      theme: 'system'
    });

    const verificationToken = user.createEmailVerificationToken();
    await user.save();

    await Folder.create([
      { name: 'Documents', user: user._id, isDefault: true, color: '#3b82f6' },
      { name: 'Images', user: user._id, isDefault: true, color: '#10b981' },
      { name: 'Videos', user: user._id, isDefault: true, color: '#f59e0b' },
      { name: 'Music', user: user._id, isDefault: true, color: '#8b5cf6' }
    ]);

    try {
      await emailService.sendVerificationEmail(user, verificationToken);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    res.status(201).json({
      message: 'Account created successfully! Please check your email to verify your account.',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isEmailVerified: user.isEmailVerified
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
};

/**
 * Login user
 */
const login = async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({ 
        error: 'Please provide email/username and password' 
      });
    }

    const user = await User.findOne({
      $or: [
        { email: emailOrUsername.toLowerCase() },
        { username: emailOrUsername }
      ]
    }).select('+password');

    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    if (user.isLocked) {
      return res.status(403).json({ 
        error: 'Account temporarily locked due to multiple failed login attempts. Please try again later.',
        code: 'ACCOUNT_LOCKED'
      });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      await user.incLoginAttempts();
      
      return res.status(401).json({ 
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    await user.resetLoginAttempts();

    const { accessToken, refreshToken } = generateTokens(user._id);

    const deviceInfo = req.headers['user-agent'] || 'Unknown device';
    await user.addRefreshToken(refreshToken, deviceInfo);

    await user.cleanExpiredTokens();

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        theme: user.theme
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

/**
 * Logout user
 */
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      const user = await User.findById(req.userId);
      if (user) {
        await user.removeRefreshToken(refreshToken);
      }
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

/**
 * Refresh access token
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      return res.status(401).json({ 
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const storedToken = user.refreshTokens.find(rt => rt.token === refreshToken);
    
    if (!storedToken) {
      return res.status(401).json({ 
        error: 'Refresh token not found',
        code: 'TOKEN_NOT_FOUND'
      });
    }

    if (storedToken.expiresAt < new Date()) {
      await user.removeRefreshToken(refreshToken);
      return res.status(401).json({ 
        error: 'Refresh token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);

    const deviceInfo = req.headers['user-agent'] || 'Unknown device';
    
    await User.findByIdAndUpdate(
      user._id,
      {
        $pull: { refreshTokens: { token: refreshToken } }
      }
    );
    
    await user.addRefreshToken(newRefreshToken, deviceInfo);

    res.json({
      accessToken,
      refreshToken: newRefreshToken
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    
    if (error.name === 'VersionError') {
      try {
        const decoded = verifyRefreshToken(req.body.refreshToken);
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId);
        
        return res.json({
          accessToken,
          refreshToken: newRefreshToken,
          warning: 'Token refreshed despite concurrent update'
        });
      } catch (fallbackError) {
        console.error('Fallback refresh also failed:', fallbackError);
      }
    }
    
    res.status(500).json({ 
      error: 'Token refresh failed',
      code: 'REFRESH_FAILED'
    });
  }
};

/**
 * Verify email
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: 'Verification token required' });
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        error: 'Invalid or expired verification token',
        code: 'INVALID_TOKEN'
      });
    }

    await User.findByIdAndUpdate(
      user._id,
      {
        $set: { isEmailVerified: true },
        $unset: { 
          emailVerificationToken: 1,
          emailVerificationExpires: 1
        }
      }
    );

    const updatedUser = await User.findById(user._id);

    try {
      await emailService.sendWelcomeEmail(updatedUser);
    } catch (emailError) {
      console.error('Welcome email failed:', emailError);
    }

    res.json({ 
      message: 'Email verified successfully!',
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        isEmailVerified: updatedUser.isEmailVerified
      }
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Email verification failed' });
  }
};

/**
 * Resend verification email
 */
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    if (!user.canResendVerificationEmail()) {
      const cooldownSeconds = user.getVerificationEmailCooldown();
      return res.status(429).json({ 
        error: `Please wait ${Math.ceil(cooldownSeconds / 60)} minutes before requesting another verification email`,
        code: 'RATE_LIMITED',
        retryAfter: cooldownSeconds
      });
    }

    const verificationToken = user.createEmailVerificationToken();
    await user.save();

    await emailService.sendVerificationEmail(user, verificationToken);

    res.json({ 
      message: 'Verification email sent successfully',
      cooldownMinutes: 5
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
};

/**
 * Request password reset
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.json({ 
        message: 'If an account exists with this email, a password reset link has been sent' 
      });
    }

    const resetToken = user.createPasswordResetToken();
    await user.save();

    try {
      await emailService.sendPasswordResetEmail(user, resetToken);
    } catch (emailError) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
      
      return res.status(500).json({ error: 'Failed to send password reset email' });
    }

    res.json({ 
      message: 'If an account exists with this email, a password reset link has been sent' 
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Password reset request failed' });
  }
};

/**
 * Reset password
 */
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters long' 
      });
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return res.status(400).json({ 
        error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
      });
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        error: 'Invalid or expired reset token',
        code: 'INVALID_TOKEN'
      });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.refreshTokens = [];
    
    await user.save();

    res.json({ message: 'Password reset successfully! Please login with your new password.' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update storage stats
    await user.updateStorageUsed();

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        storageUsed: user.storageUsed,
        storageLimit: user.storageLimit,
        theme: user.theme
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  try {
    const { username, theme } = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      user.username = username;
    }

    if (theme && ['light', 'dark', 'system'].includes(theme)) {
      user.theme = theme;
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        theme: user.theme
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

/**
 * Change password
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }

    const user = await User.findById(req.userId).select('+password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters long' 
      });
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      return res.status(400).json({ 
        error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
      });
    }

    user.password = newPassword;
    user.refreshTokens = [];
    await user.save();

    res.json({ message: 'Password changed successfully. Please login again.' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

/**
 * Request account deletion
 */
const requestAccountDeletion = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const deletionToken = user.createAccountDeletionToken();
    await user.save();

    try {
      await emailService.sendAccountDeletionEmail(user, deletionToken);
    } catch (emailError) {
      user.accountDeletionToken = undefined;
      user.accountDeletionExpires = undefined;
      await user.save();
      
      return res.status(500).json({ error: 'Failed to send account deletion email' });
    }

    res.json({ 
      message: 'Account deletion confirmation email sent. Please check your inbox.',
      expiresIn: '24 hours'
    });

  } catch (error) {
    console.error('Request account deletion error:', error);
    res.status(500).json({ error: 'Failed to request account deletion' });
  }
};

/**
 * Confirm account deletion
 */
const confirmAccountDeletion = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: 'Deletion token required' });
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      accountDeletionToken: hashedToken,
      accountDeletionExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        error: 'Invalid or expired deletion token',
        code: 'INVALID_TOKEN'
      });
    }

    // Delete all user files from Google Drive
    const files = await DriveMapping.find({ userId: user._id });
    
    for (const file of files) {
      try {
        await drive.files.delete({ fileId: file.driveId });
      } catch (driveError) {
        console.error('Drive deletion error:', driveError);
      }
    }

    // Delete all user data from database
    await DriveMapping.deleteMany({ userId: user._id });
    await Folder.deleteMany({ user: user._id });
    await User.deleteOne({ _id: user._id });

    res.json({ message: 'Account deleted successfully' });

  } catch (error) {
    console.error('Confirm account deletion error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};

module.exports = {
  signup,
  login,
  logout,
  refreshToken,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  changePassword,
  requestAccountDeletion,
  confirmAccountDeletion
};
