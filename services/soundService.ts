// services/soundService.ts

let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.error("Web Audio API is not supported in this browser");
      return null;
    }
  }
  return audioContext;
};

const playTone = (frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.5) => {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  // Ensure context is running, as it can be suspended by the browser
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

  gainNode.gain.setValueAtTime(volume, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
};

export const playClickSound = () => {
  playTone(880, 0.05, 'triangle', 0.1);
};

export const playNavigateSound = () => {
  playTone(660, 0.07, 'sine', 0.15);
};

export const playToggleSound = () => {
    playTone(1200, 0.03, 'triangle', 0.1);
};

export const playSuccessSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  playTone(523.25, 0.1, 'sine', 0.2); // C5
  setTimeout(() => playTone(659.25, 0.1, 'sine', 0.2), 70); // E5
};

export const playErrorSound = () => {
  playTone(220, 0.15, 'square', 0.1);
};