import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      const accessToken = localStorage.getItem('accessToken');
      const storedUser = localStorage.getItem('user');

      if (accessToken && storedUser) {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
        // Optionally verify token validity with a profile fetch
        try {
           const { data } = await api.get('/api/auth/profile');
           setUser(data.user);
           localStorage.setItem('user', JSON.stringify(data.user));
        } catch (err) {
           console.error("Session verification failed", err);
           // Interceptor will handle logout if 401
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (emailOrUsername, password) => {
    try {
      const { data } = await api.post('/api/auth/login', {
        emailOrUsername,
        password,
      });

      const { accessToken, refreshToken, user } = data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      setUser(user);
      setIsAuthenticated(true);
      toast.success(`Welcome back, ${user.username}!`);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      const message = error.response?.data?.error || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const signup = async (username, email, password) => {
    try {
      const { data } = await api.post('/api/auth/signup', {
        username,
        email,
        password,
      });

      // Auto login isn't usually the flow if email verification is required,
      // but here we might just redirect to a "Verify your email" page.
      // Or if the backend returns a user without tokens, we can't login yet.

      toast.success(data.message);
      return { success: true };
    } catch (error) {
       console.error('Signup error:', error);
       const message = error.response?.data?.error || 'Signup failed';
       return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
            await api.post('/api/auth/logout', { refreshToken }).catch(() => {});
        }
    } catch (err) {
        console.error("Logout error", err);
    } finally {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);
        toast.success('Logged out successfully');
    }
  };

  const updateUser = async (data) => {
      try {
          const res = await api.put('/api/auth/profile', data);
          const updatedUser = { ...user, ...res.data.user };
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
          toast.success("Profile updated");
          return { success: true };
      } catch (error) {
          const message = error.response?.data?.error || 'Update failed';
          toast.error(message);
          return { success: false, error: message };
      }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    signup,
    logout,
    updateUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
