import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useFileContext } from '../context/FileContext';
import { useSelection } from '../hooks/useSelection';
import { FileIcon } from './FileIcon';
import { getTypography } from '../theme/typography';
import { Card } from '../ui/surfaces/Card';

/**
 * File Grid View
 */
export const FileGrid = ({ files, folders, onFileClick, onFolderClick }) => {
  const { colors } = useTheme();
  const { toggleSelection, isSelected } = useSelection([...folders, ...files]);

  return (
    <div className="w-full">
      {/* Folders Section */}
      {folders.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-4 px-1" style={{ color: colors.onSurfaceVariant, ...getTypography('titleMedium') }}>
            Folders
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {folders.map(folder => (
              <FolderCard
                key={folder._id}
                folder={folder}
                onClick={() => onFolderClick(folder)}
                selected={isSelected(folder._id)}
                onSelect={(multi) => toggleSelection(folder._id, multi)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Files Section */}
      <div>
        <h3 className="mb-4 px-1" style={{ color: colors.onSurfaceVariant, ...getTypography('titleMedium') }}>
          Files
        </h3>
        {files.length === 0 ? (
           <div className="text-center py-20 opacity-60">
                <p>No files found</p>
           </div>
        ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {files.map(file => (
                <FileCard
                    key={file._id}
                    file={file}
                    onClick={() => onFileClick(file)}
                    selected={isSelected(file._id)}
                    onSelect={(multi) => toggleSelection(file._id, multi)}
                />
            ))}
            </div>
        )}
      </div>
    </div>
  );
};

const FolderCard = ({ folder, onClick, selected, onSelect }) => {
    const { colors } = useTheme();

    return (
        <Card
            variant={selected ? "filled" : "filled"}
            onClick={(e) => {
                if (e.ctrlKey || e.metaKey || e.shiftKey) {
                    onSelect(true);
                } else {
                    onClick();
                }
            }}
            className={`flex flex-col items-center justify-center p-4 transition-colors ${selected ? 'ring-2 ring-offset-1' : ''}`}
            style={{
                backgroundColor: selected ? colors.primaryContainer : colors.surfaceContainer,
                borderColor: selected ? colors.primary : 'transparent',
                '--tw-ring-color': colors.primary
            }}
        >
            <FileIcon type="folder" size={64} className="mb-2" />
            <span className="truncate w-full text-center" style={{ color: colors.onSurface, ...getTypography('labelLarge') }}>
                {folder.name}
            </span>
            <span className="text-xs opacity-60 mt-1" style={{ color: colors.onSurfaceVariant }}>
                {new Date(folder.createdAt).toLocaleDateString()}
            </span>
        </Card>
    );
};

const FileCard = ({ file, onClick, selected, onSelect }) => {
    const { colors } = useTheme();

    return (
        <Card
            variant={selected ? "filled" : "outlined"}
            onClick={(e) => {
                if (e.ctrlKey || e.metaKey || e.shiftKey) {
                    e.stopPropagation();
                    onSelect(true);
                } else {
                    onClick();
                }
            }}
            className={`flex flex-col p-0 transition-all ${selected ? 'ring-2 ring-offset-1' : ''}`}
            style={{
                backgroundColor: selected ? colors.primaryContainer : colors.surface,
                borderColor: selected ? colors.primary : colors.outlineVariant,
                '--tw-ring-color': colors.primary
            }}
        >
            {/* Preview Area */}
            <div className="aspect-[4/3] w-full bg-black/5 flex items-center justify-center overflow-hidden rounded-t-lg relative">
                 {file.contentType?.startsWith('image/') ? (
                     <img src={`/api/files/preview/${file._id}`} alt={file.filename} className="w-full h-full object-cover" />
                 ) : (
                     <FileIcon contentType={file.contentType} size={48} />
                 )}
            </div>

            {/* Info Area */}
            <div className="p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                    <p className="truncate" style={{ color: colors.onSurface, ...getTypography('labelMedium') }}>
                        {file.filename}
                    </p>
                    <p className="truncate mt-0.5" style={{ color: colors.onSurfaceVariant, fontSize: '11px' }}>
                        {(file.size / 1024).toFixed(1)} KB
                    </p>
                </div>
            </div>
        </Card>
    );
};
