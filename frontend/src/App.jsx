import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FileSystemProvider } from './context/FileSystemContext';
import { Toaster } from 'react-hot-toast';

// Auth Pages
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import VerifyEmail from './pages/auth/VerifyEmail';

// Layout
import DashboardLayout from './components/layout/DashboardLayout';

// Components
import FileBrowser from './components/files/FileBrowser';
import ProfileSettings from './components/profile/ProfileSettings';

// Placeholder
const SharedLinksPlaceholder = () => {
    // We can reuse ProfileSettings 'shared' tab logic or redirect to it
    return <Navigate to="/dashboard/profile" replace />;
};

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    if (loading) return <div className="min-h-screen flex items-center justify-center dark:bg-gray-900"><div className="animate-spin h-8 w-8 border-4 border-blue-600 rounded-full border-t-transparent"></div></div>;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return children;
};

function App() {
  return (
    <AuthProvider>
      <FileSystemProvider>
        <div className="text-gray-900 dark:text-gray-100 font-sans h-screen">
            <Toaster position="top-right" />
            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />
                <Route path="/verify-email/:token" element={<VerifyEmail />} />

                {/* Protected Dashboard Routes */}
                <Route path="/dashboard" element={
                    <ProtectedRoute>
                        <DashboardLayout />
                    </ProtectedRoute>
                }>
                    <Route index element={<Navigate to="files" replace />} />
                    <Route path="files/*" element={<FileBrowser title="My Files" />} />

                    {/* Reuse FileBrowser for special views.
                        Note: FileBrowser logic currently fetches ALL files and filters by folder.
                        We need to update FileSystemContext or FileBrowser to handle these special views
                        (Recent, Starred, Trash) which require different API endpoints.

                        For now, wiring them up, but we need to update FileSystemContext logic next.
                    */}
                    <Route path="recent" element={<FileBrowser title="Recent Files" />} />
                    <Route path="starred" element={<FileBrowser title="Starred Files" />} />
                    <Route path="trash" element={<FileBrowser title="Trash" />} />

                    <Route path="shared" element={<SharedLinksPlaceholder />} />
                    <Route path="profile" element={<ProfileSettings />} />
                </Route>

                {/* Root Redirect */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </div>
      </FileSystemProvider>
    </AuthProvider>
  );
}

export default App;
