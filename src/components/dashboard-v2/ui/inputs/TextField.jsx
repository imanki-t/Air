import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { getTypography } from '../../theme/typography';

/**
 * Material 3 Text Field
 */
export const TextField = ({
  label,
  value,
  onChange,
  placeholder = '',
  type = 'text',
  variant = 'outlined', // filled, outlined
  error = false,
  helperText = '',
  leadingIcon = null,
  trailingIcon = null,
  disabled = false,
  className = '',
  ...props
}) => {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const isFilled = variant === 'filled';

  // Color Logic
  const getBorderColor = () => {
    if (error) return colors.error;
    if (focused) return colors.primary;
    return isFilled ? 'transparent' : colors.outline;
  };

  const getLabelColor = () => {
    if (error) return colors.error;
    if (focused) return colors.primary;
    return colors.onSurfaceVariant;
  };

  const getContainerBg = () => {
    if (isFilled) return colors.surfaceContainerHighest;
    return 'transparent';
  };

  const containerStyle = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    backgroundColor: getContainerBg(),
    border: isFilled ? 'none' : `1px solid ${getBorderColor()}`,
    borderBottom: isFilled ? `1px solid ${getBorderColor()}` : undefined,
    borderRadius: isFilled ? '4px 4px 0 0' : '4px',
    padding: '0 12px',
    height: '56px',
    transition: 'all 0.2s ease',
  };

  // Label Animation
  const labelStyle = {
    position: 'absolute',
    left: leadingIcon ? '44px' : '16px',
    top: (focused || value) ? '8px' : '16px',
    fontSize: (focused || value) ? '12px' : '16px',
    color: getLabelColor(),
    pointerEvents: 'none',
    transition: 'all 0.2s ease',
    ...getTypography((focused || value) ? 'bodySmall' : 'bodyLarge'),
  };

  const inputStyle = {
    width: '100%',
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    color: colors.onSurface,
    height: '100%',
    paddingTop: (focused || value) ? '16px' : '0',
    paddingLeft: leadingIcon ? '32px' : '4px',
    paddingRight: trailingIcon ? '32px' : '4px',
    ...getTypography('bodyLarge'),
  };

  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      <motion.div
        style={containerStyle}
        animate={{
            borderColor: getBorderColor(),
            borderWidth: focused ? '2px' : '1px'
        }}
      >
        {leadingIcon && (
          <span className="absolute left-3 text-on-surface-variant flex items-center justify-center">
            {leadingIcon}
          </span>
        )}

        <motion.label style={labelStyle}>
          {label}
        </motion.label>

        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={focused ? placeholder : ''}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={inputStyle}
          {...props}
        />

        {trailingIcon && (
          <span className="absolute right-3 text-on-surface-variant flex items-center justify-center cursor-pointer">
            {trailingIcon}
          </span>
        )}
      </motion.div>

      {helperText && (
        <span
            style={{
                color: error ? colors.error : colors.onSurfaceVariant,
                paddingLeft: '16px',
                ...getTypography('bodySmall')
            }}
        >
          {helperText}
        </span>
      )}
    </div>
  );
};

TextField.propTypes = {
  label: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  type: PropTypes.string,
  variant: PropTypes.oneOf(['filled', 'outlined']),
  error: PropTypes.bool,
  helperText: PropTypes.string,
  leadingIcon: PropTypes.node,
  trailingIcon: PropTypes.node,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};
