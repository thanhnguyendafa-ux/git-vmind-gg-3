import React from 'react';
import { useUIStore } from '../../stores/useUIStore';

interface OrganicCardProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    hoverScale?: boolean;
}

export const OrganicCard: React.FC<OrganicCardProps> = ({
    children,
    className = '',
    delay = 0,
    hoverScale = true
}) => {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';

    // Organic border radius values for a "hand-drawn" feel
    // These alternate slightly for more variety if we wanted to randomize, 
    // but fixed unique ones work well for consistency.
    const borderRadius = "rounded-[2.5rem] md:rounded-[3rem]";

    return (
        <div
            className={`
                relative overflow-hidden ${borderRadius} transition-all duration-500
                backdrop-blur-xl border border-white/40 dark:border-white/10
                ${isDark ? 'bg-white/5 shadow-2xl shadow-black/20' : 'bg-white/60 shadow-xl shadow-emerald-900/5'}
                ${hoverScale ? 'hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98]' : ''}
                ${className}
            `}
            style={{
                animation: 'slideInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) backwards',
                animationDelay: `${delay}ms`
            }}
        >
            {/* Subtle inner light reflection */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

            {/* Organic Texture Overlay */}
            <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none bg-noise mix-blend-overlay"></div>

            <div className="relative z-10 h-full">
                {children}
            </div>
        </div>
    );
};
