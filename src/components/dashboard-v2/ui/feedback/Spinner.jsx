import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

/**
 * Circular Progress Spinner
 */
export const Spinner = ({
  size = 'medium', // small, medium, large
  className = '',
  ...props
}) => {
  const { colors } = useTheme();

  const getDims = () => {
    switch (size) {
      case 'small': return 24;
      case 'large': return 64;
      case 'medium':
      default: return 48;
    }
  };

  const dim = getDims();
  const strokeWidth = size === 'small' ? 3 : 4;

  return (
    <div
        className={`flex items-center justify-center ${className}`}
        style={{ width: dim, height: dim }}
        {...props}
    >
      <motion.svg
        viewBox="0 0 50 50"
        style={{ width: '100%', height: '100%' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      >
        <motion.circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke={colors.primary}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ strokeDasharray: "1, 150", strokeDashoffset: 0 }}
          animate={{
            strokeDasharray: ["1, 150", "90, 150", "90, 150"],
            strokeDashoffset: [0, -35, -124]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.svg>
    </div>
  );
};

Spinner.propTypes = {
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  className: PropTypes.string,
};
