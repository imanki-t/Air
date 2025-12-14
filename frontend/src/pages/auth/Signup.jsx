import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Spinner } from '../../components/ui';
import { toast } from 'react-hot-toast';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const Signup = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const validatePassword = (pass) => {
     return {
        length: pass.length >= 8,
        uppercase: /[A-Z]/.test(pass),
        lowercase: /[a-z]/.test(pass),
        number: /\d/.test(pass)
     };
  };

  const passwordCriteria = validatePassword(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !email || !password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
    }

    if (!Object.values(passwordCriteria).every(Boolean)) {
        toast.error("Password does not meet requirements");
        return;
    }

    setIsSubmitting(true);
    const result = await signup(username, email, password);
    setIsSubmitting(false);

    if (result.success) {
      // Typically redirect to a "Verify Email" page or Login
      toast.success("Account created! Please verify your email.");
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 relative overflow-hidden transition-colors duration-300">
       <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <div className="absolute right-0 bottom-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-purple-400 opacity-20 blur-[100px]"></div>
       </div>

      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 z-10 border border-gray-100 dark:border-gray-700 relative">
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-t-xl"></div>

         <div className="text-center mb-6">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 mb-2">Join AIRSTREAM</h1>
            <p className="text-gray-500 dark:text-gray-400">Create your secure cloud space</p>
         </div>

         <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Pick a unique username"
            />

            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
            />

            {/* Password Strength Meter */}
            {password && (
                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg text-xs space-y-1">
                    <p className="font-semibold text-gray-500 dark:text-gray-400 mb-1">Password Requirements:</p>
                    <div className={`flex items-center ${passwordCriteria.length ? 'text-green-600' : 'text-gray-400'}`}>
                        {passwordCriteria.length ? <FaCheckCircle className="mr-2"/> : <FaTimesCircle className="mr-2"/>} 8+ characters
                    </div>
                    <div className={`flex items-center ${passwordCriteria.uppercase ? 'text-green-600' : 'text-gray-400'}`}>
                        {passwordCriteria.uppercase ? <FaCheckCircle className="mr-2"/> : <FaTimesCircle className="mr-2"/>} Uppercase letter
                    </div>
                    <div className={`flex items-center ${passwordCriteria.lowercase ? 'text-green-600' : 'text-gray-400'}`}>
                        {passwordCriteria.lowercase ? <FaCheckCircle className="mr-2"/> : <FaTimesCircle className="mr-2"/>} Lowercase letter
                    </div>
                    <div className={`flex items-center ${passwordCriteria.number ? 'text-green-600' : 'text-gray-400'}`}>
                        {passwordCriteria.number ? <FaCheckCircle className="mr-2"/> : <FaTimesCircle className="mr-2"/>} Number
                    </div>
                </div>
            )}

            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
            />

            <Button type="submit" className="w-full py-3 text-lg mt-2 bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/30" disabled={isSubmitting}>
               {isSubmitting ? <Spinner size="sm" className="border-white mx-auto" /> : "Create Account"}
            </Button>
         </form>

         <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Already have an account? {' '}
            <Link to="/login" className="text-purple-600 hover:text-purple-500 font-bold">
              Sign in
            </Link>
         </div>
      </div>
    </div>
  );
};

export default Signup;
