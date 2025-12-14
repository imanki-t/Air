import React from 'react';

const M3Button = ({
  children,
  variant = 'filled',
  icon,
  onClick,
  className = '',
  disabled = false,
  type = 'button'
}) => {
  const baseStyles = "relative inline-flex items-center justify-center rounded-full h-10 px-6 text-sm font-medium transition-all duration-200 overflow-hidden disabled:opacity-38 disabled:cursor-not-allowed";

  const variants = {
    filled: "bg-primary text-on-primary hover:shadow-md hover:bg-primary/90 focus:bg-primary/90 active:bg-primary/80",
    tonal: "bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80 hover:shadow-sm",
    outlined: "border border-outline text-primary hover:bg-primary/10 focus:bg-primary/10",
    text: "text-primary hover:bg-primary/10 focus:bg-primary/10 px-3",
    elevated: "bg-surface-container-low text-primary shadow-sm hover:bg-primary/10 hover:shadow-md"
  };

  const rippleEffect = "after:content-[''] after:absolute after:w-full after:h-full after:top-0 after:left-0 after:bg-current after:opacity-0 hover:after:opacity-[0.08] active:after:opacity-[0.12]";

  return (
    <button
      type={type}
      className={`${baseStyles} ${variants[variant]} ${rippleEffect} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};

export default M3Button;
