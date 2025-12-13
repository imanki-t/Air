// models/User.js - UPDATED WITH ACTUAL FEATURES
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores and hyphens']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  refreshTokens: [{
    token: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: Date,
    deviceInfo: String
  }],
  lastLogin: {
    type: Date,
    default: null
  },
  lastVerificationEmailSent: Date,
  accountDeletionToken: String,
  accountDeletionExpires: Date,
  storageUsed: {
    type: Number,
    default: 0
  },
  storageLimit: {
    type: Number,
    default: 15 * 1024 * 1024 * 1024 // 15GB default
  },
  theme: {
    type: String,
    enum: ['light', 'dark', 'system'],
    default: 'system'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  versionKey: false
});

// Virtual for checking if account is locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Handle failed login attempts
userSchema.methods.incLoginAttempts = async function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return await this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  const maxAttempts = 5;
  const lockTime = 2 * 60 * 60 * 1000; // 2 hours
  
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + lockTime };
  }
  
  return await this.updateOne(updates);
};

// Reset login attempts on successful login
userSchema.methods.resetLoginAttempts = async function() {
  return await this.updateOne({
    $set: { 
      loginAttempts: 0, 
      lastLogin: Date.now() 
    },
    $unset: { lockUntil: 1 }
  });
};

// Generate email verification token
userSchema.methods.createEmailVerificationToken = function() {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  this.lastVerificationEmailSent = Date.now();
  
  return verificationToken;
};

// Check if user can resend verification email (5 minute cooldown)
userSchema.methods.canResendVerificationEmail = function() {
  if (!this.lastVerificationEmailSent) return true;
  
  const cooldownPeriod = 5 * 60 * 1000;
  const timeSinceLastEmail = Date.now() - this.lastVerificationEmailSent.getTime();
  
  return timeSinceLastEmail >= cooldownPeriod;
};

// Get time until user can resend verification email
userSchema.methods.getVerificationEmailCooldown = function() {
  if (!this.lastVerificationEmailSent) return 0;
  
  const cooldownPeriod = 5 * 60 * 1000;
  const timeSinceLastEmail = Date.now() - this.lastVerificationEmailSent.getTime();
  const remainingTime = cooldownPeriod - timeSinceLastEmail;
  
  return remainingTime > 0 ? Math.ceil(remainingTime / 1000) : 0;
};

// Generate password reset token
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  
  return resetToken;
};

// Generate account deletion token
userSchema.methods.createAccountDeletionToken = function() {
  const deletionToken = crypto.randomBytes(32).toString('hex');
  
  this.accountDeletionToken = crypto
    .createHash('sha256')
    .update(deletionToken)
    .digest('hex');
  
  this.accountDeletionExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  return deletionToken;
};

// Add refresh token
userSchema.methods.addRefreshToken = async function(token, deviceInfo, retries = 3) {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await this.constructor.findByIdAndUpdate(
        this._id,
        {
          $push: {
            refreshTokens: {
              $each: [{
                token,
                expiresAt,
                deviceInfo,
                createdAt: new Date()
              }],
              $slice: -5
            }
          }
        },
        { new: true }
      );
      
      if (result) {
        this.refreshTokens = result.refreshTokens;
        return true;
      }
    } catch (error) {
      if (attempt === retries - 1) {
        console.error('Failed to add refresh token after retries:', error);
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
    }
  }
  
  return false;
};

// Remove refresh token
userSchema.methods.removeRefreshToken = async function(token, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await this.constructor.findByIdAndUpdate(
        this._id,
        {
          $pull: {
            refreshTokens: { token: token }
          }
        },
        { new: true }
      );
      
      if (result) {
        this.refreshTokens = result.refreshTokens;
        return true;
      }
    } catch (error) {
      if (attempt === retries - 1) {
        console.error('Failed to remove refresh token after retries:', error);
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
    }
  }
  
  return false;
};

// Clean expired tokens
userSchema.methods.cleanExpiredTokens = async function() {
  const now = Date.now();
  
  try {
    const result = await this.constructor.findByIdAndUpdate(
      this._id,
      {
        $pull: {
          refreshTokens: {
            expiresAt: { $lt: now }
          }
        }
      },
      { new: true }
    );
    
    if (result) {
      this.refreshTokens = result.refreshTokens;
    }
  } catch (error) {
    console.error('Failed to clean expired tokens:', error);
  }
};

// Update storage used
userSchema.methods.updateStorageUsed = async function() {
  const DriveMapping = mongoose.model('DriveMapping');
  
  const result = await DriveMapping.aggregate([
    { 
      $match: { 
        userId: this._id,
        $or: [
          { 'metadata.isTrashed': { $exists: false } },
          { 'metadata.isTrashed': false }
        ]
      } 
    },
    {
      $group: {
        _id: null,
        totalSize: { $sum: '$metadata.size' }
      }
    }
  ]);
  
  this.storageUsed = result.length > 0 ? result[0].totalSize : 0;
  await this.save();
  
  return this.storageUsed;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
