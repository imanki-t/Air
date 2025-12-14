import React, { useState } from 'react';
import { Button, Input, Spinner } from '../ui';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';
import { FaCopy, FaTimes } from 'react-icons/fa';

const ShareModal = ({ file, isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [shareLink, setShareLink] = useState(null);
  const [expiresIn, setExpiresIn] = useState(24); // hours

  if (!isOpen) return null;

  const handleGenerateLink = async () => {
      setLoading(true);
      try {
          // Calculate expiration date
          const expiresDate = new Date();
          expiresDate.setHours(expiresDate.getHours() + parseInt(expiresIn));

          const res = await api.post(`/api/files/share/${file._id}`, {
              expiresIn: expiresDate.toISOString()
          });

          setShareLink(res.data.shareLink);
      } catch (error) {
          toast.error("Failed to generate link");
      } finally {
          setLoading(false);
      }
  };

  const copyToClipboard = () => {
      if (shareLink) {
          navigator.clipboard.writeText(shareLink);
          toast.success("Link copied to clipboard");
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
       <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700">
           <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700">
               <h3 className="text-lg font-semibold dark:text-white">Share "{file.metadata?.filename}"</h3>
               <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                   <FaTimes />
               </button>
           </div>

           <div className="p-6 space-y-4">
               {!shareLink ? (
                   <>
                       <div>
                           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Link Expiration</label>
                           <select
                                value={expiresIn}
                                onChange={(e) => setExpiresIn(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                           >
                               <option value="1">1 Hour</option>
                               <option value="6">6 Hours</option>
                               <option value="12">12 Hours</option>
                               <option value="24">24 Hours</option>
                               <option value="48">2 Days</option>
                               <option value="168">7 Days</option>
                           </select>
                       </div>
                       <Button onClick={handleGenerateLink} disabled={loading} className="w-full">
                           {loading ? <Spinner size="sm" className="border-white" /> : "Generate Link"}
                       </Button>
                   </>
               ) : (
                   <div className="space-y-4">
                       <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
                           <p className="text-sm text-green-700 dark:text-green-300 mb-2">Link generated successfully!</p>
                           <div className="flex items-center space-x-2">
                               <input
                                   readOnly
                                   value={shareLink}
                                   className="flex-1 text-xs p-2 rounded border border-green-200 dark:border-green-800 bg-white dark:bg-gray-900 dark:text-gray-300"
                               />
                               <Button size="sm" onClick={copyToClipboard} variant="secondary">
                                   <FaCopy />
                               </Button>
                           </div>
                       </div>
                       <p className="text-xs text-gray-500 text-center">
                           Anyone with this link can view this file.
                       </p>
                       <Button onClick={onClose} variant="ghost" className="w-full">Done</Button>
                   </div>
               )}
           </div>
       </div>
    </div>
  );
};

export default ShareModal;
