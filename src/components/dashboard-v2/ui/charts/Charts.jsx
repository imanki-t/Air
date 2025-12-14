import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

/**
 * SVG Donut Chart Component
 */
export const DonutChart = ({
  data = [],
  size = 200,
  thickness = 20,
  className = '',
  centerLabel,
  ...props
}) => {
  const { colors } = useTheme();

  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  let currentAngle = 0;

  const radius = (size - thickness) / 2;
  const center = size / 2;

  const getCoordinatesForPercent = (percent) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map((item, index) => {
          const percentage = item.value / total;
          const startAngle = currentAngle;
          const endAngle = currentAngle + percentage;

          const [startX, startY] = getCoordinatesForPercent(startAngle);
          const [endX, endY] = getCoordinatesForPercent(endAngle);

          const largeArcFlag = percentage > 0.5 ? 1 : 0;

          const pathData = [
            `M ${center + radius * startX} ${center + radius * startY}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${center + radius * endX} ${center + radius * endY}`
          ].join(' ');

          currentAngle += percentage;

          return (
            <motion.path
              key={index}
              d={pathData}
              fill="none"
              stroke={item.color || colors.primary}
              strokeWidth={thickness}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: index * 0.2 }}
            />
          );
        })}
      </svg>
      {centerLabel && (
        <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
          {centerLabel}
        </div>
      )}
    </div>
  );
};

DonutChart.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.number.isRequired,
    color: PropTypes.string,
    label: PropTypes.string
  })),
  size: PropTypes.number,
  thickness: PropTypes.number,
  className: PropTypes.string,
  centerLabel: PropTypes.node,
};

/**
 * Line Chart Component
 */
export const LineChart = ({
    data = [],
    width = 500,
    height = 300,
    color
}) => {
    const { colors } = useTheme();
    const lineColor = color || colors.primary;

    if (data.length < 2) return null;

    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const minX = 0;
    const maxX = data.length - 1;
    const minY = Math.min(...data.map(d => d.value));
    const maxY = Math.max(...data.map(d => d.value));

    const getX = index => (index / maxX) * chartWidth + padding;
    const getY = value => chartHeight - ((value - minY) / (maxY - minY)) * chartHeight + padding;

    const pathData = data.reduce((acc, point, i) => {
        const x = getX(i);
        const y = getY(point.value);
        return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');

    return (
        <svg width={width} height={height}>
            <motion.path
                d={pathData}
                fill="none"
                stroke={lineColor}
                strokeWidth={2}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5 }}
            />
            {data.map((point, i) => (
                <motion.circle
                    key={i}
                    cx={getX(i)}
                    cy={getY(point.value)}
                    r={4}
                    fill={colors.surface}
                    stroke={lineColor}
                    strokeWidth={2}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 + i * 0.1 }}
                />
            ))}
        </svg>
    );
};

LineChart.propTypes = {
    data: PropTypes.arrayOf(PropTypes.shape({
        value: PropTypes.number.isRequired,
        label: PropTypes.string
    })),
    width: PropTypes.number,
    height: PropTypes.number,
    color: PropTypes.string
};
