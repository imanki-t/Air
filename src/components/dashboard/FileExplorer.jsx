// src/components/dashboard/FileExplorer.jsx - ENHANCED WITH KEBAB MENUS
import React, { useState } from 'react';
import { Folder, FileText, MoreVertical, Image, Music, Video, Star } from 'lucide-react';
import M3Card from '../m3/M3Card';

const FileIcon = ({ type, className }) => {
  if (type?.startsWith('image/')) return <Image className={className} />;
  if (type?.startsWith('audio/')) return <Music className={className} />;
  if (type?.startsWith('video/')) return <Video className={className} />;
  return <FileText className={className} />;
};

const formatSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const FileKebabMenu = ({ file, onAction, onClose }) => {
  return (
    <div className="absolute right-0 top-full mt-1 w-48 bg-surface-container rounded-lg shadow-lg border border-outline-variant z-50 py-1">
      <button
        onClick={() => {
          onAction(file, 'preview');
          onClose();
        }}
        className="w-full px-4 py-2 text-left text-sm hover:bg-surface-container-high transition-colors flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        Preview
      </button>
      
      <button
        onClick={() => {
          onAction(file, 'star');
          onClose();
        }}
        className="w-full px-4 py-2 text-left text-sm hover:bg-surface-container-high transition-colors flex items-center gap-2"
      >
        <Star className={`w-4 h-4 ${file.metadata?.isStarred ? 'fill-yellow-500 text-yellow-500' : ''}`} />
        {file.metadata?.isStarred ? 'Unstar' : 'Star'}
      </button>
      
      <button
        onClick={() => {
          onAction(file, 'share');
          onClose();
        }}
        className="w-full px-4 py-2 text-left text-sm hover:bg-surface-container-high transition-colors flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        Share
      </button>
      
      <button
        onClick={() => {
          onAction(file, 'download');
          onClose();
        }}
        className="w-full px-4 py-2 text-left text-sm hover:bg-surface-container-high transition-colors flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download
      </button>
      
      <div className="border-t border-outline-variant my-1" />
      
      <button
        onClick={() => {
          onAction(file, 'delete');
          onClose();
        }}
        className="w-full px-4 py-2 text-left text-sm hover:bg-destructive/10 text-destructive transition-colors flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Delete
      </button>
    </div>
  );
};

const FileCard = ({ file, onFileClick, onFileAction }) => {
  const [showMenu, setShowMenu] = useState(false);
  
  return (
    <M3Card className="cursor-pointer hover:bg-surface-container-high transition-colors group relative">
      <div className="flex flex-col items-center p-3 text-center">
        {/* Preview/Icon */}
        <div className="w-full aspect-square bg-surface-container rounded-lg mb-3 flex items-center justify-center overflow-hidden">
          {file.contentType?.startsWith('image/') ? (
            <div className="w-full h-full bg-secondary-container flex items-center justify-center">
              <Image className="text-on-secondary-container" size={32} />
            </div>
          ) : (
            <FileIcon type={file.contentType} className="h-12 w-12 text-secondary" />
          )}
        </div>
        
        {/* File Name */}
        <h3 className="text-on-surface font-medium truncate w-full text-sm mb-1">
          {file.filename}
        </h3>
        
        {/* File Size */}
        <p className="text-xs text-on-surface-variant">{formatSize(file.length)}</p>
        
        {/* Kebab Menu Button */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1.5 bg-surface/80 rounded-full hover:bg-surface shadow-sm backdrop-blur-sm"
          >
            <MoreVertical size={16} />
          </button>
          
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              <div className="relative z-50">
                <FileKebabMenu
                  file={file}
                  onAction={onFileAction}
                  onClose={() => setShowMenu(false)}
                />
              </div>
            </>
          )}
        </div>
        
        {/* Star Indicator */}
        {file.metadata?.isStarred && (
          <div className="absolute top-2 left-2">
            <Star size={16} className="fill-yellow-500 text-yellow-500" />
          </div>
        )}
      </div>
    </M3Card>
  );
};

const FileExplorer = ({
  files = [],
  folders = [],
  onFolderClick,
  onFileClick,
  onFileAction,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const hasItems = folders.length > 0 || files.length > 0;

  if (!hasItems) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-on-surface-variant">
        <Folder size={64} className="mb-4 opacity-50" />
        <p className="text-lg">No files or folders found</p>
      </div>
    );
  }

  // Separate default and custom folders
  const defaultFolders = folders.filter(f => f.isDefault);
  const customFolders = folders.filter(f => !f.isDefault);

  return (
    <div className="space-y-6">
      {/* Default Folders - Special Box */}
      {defaultFolders.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-on-surface-variant mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
            Quick Access
          </h3>
          <div className="border-2 border-primary/20 bg-primary/5 rounded-xl p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {defaultFolders.map((folder) => (
                <M3Card
                  key={folder._id}
                  className="cursor-pointer hover:bg-surface-container-high transition-colors group"
                  onClick={() => onFolderClick(folder)}
                >
                  <div className="flex flex-col items-center p-3 text-center">
                    <Folder
                      size={40}
                      className="text-primary fill-primary/20 mb-2 group-hover:scale-105 transition-transform"
                    />
                    <h3 className="text-on-surface font-medium truncate w-full text-sm">
                      {folder.name}
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-1">
                      {folder.fileCount || 0} files
                    </p>
                  </div>
                </M3Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Custom Folders */}
      {customFolders.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-on-surface-variant mb-3">My Folders</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {customFolders.map((folder) => (
              <M3Card
                key={folder._id}
                className="cursor-pointer hover:bg-surface-container-high transition-colors group relative"
                onClick={() => onFolderClick(folder)}
              >
                <div className="flex flex-col items-center p-3 text-center">
                  <Folder
                    size={40}
                    className="text-primary fill-primary/20 mb-2 group-hover:scale-105 transition-transform"
                  />
                  <h3 className="text-on-surface font-medium truncate w-full text-sm">
                    {folder.name}
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {folder.fileCount || 0} files
                  </p>
                </div>
              </M3Card>
            ))}
          </div>
        </section>
      )}

      {/* Files */}
      {files.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-on-surface-variant mb-3">Files</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {files.map((file) => (
              <FileCard
                key={file._id}
                file={file}
                onFileClick={onFileClick}
                onFileAction={onFileAction}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default FileExplorer;
