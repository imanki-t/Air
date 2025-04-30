 import React from 'react';
 import { Link } from 'react-router-dom'; // Import Link for navigation

 // Utility for conditional class names
 const cn = (...classes) => classes.filter(Boolean).join(' ');

 const Homepage = ({ darkMode }) => {
   // Define image filenames - you'll need to create and place these
   // in your `public` directory.
   const logoSrc = darkMode ? '/kuwuten-logo-dark.png' : '/kuwuten-logo-light.png';
   const heroImageSrc = '/homepage-hero-main.png';
   const uploadFeatureSrc = '/homepage-feature-upload.png';
   const shareFeatureSrc = '/homepage-feature-share.png';
   const secureFeatureSrc = '/homepage-feature-secure.png';

   return (
     <div className={cn('min-h-screen transition-colors duration-300', darkMode ? 'bg-gradient-to-b from-gray-900 to-black text-gray-200' : 'bg-gradient-to-b from-white to-gray-100 text-gray-800')}>

       {/* Navigation Bar */}
       <nav className={cn('sticky top-0 z-40 w-full backdrop-blur flex-none transition-colors duration-500 lg:z-50 lg:border-b', darkMode ? 'border-gray-800 bg-gray-900/75' : 'border-gray-200 bg-white/75')}>
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex justify-between items-center h-16">
             <div className="flex items-center">
               <img className="h-8 w-auto" src={logoSrc} alt="Kuwuten Logo" />
               <span className={cn("ml-3 text-xl font-semibold", darkMode ? "text-white" : "text-gray-900")}>Kuwuten</span>
             </div>
             <div className="flex items-center">
               <Link
                 to="/dashboard" // Link directly to dashboard (AccessGate will handle login if needed)
                 className={cn(
                   'px-5 py-2 rounded-md text-sm font-medium transition-colors duration-200',
                   'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                   darkMode ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white'
                 )}
               >
                 Get Started
               </Link>
             </div>
           </div>
         </div>
       </nav>

       {/* Hero Section */}
       <section className="py-20 sm:py-28 lg:py-32 overflow-hidden">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
           {/* Text Content */}
           <div className="animate-fade-in-up text-center lg:text-left">
             <h1 className={cn(
               "text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6",
               darkMode ? "text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500" : "text-gray-900"
             )}>
               Seamless File Management & Sharing
             </h1>
             <p className={cn("text-lg sm:text-xl mb-8", darkMode ? "text-gray-300" : "text-gray-600")}>
               Upload, store, and share your files effortlessly with Kuwuten. Secure, fast, and user-friendly. Access your files from anywhere.
             </p>
             <Link
               to="/dashboard" // Link to dashboard
               className={cn(
                 'inline-block px-8 py-3 rounded-lg text-lg font-semibold transition-transform duration-200 transform hover:scale-105',
                 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl'
               )}
             >
               Access Your Files
             </Link>
           </div>

           {/* Image Content */}
           <div className="mt-10 lg:mt-0 animate-fade-in-right">
             <img
               src={heroImageSrc}
               alt="Kuwuten platform interface showing file uploads"
               className="rounded-lg shadow-2xl w-full h-auto object-cover"
             />
           </div>
         </div>
       </section>

       {/* Features Section */}
       <section className={cn("py-20 sm:py-24", darkMode ? "bg-gray-900" : "bg-white")}>
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="text-center mb-16">
             <h2 className={cn("text-3xl sm:text-4xl font-bold tracking-tight", darkMode ? "text-white" : "text-gray-900")}>
               Everything You Need
             </h2>
             <p className={cn("mt-4 text-lg", darkMode ? "text-gray-400" : "text-gray-600")}>
               Powerful features designed for simplicity and security.
             </p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-12">
             {/* Feature 1: Upload */}
             <div className={cn("p-8 rounded-xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-1", darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200")}>
               <img src={uploadFeatureSrc} alt="File Upload Illustration" className="h-40 w-auto mx-auto mb-6" />
               <h3 className={cn("text-xl font-semibold mb-3 text-center", darkMode ? "text-white" : "text-gray-900")}>Easy Uploads</h3>
               <p className={cn("text-center", darkMode ? "text-gray-300" : "text-gray-600")}>
                 Drag-and-drop simplicity with resumable uploads. Never lose progress.
               </p>
             </div>

             {/* Feature 2: Share */}
             <div className={cn("p-8 rounded-xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-1", darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200")}>
               <img src={shareFeatureSrc} alt="File Sharing Illustration" className="h-40 w-auto mx-auto mb-6" />
               <h3 className={cn("text-xl font-semibold mb-3 text-center", darkMode ? "text-white" : "text-gray-900")}>Secure Sharing</h3>
               <p className={cn("text-center", darkMode ? "text-gray-300" : "text-gray-600")}>
                 Generate secure shareable links or QR codes for individual files or zipped batches.
               </p>
             </div>

             {/* Feature 3: Secure */}
             <div className={cn("p-8 rounded-xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-1", darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200")}>
               <img src={secureFeatureSrc} alt="Security Illustration" className="h-40 w-auto mx-auto mb-6" />
               <h3 className={cn("text-xl font-semibold mb-3 text-center", darkMode ? "text-white" : "text-gray-900")}>Always Secure</h3>
               <p className={cn("text-center", darkMode ? "text-gray-300" : "text-gray-600")}>
                 Protected access and end-to-end encryption ensure your files remain private.
               </p>
             </div>
           </div>
         </div>
       </section>

       {/* Call to Action Section */}
       <section className="py-20 sm:py-24">
         <div className="max-w-3xl mx-auto text-center px-4 sm:px-6 lg:px-8">
           <h2 className={cn("text-3xl sm:text-4xl font-bold tracking-tight mb-6", darkMode ? "text-white" : "text-gray-900")}>
             Ready to Simplify Your File Workflow?
           </h2>
           <p className={cn("text-lg sm:text-xl mb-8", darkMode ? "text-gray-300" : "text-gray-600")}>
             Join Kuwuten today and experience hassle-free file management.
           </p>
           <Link
             to="/dashboard" // Link to dashboard
             className={cn(
               'inline-block px-10 py-4 rounded-lg text-lg font-semibold transition-transform duration-200 transform hover:scale-105',
               'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl'
             )}
           >
             Get Started Now
           </Link>
         </div>
       </section>

       {/* Footer */}
       <footer className={cn("py-8 border-t", darkMode ? "border-gray-800" : "border-gray-200")}>
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
           <p className={cn("text-sm", darkMode ? "text-gray-400" : "text-gray-500")}>
             © {new Date().getFullYear()} Kuwuten. All Rights Reserved. Built with ❤️.
           </p>
         </div>
       </footer>

       {/* Basic CSS for Animations (can be moved to index.css) */}
       <style jsx>{`
         @keyframes fadeInUp {
           from { opacity: 0; transform: translateY(20px); }
           to { opacity: 1; transform: translateY(0); }
         }
         .animate-fade-in-up {
           animation: fadeInUp 0.8s ease-out forwards;
         }

         @keyframes fadeInRight {
           from { opacity: 0; transform: translateX(30px); }
           to { opacity: 1; transform: translateX(0); }
         }
         .animate-fade-in-right {
           animation: fadeInRight 0.8s ease-out 0.2s forwards; /* Add delay */
           opacity: 0; /* Start hidden */
         }
       `}</style>
     </div>
   );
 };

 export default Homepage;

