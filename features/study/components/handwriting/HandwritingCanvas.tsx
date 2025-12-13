
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useUIStore } from '../../../../stores/useUIStore';
import { playBrushSound } from '../../../../services/soundService';

interface Point {
  x: number;
  y: number;
  pressure: number;
  time: number;
}

interface HandwritingCanvasProps {
  width: number;
  height: number;
  onStrokeEnd: (strokes: { x: number; y: number }[][]) => void;
  onClear?: () => void;
}

// Physics Constants
const MIN_WIDTH = 2.0;
const MAX_WIDTH = 8.0;
const VELOCITY_WEIGHT = 0.7; // How much velocity affects width vs pressure

const HandwritingCanvas: React.FC<HandwritingCanvasProps> = ({ width, height, onStrokeEnd }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Store raw strokes for recognition (simplified coordinates)
  const [recognitionStrokes, setRecognitionStrokes] = useState<{ x: number; y: number }[][]>([]);
  // Store full physics points for redrawing
  const [renderStrokes, setRenderStrokes] = useState<Point[][]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  
  const { theme } = useUIStore();
  const isDark = theme === 'dark';

  // --- Vector Ink Engine ---

  const getStrokeWidth = (velocity: number, pressure: number) => {
    // Faster = Thinner, Higher Pressure = Thicker
    // Normalize velocity (arbitrary cap at 5px/ms)
    const normalizedVel = Math.min(velocity, 5) / 5;
    
    // Width influenced by inverse velocity and direct pressure
    const velocityFactor = (1 - normalizedVel) * (MAX_WIDTH - MIN_WIDTH);
    const pressureFactor = pressure * (MAX_WIDTH - MIN_WIDTH);
    
    // Combine factors
    const width = MIN_WIDTH + (velocityFactor * (1 - VELOCITY_WEIGHT)) + (pressureFactor * VELOCITY_WEIGHT);
    return width;
  };

  const drawPoint = (ctx: CanvasRenderingContext2D, p1: Point, p2: Point) => {
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const timeDiff = p2.time - p1.time;
    const velocity = timeDiff > 0 ? dist / timeDiff : 0;
    
    const lineWidth = getStrokeWidth(velocity, p2.pressure);

    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = isDark ? '#f1f5f9' : '#1e293b'; // slate-100 : slate-800
    
    // Quadratic Bezier for smoothing
    // We use the midpoint technique to smooth the line between captured points
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    
    // Audio Feedback based on velocity
    if (dist > 2) {
         playBrushSound(0.05, Math.min(velocity / 2, 1));
    }
  };

  // --- Rendering Pipeline ---

  const drawBackground = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, width, height);

    // 1. Rice Paper Texture Base
    ctx.fillStyle = isDark ? '#1e1e1e' : '#fdfbf7';
    ctx.fillRect(0, 0, width, height);

    // 2. Paper Grain (Noise)
    // In a real app, use a pre-loaded image pattern. Here we simulate dots.
    // Optimization: Only draw noise if canvas is small enough or cached, otherwise simple fill.
    if (width < 500) {
        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
        for (let i = 0; i < 200; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const r = Math.random() * 1.5;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // 3. "Tian Zi Ge" Grid (Dynamic Opacity)
    ctx.beginPath();
    ctx.lineWidth = 1;
    // Outer Border
    ctx.strokeStyle = isDark ? '#3f3f46' : '#e5e7eb';
    ctx.strokeRect(2, 2, width - 4, height - 4);
    
    // Dashed Center Lines (Red/Pink)
    ctx.beginPath();
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(252, 165, 165, 0.5)'; 
    
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const renderAll = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      drawBackground(ctx);
      
      // Draw historical strokes
      renderStrokes.forEach(stroke => {
          if (stroke.length < 2) return;
          ctx.beginPath();
          for (let i = 0; i < stroke.length - 1; i++) {
              drawPoint(ctx, stroke[i], stroke[i+1]);
          }
      });
      
      // Draw current stroke
      if (currentStroke.length >= 2) {
          const p1 = currentStroke[currentStroke.length - 2];
          const p2 = currentStroke[currentStroke.length - 1];
          drawPoint(ctx, p1, p2);
      }
  }, [renderStrokes, currentStroke, isDark, width, height]);

  // Initial & Update Render
  useEffect(() => {
      renderAll();
  }, [renderStrokes, currentStroke, renderAll]);


  // --- Event Handling ---

  const getPoint = (e: React.PointerEvent): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0, pressure: 0.5, time: Date.now() };
      const rect = canvas.getBoundingClientRect();
      
      return {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          pressure: e.pressure || 0.5, // Default for mouse
          time: Date.now()
      };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDrawing(true);
      const point = getPoint(e);
      setCurrentStroke([point]);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
      e.preventDefault();
      if (!isDrawing) return;
      
      // Coalesced events for higher precision on supported hardware
      const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      
      const newPoints = events.map(evt => getPoint(evt));
      setCurrentStroke(prev => [...prev, ...newPoints]);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
      e.preventDefault();
      if (!isDrawing) return;
      setIsDrawing(false);
      
      if (currentStroke.length > 0) {
          const newRenderStrokes = [...renderStrokes, currentStroke];
          setRenderStrokes(newRenderStrokes);
          
          // Simplify for recognition (strip pressure/time)
          const simpleStroke = currentStroke.map(p => ({ x: p.x, y: p.y }));
          const newRecognitionStrokes = [...recognitionStrokes, simpleStroke];
          setRecognitionStrokes(newRecognitionStrokes);
          
          onStrokeEnd(newRecognitionStrokes);
      }
      setCurrentStroke([]);
  };
  
  return (
    <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="rounded-xl shadow-inner cursor-crosshair touch-none bg-white dark:bg-black"
        style={{ touchAction: 'none' }}
    />
  );
};

export default HandwritingCanvas;
