// src/services/authService.js - UPDATED WITH ALL FEATURES
import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL + '/api/auth';

class AuthService {
  constructor() {
    this.setupInterceptors();
  }

  setupInterceptors() {
    axios.interceptors.request.use(
      (config) => {
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshAccessToken();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axios(originalRequest);
          } catch (refreshError) {
            this.logout();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async signup(username, email, password) {
    const response = await axios.post(`${API_URL}/signup`, {
      username,
      email,
      password
    });
    return response.data;
  }

  async login(emailOrUsername, password) {
    const response = await axios.post(`${API_URL}/login`, {
      emailOrUsername,
      password
    });
    
    if (response.data.accessToken) {
      this.setTokens(response.data.accessToken, response.data.refreshToken);
      this.setUser(response.data.user);
    }
    
    return response.data;
  }

  async logout() {
    const refreshToken = this.getRefreshToken();
    
    try {
      await axios.post(`${API_URL}/logout`, { refreshToken });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    this.clearTokens();
    this.clearUser();
  }

  async refreshAccessToken() {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(`${API_URL}/refresh-token`, {
      refreshToken
    });

    this.setTokens(response.data.accessToken, response.data.refreshToken);
    return response.data.accessToken;
  }

  async verifyEmail(token) {
    const response = await axios.get(`${API_URL}/verify-email/${token}`);
    return response.data;
  }

  async resendVerification(email) {
    const response = await axios.post(`${API_URL}/resend-verification`, {
      email
    });
    return response.data;
  }

  async forgotPassword(email) {
    const response = await axios.post(`${API_URL}/forgot-password`, {
      email
    });
    return response.data;
  }

  async resetPassword(token, password) {
    const response = await axios.post(`${API_URL}/reset-password/${token}`, {
      password
    });
    return response.data;
  }

  async getProfile() {
    const response = await axios.get(`${API_URL}/profile`);
    return response.data;
  }

  // UPDATED: Now accepts theme parameter
  async updateProfile(username, theme) {
    const response = await axios.put(`${API_URL}/profile`, {
      username,
      theme
    });
    
    // Update local storage with new user data
    if (response.data.user) {
      this.setUser(response.data.user);
    }
    
    return response.data;
  }

  async changePassword(currentPassword, newPassword) {
    const response = await axios.put(`${API_URL}/change-password`, {
      currentPassword,
      newPassword
    });
    return response.data;
  }

  // NEW: Request account deletion
  async requestAccountDeletion() {
    const response = await axios.post(`${API_URL}/request-account-deletion`);
    return response.data;
  }

  // Token management
  setTokens(accessToken, refreshToken) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  getAccessToken() {
    return localStorage.getItem('accessToken');
  }

  getRefreshToken() {
    return localStorage.getItem('refreshToken');
  }

  clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  // User management
  setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  }

  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  clearUser() {
    localStorage.removeItem('user');
  }

  isAuthenticated() {
    return !!this.getAccessToken();
  }

  isEmailVerified() {
    const user = this.getUser();
    return user?.isEmailVerified || false;
  }
}

export default new AuthService();
