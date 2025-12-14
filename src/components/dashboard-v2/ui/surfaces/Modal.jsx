import React from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { getTypography } from '../../theme/typography';
import { scaleFade } from '../../theme/motion';
import { TextButton } from '../buttons/TextButton';

/**
 * Material 3 Dialog (Modal)
 */
export const Modal = ({
  isOpen,
  onClose,
  title,
  icon,
  children,
  actions,
  maxWidth = '560px',
  ...props
}) => {
  const { colors } = useTheme();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.32 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ backgroundColor: colors.scrim }}
            className="absolute inset-0"
          />

          {/* Dialog Surface */}
          <motion.div
            variants={scaleFade}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{
              backgroundColor: colors.surfaceContainerHigh,
              borderRadius: '28px',
              maxWidth: maxWidth,
              width: '100%',
              position: 'relative',
              zIndex: 10,
              boxShadow: '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh'
            }}
            onClick={(e) => e.stopPropagation()}
            {...props}
          >
            {/* Header */}
            <div className="p-6 pb-4 flex flex-col gap-4 items-center text-center sm:items-start sm:text-left">
              {icon && (
                <div className="mb-2 text-secondary">
                  {icon}
                </div>
              )}
              <h2 style={{ color: colors.onSurface, ...getTypography('headlineSmall') }}>
                {title}
              </h2>
            </div>

            {/* Content */}
            <div className="px-6 pb-6 overflow-y-auto custom-scrollbar" style={{ color: colors.onSurfaceVariant, ...getTypography('bodyMedium') }}>
              {children}
            </div>

            {/* Actions */}
            {actions && (
              <div className="p-6 pt-2 flex justify-end gap-2">
                {actions}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  icon: PropTypes.node,
  children: PropTypes.node,
  actions: PropTypes.node,
  maxWidth: PropTypes.string,
};
