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

// Public Route Component
const PublicRoute = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();
  
  if (isAuthenticated) {
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
        <Route path="/auth/verify-email" element={<VerifyEmailNotice />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />

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
