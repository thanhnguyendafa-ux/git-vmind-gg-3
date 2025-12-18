
// services/audioService.ts

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

// --- Smart Native Speech Logic ---

/**
 * Detects the language of a text string based on Unicode character ranges.
 * Priority: JP -> KR -> RU -> VN -> CN -> EN (Default)
 */
export const detectLanguageFromText = (text: string): string => {
  if (!text) return 'en-US';
  const cleanText = text.trim();
  
  // Japanese: Hiragana (\u3040-\u309F) or Katakana (\u30A0-\u30FF)
  // Note: Kanji (\u4E00-\u9FFF) is shared with Chinese, so we check for Kana to confirm Japanese.
  const hasKana = /[\u3040-\u309F\u30A0-\u30FF]/.test(cleanText);
  if (hasKana) return 'ja-JP';

  // Korean: Hangul (\uAC00-\uD7AF)
  const hasHangul = /[\uAC00-\uD7AF]/.test(cleanText);
  if (hasHangul) return 'ko-KR';

  // Russian: Cyrillic (\u0400-\u04FF)
  const hasCyrillic = /[\u0400-\u04FF]/.test(cleanText);
  if (hasCyrillic) return 'ru-RU';
  
  // Vietnamese: Specific Latin extensions
  // Checks for specific Vietnamese vowels with tone marks
  const hasVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(cleanText);
  if (hasVietnamese) return 'vi-VN';

  // Chinese: Hanzi (\u4E00-\u9FFF) WITHOUT Kana
  // If we have Kanji but no Kana, it's likely Chinese.
  const hasHanzi = /[\u4E00-\u9FFF]/.test(cleanText);
  if (hasHanzi) return 'zh-CN';

  // Default to English/Latin
  return 'en-US';
};

/**
 * Selects the best available voice for a given language code.
 * Prioritizes: Google > Microsoft > Enhanced > Default
 */
const getBestVoice = (langCode: string): SpeechSynthesisVoice | null => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  
  const voices = window.speechSynthesis.getVoices();
  const candidates = voices.filter(v => v.lang.startsWith(langCode.split('-')[0])); // Match 'ja' from 'ja-JP'

  if (candidates.length === 0) return null;

  // Scoring function for sorting
  const scoreVoice = (voice: SpeechSynthesisVoice) => {
    let score = 0;
    const name = voice.name.toLowerCase();
    
    // Exact locale match gets a boost (e.g. en-US vs en-GB)
    if (voice.lang === langCode) score += 10;
    
    // High quality providers
    if (name.includes('google')) score += 5;
    if (name.includes('microsoft')) score += 4;
    if (name.includes('enhanced') || name.includes('premium') || name.includes('hq')) score += 3;
    
    return score;
  };

  return candidates.sort((a, b) => scoreVoice(b) - scoreVoice(a))[0];
};

// --- Web Audio API (Sound Effects) ---

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


// --- Text to Speech ---

export const playSpeech = (text: string, lang?: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Speech Synthesis not supported'));
      return;
    }

    // Cancel any ongoing speech
    stopSpeech();

    // 1. Determine Language
    const targetLang = lang || detectLanguageFromText(text);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = targetLang;
    utterance.rate = 0.9; // Slightly slower for better clarity
    utterance.pitch = 1.0;
    
    // 2. Select Best Voice
    // Voices load asynchronously. If getVoices() is empty, we might need to wait for onvoiceschanged,
    // but for immediate playback we try our best with what's available.
    const bestVoice = getBestVoice(targetLang);
    if (bestVoice) {
        utterance.voice = bestVoice;
    }
    
    utterance.onend = () => {
      resolve();
    };
    
    utterance.onerror = (event) => {
      // rejection might trigger if canceled, which is expected behavior in UI rapid interaction
      if (event.error !== 'interrupted' && event.error !== 'canceled') {
         console.warn("TTS Error:", event);
      }
      resolve(); // Resolve anyway to not block queues
    };
    
    window.speechSynthesis.speak(utterance);
  });
};

export const stopSpeech = (): void => {
  if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
  }
};
