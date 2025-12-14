import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

/**
 * Material 3 Switch
 */
export const Switch = ({
  checked,
  onChange,
  disabled = false,
  iconOn = null,
  iconOff = null,
  className = '',
  ...props
}) => {
  const { colors } = useTheme();

  const trackVariants = {
    unchecked: {
      backgroundColor: disabled ? colors.onSurface + '1F' : colors.surfaceContainerHighest,
      borderColor: disabled ? colors.onSurface + '1F' : colors.outline,
    },
    checked: {
      backgroundColor: disabled ? colors.onSurface + '1F' : colors.primary,
      borderColor: disabled ? 'transparent' : colors.primary,
    }
  };

  const thumbVariants = {
    unchecked: {
      x: 0,
      backgroundColor: disabled ? colors.onSurface + '61' : colors.outline,
      width: iconOff ? 24 : 16,
      height: iconOff ? 24 : 16,
    },
    checked: {
      x: 20,
      backgroundColor: disabled ? colors.surface : colors.onPrimary,
      width: 24,
      height: 24,
    }
  };

  return (
    <div
        className={`inline-flex items-center cursor-pointer ${disabled ? 'opacity-50' : ''} ${className}`}
        onClick={!disabled ? onChange : undefined}
    >
      <motion.div
        style={{
          width: '52px',
          height: '32px',
          borderRadius: '100px',
          display: 'flex',
          alignItems: 'center',
          padding: '4px',
          borderWidth: '2px',
          borderStyle: 'solid',
          position: 'relative'
        }}
        variants={trackVariants}
        initial={false}
        animate={checked ? 'checked' : 'unchecked'}
      >
        <motion.div
          style={{
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: checked ? (disabled ? colors.onSurface : colors.onPrimaryContainer) : colors.surfaceContainerHighest,
          }}
          variants={thumbVariants}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
            {checked ? iconOn : iconOff}
        </motion.div>
      </motion.div>
    </div>
  );
};

Switch.propTypes = {
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  iconOn: PropTypes.node,
  iconOff: PropTypes.node,
  className: PropTypes.string,
};
