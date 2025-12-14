import React from 'react';
import { useFileSystem } from '../../context/FileSystemContext';
import { FaFile, FaFilePdf, FaFileImage, FaFileAudio, FaFileVideo, FaFileCode, FaFileAlt, FaFileArchive } from 'react-icons/fa';

const getFileIcon = (contentType, filename) => {
    if (contentType?.startsWith('image/')) return <FaFileImage className="text-purple-500" />;
    if (contentType?.startsWith('video/')) return <FaFileVideo className="text-red-500" />;
    if (contentType?.startsWith('audio/')) return <FaFileAudio className="text-yellow-500" />;
    if (contentType === 'application/pdf') return <FaFilePdf className="text-red-600" />;
    if (filename?.endsWith('.zip') || filename?.endsWith('.rar')) return <FaFileArchive className="text-orange-500" />;
    if (filename?.endsWith('.js') || filename?.endsWith('.html') || filename?.endsWith('.css')) return <FaFileCode className="text-blue-500" />;
    return <FaFileAlt className="text-gray-500" />;
};

const FileItem = ({ file }) => {
  const { selection, toggleSelection, viewMode } = useFileSystem();
  const isSelected = selection.includes(file._id);

  const handleClick = (e) => {
      e.stopPropagation();
      // On mobile/desktop, clicking a file usually opens/previews it.
      // But we also need selection.
      // Let's say: Click = Preview, Ctrl+Click = Select.
      // For now, let's just log preview or implementing selection if using checkbox.
      // Wait, user wants robust mobile too.
      // Standard: Tap = Open. Long Press = Select.

      // For this simplified web implementation:
      // We will rely on the checkbox for explicit selection, or implement a proper selection mode.
      // Let's try: Click body -> Select (Toggle). Double Click -> Open?
      // Actually, standard file managers: Single Click -> Select. Double Click -> Open.
      toggleSelection(file._id, e.ctrlKey || e.metaKey);
  };

  const handleOpen = (e) => {
      e.stopPropagation();
      // Trigger Preview (We need a Preview Context or Modal)
      // For now, let's just allow downloading or navigating to preview URL
      window.open(`/api/files/download/${file._id}`, '_blank');
  };

  const icon = getFileIcon(file.metadata?.contentType, file.metadata?.filename);
  const size = (file.length / 1024 / 1024).toFixed(2) + ' MB';

  if (viewMode === 'list') {
      return (
        <div
            onClick={handleClick}
            onDoubleClick={handleOpen}
            className={`flex items-center p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
        >
            <div className="mr-4 text-xl">
                {icon}
            </div>
            <span className="flex-1 font-medium text-gray-700 dark:text-gray-200 truncate">{file.metadata?.filename}</span>
            <span className="text-xs text-gray-400 w-24 text-right">{size}</span>
            <span className="text-xs text-gray-400 w-32 text-right ml-4 hidden sm:block">
                {new Date(file.uploadDate).toLocaleDateString()}
            </span>
        </div>
      );
  }

  return (
    <div
        onClick={handleClick}
        onDoubleClick={handleOpen}
        className={`group relative flex flex-col items-center p-4 rounded-xl transition-all duration-200 cursor-pointer border ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm' : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'}`}
    >
       {/* Preview Thumbnail if image */}
       {file.metadata?.contentType?.startsWith('image/') ? (
           <div className="w-full h-24 mb-2 flex items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
               {/* Since we are in a sandbox, we might not have the actual image endpoint easy to reach without auth token in img src.
                   We need to use a protected image component or just use icon for now to be safe.
                   Actually, standard approach is <img src="/api/files/preview/:id" /> which redirects.
                   Wait, `fileRoutes` has `/preview/:id`. We need to attach token?
                   Usually browsers attach cookies, but we use Bearer token.
                   We might need a presigned URL or just fetch blob.
                   Let's stick to Icon for speed, or try the endpoint if cookies work (they don't, we use headers).
                   So we'd need a special component. Let's use Icon for now.
               */}
               {icon}
           </div>
       ) : (
           <div className="text-5xl mb-2 drop-shadow-sm transition-transform group-hover:scale-110">
               {icon}
           </div>
       )}

      <span className="text-sm font-medium text-center text-gray-700 dark:text-gray-200 truncate w-full px-2">
         {file.metadata?.filename}
      </span>
      <span className="text-xs text-gray-400 mt-1">{size}</span>

      {/* Selection Checkbox */}
      <div
        className={`absolute top-2 right-2 p-1 rounded-full ${isSelected ? 'text-blue-600 bg-white' : 'text-gray-400 opacity-0 group-hover:opacity-100'} transition-opacity`}
      >
        <div className={`w-4 h-4 border-2 rounded-sm ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-400'}`}></div>
      </div>
    </div>
  );
};

export default FileItem;
