import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '../context/ThemeContext';
import { fileTypeColors } from '../theme/colors';

/**
 * File Icon Component
 *
 * Renders the appropriate icon based on file type/mime type.
 */
export const FileIcon = ({ type, contentType, size = 48, className = '' }) => {
  const { colors } = useTheme();

  const getIconColor = () => {
    if (type === 'folder') return fileTypeColors.folder;
    if (contentType?.startsWith('image/')) return fileTypeColors.image;
    if (contentType?.startsWith('video/')) return fileTypeColors.video;
    if (contentType?.startsWith('audio/')) return fileTypeColors.audio;
    if (contentType?.includes('pdf') || contentType?.includes('text/')) return fileTypeColors.document;
    if (contentType?.includes('zip') || contentType?.includes('compressed')) return fileTypeColors.archive;
    return fileTypeColors.unknown;
  };

  const color = getIconColor();

  if (type === 'folder') {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
        <path
          d="M40 12H24L20 8H8C5.79 8 4 9.79 4 12V36C4 38.21 5.79 40 8 40H40C42.21 40 44 38.21 44 36V16C44 13.79 42.21 12 40 12Z"
          fill={color}
          stroke={colors.onSurface + '1F'} // Subtle stroke for contrast
          strokeWidth="1"
        />
      </svg>
    );
  }

  // File Generic
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path
        d="M28 4H12C9.79 4 8 5.79 8 8V40C8 42.21 9.79 44 12 44H36C38.21 44 40 42.21 40 40V16L28 4Z"
        fill={colors.surfaceContainerHighest}
      />
      <path
        d="M28 4V16H40"
        fill={color}
        opacity="0.5"
      />
      {/* Type specific glyph */}
      <rect x="16" y="24" width="16" height="2" rx="1" fill={color} />
      <rect x="16" y="28" width="12" height="2" rx="1" fill={color} />
      <rect x="16" y="32" width="16" height="2" rx="1" fill={color} />
    </svg>
  );
};

FileIcon.propTypes = {
  type: PropTypes.string,
  contentType: PropTypes.string,
  size: PropTypes.number,
  className: PropTypes.string,
};
