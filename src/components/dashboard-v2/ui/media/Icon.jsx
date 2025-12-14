import React from 'react';
import PropTypes from 'prop-types';

/**
 * Icon Wrapper Component
 */
export const Icon = ({
  icon,
  size = 24,
  color,
  className = '',
  ...props
}) => {
  return (
    <span
        className={`inline-flex items-center justify-center ${className}`}
        style={{ width: size, height: size, color }}
        {...props}
    >
        {React.cloneElement(icon, {
            width: size,
            height: size,
            strokeWidth: 2
        })}
    </span>
  );
};

Icon.propTypes = {
    icon: PropTypes.element.isRequired,
    size: PropTypes.number,
    color: PropTypes.string,
    className: PropTypes.string
};
