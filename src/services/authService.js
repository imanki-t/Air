// src/services/authService.js - FRONTEND SERVICE
import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const authService = {
  /**
   * Sign up new user
   */
  async signup(username, email, password) {
    try {
      const response = await axios.post(`${API_URL}/api/auth/signup`, {
        username,
        email,
        password
      });
      return response.data;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  },

  /**
   * Login user
   */
  async login(emailOrUsername, password) {
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        emailOrUsername,
        password
      });
      
      if (response.data.accessToken) {
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  /**
   * Logout user
   */
  async logout() {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (refreshToken) {
        await axios.post(`${API_URL}/api/auth/logout`, {
          refreshToken
        }, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  },

  /**
   * Refresh access token
   */
  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await axios.post(`${API_URL}/api/auth/refresh-token`, {
        refreshToken
      });
      
      if (response.data.accessToken) {
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
      }
      
      return response.data;
    } catch (error) {
      console.error('Refresh token error:', error);
      this.logout();
      throw error;
    }
  },

  /**
   * Verify email
   */
  async verifyEmail(token) {
    try {
      const response = await axios.get(`${API_URL}/api/auth/verify-email/${token}`);
      return response.data;
    } catch (error) {
      console.error('Verify email error:', error);
      throw error;
    }
  },

  /**
   * Resend verification email
   */
  async resendVerification(email) {
    try {
      const response = await axios.post(`${API_URL}/api/auth/resend-verification`, {
        email
      });
      return response.data;
    } catch (error) {
      console.error('Resend verification error:', error);
      throw error;
    }
  },

  /**
   * Request password reset
   */
  async forgotPassword(email) {
    try {
      const response = await axios.post(`${API_URL}/api/auth/forgot-password`, {
        email
      });
      return response.data;
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  },

  /**
   * Reset password
   */
  async resetPassword(token, password) {
    try {
      const response = await axios.post(`${API_URL}/api/auth/reset-password/${token}`, {
        password
      });
      return response.data;
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  },

  /**
   * Get current user profile
   */
  async getProfile() {
    try {
      const response = await axios.get(`${API_URL}/api/auth/profile`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  },

  /**
   * Update user profile
   */
  async updateProfile(username, theme) {
    try {
      const response = await axios.put(
        `${API_URL}/api/auth/profile`,
        { username, theme },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`
          }
        }
      );
      
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  },

  /**
   * Change password
   */
  async changePassword(currentPassword, newPassword) {
    try {
      const response = await axios.put(
        `${API_URL}/api/auth/change-password`,
        {
          currentPassword,
          newPassword
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  },

  /**
   * Request account deletion
   */
  async requestAccountDeletion() {
    try {
      const response = await axios.post(
        `${API_URL}/api/auth/request-account-deletion`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Request account deletion error:', error);
      throw error;
    }
  },

  /**
   * Confirm account deletion
   */
  async confirmAccountDeletion(token) {
    try {
      const response = await axios.get(
        `${API_URL}/api/auth/confirm-account-deletion/${token}`
      );
      
      // Clear local storage after successful deletion
      this.logout();
      
      return response.data;
    } catch (error) {
      console.error('Confirm account deletion error:', error);
      throw error;
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!localStorage.getItem('accessToken');
  },

  /**
   * Get current user from localStorage
   */
  getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  /**
   * Set user in localStorage
   */
  setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  }
};

export default authService;
