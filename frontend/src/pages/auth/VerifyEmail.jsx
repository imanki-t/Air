import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import { Button, Spinner } from '../../components/ui';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const VerifyEmail = () => {
  const { token } = useParams();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verify = async () => {
        try {
            const res = await api.get(`/api/auth/verify-email/${token}`);
            setStatus('success');
            setMessage(res.data.message);
        } catch (error) {
            setStatus('error');
            setMessage(error.response?.data?.error || "Verification failed");
        }
    };
    if (token) verify();
  }, [token]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center border border-gray-100 dark:border-gray-700">
         {status === 'verifying' && (
             <div className="flex flex-col items-center">
                 <Spinner size="lg" className="mb-4 text-blue-600" />
                 <h2 className="text-xl font-semibold dark:text-white">Verifying your email...</h2>
             </div>
         )}

         {status === 'success' && (
             <div className="flex flex-col items-center text-green-600">
                 <FaCheckCircle className="text-5xl mb-4" />
                 <h2 className="text-2xl font-bold mb-2">Verified!</h2>
                 <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
                 <Link to="/login" className="w-full">
                    <Button className="w-full">Go to Login</Button>
                 </Link>
             </div>
         )}

         {status === 'error' && (
             <div className="flex flex-col items-center text-red-600">
                 <FaTimesCircle className="text-5xl mb-4" />
                 <h2 className="text-2xl font-bold mb-2">Verification Failed</h2>
                 <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
                 <Link to="/login" className="w-full">
                    <Button variant="secondary" className="w-full">Back to Login</Button>
                 </Link>
             </div>
         )}
      </div>
    </div>
  );
};

export default VerifyEmail;
