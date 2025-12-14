import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { getTypography } from '../../theme/typography';

/**
 * Material 3 Floating Action Button (FAB)
 */
export const FAB = ({
  icon,
  label = null, // If provided, becomes an Extended FAB
  onClick,
  variant = 'primary', // primary, secondary, tertiary, surface
  size = 'medium', // small, medium, large
  disabled = false,
  className = '',
  ...props
}) => {
  const { colors } = useTheme();

  const getContainerColor = () => {
    switch (variant) {
      case 'secondary': return colors.secondaryContainer;
      case 'tertiary': return colors.tertiaryContainer;
      case 'surface': return colors.surfaceContainerHigh;
      case 'primary':
      default: return colors.primaryContainer;
    }
  };

  const getContentColor = () => {
    switch (variant) {
      case 'secondary': return colors.onSecondaryContainer;
      case 'tertiary': return colors.onTertiaryContainer;
      case 'surface': return colors.primary;
      case 'primary':
      default: return colors.onPrimaryContainer;
    }
  };

  const getDimensions = () => {
    if (label) return { height: '56px', borderRadius: '16px', padding: '0 20px 0 16px' }; // Extended
    switch (size) {
      case 'small': return { width: '40px', height: '40px', borderRadius: '12px', padding: 0 };
      case 'large': return { width: '96px', height: '96px', borderRadius: '28px', padding: 0 };
      case 'medium':
      default: return { width: '56px', height: '56px', borderRadius: '16px', padding: 0 };
    }
  };

  const dims = getDimensions();

  const baseStyles = {
    backgroundColor: getContainerColor(),
    color: getContentColor(),
    ...dims,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    boxShadow: '0px 3px 6px -2px rgba(0,0,0,0.2), 0px 6px 10px 0px rgba(0,0,0,0.14), 0px 1px 18px 0px rgba(0,0,0,0.12)',
    ...getTypography('labelLarge'),
    opacity: disabled ? 0.5 : 1,
  };

  const hoverVariants = {
    hover: {
      boxShadow: '0px 5px 5px -3px rgba(0,0,0,0.2), 0px 8px 10px 1px rgba(0,0,0,0.14), 0px 3px 14px 2px rgba(0,0,0,0.12)',
      scale: 1.02,
    },
    tap: {
      scale: 0.95,
      boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12)',
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
      {...props}
    >
      <span className="flex items-center justify-center">{icon}</span>
      {label && <span>{label}</span>}
    </motion.button>
  );
};

FAB.propTypes = {
  icon: PropTypes.node.isRequired,
  label: PropTypes.string,
  onClick: PropTypes.func,
  variant: PropTypes.oneOf(['primary', 'secondary', 'tertiary', 'surface']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  disabled: PropTypes.bool,
  className: PropTypes.string,
};
