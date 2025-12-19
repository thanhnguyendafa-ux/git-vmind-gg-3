import React, { useEffect, useRef } from 'react';
import { useUIStore } from '../../stores/useUIStore';

export const LivingTreeVisual: React.FC<{ className?: string }> = ({ className = '' }) => {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let productId = 0;
        const branches: Branch[] = [];

        // Canvas sizing
        const setSize = () => {
            const parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
            }
        };
        setSize();
        window.addEventListener('resize', setSize);

        // Organic Branch Logic
        class Branch {
            x: number;
            y: number;
            angle: number;
            length: number;
            width: number;
            color: string;
            speed: number;
            targetAngle: number;
            generation: number;

            constructor(x: number, y: number, angle: number, length: number, width: number, generation: number) {
                this.x = x;
                this.y = y;
                this.angle = angle;
                this.length = length;
                this.width = width;
                this.generation = generation;
                this.color = isDark ? `rgba(16, 185, 129, ${0.8 - generation * 0.1})` : `rgba(21, 128, 61, ${0.8 - generation * 0.1})`;
                this.speed = 0;
                this.targetAngle = angle;
            }

            grow() {
                // Swaying motion
                this.targetAngle = this.angle + Math.sin(Date.now() / 1000 + this.generation) * 0.02;
                this.angle += (this.targetAngle - this.angle) * 0.1;

                // Draw
                if (!ctx) return;
                ctx.beginPath();
                const endX = this.x + Math.cos(this.angle) * this.length;
                const endY = this.y + Math.sin(this.angle) * this.length;

                ctx.moveTo(this.x, this.y);
                // Quadratic curve for organic feel
                ctx.quadraticCurveTo(
                    this.x + Math.cos(this.angle) * (this.length / 2),
                    this.y + Math.sin(this.angle) * (this.length / 2) + (Math.random() - 0.5) * 2,
                    endX,
                    endY
                );

                ctx.strokeStyle = this.color;
                ctx.lineWidth = this.width;
                ctx.lineCap = 'round';
                ctx.stroke();

                // Draw Leaves/Orbs
                if (this.generation > 2 && Math.random() > 0.9) {
                    ctx.beginPath();
                    ctx.fillStyle = isDark ? '#3DDC84' : '#86efac';
                    ctx.arc(endX, endY, 2, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Recursive growth visual (simplified for loop)
            }
        }

        // Initialize simplified tree for landing page visual
        // A more complex generative fractal would go here
        // For now, drawing a static-ish organic shape that sways
        const draw = () => {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Base
            const centerX = canvas.width / 2;
            const bottomY = canvas.height * 0.9;

            // Simple trunk
            ctx.beginPath();
            ctx.moveTo(centerX, bottomY);
            ctx.lineTo(centerX, bottomY - 100);
            ctx.strokeStyle = isDark ? '#166534' : '#4ade80';
            ctx.lineWidth = 8;
            ctx.stroke();

            // This is a placeholder for a complex generative tree.
            // For the purpose of the prototype, we assume a nice SVG or complex canvas render.
            // Let's draw a few organic curves to represent the "Garden".

            const time = Date.now() / 2000;

            for (let i = 0; i < 5; i++) {
                ctx.beginPath();
                const startX = centerX;
                const startY = bottomY - 50;
                const endX = centerX + Math.sin(time + i) * 100 + (i - 2) * 50;
                const endY = bottomY - 200 - Math.cos(time + i) * 50;

                ctx.moveTo(startX, startY);
                ctx.bezierCurveTo(startX + (i - 2) * 20, startY - 50, endX, endY + 50, endX, endY);

                ctx.strokeStyle = isDark
                    ? `rgba(61, 220, 132, ${0.2 + i * 0.1})`
                    : `rgba(22, 163, 74, ${0.2 + i * 0.1})`;
                ctx.lineWidth = 4 - i * 0.5;
                ctx.stroke();

                // Glow
                ctx.shadowBlur = 15;
                ctx.shadowColor = isDark ? '#3DDC84' : '#16a34a';
            }
            ctx.shadowBlur = 0;

            productId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', setSize);
            cancelAnimationFrame(productId);
        };
    }, [isDark]);

    return (
        <div className={`relative w-full h-full min-h-[400px] flex items-center justify-center overflow-hidden rounded-3xl ${className}`}>
            {/* Background Atmosphere */}
            <div className={`absolute inset-0 opacity-50 ${isDark ? 'bg-gradient-to-t from-emerald-900/40 to-transparent' : 'bg-gradient-to-t from-emerald-100/40 to-transparent'}`} />

            {/* Canvas for generative art */}
            <canvas ref={canvasRef} className="absolute inset-0 z-10" />

            {/* Fallback / overlay content */}
            <div className="relative z-20 text-center p-8 backdrop-blur-sm bg-white/5 rounded-2xl border border-white/10 shadow-2xl">
                <div className={`text-6xl mb-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    🌱
                </div>
                <p className={`font-serif italic text-lg ${isDark ? 'text-emerald-200/80' : 'text-emerald-800/80'}`}>
                    "The mind is a garden."
                </p>
            </div>
        </div>
    );
};
