
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
  // Resume if suspended (common browser policy)
  if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
  }
  return audioContext;
};

// --- Tone Generators ---

const playTone = (frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.5) => {
  const ctx = getAudioContext();
  if (!ctx) return;
  
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
  // Major Chord Arpeggio (C5 - E5 - G5)
  playTone(523.25, 0.1, 'sine', 0.2); 
  setTimeout(() => playTone(659.25, 0.1, 'sine', 0.2), 70); 
  setTimeout(() => playTone(783.99, 0.2, 'sine', 0.15), 140); 
};

export const playErrorSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  // Dissonant low thud
  playTone(150, 0.2, 'sawtooth', 0.15);
  playTone(145, 0.2, 'sawtooth', 0.15); // Slight detune for roughness
};

// --- Procedural Ink SFX ---

let noiseBuffer: AudioBuffer | null = null;

const createNoiseBuffer = (ctx: AudioContext) => {
    if (noiseBuffer) return noiseBuffer;
    const bufferSize = ctx.sampleRate * 2; // 2 seconds of noise
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    noiseBuffer = buffer;
    return buffer;
};

/**
 * Simulates the sound of a brush stroke on paper.
 * Uses filtered white noise.
 * @param duration Duration of the stroke sound in seconds (approx)
 * @param intensity 0-1, affects volume and filter frequency
 */
export const playBrushSound = (duration: number = 0.1, intensity: number = 0.5) => {
    const ctx = getAudioContext();
    if (!ctx) return;

    const buffer = createNoiseBuffer(ctx);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    // Filter to make it sound like paper friction (Highpass + Lowpass band)
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.5;
    // Velocity modulates pitch slightly
    filter.frequency.setValueAtTime(800 + (intensity * 1000), ctx.currentTime);

    const gain = ctx.createGain();
    // Velocity modulates volume
    const vol = Math.min(0.8, 0.1 + (intensity * 0.4));
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
    noise.stop(ctx.currentTime + duration);
};

export const playStrokeCompleteSound = () => {
    // Satisfying "pop" or "ding" for a single stroke completion
    playTone(1200, 0.1, 'sine', 0.1);
    playTone(2400, 0.05, 'triangle', 0.05); // Overtone
};
