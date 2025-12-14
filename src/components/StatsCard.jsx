// src/components/StatsCard.jsx
import React from 'react';

const StatsCard = ({ title, value, subtitle, icon, isDark, progress }) => {
  return (
    <div className={`p-6 rounded-xl border ${
      isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-3xl">{icon}</div>
        <div className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {value}
        </div>
      </div>
      
      <h3 className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        {title}
      </h3>
      
      {subtitle && (
        <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
          {subtitle}
        </p>
      )}

      {progress !== undefined && (
        <div className={`mt-3 w-full rounded-full h-2 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
          <div
            className={`h-2 rounded-full ${
              progress > 90 ? 'bg-red-500' : progress > 70 ? 'bg-yellow-500' : 'bg-blue-600'
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default StatsCard;
