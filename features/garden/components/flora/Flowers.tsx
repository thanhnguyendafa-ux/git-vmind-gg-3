
import * as React from 'react';

interface FlowersProps {
    count: number;
}

// Simple deterministic pseudo-random number generator
const pseudoRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
};

const FLOWER_COLORS = ["#f472b6", "#c084fc", "#fbbf24", "#f87171", "#60a5fa"];

const Flowers: React.FC<FlowersProps> = ({ count }) => {
    const flowers = React.useMemo(() => {
        return Array.from({ length: count }).map((_, i) => {
            // Seed based on index to ensure stability
            const r1 = pseudoRandom(i + 1);
            const r2 = pseudoRandom(i + 100);
            const r3 = pseudoRandom(i + 200);
            
            // x between 5 and 95
            const cx = 5 + r1 * 90;
            // y between 70 and 95 (ground area)
            const cy = 70 + r2 * 25;
            
            const color = FLOWER_COLORS[Math.floor(r3 * FLOWER_COLORS.length)];
            
            return { cx, cy, color };
        });
    }, [count]);

    return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible animate-fadeIn" style={{ animationDelay: '200ms' }}>
            {flowers.map((f, i) => (
                <g key={i}>
                    <circle cx={f.cx} cy={f.cy} r="1.5" fill={f.color} />
                    <circle cx={f.cx} cy={f.cy} r="0.5" fill="white" opacity="0.5" />
                </g>
            ))}
        </svg>
    );
};

export default Flowers;
