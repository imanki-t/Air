// components/SignupPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const SignupPage = ({ darkMode }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(''); // State for success message
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const navigate = useNavigate();

  // Basic effect for clearing messages
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
    if (successMessage) {
        const timer = setTimeout(() => setSuccessMessage(''), 5000);
        return () => clearTimeout(timer);
    }
  }, [error, successMessage]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/auth/signup`, {
        username,
        password,
      });

      // Assuming backend sends success status and potentially logs in automatically
      if (res.status === 201) {
         setSuccessMessage('Account created successfully!');
         // Optional: Auto-login after signup
         // const token = res.data.token;
         // if (token) {
         //     localStorage.setItem('token', token);
         //     // Notify App.jsx or use a context for authentication state
         //     // navigate('/dashboard', { replace: true });
         // }
         // For now, redirect to login page after success message
         setTimeout(() => navigate('/login', { replace: true }), 2000); // Redirect after 2 seconds
      }


    } catch (err) {
      console.error('Signup error:', err);
      setLoading(false);
      if (err.response) {
        if (err.response.status === 400 && err.response.data.message === 'User already exists') {
          setError('Username already exists.');
        } else if (err.response.data && err.response.data.message) {
          setError(`Signup failed: ${err.response.data.message}`);
        } else {
          setError('Signup failed. Please try again.');
        }
      } else {
        setError('Network error. Please check your connection.');
      }

       // Add shake animation on error
      const form = document.getElementById('signup-form');
      if (form) {
        form.classList.add('animate-shake');
        setTimeout(() => form.classList.remove('animate-shake'), 500);
      }
    } finally {
        // Keep loading true if success message is shown until redirect
        if (!successMessage) {
             setLoading(false);
        }
    }
  };

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Consider adding some decorative elements similar to LoginPage */}
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto px-4 py-12"> {/* Added padding-top/bottom */}
        <div className="flex flex-col items-center">
          <div className="w-full relative max-w-xs sm:max-w-sm">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 rounded-2xl opacity-70 blur-sm animate-pulse"></div> {/* Adjusted gradient */}
            <div className="relative bg-gray-900/90 backdrop-blur-md rounded-xl overflow-hidden border border-gray-800">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-blue-500"></div> {/* Adjusted gradient */}
              <div className="absolute inset-0 bg-grid-pattern opacity-5"></div> {/* Reusing grid pattern class if defined */}
              <div className="p-6 pt-10">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-1"> {/* Adjusted gradient */}
                    CREATE ACCOUNT
                  </h2>
                  <p className="text-gray-400 text-sm">
                    Join KUWUTEN and manage your files securely!
                  </p>
                </div>
                <form id="signup-form" onSubmit={handleSubmit} className="space-y-4">
                  {/* Username Field */}
                  <div className="relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg blur opacity-30"></div> {/* Adjusted gradient */}
                    <div className="relative">
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Choose a Username"
                        className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoComplete="username"
                        required
                      />
                    </div>
                  </div>
                  {/* Password Field */}
                  <div className="relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg blur opacity-30"></div> {/* Adjusted gradient */}
                    <div className="relative">
                      <input
                        type={passwordVisible ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Choose a Password"
                        className="w-full px-4 py-3 pr-10 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoComplete="new-password"
                        required
                        minLength="6" // Example: Minimum password length
                      />
                       <button
                          type="button"
                          onClick={togglePasswordVisibility}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-400 transition-colors"
                          aria-label={passwordVisible ? "Hide password" : "Show password"}
                        >
                          {passwordVisible ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                    </div>
                  </div>
                   {/* Confirm Password Field */}
                   <div className="relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg blur opacity-30"></div> {/* Adjusted gradient */}
                    <div className="relative">
                      <input
                        type={passwordVisible ? "text" : "password"} // Use same visibility state
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm Password"
                        className="w-full px-4 py-3 pr-10 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoComplete="new-password"
                        required
                        minLength="6" // Match minimum length
                      />
                       {/* Optional: Add separate visibility toggle for confirm password */}
                    </div>
                  </div>
                  {error && (
                    <div className="py-2 px-3 bg-red-900/50 border border-red-700 rounded-lg text-red-400 text-sm flex items-center space-x-2 animate-pulse">
                       {/* Error icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>{error}</span>
                    </div>
                  )}
                   {successMessage && (
                    <div className="py-2 px-3 bg-green-900/50 border border-green-700 rounded-lg text-green-400 text-sm flex items-center space-x-2">
                       {/* Success icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{successMessage}</span>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium rounded-lg transition-all duration-200 relative overflow-hidden group disabled:opacity-50 disabled:cursor-wait"
                  >
                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-purple-400 to-blue-400 opacity-0 group-hover:opacity-20 transition-opacity duration-200"></span> {/* Adjusted gradient */}
                    <span className="flex items-center justify-center">
                        {loading && (
                            <svg className="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                         )}
                      {loading ? 'Signing Up...' : 'Sign Up'}
                    </span>
                  </button>
                 </form>
                 {/* Link to Login Page */}
                 <div className="text-center mt-4 text-sm">
                     <span className="text-gray-400">Already have an account? </span>
                     <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors"> {/* Link to login */}
                         Login
                     </Link>
                 </div>
              </div>
               {/* Optional: Add a quote here */}
              {/* <div className="p-4 border-t border-gray-800 text-center">
                <p className="text-gray-400 text-sm italic">Some signup quote</p>
              </div> */}
            </div>
          </div>
        </div>
      </div>
       {/* Add backend URL check and fatal error screen similar to App.jsx if needed */}
       {/* Add decorative elements and styles from LoginPage if desired */}
       {/* Include shake animation style if reusing */}
        <style jsx>{`
        /* Reuse or define background and shake animations */
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }

        .animate-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>
  );
};

export default SignupPage;
