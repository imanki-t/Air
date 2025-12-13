// src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import authService from './services/authService';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import VerifyEmail from './pages/VerifyEmail';
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
  
  // If authenticated and we shouldn't allow, redirect to workspace
  if (isAuthenticated && !allowWhenAuthenticated) {
    return <Navigate to="/workspace" replace />;
  }

  return children;
};

function App() {
  return (
    <div className="min-h-screen">
      <Routes>
        {/* Home Route */}
        <Route
          path="/"
          element={
            authService.isAuthenticated() ? (
              <Navigate to="/workspace" replace />
            ) : (
              <Home />
            )
          }
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
        {/* This is the route that handles the email link click */}
        <Route 
          path="/verify-email" 
          element={
            <PublicRoute allowWhenAuthenticated={true}>
              <VerifyEmail />
            </PublicRoute>
          } 
        />
        
        {/* This is the waiting page after signup */}
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
