import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { getTypography } from '../../theme/typography';

/**
 * Material 3 Filled Button
 */
export const FilledButton = ({
  label,
  onClick,
  icon = null,
  disabled = false,
  fullWidth = false,
  className = '',
  ...props
}) => {
  const { colors, isDark } = useTheme();

  const baseStyles = {
    backgroundColor: disabled ? colors.onSurface + '1F' : colors.primary,
    color: disabled ? colors.onSurface + '61' : colors.onPrimary,
    borderRadius: '20px',
    padding: icon ? '0 24px 0 16px' : '0 24px',
    height: '40px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    width: fullWidth ? '100%' : 'auto',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: disabled ? 'none' : '0px 1px 3px 1px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.3)',
    ...getTypography('labelLarge'),
    transition: 'box-shadow 0.2s ease',
  };

  const hoverVariants = {
    hover: {
      backgroundColor: disabled ? colors.onSurface + '1F' : (isDark ? '#ACCFFF' : '#005590'), // Calculated hover state
      boxShadow: disabled ? 'none' : '0px 2px 6px 2px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.3)',
    },
    tap: {
      scale: 0.98,
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
      {/* State Layer (Overlay) handled via Framer Motion background color change */}
      {icon && <span className="flex items-center justify-center w-[18px] h-[18px]">{icon}</span>}
      <span>{label}</span>
    </motion.button>
  );
};

FilledButton.propTypes = {
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  icon: PropTypes.node,
  disabled: PropTypes.bool,
  fullWidth: PropTypes.bool,
  className: PropTypes.string,
};
