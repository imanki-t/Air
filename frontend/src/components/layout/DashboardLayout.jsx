import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden transition-colors duration-300">
       {/* Sidebar */}
       <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

       {/* Main Content Area */}
       <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header toggleSidebar={toggleSidebar} />

          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 scrollbar-hide">
             {/* Render the matched child route component */}
             <div className="max-w-7xl mx-auto h-full">
                <Outlet />
             </div>
          </main>
       </div>
    </div>
  );
};

export default DashboardLayout;
