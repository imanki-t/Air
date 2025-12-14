import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { IconButton } from '../buttons/IconButton';

/**
 * Custom Rich Text Editor (Simplified)
 */
export const RichTextEditor = ({ value, onChange, className = '' }) => {
  const { colors } = useTheme();

  const execCommand = (command, arg = null) => {
    document.execCommand(command, false, arg);
  };

  return (
    <div className={`border rounded-lg overflow-hidden flex flex-col ${className}`} style={{ borderColor: colors.outlineVariant }}>
      <div className="flex items-center gap-1 p-2 border-b" style={{ backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }}>
        <IconButton
            icon={<b>B</b>}
            onClick={() => execCommand('bold')}
            size="small"
            variant="standard"
        />
        <IconButton
            icon={<i>I</i>}
            onClick={() => execCommand('italic')}
            size="small"
            variant="standard"
        />
        <IconButton
            icon={<u>U</u>}
            onClick={() => execCommand('underline')}
            size="small"
            variant="standard"
        />
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <IconButton
            icon={<span>H1</span>}
            onClick={() => execCommand('formatBlock', 'H1')}
            size="small"
            variant="standard"
        />
        <IconButton
            icon={<span>H2</span>}
            onClick={() => execCommand('formatBlock', 'H2')}
            size="small"
            variant="standard"
        />
      </div>
      <div
        className="flex-1 p-4 outline-none overflow-y-auto"
        contentEditable
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        dangerouslySetInnerHTML={{ __html: value }}
        style={{ color: colors.onSurface, minHeight: '200px' }}
      />
    </div>
  );
};
