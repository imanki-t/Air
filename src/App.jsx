// src/App.jsx - UPDATED WITH ACCOUNT DELETION ROUTE
import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import authService from './services/authService';

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

// Public Route Component - UPDATED: Allow authenticated users on home
const PublicRoute = ({ children, allowWhenAuthenticated = false }) => {
  const isAuthenticated = authService.isAuthenticated();
  
  // Only redirect to workspace if not allowed when authenticated
  if (isAuthenticated && !allowWhenAuthenticated) {
    return <Navigate to="/workspace" replace />;
  }

  return children;
};

function App() {
  // Apply theme on mount
  useEffect(() => {
    const user = authService.getUser();
    const theme = user?.theme || 'system';
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // System preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  return (
    <div className="min-h-screen">
      <Routes>
        {/* Home Route - UPDATED: Allow authenticated users */}
        <Route
          path="/"
          element={<Home />}
        />

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
