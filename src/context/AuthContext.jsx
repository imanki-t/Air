// src/context/AuthContext.jsx - Authentication Context
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(localStorage.getItem('accessToken'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken'));

  const API_URL = import.meta.env.VITE_BACKEND_URL;

  // Axios interceptor for adding auth token
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(
      (config) => {
        if (accessToken && config.url?.startsWith(API_URL)) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    return () => axios.interceptors.request.eject(interceptor);
  }, [accessToken, API_URL]);

  // Axios interceptor for handling token refresh
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && 
            error.response?.data?.code === 'TOKEN_EXPIRED' && 
            !originalRequest._retry &&
            refreshToken) {
          originalRequest._retry = true;

          try {
            const response = await axios.post(`${API_URL}/api/auth/refresh-token`, {
              refreshToken
            });

            const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
            
            setAccessToken(newAccessToken);
            setRefreshToken(newRefreshToken);
            localStorage.setItem('accessToken', newAccessToken);
            localStorage.setItem('refreshToken', newRefreshToken);

            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return axios(originalRequest);
          } catch (refreshError) {
            logout();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, [refreshToken, API_URL]);

  const checkAuth = async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/api/auth/profile`);
      setUser(response.data.user);
    } catch (error) {
      console.error('Auth check failed:', error);
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/api/auth/refresh-token`, {
            refreshToken
          });
          
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
          setAccessToken(newAccessToken);
          setRefreshToken(newRefreshToken);
          localStorage.setItem('accessToken', newAccessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          const profileResponse = await axios.get(`${API_URL}/api/auth/profile`);
          setUser(profileResponse.data.user);
        } catch (refreshError) {
          logout();
        }
      } else {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    const response = await axios.post(`${API_URL}/api/auth/login`, credentials);
    const { accessToken: newAccessToken, refreshToken: newRefreshToken, user: userData } = response.data;
    
    setAccessToken(newAccessToken);
    setRefreshToken(newRefreshToken);
    setUser(userData);
    
    localStorage.setItem('accessToken', newAccessToken);
    localStorage.setItem('refreshToken', newRefreshToken);
    
    return response.data;
  };

  const signup = async (userData) => {
    const response = await axios.post(`${API_URL}/api/auth/signup`, userData);
    return response.data;
  };

  const logout = async () => {
    try {
      if (refreshToken) {
        await axios.post(`${API_URL}/api/auth/logout`, { refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  };

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
  };

  const value = {
    user,
    loading,
    accessToken,
    login,
    signup,
    logout,
    checkAuth,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
