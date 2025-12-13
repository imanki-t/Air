// src/App.jsx - UPDATED WITH TOAST COMPONENT
import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import authService from './services/authService';
import Toast from './components/Toast';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import VerifyEmail from './pages/VerifyEmail';
import ConfirmAccountDeletion from './pages/ConfirmAccountDeletion';
import { VerifyEmailNotice, ForgotPassword } from './components/RemainingComponents';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();
  
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  return children;
};

// Public Route Component
const PublicRoute = ({ children, allowWhenAuthenticated = false }) => {
  const isAuthenticated = authService.isAuthenticated();
  
  if (isAuthenticated && !allowWhenAuthenticated) {
    return <Navigate to="/workspace" replace />;
  }

  return children;
};

function App() {
  // Apply theme on mount based on user preference
  useEffect(() => {
    const user = authService.getUser();
    const theme = user?.theme || 'system';
    
    const applyTheme = (selectedTheme) => {
      if (selectedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (selectedTheme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        // System preference
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    applyTheme(theme);

    // Listen for system theme changes if theme is set to 'system'
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e) => {
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  return (
    <div className="min-h-screen">
      {/* Global Toast Notification Component */}
      <Toast />
      
      <Routes>
        {/* Home Route - Allow authenticated users */}
        <Route path="/" element={<Home />} />

        {/* Auth Routes */}
        <Route
          path="/auth/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/auth/signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />
        
        {/* Email Verification Routes */}
        <Route 
          path="/verify-email" 
          element={
            <PublicRoute allowWhenAuthenticated={true}>
              <VerifyEmail />
            </PublicRoute>
          } 
        />
        
        <Route 
          path="/auth/verify-email" 
          element={
            <PublicRoute allowWhenAuthenticated={true}>
              <VerifyEmailNotice />
            </PublicRoute>
          } 
        />
        
        <Route 
          path="/auth/forgot-password" 
          element={
            <PublicRoute allowWhenAuthenticated={true}>
              <ForgotPassword />
            </PublicRoute>
          } 
        />

        {/* Account Deletion Confirmation */}
        <Route 
          path="/confirm-account-deletion" 
          element={
            <PublicRoute allowWhenAuthenticated={true}>
              <ConfirmAccountDeletion />
            </PublicRoute>
          } 
        />

        {/* Protected Routes */}
        <Route
          path="/workspace"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* 404 Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
