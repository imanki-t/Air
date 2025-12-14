import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { getTypography } from '../../theme/typography';
import { slideUp } from '../../theme/motion';
import { TextButton } from '../buttons/TextButton';

/**
 * Material 3 Snackbar / Toast
 */
export const Toast = ({
  message,
  actionLabel,
  onAction,
  onDismiss,
  duration = 4000,
  isVisible,
  className = '',
  ...props
}) => {
  const { colors } = useTheme();

  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onDismiss]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          variants={slideUp}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{
            backgroundColor: colors.inverseSurface,
            color: colors.inverseOnSurface,
            borderRadius: '4px',
            padding: '0 16px',
            minHeight: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'fixed',
            bottom: '24px',
            left: '24px',
            zIndex: 100,
            maxWidth: '360px',
            width: 'calc(100% - 48px)',
            boxShadow: '0px 1px 3px 1px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.3)',
            ...getTypography('bodyMedium')
          }}
          className={className}
          {...props}
        >
          <span className="py-3 mr-auto">{message}</span>

          {actionLabel && (
            <div className="ml-3">
              <TextButton
                label={actionLabel}
                onClick={onAction}
                style={{ color: colors.inversePrimary }}
              />
            </div>
          )}

          <button
            onClick={onDismiss}
            className="ml-2 p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

Toast.propTypes = {
  message: PropTypes.string.isRequired,
  actionLabel: PropTypes.string,
  onAction: PropTypes.func,
  onDismiss: PropTypes.func.isRequired,
  duration: PropTypes.number,
  isVisible: PropTypes.bool.isRequired,
  className: PropTypes.string,
};
