import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Button } from '../../components/ui';
import { toast } from 'react-hot-toast';

const ResendVerification = ({ email }) => {
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    try {
        const res = await api.post('/api/auth/resend-verification', { email });
        toast.success(res.data.message);
        setCooldown(60); // Start 60s cooldown (simple client side, backend enforces 5 mins)
    } catch (error) {
        if (error.response?.status === 429) {
             // Backend rate limit
             const retryAfter = error.response.data.retryAfter || 60;
             setCooldown(retryAfter);
             toast.error(`Please wait ${Math.ceil(retryAfter/60)} mins`);
        } else {
             toast.error(error.response?.data?.error || "Failed to send email");
        }
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="mt-4 text-center">
       <p className="text-sm text-gray-500 mb-2">Didn't receive the email?</p>
       <Button
         variant="ghost"
         size="sm"
         onClick={handleResend}
         disabled={loading || cooldown > 0}
         className="text-blue-600 hover:text-blue-700"
       >
         {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Verification Email"}
       </Button>
    </div>
  );
};

export default ResendVerification;
