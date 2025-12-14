import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export const ColorPicker = ({ value, onChange, colors: palette = [] }) => {
    const { colors } = useTheme();

    const defaultPalette = [
        '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
        '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50',
        '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800',
        '#FF5722', '#795548', '#9E9E9E', '#607D8B'
    ];

    const activePalette = palette.length > 0 ? palette : defaultPalette;

    return (
        <div className="flex flex-wrap gap-2 p-2">
            {activePalette.map((color) => (
                <div
                    key={color}
                    onClick={() => onChange(color)}
                    className="w-8 h-8 rounded-full cursor-pointer transition-transform hover:scale-110 flex items-center justify-center border border-white/10"
                    style={{ backgroundColor: color }}
                >
                    {value === color && (
                         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    )}
                </div>
            ))}
        </div>
    );
};
