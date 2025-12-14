import React from 'react';

const M3ListItem = ({
  headline,
  supportingText,
  leading,
  trailing,
  onClick,
  active = false
}) => {
  return (
    <div
      className={`
        flex items-center px-4 py-3
        ${active ? 'bg-secondary-container text-on-secondary-container' : 'hover:bg-surface-container-high text-on-surface'}
        cursor-pointer rounded-full transition-colors mx-2
      `}
      onClick={onClick}
    >
      {leading && (
        <div className="mr-4 flex items-center justify-center text-on-surface-variant">
          {leading}
        </div>
      )}

      <div className="flex-1">
        <div className={`text-base font-normal ${active ? 'font-medium' : ''}`}>
          {headline}
        </div>
        {supportingText && (
          <div className="text-sm text-on-surface-variant">
            {supportingText}
          </div>
        )}
      </div>

      {trailing && (
        <div className="ml-4 text-on-surface-variant">
          {trailing}
        </div>
      )}
    </div>
  );
};

export default M3ListItem;
