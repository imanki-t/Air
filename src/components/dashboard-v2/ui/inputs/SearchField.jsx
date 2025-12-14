import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { getTypography } from '../../theme/typography';
import { IconButton } from '../buttons/IconButton';

/**
 * Material 3 Search Field
 */
export const SearchField = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
  className = '',
  ...props
}) => {
  const { colors } = useTheme();

  const containerStyles = {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: '28px', // Full pill shape
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    padding: '0 8px 0 16px',
    width: '100%',
    transition: 'background-color 0.2s ease',
  };

  const inputStyles = {
    flex: 1,
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    color: colors.onSurface,
    height: '100%',
    marginLeft: '8px',
    ...getTypography('bodyLarge'),
  };

  return (
    <motion.div
      className={className}
      style={containerStyles}
      whileHover={{ backgroundColor: colors.surfaceContainerHighest }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.onSurfaceVariant} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyles}
        {...props}
      />

      {value && (
        <IconButton
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          }
          onClick={() => {
            onChange('');
            if (onClear) onClear();
          }}
          size="small"
        />
      )}
    </motion.div>
  );
};

SearchField.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onClear: PropTypes.func,
  placeholder: PropTypes.string,
  className: PropTypes.string,
};
