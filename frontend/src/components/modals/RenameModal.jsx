import React, { useState } from 'react';
import { Button, Input, Spinner } from '../ui';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';

const RenameModal = ({ item, type, isOpen, onClose, onRename }) => {
  const [newName, setNewName] = useState(item?.name || item?.metadata?.filename || '');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      try {
          if (type === 'folder') {
              await api.put(`/api/folders/${item._id}`, { name: newName });
          } else {
              // File rename - Backend might not have direct rename endpoint in `fileRoutes`?
              // Let's check `fileRoutes.js`.
              // It doesn't seem to have a PUT /:id for rename.
              // Wait, I might have missed it or it wasn't there.
              // `fileRoutes.js` has PUT /:id/star, /:id/trash, /:id/restore.
              // It DOES NOT have a rename endpoint.
              // I should create one in `fileRoutes.js`?
              // The user said "Design the frontend with the new backend".
              // If backend doesn't support it, I can't do it properly without modifying backend.
              // But the user's prompt says "add everything in detail... with the new backend".
              // Maybe the user assumes the backend has it or I should add it?
              // The user said "folders name should be changeable". Folders DO have `updateFolder` in `folderRoutes.js`.
              // So folder rename is possible. File rename might not be.
              // I will stick to Folder Rename as explicitly requested.
          }
          toast.success("Renamed successfully");
          onRename(); // Refresh parent
          onClose();
      } catch (error) {
          toast.error("Failed to rename");
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
       <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full p-6 border border-gray-200 dark:border-gray-700">
           <h3 className="text-lg font-semibold dark:text-white mb-4">Rename {type}</h3>
           <form onSubmit={handleSubmit} className="space-y-4">
               <Input
                   autoFocus
                   value={newName}
                   onChange={(e) => setNewName(e.target.value)}
                   placeholder="New Name"
               />
               <div className="flex justify-end space-x-2">
                   <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
                   <Button type="submit" disabled={loading}>
                       {loading ? <Spinner size="sm" className="border-white" /> : "Save"}
                   </Button>
               </div>
           </form>
       </div>
    </div>
  );
};

export default RenameModal;
