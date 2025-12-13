import * as React from 'react';
import Icon from '../../components/ui/Icon';

interface FocusTimerProps {
  startTime?: number;
  onTick?: (elapsedSeconds: number) => void;
  displaySeconds?: number;
}

const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const FocusTimer: React.FC<FocusTimerProps> = ({ startTime, onTick, displaySeconds }) => {
  const [internalElapsed, setInternalElapsed] = React.useState(0);

  React.useEffect(() => {
    if (!startTime || displaySeconds !== undefined) return;

    // Immediately calculate and set the initial elapsed time
    const initialElapsed = Math.floor((Date.now() - startTime) / 1000);
    setInternalElapsed(initialElapsed);
    onTick?.(initialElapsed);

    const intervalId = setInterval(() => {
      const currentElapsed = Math.floor((Date.now() - startTime) / 1000);
      setInternalElapsed(currentElapsed);
      onTick?.(currentElapsed);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [startTime, onTick, displaySeconds]);

  const secondsToShow = displaySeconds !== undefined ? displaySeconds : internalElapsed;

  if (displaySeconds === undefined && !startTime) {
    return null;
  }

  return (
    <div
      className="fixed bottom-24 right-4 z-50 flex items-center gap-2 bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-full font-mono font-semibold text-sm animate-fade-in-up"
      role="timer"
      aria-live="off"
    >
      <Icon name="clock" className="w-4 h-4" />
      <span>{formatTime(secondsToShow)}</span>
    </div>
  );
};

export default FocusTimer;
