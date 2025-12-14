import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FaSearch, FaBars, FaUserCircle, FaCog, FaSignOutAlt, FaMoon, FaSun } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';

const Header = ({ toggleSidebar }) => {
  const { user, logout, updateUser } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const [theme, setTheme] = useState(user?.theme || 'system'); // simple local state for quick toggle

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
      logout();
      navigate('/login');
  };

  // Simple search placeholder - In real implementation, this would connect to context/URL
  const handleSearch = (e) => {
      // Implement global search later
  };

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 lg:px-8 z-10">

      {/* Left: Hamburger & Title (Mobile) */}
      <div className="flex items-center">
         <button onClick={toggleSidebar} className="mr-4 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 md:hidden text-gray-600 dark:text-gray-300">
            <FaBars />
         </button>
         <h2 className="text-lg font-semibold text-gray-800 dark:text-white md:hidden">My Files</h2>

         {/* Desktop Search Bar */}
         <div className="hidden md:flex relative max-w-md w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
               <FaSearch className="text-gray-400" />
            </div>
            <input
               type="text"
               placeholder="Search files and folders..."
               className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:bg-white dark:focus:bg-gray-600 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
               onChange={handleSearch}
            />
         </div>
      </div>

      {/* Right: Actions & Profile */}
      <div className="flex items-center space-x-4">

         {/* Mobile Search Icon */}
         <button className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-full">
            <FaSearch />
         </button>

         {/* Profile Dropdown */}
         <div className="relative" ref={dropdownRef}>
            <button
               onClick={() => setDropdownOpen(!dropdownOpen)}
               className="flex items-center space-x-2 focus:outline-none"
            >
               <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
               </div>
               <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-200">
                  {user?.username}
               </span>
            </button>

            {dropdownOpen && (
               <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                     <p className="text-sm text-gray-900 dark:text-white font-medium truncate">{user?.username}</p>
                     <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                  </div>

                  <Link
                    to="/dashboard/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                  >
                     <FaCog className="mr-2" /> Settings
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
                  >
                     <FaSignOutAlt className="mr-2" /> Logout
                  </button>
               </div>
            )}
         </div>
      </div>
    </header>
  );
};

export default Header;
