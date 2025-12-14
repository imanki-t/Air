import React from 'react';
import { Folder, FileText, MoreVertical, Image, Music, Video, File } from 'lucide-react';
import M3Card from '../m3/M3Card';
import M3ListItem from '../m3/M3ListItem';

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

const FileExplorer = ({
  files = [],
  folders = [],
  viewType = 'grid',
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

  if (viewType === 'list') {
    return (
      <div className="bg-surface rounded-xl overflow-hidden border border-outline-variant">
        {folders.map((folder) => (
          <M3ListItem
            key={folder._id}
            headline={folder.name}
            leading={<Folder className="text-primary fill-primary/20" />}
            trailing={<MoreVertical size={20} />}
            onClick={() => onFolderClick(folder)}
          />
        ))}
        {files.map((file) => (
          <M3ListItem
            key={file._id}
            headline={file.filename}
            supportingText={formatSize(file.length)}
            leading={<FileIcon type={file.contentType} className="text-secondary" />}
            trailing={
              <button
                onClick={(e) => { e.stopPropagation(); onFileAction(file, 'menu'); }}
                className="p-1 rounded-full hover:bg-surface-variant"
              >
                <MoreVertical size={20} />
              </button>
            }
            onClick={() => onFileClick(file)}
          />
        ))}
      </div>
    );
  }

  // Grid View
  return (
    <div className="space-y-6">
      {folders.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-on-surface-variant mb-3 px-1">Folders</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {folders.map((folder) => (
              <M3Card
                key={folder._id}
                className="cursor-pointer hover:bg-surface-container-high transition-colors group relative"
                onClick={() => onFolderClick(folder)}
              >
                <div className="flex flex-col items-center p-2 text-center">
                  <Folder size={48} className="text-primary fill-primary/20 mb-2 group-hover:scale-105 transition-transform" />
                  <h3 className="text-on-surface font-medium truncate w-full text-sm">{folder.name}</h3>
                </div>
              </M3Card>
            ))}
          </div>
        </section>
      )}

      {files.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-on-surface-variant mb-3 px-1">Files</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {files.map((file) => (
              <M3Card
                key={file._id}
                className="cursor-pointer hover:bg-surface-container-high transition-colors group"
                onClick={() => onFileClick(file)}
              >
                <div className="flex flex-col items-center p-2 text-center relative">
                   <div className="w-full aspect-square bg-surface-container rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                      {file.contentType?.startsWith('image/') ? (
                         <div className="w-full h-full bg-secondary-container flex items-center justify-center">
                            <Image className="text-on-secondary-container" size={32} />
                         </div>
                      ) : (
                        <FileIcon type={file.contentType} className="h-12 w-12 text-secondary" />
                      )}
                   </div>
                   <h3 className="text-on-surface font-medium truncate w-full text-sm">{file.filename}</h3>
                   <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); onFileAction(file, 'menu'); }}
                        className="p-1 bg-surface/80 rounded-full hover:bg-surface shadow-sm backdrop-blur-sm"
                      >
                         <MoreVertical size={16} />
                      </button>
                   </div>
                </div>
              </M3Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default FileExplorer;
