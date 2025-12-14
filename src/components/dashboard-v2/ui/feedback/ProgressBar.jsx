import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

/**
 * Material 3 Linear Progress Indicator
 */
export const ProgressBar = ({
  progress = 0, // 0 to 100
  indeterminate = false,
  className = '',
  height = '4px',
  ...props
}) => {
  const { colors } = useTheme();

  return (
    <div
      className={`w-full overflow-hidden rounded-full ${className}`}
      style={{
        backgroundColor: colors.surfaceContainerHighest,
        height: height
      }}
      {...props}
    >
      {indeterminate ? (
        <motion.div
          className="h-full w-full origin-left"
          style={{ backgroundColor: colors.primary }}
          animate={{
            x: ['-100%', '100%'],
            scaleX: [0.2, 0.5, 0.8, 0.2]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ) : (
        <motion.div
          className="h-full"
          style={{ backgroundColor: colors.primary }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          transition={{ type: "spring", stiffness: 50, damping: 20 }}
        />
      )}
    </div>
  );
};

ProgressBar.propTypes = {
  progress: PropTypes.number,
  indeterminate: PropTypes.bool,
  className: PropTypes.string,
  height: PropTypes.string,
};
