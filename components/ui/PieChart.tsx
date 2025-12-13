import * as React from 'react';

interface PieChartProps {
  data: { value: number; color: string; label?: string }[];
  total: number;
  centerValue: string;
  centerLabel: string;
  isDonut?: boolean;
}

const PieChart: React.FC<PieChartProps> = ({ data, total, centerValue, centerLabel, isDonut = false }) => {
    const radius = 15.91549430918954; // so circumference is 100
    const strokeWidth = isDonut ? 4 : radius; // Thicker stroke for donut, full radius for pie
    const innerRadius = isDonut ? radius - strokeWidth : 0;
    
    let offset = 0;

    return (
        <div className="relative w-32 h-32">
            <svg viewBox="0 0 36 36" className="w-full h-full">
                <circle cx="18" cy="18" r={radius} fill="transparent" className="stroke-secondary-200 dark:stroke-secondary-700" strokeWidth={strokeWidth} />

                {data.map((item, index) => {
                    if (item.value === 0) return null;
                    const percentage = total > 0 ? (item.value / total) * 100 : 0;
                    if (percentage === 0) return null;
                    // Prevent tiny slivers from looking weird
                    const finalPercentage = percentage < 0.5 ? 0 : percentage;
                    const currentOffset = offset;
                    offset += finalPercentage;
                    return (
                        <circle
                            key={index}
                            cx="18"
                            cy="18"
                            r={radius}
                            fill="transparent"
                            stroke={item.color}
                            strokeWidth={strokeWidth}
                            strokeDasharray={`${finalPercentage} ${100 - finalPercentage}`}
                            strokeDashoffset={-currentOffset}
                            transform="rotate(-90 18 18)"
                        >
                            <title>{item.label}: {item.value}</title>
                        </circle>
                    );
                })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold text-text-main dark:text-secondary-100">{centerValue}</span>
                <span className="text-xs text-text-subtle">{centerLabel}</span>
            </div>
        </div>
    );
};

export default PieChart;
