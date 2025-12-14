import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Spinner } from '../../components/ui';
import { toast } from 'react-hot-toast';

const Login = () => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quote, setQuote] = useState('');
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const quotes = [
    "Diamond hoe? In a locked chest. Respect it.",
    "Built a dirt house for the nostalgia. Would die for it.",
    "Trust issues? I cover my redstone with obsidian.",
    "History will remember me as the dirt block king",
    "My realm, my rules",
    "I craft, therefore I am",
    "Home is where the respawn point is",
    "Redstone is just digital wizardry",
    "In the beginning, there was wood",
    "The cake is a lie… but I still bake it"
  ];

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
    setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailOrUsername || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    const result = await login(emailOrUsername, password);
    setIsSubmitting(false);

    if (result.success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 relative overflow-hidden transition-colors duration-300">
       {/* Background Animation Layers - Preserving the "Vibe" */}
       <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-400 opacity-20 blur-[100px]"></div>
       </div>

      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 z-10 border border-gray-100 dark:border-gray-700 relative">
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-t-xl"></div>

         <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 mb-2">AIRSTREAM</h1>
            <p className="text-gray-500 dark:text-gray-400">Secure File Storage & Sharing</p>
         </div>

         <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Username or Email"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />

            <div className="flex items-center justify-between text-sm">
               <label className="flex items-center text-gray-600 dark:text-gray-400 cursor-pointer">
                 <input type="checkbox" className="mr-2 rounded text-blue-600 focus:ring-blue-500" />
                 Remember me
               </label>
               <Link to="/forgot-password" class="text-blue-600 hover:text-blue-500 font-medium">
                 Forgot password?
               </Link>
            </div>

            <Button type="submit" className="w-full py-3 text-lg shadow-lg shadow-blue-500/30" disabled={isSubmitting}>
               {isSubmitting ? <Spinner size="sm" className="border-white mx-auto" /> : "Sign In"}
            </Button>
         </form>

         <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Don't have an account? {' '}
            <Link to="/signup" className="text-blue-600 hover:text-blue-500 font-bold">
              Sign up
            </Link>
         </div>
      </div>

      <div className="mt-8 text-center max-w-md z-10 opacity-70">
         <p className="text-sm text-gray-500 italic">"{quote}"</p>
      </div>
    </div>
  );
};

export default Login;
