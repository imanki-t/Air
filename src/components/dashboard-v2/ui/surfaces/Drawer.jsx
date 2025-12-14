import React from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { slideInRight } from '../../theme/motion';

/**
 * Material 3 Navigation Drawer / Sidebar
 */
export const Drawer = ({
  isOpen,
  onClose,
  children,
  position = 'left',
  className = '',
  width = '300px',
  ...props
}) => {
  const { colors } = useTheme();

  const slideVariants = {
    initial: { x: position === 'left' ? '-100%' : '100%' },
    animate: {
      x: 0,
      transition: { type: "spring", stiffness: 300, damping: 30 }
    },
    exit: {
      x: position === 'left' ? '-100%' : '100%',
      transition: { type: "spring", stiffness: 300, damping: 30 }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.32 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ backgroundColor: colors.scrim }}
            className="fixed inset-0 z-40"
          />

          {/* Drawer Surface */}
          <motion.div
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{
              backgroundColor: colors.surfaceContainerLow,
              width: width,
              height: '100%',
              position: 'fixed',
              top: 0,
              [position]: 0,
              zIndex: 50,
              boxShadow: '0px 8px 10px -5px rgba(0,0,0,0.2), 0px 16px 24px 2px rgba(0,0,0,0.14), 0px 6px 30px 5px rgba(0,0,0,0.12)',
              borderTopRightRadius: position === 'left' ? '16px' : '0',
              borderBottomRightRadius: position === 'left' ? '16px' : '0',
              borderTopLeftRadius: position === 'right' ? '16px' : '0',
              borderBottomLeftRadius: position === 'right' ? '16px' : '0',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
            className={className}
            onClick={(e) => e.stopPropagation()}
            {...props}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

Drawer.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node,
  position: PropTypes.oneOf(['left', 'right']),
  className: PropTypes.string,
  width: PropTypes.string,
};
