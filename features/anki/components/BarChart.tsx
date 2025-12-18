import * as React from 'react';

interface BarChartProps {
  data: { label: string; value: number }[];
  maxBarHeight?: number;
}

const Bar: React.FC<{ item: { label: string, value: number }, maxValue: number, maxBarHeight: number }> = ({ item, maxValue, maxBarHeight }) => {
    const [heightPercent, setHeightPercent] = React.useState(0);
    
    React.useEffect(() => {
        // Stagger the animation start for a more dynamic feel
        const delay = Math.random() * 200;
        const timer = setTimeout(() => {
            const percent = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
            setHeightPercent(percent);
        }, delay);
        return () => clearTimeout(timer);
    }, [item.value, maxValue]);

    const getColorClass = () => {
        const ratio = maxValue > 0 ? item.value / maxValue : 0;
        if (ratio > 0.8) return 'bg-primary-700';
        if (ratio > 0.6) return 'bg-primary-600';
        if (ratio > 0.4) return 'bg-primary-500';
        if (ratio > 0.2) return 'bg-primary-400';
        if (ratio > 0) return 'bg-primary-300';
        return 'bg-secondary-200 dark:bg-secondary-700';
    };

    return (
        <div className="flex-1 flex flex-col items-center gap-1 group" title={`${item.label}: ${item.value}`}>
            <div className="relative w-full h-full flex items-end justify-center">
                <div
                    className={`w-full rounded-t-md transition-all duration-500 ease-out group-hover:opacity-80 ${getColorClass()}`}
                    style={{ height: `${heightPercent}%` }}
                >
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold bg-secondary-800 text-white px-1.5 py-0.5 rounded-md pointer-events-none">
                        {item.value}
                    </div>
                </div>
            </div>
            <p className="text-xs text-text-subtle truncate">{item.label}</p>
        </div>
    );
};

const BarChart: React.FC<BarChartProps> = ({ data, maxBarHeight = 128 }) => {
  const maxValue = React.useMemo(() => {
    const max = Math.max(...data.map(d => d.value));
    return max > 0 ? max : 1;
  }, [data]);

  return (
    <div className="flex justify-between items-end gap-1 sm:gap-2" style={{ height: `${maxBarHeight}px` }}>
      {data.map((item, index) => (
        <Bar key={index} item={item} maxValue={maxValue} maxBarHeight={maxBarHeight} />
      ))}
    </div>
  );
};

export default BarChart;
