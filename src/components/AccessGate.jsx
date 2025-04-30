 import React, { useState, useEffect } from 'react';
 import { useNavigate } from 'react-router-dom'; // Import useNavigate

 // Utility for conditional class names (if not already globally available)
 const cn = (...classes) => classes.filter(Boolean).join(' ');

 const AccessGate = ({ children, showLoginContent }) => { // Accept showLoginContent prop
   const [passkey, setPasskey] = useState(''); // 
   const [error, setError] = useState(''); // 
   const [fadeOut, setFadeOut] = useState(false); // 
   const [unlocked, setUnlocked] = useState(false); // 
   const [loading, setLoading] = useState(true); // 
   const [passwordVisible, setPasswordVisible] = useState(false); // 
   const [mouseMovePosition, setMouseMovePosition] = useState({ x: 0, y: 0 }); // 
   const [showPhases, setShowPhases] = useState(false); // 
   const navigate = useNavigate(); // Hook for navigation

   // Quotes and phase logic remain the same
   const quotes = ["Built a dirt house for the nostalgia. Would die for it.", /* ... other quotes ... */ "He still doesn’t know."]; //
   const [currentQuote, setCurrentQuote] = useState(''); // 
   const phases = ["Encrypting", "Securing", "Connecting", "Verifying"]; // 
   const [currentPhase, setCurrentPhase] = useState(0); // 
   const [phaseVisible, setPhaseVisible] = useState(false); // 
   const [phaseOpacity, setPhaseOpacity] = useState(0); // 

   // Effect to check initial unlock status
   useEffect(() => {
     const unlockedBefore = sessionStorage.getItem('access_granted');
     if (unlockedBefore === 'true') {
       setUnlocked(true);
       // No need to set loading false here, let the main return handle it
     } else {
       // Start loading animation timings
       setTimeout(() => setShowPhases(true), 2000); // Show phases after 2s 
       setTimeout(() => setLoading(false), 2000 + (phases.length * 800)); // Adjust total time based on phase duration 
     }

     // Mouse move effect remains the same
     const handleMouseMove = (e) => {
       const x = (e.clientX / window.innerWidth) * 10; // 
       const y = (e.clientY / window.innerHeight) * 10; // 
       setMouseMovePosition({ x, y }); // 
     };
     window.addEventListener('mousemove', handleMouseMove); // 
     return () => window.removeEventListener('mousemove', handleMouseMove); // 

   }, []);

   // Effects for quote typing, phase animation, error timeout remain similar
    useEffect(() => {
        const quote = quotes[Math.floor(Math.random() * quotes.length)]; // 
        setCurrentQuote(quote); // 
        // Typewriter effect (simplified)
        let index = 0;
        const typeInterval = setInterval(() => {
            setPasskey(prev => prev + quote.charAt(index)); // Simulate typing into passkey for visual effect
            index++;
            if (index >= quote.length) clearInterval(typeInterval);
        }, 50); // 
        return () => clearInterval(typeInterval);
    }, []); // Run only once

    useEffect(() => { // 
        if (loading && showPhases) { // 
            setPhaseVisible(true); // 
            setPhaseOpacity(1); // Simple fade in 
            const phaseTimer = setTimeout(() => { // 
                setPhaseOpacity(0); // Fade out 
                setTimeout(() => { // Wait for fade out before next phase 
                    setPhaseVisible(false); // 
                    if (currentPhase < phases.length - 1) {
                        setCurrentPhase(prev => prev + 1); // 
                    }
                }, 300); // Fade out duration
            }, 500); // Visible duration
            return () => clearTimeout(phaseTimer); // 
        }
    }, [currentPhase, loading, showPhases]); // 

    useEffect(() => { // 
        if (error) { // 
            const timer = setTimeout(() => setError(''), 5000); // 
            return () => clearTimeout(timer); // 
        }
    }, [error]); // 


   // Handle Submit - Navigate on Success
   const handleSubmit = (e) => { // 
     e.preventDefault(); // 
     const correct = import.meta.env.VITE_SITE_PASSKEY || 'thechosenone'; // 
     if (passkey === correct) { // 
       // Play sound (optional)
       const audio = new Audio('/access-granted.mp3'); // 
       audio.play().catch(() => {}); // 

       setFadeOut(true); // 
       setTimeout(() => { // 
         setUnlocked(true); // 
         sessionStorage.setItem('access_granted', 'true'); // 
         // *** Navigate to the dashboard after successful login ***
         navigate('/dashboard', { replace: true }); // Use navigate
       }, 800); // 
     } else {
       setError('Access Denied: Invalid Passkey'); // 
       setPasskey(''); // 
       // Shake animation
       const form = document.getElementById('access-form'); // 
       if (form) { // 
         form.classList.add('animate-shake'); // 
         setTimeout(() => form.classList.remove('animate-shake'), 500); // 
       }
     }
   };

   // Toggle password visibility remains the same 
   const togglePasswordVisibility = () => {
     setPasswordVisible(!passwordVisible); // 
   };

   // --- Render Logic ---

   // If already unlocked (session exists), render children immediately
   // This allows ProtectedRoute in App.jsx to work correctly on refresh
   if (unlocked) { // 
       // If children are provided (like the Navigate component from App.jsx), render them.
       // Otherwise, this component shouldn't render anything if already unlocked.
       return children || null; // Render children (Navigate in this case) or nothing
   }


   // If not unlocked, show Loading or Login UI
   return (
     <div
       className={cn( // 
         'fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-700 ease-in-out overflow-hidden',
         fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100', // Ensure faded out is not interactable
         darkMode ? 'bg-gradient-to-br from-gray-900 to-black' : 'bg-gradient-to-br from-blue-50 to-indigo-100' // Adjusted light theme gradient
       )}
       // Removed inline style for background
     >
       {/* Background Grid/Animations remain the same */}
        <div className="absolute inset-0 overflow-hidden"> {/* */}
            <div
                className="absolute inset-0 opacity-10"
                style={{
                    backgroundImage: 'linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(to right, rgba(59,130,246,0.3) 1px, transparent 1px)', // Slightly less intense grid 
                    backgroundSize: '50px 50px', // Larger grid 
                    transform: `translate(${mouseMovePosition.x}px, ${mouseMovePosition.y}px)`, // 
                    transition: 'transform 0.5s ease-out' // 
                }}
            />
            {/* Orbital rings */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none">
                {[1, 2, 3].map(ring => ( // Reduced rings 
                    <div key={ring}
                        className="absolute rounded-full border border-blue-500/10" // Less visible border 
                        style={{
                            top: '50%', // 
                            left: '50%', // 
                            transform: 'translate(-50%, -50%)', // 
                            width: `${ring * 50}%`, // Adjusted size/spacing 
                            height: `${ring * 50}%`, // 
                            animation: `orbital-rotation ${ring * 15 + 30}s linear infinite` // Adjusted speed 
                        }}
                    />
                ))}
            </div>
             {/* Floating particles */}
             <div className="absolute inset-0">
                {Array.from({ length: 20 }).map((_, i) => ( // Fewer particles 
                    <div key={i}
                        className="absolute rounded-full bg-gradient-to-r from-blue-400 to-purple-500 opacity-50" // Slightly more visible 
                        style={{
                            width: `${Math.random() * 4 + 1}px`, // Smaller particles 
                            height: `${Math.random() * 4 + 1}px`, // 
                            left: `${Math.random() * 100}%`, // 
                            top: `${Math.random() * 100}%`, // 
                            filter: 'blur(0.5px)', // Less blur 
                            animation: `float ${Math.random() * 8 + 8}s linear infinite alternate`, // Added alternate direction 
                            animationDelay: `${Math.random() * 4}s` // 
                        }}
                    />
                ))}
            </div>
            {/* Blur shapes */}
            <div className="absolute top-1/4 left-1/4 w-56 h-56 rounded-full bg-blue-500/5 blur-2xl animate-pulse"></div> {/* */}
            <div className="absolute bottom-1/4 right-1/4 w-56 h-56 rounded-full bg-purple-500/5 blur-2xl animate-pulse animation-delay-2000"></div> {/* */}
        </div>


       {/* Header remains the same */}
        <header className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 sm:px-6 py-4"> {/* */}
            <div className="flex items-center space-x-3"> {/* */}
                <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg"> {/* */}
                    <img // 
                        src="/android-chrome-512x512.png" // 
                        className="h-8 w-8 sm:h-9 sm:w-9" // 
                        alt="Kuwuten App Icon"
                    />
                </div>
                 <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight"> {/* */}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500"> {/* */}
                        KUWUTEN
                    </span>
                </h1>
            </div>
        </header>

       {/* Main Content Area */}
       <div className="relative z-10 w-full max-w-md mx-auto px-4 mt-24 sm:mt-28"> {/* */}
         {loading ? ( // 
           // Loading Screen remains the same
            <div className="flex flex-col items-center justify-center p-8"> {/* */}
                <div className="relative w-48 h-48 md:w-64 md:h-64 mb-6"> {/* Adjusted size */}
                    <div className="absolute inset-0"> {/* */}
                        {/* Spinners */}
                        <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-blue-500/30 border-b-blue-500/30 border-l-blue-500/30 animate-spin" style={{ animationDuration: '1s' }}></div> {/* */}
                        <div className="absolute inset-4 rounded-full border-4 border-t-purple-500 border-r-purple-500/30 border-b-purple-500/30 border-l-purple-500/30 animate-spin" style={{ animationDuration: '1.2s', animationDirection: 'reverse' }}></div> {/* */}
                        <div className="absolute inset-8 rounded-full border-4 border-t-teal-500 border-r-teal-500/30 border-b-teal-500/30 border-l-teal-500/30 animate-spin" style={{ animationDuration: '1.4s' }}></div> {/* Changed color & speed */}
                    </div>
                     {/* Phase Text */}
                     {showPhases && phaseVisible && ( // 
                        <div className="absolute inset-0 flex items-center justify-center"> {/* */}
                            <span // 
                                className="text-gray-300 text-lg md:text-xl font-medium tracking-wider" // 
                                style={{
                                    opacity: phaseOpacity, // 
                                    transition: 'opacity 300ms ease-in-out', // 
                                }}
                            >
                                {phases[currentPhase]}... {/* Added ellipsis */}
                            </span>
                        </div>
                    )}
                </div>
                <p className={`mt-4 text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Initializing secure session...</p> {/* Added loading text */}
            </div>
         ) : (
           // Login Form Structure remains similar, styling adjusted
            <div className="flex flex-col items-center"> {/* */}
                <div className="w-full relative max-w-xs sm:max-w-sm"> {/* */}
                    {/* Subtle animated gradient border */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl blur opacity-50 animate-pulse-slow group-hover:opacity-75 transition-opacity duration-500"></div> {/* */}

                    <div className={cn("relative rounded-xl overflow-hidden border backdrop-blur-lg", darkMode ? "bg-gray-900/80 border-gray-700/50" : "bg-white/80 border-gray-200/50")}> {/* */}
                         {/* Optional top accent line */}
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div> {/* */}

                        <div className="p-6 sm:p-8"> {/* */}
                             <div className="text-center mb-6 sm:mb-8"> {/* */}
                                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-2"> {/* */}
                                    Secure Access
                                </h2>
                                <p className={cn("text-sm", darkMode ? "text-gray-400" : "text-gray-600")}> {/* */}
                                    Enter passkey to continue {/* */}
                                </p>
                            </div>
                            <form id="access-form" onSubmit={handleSubmit} className="space-y-5"> {/* */}
                                {/* Input Field with Eye Icon */}
                                <div className="relative"> {/* */}
                                     {/* Input Background Glow (optional) */}
                                    <div className="absolute -inset-px bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur-sm opacity-0 group-focus-within:opacity-20 transition-opacity duration-300"></div> {/* */}
                                    <div className="relative"> {/* */}
                                        <input // 
                                            type={passwordVisible ? "text" : "password"} // 
                                            value={passkey} // 
                                            onChange={(e) => setPasskey(e.target.value)} // 
                                            placeholder="Enter Passkey" // Added placeholder
                                            className={cn( // 
                                                "w-full px-4 py-3 pr-10 rounded-lg border transition-all duration-200",
                                                "focus:outline-none focus:ring-2 focus:ring-offset-2",
                                                darkMode
                                                    ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 focus:ring-blue-500 focus:ring-offset-gray-900"
                                                    : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:ring-offset-white"
                                            )}
                                            autoComplete="current-password" // More appropriate autocomplete 
                                            required // Added required attribute
                                        />
                                        <button // 
                                            type="button" // 
                                            onClick={togglePasswordVisibility} // 
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-400 transition-colors p-1" // 
                                            aria-label={passwordVisible ? "Hide password" : "Show password"} // 
                                        >
                                            {passwordVisible ? ( // 
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> {/* */}
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59" /> {/* */}
                                                </svg>
                                            ) : ( // 
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> {/* */}
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /> {/* */}
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /> {/* */}
                                                </svg>
                                            )} {/* */}
                                        </button>
                                    </div>
                                </div>
                                {/* Error Message */}
                                 {error && ( // 
                                    <div className="py-2.5 px-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm flex items-center space-x-2 animate-pulse"> {/* */}
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> {/* */}
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> {/* Changed icon */}
                                        </svg>
                                        <span>{error}</span> {/* */}
                                    </div>
                                )}
                                {/* Submit Button */}
                                <button // 
                                    type="submit" // 
                                    className={cn( // 
                                        "w-full py-3 px-4 font-semibold rounded-lg transition-all duration-300 ease-in-out relative overflow-hidden group",
                                        "bg-gradient-to-r from-blue-600 to-purple-600 text-white",
                                        "hover:from-blue-500 hover:to-purple-500 hover:shadow-lg hover:scale-[1.02]",
                                        "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500",
                                        darkMode ? "focus:ring-offset-gray-900" : "focus:ring-offset-white"
                                    )}
                                >
                                     {/* Shine effect on hover */}
                                    <span className="absolute top-0 left-0 w-full h-full bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span> {/* */}
                                    <span className="relative flex items-center justify-center"> {/* */}
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> {/* */}
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /> {/* Changed icon */}
                                        </svg>
                                        Unlock Access {/* */}
                                    </span>
                                </button>
                            </form>
                            {/* Quote Section */}
                             <div className="mt-8 pt-4 border-t text-center border-gray-700/30"> {/* */}
                                <p className={cn("text-xs italic", darkMode ? "text-gray-500" : "text-gray-500")}> {/* */}
                                    "{currentQuote}" {/* Display random quote */}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
         )}
       </div>

       {/* Footer elements (Security Badges, Copyright) remain similar */}
        {/* Bottom-left Security Badges */}
        <div className="fixed bottom-4 left-4 sm:left-6 text-gray-500 text-xs hidden md:flex flex-col items-start space-y-1"> {/* */}
            <div className="flex items-center space-x-1.5"> {/* */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> {/* */}
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /> {/* */}
                </svg>
                <span>AES-256 Encrypted</span> {/* */}
            </div>
            <div className="flex items-center space-x-1.5"> {/* */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> {/* */}
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /> {/* */}
                </svg>
                <span>Secure Authentication</span> {/* */}
            </div>
        </div>

        {/* Copyright Text */}
        <div className="fixed bottom-4 right-4 sm:right-6 text-gray-500 text-xs max-w-[180px] sm:max-w-xs text-right leading-tight"> {/* */}
            <span>© {new Date().getFullYear()} Kuwuten</span> {/* */}
            <span className="hidden sm:inline"> • All Rights Reserved</span><br className="sm:hidden"/> {/* */}
            <span className="opacity-80">End-to-End Encrypted Storage</span> {/* */}
        </div>


       {/* CSS Animations remain the same */}
        <style jsx>{`
            /* Grid Pattern */
            .bg-grid-pattern { /* */
                background-image: radial-gradient(circle, rgba(59, 130, 246, 0.1) 0.5px, transparent 0.5px); /* */
                background-size: 30px 30px; /* */
            }

            /* Orbital Rotation */
            @keyframes orbital-rotation { /* */
                from { transform: translate(-50%, -50%) rotate(0deg); } /* */
                to { transform: translate(-50%, -50%) rotate(360deg); } /* */
            }

            /* Floating Particles */
            @keyframes float { /* */
                0%, 100% { transform: translateY(0) translateX(0); } /* */
                50% { transform: translateY(-15px) translateX(5px); } /* */
            }

            /* Shake Animation */
            @keyframes shake { /* */
                0%, 100% { transform: translateX(0); } /* */
                10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); } /* */
                20%, 40%, 60%, 80% { transform: translateX(4px); } /* */
            }
            .animate-shake { /* */
                animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; /* */
            }

             /* Slow Pulse for Border */
            @keyframes pulse-slow {
                0%, 100% { opacity: 0.5; }
                50% { opacity: 0.7; }
            }
            .animate-pulse-slow {
                animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            }
        `}</style>

     </div>
   );
 };

 export default AccessGate;
