import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import { Button, Input, Spinner } from '../../components/ui';
import { toast } from 'react-hot-toast';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { token } = useParams();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
        await api.post(`/api/auth/reset-password/${token}`, { password });
        toast.success("Password reset successful. Please login.");
        navigate('/login');
    } catch (error) {
        toast.error(error.response?.data?.error || "Reset failed");
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
         <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">Set New Password</h1>

         <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="New Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 chars, 1 upper, 1 lower, 1 number"
            />

            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />

            <Button type="submit" className="w-full py-3" disabled={isSubmitting}>
               {isSubmitting ? <Spinner size="sm" className="border-white mx-auto" /> : "Reset Password"}
            </Button>
         </form>

         <div className="mt-4 text-center">
             <Link to="/login" className="text-sm text-blue-600 hover:underline">Back to Login</Link>
         </div>
      </div>
    </div>
  );
};

export default ResetPassword;
