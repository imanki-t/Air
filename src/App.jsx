// src/App.jsx - Main Application Component
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

// Page Components
import Homepage from './pages/Homepage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import EmailVerification from './pages/EmailVerification';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ConfirmDeletion from './pages/ConfirmDeletion';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';

// Layout
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

function AppContent() {
  const { user, loading, logout, checkAuth } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' ? 'bg-gray-950' : 'bg-white'
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  const showFooter = ['dashboard', 'signup'].some(p => location.pathname.includes(p));

  return (
    <>
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Homepage />} />
      <Route 
        path="/login" 
        element={user ? <Navigate to="/dashboard" replace /> : <Login />} 
      />
      <Route 
        path="/signup" 
        element={user ? <Navigate to="/dashboard" replace /> : <Signup />} 
      />
      <Route path="/verify-email" element={<EmailVerification />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/confirm-account-deletion" element={<ConfirmDeletion />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    {showFooter && (
      <footer style={{ textAlign: 'center', padding: '16px', fontSize: '14px', color: theme === 'dark' ? '#9ca3af' : '#6b7280', borderTop: `1px solid ${theme === 'dark' ? '#1f2937' : '#e5e7eb'}` }}>
        © Airstream &nbsp;|&nbsp;{' '}
        <a href="https://quickwitty.onrender.com/contacts" style={{ color: '#3b82f6', textDecoration: 'none' }}>Contact Us</a>
      </footer>
    )}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
