import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { Button, Input, Spinner } from '../../components/ui';
import { toast } from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    setIsSubmitting(true);
    try {
        await api.post('/api/auth/forgot-password', { email });
        setSent(true);
        toast.success("Reset link sent if account exists");
    } catch (error) {
        toast.error("Request failed");
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
         <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Reset Password</h1>
            <p className="text-gray-500 dark:text-gray-400">Enter your email to receive instructions</p>
         </div>

         {!sent ? (
             <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />

                <Button type="submit" className="w-full py-3" disabled={isSubmitting}>
                   {isSubmitting ? <Spinner size="sm" className="border-white mx-auto" /> : "Send Reset Link"}
                </Button>
             </form>
         ) : (
             <div className="text-center space-y-4">
                 <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 p-4 rounded-lg">
                    If an account matches <strong>{email}</strong>, you will receive an email with instructions to reset your password.
                 </div>
                 <Button onClick={() => setSent(false)} variant="secondary" className="w-full">
                    Try another email
                 </Button>
             </div>
         )}

         <div className="mt-6 text-center text-sm">
            <Link to="/login" className="text-blue-600 hover:text-blue-500 font-medium">
              Back to Login
            </Link>
         </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
