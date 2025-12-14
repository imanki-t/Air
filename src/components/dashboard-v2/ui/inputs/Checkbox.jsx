import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

/**
 * Material 3 Checkbox
 */
export const Checkbox = ({
  checked,
  onChange,
  disabled = false,
  indeterminate = false,
  className = '',
  ...props
}) => {
  const { colors } = useTheme();

  const variants = {
    unchecked: {
      backgroundColor: 'transparent',
      borderColor: disabled ? colors.onSurface + '61' : colors.onSurfaceVariant,
    },
    checked: {
      backgroundColor: disabled ? colors.onSurface + '1F' : colors.primary,
      borderColor: disabled ? 'transparent' : colors.primary,
    },
    indeterminate: {
        backgroundColor: disabled ? colors.onSurface + '1F' : colors.primary,
        borderColor: disabled ? 'transparent' : colors.primary,
    }
  };

  const containerStyle = {
    width: '18px',
    height: '18px',
    borderRadius: '2px',
    borderWidth: '2px',
    borderStyle: 'solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer',
    position: 'relative',
    zIndex: 1
  };

  // State layer (ripple target) wrapper
  const wrapperStyle = {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };

  return (
    <motion.div
        style={wrapperStyle}
        className={className}
        onClick={!disabled ? onChange : undefined}
        whileHover={!disabled ? { backgroundColor: colors.onSurface + '14' } : undefined}
        whileTap={!disabled ? { backgroundColor: colors.onSurface + '1F' } : undefined}
    >
        <motion.div
            style={containerStyle}
            variants={variants}
            initial={false}
            animate={checked ? 'checked' : (indeterminate ? 'indeterminate' : 'unchecked')}
        >
            {checked && (
                <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                    <path
                        d="M1.33334 5L4.66667 8.33333L10.6667 1.66667"
                        stroke={disabled ? colors.onSurface + '61' : colors.onPrimary}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            )}
            {indeterminate && (
                 <svg width="10" height="2" viewBox="0 0 10 2" fill="none">
                 <path
                     d="M1 1H9"
                     stroke={disabled ? colors.onSurface + '61' : colors.onPrimary}
                     strokeWidth="2"
                     strokeLinecap="round"
                     strokeLinejoin="round"
                 />
             </svg>
            )}
        </motion.div>
    </motion.div>
  );
};

Checkbox.propTypes = {
  checked: PropTypes.bool,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  indeterminate: PropTypes.bool,
  className: PropTypes.string,
};
