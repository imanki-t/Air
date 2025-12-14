import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '../../context/ThemeContext';
import { getTypography } from '../../theme/typography';

/**
 * Avatar Component
 */
export const Avatar = ({
  src,
  alt,
  initials,
  size = 'medium',
  className = '',
  ...props
}) => {
  const { colors } = useTheme();

  const getDims = () => {
    switch (size) {
      case 'small': return '32px';
      case 'large': return '56px';
      case 'xlarge': return '96px';
      case 'medium':
      default: return '40px';
    }
  };

  const getFontSize = () => {
    switch (size) {
        case 'small': return '12px';
        case 'large': return '22px';
        case 'xlarge': return '36px';
        default: return '16px';
    }
  }

  const dim = getDims();

  return (
    <div
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-full ${className}`}
      style={{
        width: dim,
        height: dim,
        backgroundColor: colors.primaryContainer,
        color: colors.onPrimaryContainer,
      }}
      {...props}
    >
      {src ? (
        <img
          src={src}
          alt={alt || 'Avatar'}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
            // Fallback to initials if image fails
          }}
        />
      ) : (
        <span
            className="font-medium select-none"
            style={{ fontSize: getFontSize() }}
        >
            {initials ? initials.slice(0, 2).toUpperCase() : '?'}
        </span>
      )}
    </div>
  );
};

Avatar.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string,
  initials: PropTypes.string,
  size: PropTypes.oneOf(['small', 'medium', 'large', 'xlarge']),
  className: PropTypes.string,
};
