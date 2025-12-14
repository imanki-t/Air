import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { getTypography } from '../../theme/typography';

/**
 * Material 3 Chip
 */
export const Chip = ({
  label,
  icon = null,
  selected = false,
  onClick,
  onDelete,
  disabled = false,
  className = '',
  ...props
}) => {
  const { colors } = useTheme();

  const getBgColor = () => {
    if (disabled) return 'transparent';
    if (selected) return colors.secondaryContainer;
    return 'transparent';
  };

  const getBorderColor = () => {
    if (disabled) return colors.onSurface + '1F';
    if (selected) return 'transparent';
    return colors.outline;
  };

  const getTextColor = () => {
    if (disabled) return colors.onSurface + '61';
    if (selected) return colors.onSecondaryContainer;
    return colors.onSurfaceVariant;
  };

  return (
    <motion.div
      onClick={!disabled ? onClick : undefined}
      style={{
        backgroundColor: getBgColor(),
        border: `1px solid ${getBorderColor()}`,
        borderRadius: '8px',
        height: '32px',
        display: 'inline-flex',
        alignItems: 'center',
        padding: onDelete ? '0 8px 0 12px' : '0 12px',
        gap: '8px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: getTextColor(),
        ...getTypography('labelLarge')
      }}
      whileHover={!disabled ? { backgroundColor: selected ? colors.secondaryContainer : colors.onSurfaceVariant + '14' } : undefined}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      className={className}
      {...props}
    >
      {selected && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      )}
      {!selected && icon && (
         <span className="flex items-center justify-center w-[18px] h-[18px]">{icon}</span>
      )}

      <span>{label}</span>

      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onDelete();
          }}
          className="ml-1 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      )}
    </motion.div>
  );
};

Chip.propTypes = {
  label: PropTypes.string.isRequired,
  icon: PropTypes.node,
  selected: PropTypes.bool,
  onClick: PropTypes.func,
  onDelete: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};
