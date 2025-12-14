import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { useSelection } from '../hooks/useSelection';
import { FileIcon } from './FileIcon';
import { getTypography } from '../theme/typography';
import { Checkbox } from '../ui/inputs/Checkbox';
import { IconButton } from '../ui/buttons/IconButton';

/**
 * File List View (Table)
 */
export const FileList = ({ files, folders, onFileClick, onFolderClick }) => {
  const { colors } = useTheme();
  const allItems = [...folders, ...files];
  const { selectedIds, toggleSelection, selectAll, clearSelection, isSelected } = useSelection(allItems);

  const allSelected = allItems.length > 0 && selectedIds.length === allItems.length;
  const indeterminate = selectedIds.length > 0 && selectedIds.length < allItems.length;

  return (
    <div className="w-full">
      {/* Header */}
      <div
        className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center px-4 py-3 border-b sticky top-0 z-10 backdrop-blur-sm"
        style={{
            borderColor: colors.outlineVariant + '40',
            backgroundColor: colors.background + 'E6'
        }}
      >
        <div className="w-10 flex justify-center">
            <Checkbox
                checked={allSelected}
                indeterminate={indeterminate}
                onChange={() => allSelected ? clearSelection() : selectAll()}
            />
        </div>
        <div style={{ ...getTypography('labelMedium'), color: colors.onSurfaceVariant }}>Name</div>
        <div className="w-32 hidden md:block" style={{ ...getTypography('labelMedium'), color: colors.onSurfaceVariant }}>Owner</div>
        <div className="w-32 hidden sm:block text-right" style={{ ...getTypography('labelMedium'), color: colors.onSurfaceVariant }}>Last Modified</div>
        <div className="w-24 hidden sm:block text-right" style={{ ...getTypography('labelMedium'), color: colors.onSurfaceVariant }}>Size</div>
        <div className="w-10"></div>
      </div>

      {/* Body */}
      <div className="pb-20">
        {allItems.map((item) => {
             const isFolder = !!item.name; // Simple check
             const selected = isSelected(item._id);

             return (
                <div
                    key={item._id}
                    className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center px-4 py-2 border-b transition-colors cursor-pointer group hover:bg-black/5 dark:hover:bg-white/5"
                    style={{
                        borderColor: colors.outlineVariant + '20',
                        backgroundColor: selected ? colors.primaryContainer + '40' : 'transparent'
                    }}
                    onClick={(e) => {
                        if (e.ctrlKey || e.metaKey || e.shiftKey) {
                            toggleSelection(item._id, true);
                        } else {
                            if(isFolder) onFolderClick(item);
                            else onFileClick(item);
                        }
                    }}
                >
                    <div className="w-10 flex justify-center" onClick={(e) => e.stopPropagation()}>
                        <div className={`opacity-0 group-hover:opacity-100 ${selected ? 'opacity-100' : ''} transition-opacity`}>
                             <Checkbox
                                checked={selected}
                                onChange={() => toggleSelection(item._id, true)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 min-w-0">
                        <FileIcon
                            type={isFolder ? 'folder' : 'file'}
                            contentType={item.contentType}
                            size={32}
                        />
                        <span className="truncate font-medium" style={{ color: colors.onSurface }}>
                            {item.name || item.filename}
                        </span>
                    </div>

                    <div className="w-32 hidden md:block truncate" style={{ ...getTypography('bodySmall'), color: colors.onSurfaceVariant }}>
                        Me
                    </div>

                    <div className="w-32 hidden sm:block text-right truncate" style={{ ...getTypography('bodySmall'), color: colors.onSurfaceVariant }}>
                        {new Date(item.updatedAt || item.createdAt).toLocaleDateString()}
                    </div>

                    <div className="w-24 hidden sm:block text-right" style={{ ...getTypography('bodySmall'), color: colors.onSurfaceVariant }}>
                        {isFolder ? '-' : (item.size / 1024).toFixed(1) + ' KB'}
                    </div>

                    <div className="w-10 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                         <IconButton
                            icon={
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                            }
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                // Open Menu
                            }}
                         />
                    </div>
                </div>
             );
        })}
      </div>
    </div>
  );
};
