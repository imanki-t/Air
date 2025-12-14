import React from 'react';

const M3Fab = ({ icon, onClick, variant = 'primary', className = '', size = 'medium' }) => {
  const sizes = {
    small: 'w-10 h-10',
    medium: 'w-14 h-14',
    large: 'w-24 h-24'
  };

  const colors = {
    primary: 'bg-primary-container text-on-primary-container hover:bg-primary-container/90',
    secondary: 'bg-secondary-container text-on-secondary-container hover:bg-secondary-container/90',
    surface: 'bg-surface-container-high text-primary hover:bg-surface-container-highest'
  };

  return (
    <button
      className={`
        flex items-center justify-center
        rounded-2xl
        shadow-md hover:shadow-lg
        transition-all duration-200
        ${sizes[size]}
        ${colors[variant]}
        ${className}
      `}
      onClick={onClick}
    >
      {icon}
    </button>
  );
};

export default M3Fab;
