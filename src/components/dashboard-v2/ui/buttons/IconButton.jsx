import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

/**
 * Material 3 Icon Button
 */
export const IconButton = ({
  icon,
  onClick,
  variant = 'standard', // standard, filled, tonal, outlined
  disabled = false,
  className = '',
  size = 'medium', // small, medium, large
  tooltip = '',
  selected = false,
  ...props
}) => {
  const { colors } = useTheme();

  const getSize = () => {
    switch (size) {
      case 'small': return '32px';
      case 'large': return '48px';
      default: return '40px';
    }
  };

  const getColors = () => {
    if (disabled) {
      return {
        bg: variant === 'filled' || variant === 'tonal' ? colors.onSurface + '1F' : 'transparent',
        fg: colors.onSurface + '61',
        border: variant === 'outlined' ? colors.onSurface + '1F' : 'transparent',
      };
    }

    if (selected) {
        return {
            bg: colors.primary,
            fg: colors.onPrimary,
            border: 'transparent'
        }
    }

    switch (variant) {
      case 'filled':
        return { bg: colors.primary, fg: colors.onPrimary, border: 'transparent' };
      case 'tonal':
        return { bg: colors.secondaryContainer, fg: colors.onSecondaryContainer, border: 'transparent' };
      case 'outlined':
        return { bg: 'transparent', fg: colors.onSurfaceVariant, border: colors.outline };
      case 'standard':
      default:
        return { bg: 'transparent', fg: colors.onSurfaceVariant, border: 'transparent' };
    }
  };

  const currentColors = getColors();

  const baseStyles = {
    backgroundColor: currentColors.bg,
    color: currentColors.fg,
    borderRadius: '50%',
    width: getSize(),
    height: getSize(),
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: variant === 'outlined' ? `1px solid ${currentColors.border}` : 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    position: 'relative',
    overflow: 'hidden',
  };

  const hoverVariants = {
    hover: {
      backgroundColor: disabled
        ? currentColors.bg
        : variant === 'standard' || variant === 'outlined'
          ? colors.onSurfaceVariant + '14'
          : currentColors.bg, // Filled/Tonal handle hover via opacity or brightness in a real implementation, simplified here
      opacity: (variant === 'filled' || variant === 'tonal') && !disabled ? 0.9 : 1,
    },
    tap: {
      scale: 0.9,
    }
  };

  return (
    <motion.button
      onClick={disabled ? undefined : onClick}
      style={baseStyles}
      variants={hoverVariants}
      whileHover={!disabled ? "hover" : undefined}
      whileTap={!disabled ? "tap" : undefined}
      className={className}
      disabled={disabled}
      title={tooltip}
      {...props}
    >
      {icon}
    </motion.button>
  );
};

IconButton.propTypes = {
  icon: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  variant: PropTypes.oneOf(['standard', 'filled', 'tonal', 'outlined']),
  disabled: PropTypes.bool,
  className: PropTypes.string,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  tooltip: PropTypes.string,
  selected: PropTypes.bool,
};
