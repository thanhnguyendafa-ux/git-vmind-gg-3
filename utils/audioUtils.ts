// utils/audioUtils.ts

// Singleton AudioContext management
let audioContext: AudioContext | null = null;
const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    // Gemini TTS uses a sample rate of 24000.
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  return audioContext;
};

// Set to keep track of currently playing audio sources
let activeSources = new Set<AudioBufferSourceNode>();

/**
 * Decodes a base64 string into a Uint8Array.
 * This is a manual implementation as required by architecture.md.
 * @param base64 The base64 encoded string.
 * @returns The decoded Uint8Array.
 */
function decode(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Manually decodes raw PCM audio data into an AudioBuffer.
 * This is required for Gemini TTS output as it's not a standard audio file format.
 * Conforms to architecture.md guidelines for Live/TTS audio decoding.
 * @param data The raw PCM audio data as a Uint8Array.
 * @param ctx The AudioContext to use for creating the buffer.
 * @returns A promise that resolves to the decoded AudioBuffer.
 */
async function manualDecodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
): Promise<AudioBuffer> {
  // Gemini TTS is 1 channel (mono), 24000 sample rate.
  const numChannels = 1;
  const sampleRate = 24000;
  
  // The raw data is 16-bit PCM, so we need to interpret the buffer as Int16.
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert 16-bit integer back to float in the range [-1.0, 1.0]
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


/**
 * Stops all currently playing audio sources managed by this utility.
 */
export function stopAllAudio(): void {
  for (const source of activeSources) {
    try {
      source.stop();
    } catch (e) {
      // Ignore errors if the source has already stopped
    }
  }
  activeSources.clear();
}

/**
 * Decodes a base64 encoded string of raw PCM audio into an AudioBuffer.
 * @param base64String The base64 encoded audio data from Gemini TTS.
 * @returns A promise that resolves to the AudioBuffer.
 */
export async function decodeBase64Audio(base64String: string): Promise<AudioBuffer> {
    const ctx = getAudioContext();
    const decodedBytes = decode(base64String);
    return manualDecodeAudioData(decodedBytes, ctx);
}

/**
 * Plays a decoded AudioBuffer.
 * @param audioBuffer The AudioBuffer to play.
 * @returns The AudioBufferSourceNode that was created, allowing for event listeners (e.g., 'ended').
 */
export function playDecodedAudio(audioBuffer: AudioBuffer): AudioBufferSourceNode {
    const ctx = getAudioContext();
    
    // Stop any audio that might be currently playing.
    stopAllAudio();
    
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    
    // When this source finishes, remove it from the active set.
    source.addEventListener('ended', () => {
        activeSources.delete(source);
    });

    source.start();
    
    // Add the new source to the active set.
    activeSources.add(source);
    
    return source;
}
