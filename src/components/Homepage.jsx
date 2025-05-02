// Homepage.jsx
import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

const Homepage = ({ isLoggedIn, darkMode }) => {
  const [heroRef, heroInView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const [featuresRef, featuresInView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  // Reference for background animation
  const bgRef = useRef(null);

  // Effect for subtle background animation
  useEffect(() => {
    if (!bgRef.current) return;
    
    const handleMouseMove = (e) => {
      const { clientX, clientY } = e;
      const xPos = (clientX / window.innerWidth) - 0.5;
      const yPos = (clientY / window.innerHeight) - 0.5;
      
      bgRef.current.style.transform = `translate(${xPos * 20}px, ${yPos * 20}px)`;
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Feature cards data - replace image paths when you add the actual images
  const features = [
    {
      title: "Secure Storage",
      description: "Your files, protected with enterprise-grade encryption",
      image: "/images/features/secure.svg" // You would place images in public/images/features/
    },
    {
      title: "Easy Sharing",
      description: "Share files with customizable permissions",
      image: "/images/features/share.svg"
    },
    {
      title: "Instant Access",
      description: "Find what you need, when you need it",
      image: "/images/features/access.svg"
    }
  ];

  return (
    <div className="relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          ref={bgRef}
          className={`absolute inset-0 transition-transform duration-300 ease-out ${
            darkMode ? 'opacity-5' : 'opacity-3'
          }`}
        >
          <div className="absolute top-0 left-0 w-full h-full">
            <div className={`absolute -top-20 -left-20 w-96 h-96 rounded-full ${
              darkMode ? 'bg-purple-700' : 'bg-purple-300'
            } blur-3xl`}></div>
            <div className={`absolute top-1/3 -right-20 w-96 h-96 rounded-full ${
              darkMode ? 'bg-blue-700' : 'bg-blue-300'
            } blur-3xl`}></div>
            <div className={`absolute -bottom-20 left-1/3 w-96 h-96 rounded-full ${
              darkMode ? 'bg-indigo-700' : 'bg-indigo-300'
            } blur-3xl`}></div>
          </div>
        </div>
      </div>

      {/* Main content container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        {/* Hero section */}
        <motion.div 
          ref={heroRef}
          initial={{ opacity: 0, y: 30 }}
          animate={heroInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-3xl mx-auto mb-16 md:mb-24"
        >
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className={`text-4xl md:text-6xl font-bold mb-6 tracking-tight ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">Kuwuten</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            className={`text-xl md:text-2xl mb-10 ${
              darkMode ? 'text-gray-300' : 'text-gray-600'
            }`}
          >
            Your personal file management system, reimagined.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={heroInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.6, ease: "easeOut" }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link 
              to={isLoggedIn ? "/dashboard" : "/login"}
              className="inline-flex items-center px-8 py-4 text-lg font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:from-indigo-700 hover:to-purple-700"
            >
              <span>Go to Dashboard</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
          </motion.div>
        </motion.div>

        {/* Features section */}
        <motion.div 
          ref={featuresRef}
          initial={{ opacity: 0 }}
          animate={featuresInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-16"
        >
          <h2 className={`text-3xl font-bold text-center mb-12 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Key Features
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={featuresInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 * (index + 1) }}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className={`p-6 rounded-2xl ${
                  darkMode 
                    ? 'bg-gray-800/50 hover:bg-gray-800/80' 
                    : 'bg-white hover:bg-gray-50'
                } shadow-lg transition-all duration-300 hover:shadow-xl`}
              >
                <div className="w-16 h-16 mb-4 mx-auto">
                  <img 
                    src={feature.image} 
                    alt={feature.title}
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className={`text-xl font-semibold mb-3 text-center ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {feature.title}
                </h3>
                <p className={`text-center ${
                  darkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Homepage;
