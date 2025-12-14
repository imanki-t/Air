import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { getTypography } from '../../theme/typography';

/**
 * Material 3 Card
 */
export const Card = ({
  children,
  variant = 'filled', // elevated, filled, outlined
  onClick,
  className = '',
  ...props
}) => {
  const { colors } = useTheme();

  const getStyles = () => {
    const base = {
      borderRadius: '12px',
      overflow: 'hidden',
      position: 'relative',
      cursor: onClick ? 'pointer' : 'default',
    };

    switch (variant) {
      case 'elevated':
        return {
          ...base,
          backgroundColor: colors.surfaceContainerLow,
          boxShadow: '0px 1px 3px 1px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.3)',
        };
      case 'outlined':
        return {
          ...base,
          backgroundColor: colors.surface,
          border: `1px solid ${colors.outlineVariant}`,
        };
      case 'filled':
      default:
        return {
          ...base,
          backgroundColor: colors.surfaceContainerHighest,
        };
    }
  };

  const hoverVariants = onClick ? {
    hover: {
      y: -2,
      boxShadow: variant === 'elevated'
        ? '0px 4px 8px 3px rgba(0, 0, 0, 0.15), 0px 1px 3px 0px rgba(0, 0, 0, 0.3)'
        : '0px 1px 2px 0px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
    },
    tap: {
      scale: 0.99,
      y: 0,
    }
  } : {};

  return (
    <motion.div
      style={getStyles()}
      variants={hoverVariants}
      whileHover={onClick ? "hover" : undefined}
      whileTap={onClick ? "tap" : undefined}
      onClick={onClick}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

Card.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf(['elevated', 'filled', 'outlined']),
  onClick: PropTypes.func,
  className: PropTypes.string,
};
