
import * as React from 'react';

interface GrassPatchesProps {
    count?: number;
}

const pseudoRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
};

const GrassPatches: React.FC<GrassPatchesProps> = ({ count = 5 }) => {
    const patches = React.useMemo(() => {
        return Array.from({ length: count }).map((_, i) => {
            const r1 = pseudoRandom(i * 50);
            const r2 = pseudoRandom(i * 50 + 1);
            
            // Distributed mainly around the center and edges of the mound
            // x between 20 and 80
            const startX = 20 + r1 * 60;
            // y between 85 and 95
            const startY = 85 + r2 * 10;
            
            // Slight variations for grass blades
            const d = `M ${startX} ${startY} Q ${startX + 1} ${startY - 4} ${startX + 2} ${startY} M ${startX + 2} ${startY + 2} Q ${startX + 3} ${startY - 3} ${startX + 4} ${startY + 2}`;
            
            return { id: i, d };
        });
    }, [count]);

    return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible animate-fadeIn" style={{ animationDelay: '500ms' }}>
            <g fill="none" stroke="#a7f3d0" strokeWidth="0.5" strokeLinecap="round">
                {patches.map(p => (
                    <path key={p.id} d={p.d} />
                ))}
            </g>
        </svg>
    );
};

export default GrassPatches;
