import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { getTypography } from '../../theme/typography';
import { IconButton } from '../buttons/IconButton';

/**
 * Custom Date Picker
 */
export const DatePicker = ({ value, onChange, className = '' }) => {
  const { colors } = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const days = daysInMonth(year, month);
    const firstDay = firstDayOfMonth(year, month);

    const blanks = Array(firstDay).fill(null);
    const dayArray = Array.from({ length: days }, (_, i) => i + 1);

    return [...blanks, ...dayArray].map((day, index) => {
        if (!day) return <div key={`blank-${index}`} />;

        const dateObj = new Date(year, month, day);
        const isSelected = value && dateObj.toDateString() === new Date(value).toDateString();
        const isToday = dateObj.toDateString() === new Date().toDateString();

        return (
            <div
                key={day}
                className="w-8 h-8 flex items-center justify-center rounded-full cursor-pointer text-sm"
                style={{
                    backgroundColor: isSelected ? colors.primary : (isToday ? colors.secondaryContainer : 'transparent'),
                    color: isSelected ? colors.onPrimary : (isToday ? colors.onSecondaryContainer : colors.onSurface)
                }}
                onClick={() => onChange(dateObj)}
            >
                {day}
            </div>
        );
    });
  };

  return (
    <div className={`p-4 rounded-xl shadow-lg border inline-block ${className}`} style={{ backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }}>
      <div className="flex items-center justify-between mb-4">
        <IconButton
            icon={<span className="text-xl">‹</span>}
            onClick={handlePrevMonth}
            size="small"
        />
        <span style={{ color: colors.onSurface, ...getTypography('titleMedium') }}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </span>
        <IconButton
            icon={<span className="text-xl">›</span>}
            onClick={handleNextMonth}
            size="small"
        />
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
         {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
             <div key={d} className="text-xs font-bold opacity-50" style={{ color: colors.onSurfaceVariant }}>{d}</div>
         ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
          {renderCalendar()}
      </div>
    </div>
  );
};
