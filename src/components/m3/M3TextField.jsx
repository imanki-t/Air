import React from 'react';

const M3TextField = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  leadingIcon,
  className = ''
}) => {
  return (
    <div className={`relative ${className}`}>
      {leadingIcon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
          {leadingIcon}
        </div>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`
          block w-full rounded-t-lg border-b border-outline-variant bg-surface-container-highest
          py-3 px-4 text-on-surface placeholder-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-0
          ${leadingIcon ? 'pl-10' : ''}
          transition-colors
        `}
      />
      <label className="absolute -top-2 left-2 text-xs text-primary bg-surface-container-highest px-1">
        {label}
      </label>
    </div>
  );
};

export default M3TextField;
