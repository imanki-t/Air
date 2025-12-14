import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Card, Spinner } from '../ui';
import { FaUser, FaLock, FaTrash, FaDownload, FaPalette, FaShieldAlt, FaLink } from 'react-icons/fa';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';

const ProfileSettings = () => {
  const { user, updateUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [sharedLinks, setSharedLinks] = useState([]);

  // Profile Form State
  const [username, setUsername] = useState(user?.username || '');

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (activeTab === 'shared') {
        fetchSharedLinks();
    }
  }, [activeTab]);

  const fetchSharedLinks = async () => {
      try {
          const res = await api.get('/api/files/shared-links');
          setSharedLinks(res.data);
      } catch (error) {
          console.error(error);
      }
  };

  const handleUpdateProfile = async (e) => {
      e.preventDefault();
      setLoading(true);
      await updateUser({ username });
      setLoading(false);
  };

  const handleChangePassword = async (e) => {
      e.preventDefault();
      setLoading(true);
      try {
          await api.put('/api/auth/change-password', { currentPassword, newPassword });
          toast.success("Password changed successfully");
          setCurrentPassword('');
          setNewPassword('');
      } catch (error) {
          toast.error(error.response?.data?.error || "Failed to change password");
      } finally {
          setLoading(false);
      }
  };

  const handleDeleteAccount = async () => {
      if (!window.confirm("Are you sure? This will permanently delete all your files and data.")) return;

      try {
          await api.post('/api/auth/request-account-deletion');
          toast.success("Confirmation email sent. Please check your inbox.");
      } catch (error) {
          toast.error("Failed to request deletion");
      }
  };

  const handleRevokeLink = async (id) => {
      try {
          await api.delete(`/api/files/share/${id}`);
          toast.success("Link revoked");
          fetchSharedLinks();
      } catch (error) {
          toast.error("Failed to revoke link");
      }
  };

  const downloadMetadata = () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(user, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "user_metadata.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  const tabs = [
      { id: 'profile', label: 'Profile', icon: <FaUser /> },
      { id: 'security', label: 'Security', icon: <FaLock /> },
      { id: 'shared', label: 'Shared Links', icon: <FaLink /> },
      { id: 'data', label: 'Data & Privacy', icon: <FaShieldAlt /> },
  ];

  return (
    <div className="max-w-4xl mx-auto pb-10">
       <h1 className="text-3xl font-bold dark:text-white mb-6">Settings</h1>

       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           {/* Tabs Sidebar */}
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden h-fit">
               {tabs.map(tab => (
                   <button
                       key={tab.id}
                       onClick={() => setActiveTab(tab.id)}
                       className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                           activeTab === tab.id
                           ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border-l-4 border-blue-600'
                           : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border-l-4 border-transparent'
                       }`}
                   >
                       <span className="mr-3 text-lg">{tab.icon}</span>
                       {tab.label}
                   </button>
               ))}
               <button
                   onClick={handleDeleteAccount}
                   className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-l-4 border-transparent transition-colors mt-4 border-t border-gray-100 dark:border-gray-700"
               >
                   <span className="mr-3 text-lg"><FaTrash /></span>
                   Delete Account
               </button>
           </div>

           {/* Content Area */}
           <div className="md:col-span-3 space-y-6">

               {/* Profile Tab */}
               {activeTab === 'profile' && (
                   <Card>
                       <h2 className="text-xl font-semibold mb-4 dark:text-white">Edit Profile</h2>
                       <form onSubmit={handleUpdateProfile} className="space-y-4">
                           <Input
                               label="Username"
                               value={username}
                               onChange={(e) => setUsername(e.target.value)}
                           />
                           <Input
                               label="Email"
                               value={user?.email}
                               disabled
                               className="bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                           />
                           <div className="pt-2">
                               <Button type="submit" disabled={loading}>
                                   {loading ? <Spinner size="sm" className="border-white" /> : "Save Changes"}
                               </Button>
                           </div>
                       </form>
                   </Card>
               )}

               {/* Security Tab */}
               {activeTab === 'security' && (
                   <Card>
                       <h2 className="text-xl font-semibold mb-4 dark:text-white">Change Password</h2>
                       <form onSubmit={handleChangePassword} className="space-y-4">
                           <Input
                               label="Current Password"
                               type="password"
                               value={currentPassword}
                               onChange={(e) => setCurrentPassword(e.target.value)}
                           />
                           <Input
                               label="New Password"
                               type="password"
                               value={newPassword}
                               onChange={(e) => setNewPassword(e.target.value)}
                           />
                           <div className="pt-2">
                               <Button type="submit" disabled={loading}>
                                   {loading ? <Spinner size="sm" className="border-white" /> : "Update Password"}
                               </Button>
                           </div>
                       </form>
                   </Card>
               )}

               {/* Shared Links Tab */}
               {activeTab === 'shared' && (
                   <Card>
                       <h2 className="text-xl font-semibold mb-4 dark:text-white">Active Shared Links</h2>
                       {sharedLinks.length === 0 ? (
                           <p className="text-gray-500">No active shared links.</p>
                       ) : (
                           <div className="space-y-3">
                               {sharedLinks.map(link => (
                                   <div key={link._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                       <div className="overflow-hidden mr-4">
                                           <p className="font-medium truncate dark:text-white">{link.metadata?.filename}</p>
                                           <p className="text-xs text-gray-500">Expires: {new Date(link.metadata?.shareExpires).toLocaleDateString()}</p>
                                       </div>
                                       <Button variant="danger" size="sm" onClick={() => handleRevokeLink(link._id)}>
                                           Revoke
                                       </Button>
                                   </div>
                               ))}
                           </div>
                       )}
                   </Card>
               )}

               {/* Data Tab */}
               {activeTab === 'data' && (
                   <Card>
                       <h2 className="text-xl font-semibold mb-4 dark:text-white">Data & Privacy</h2>
                       <div className="space-y-4">
                           <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                               <div>
                                   <h3 className="font-medium dark:text-white">Export Data</h3>
                                   <p className="text-sm text-gray-500">Download a copy of your personal data.</p>
                               </div>
                               <Button variant="secondary" onClick={downloadMetadata}>
                                   <FaDownload className="mr-2" /> Download JSON
                               </Button>
                           </div>
                       </div>
                   </Card>
               )}
           </div>
       </div>
    </div>
  );
};

export default ProfileSettings;
