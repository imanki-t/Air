import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { getTypography } from '../../theme/typography';

/**
 * Material 3 Text Button
 */
export const TextButton = ({
  label,
  onClick,
  icon = null,
  disabled = false,
  fullWidth = false,
  className = '',
  danger = false,
  ...props
}) => {
  const { colors } = useTheme();

  const textColor = danger ? colors.error : colors.primary;

  const baseStyles = {
    backgroundColor: 'transparent',
    color: disabled ? colors.onSurface + '61' : textColor,
    borderRadius: '20px',
    padding: icon ? '0 16px 0 12px' : '0 12px',
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
    ...getTypography('labelLarge'),
  };

  const hoverVariants = {
    hover: {
      backgroundColor: disabled ? 'transparent' : (danger ? colors.error + '14' : colors.primary + '14'),
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
      {icon && <span className="flex items-center justify-center w-[18px] h-[18px]">{icon}</span>}
      <span>{label}</span>
    </motion.button>
  );
};

TextButton.propTypes = {
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  icon: PropTypes.node,
  disabled: PropTypes.bool,
  fullWidth: PropTypes.bool,
  className: PropTypes.string,
  danger: PropTypes.bool,
};
