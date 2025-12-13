// src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import authService from './services/authService';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import { VerifyEmailNotice, ForgotPassword } from './components/RemainingComponents';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();
  
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  return children;
};

// Public Route Component - IMPROVED: Don't redirect if on certain pages
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

        {/* Auth Routes - IMPROVED: Allow going back during certain auth flows */}
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
        {/* Allow access to verify-email even when authenticated */}
        <Route 
          path="/auth/verify-email" 
          element={
            <PublicRoute allowWhenAuthenticated={true}>
              <VerifyEmailNotice />
            </PublicRoute>
          } 
        />
        {/* Allow access to forgot-password even when authenticated */}
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
