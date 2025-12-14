import React from 'react';

const M3Card = ({ children, className = '', onClick, elevated = false }) => {
  return (
    <div
      className={`
        bg-surface-container-low
        rounded-xl
        p-4
        ${elevated ? 'shadow-md' : 'border border-outline-variant'}
        ${onClick ? 'cursor-pointer hover:bg-surface-container hover:shadow-sm transition-all' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default M3Card;
