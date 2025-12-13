
import { TranscriptEntry } from '../types';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export function extractVideoID(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

export function extractStartTime(url: string): number {
  // Handles formats like ?t=82, &t=82s
  const regex = /[?&](?:t|start)=(\d+)/;
  const match = url.match(regex);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Parses a string containing a timestamped transcript into an array of TranscriptEntry objects.
 * Handles [HH:MM:SS] text, or multi-line formats where timestamps and text are on separate lines.
 * @param text The raw transcript text.
 * @returns An array of TranscriptEntry objects.
 */
export function parseTimestampedTranscript(text: string): TranscriptEntry[] {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line !== '');
    
    // Regex for purely timestamp line: "1:18" or "01:18" or "1:02:03" (with optional brackets)
    const timestampRegex = /^(?:\[\s*)?(?:(\d+):)?(\d+):(\d+)(?:\])?$/;
    
    // Regex for timestamp mixed with text on the same line: "0:00 Hello world"
    const mixedRegex = /^(?:\[\s*)?(?:(\d+):)?(\d+):(\d+)(?:\])?\s+(.+)$/;

    const entries: { text: string; start: number }[] = [];
    let currentEntry: { text: string; start: number } | null = null;

    for (const line of lines) {
        // Case 1: Line is purely a timestamp (common in copy-paste from YouTube UI)
        const timeMatch = line.match(timestampRegex);
        if (timeMatch) {
            // If we have a previous entry pending, push it
            if (currentEntry) {
                entries.push(currentEntry);
            }
            
            // Parse seconds
            const hours = timeMatch[1] ? parseInt(timeMatch[1], 10) : 0;
            const minutes = parseInt(timeMatch[2], 10);
            const seconds = parseInt(timeMatch[3], 10);
            const totalSeconds = hours * 3600 + minutes * 60 + seconds;

            // Start new entry
            currentEntry = { text: '', start: totalSeconds };
            continue;
        }

        // Case 2: Line has timestamp AND text (e.g., manual format)
        const mixedMatch = line.match(mixedRegex);
        if (mixedMatch) {
             if (currentEntry) {
                entries.push(currentEntry);
            }
            const hours = mixedMatch[1] ? parseInt(mixedMatch[1], 10) : 0;
            const minutes = parseInt(mixedMatch[2], 10);
            const seconds = parseInt(mixedMatch[3], 10);
            const totalSeconds = hours * 3600 + minutes * 60 + seconds;
            const content = mixedMatch[4];

            currentEntry = { text: content, start: totalSeconds };
            continue;
        }

        // Case 3: Line is just text
        if (currentEntry) {
            currentEntry.text = currentEntry.text ? currentEntry.text + ' ' + line : line;
        } else {
            // Fallback: Found text before any timestamp. 
            // Treat as start=0 if it's the very first thing, otherwise ignore or attach to dummy.
             currentEntry = { text: line, start: 0 };
        }
    }

    // Push the last entry
    if (currentEntry) {
        entries.push(currentEntry);
    }

    if (entries.length === 0) {
        return [];
    }

    // Calculate durations
    const result: TranscriptEntry[] = entries.map((entry, index) => {
        let duration: number;
        if (index < entries.length - 1) {
            duration = entries[index + 1].start - entry.start;
        } else {
            duration = 5; // Default duration for the last entry
        }
        // Ensure duration is positive (in case timestamps are out of order) and reasonable
        return { ...entry, duration: Math.max(1, duration) };
    });

    return result;
}

let apiLoaded: Promise<void> | null = null;

export function loadYouTubeAPI(): Promise<void> {
    if (apiLoaded) {
        return apiLoaded;
    }

    apiLoaded = new Promise((resolve) => {
        // If the API is already loaded, resolve immediately.
        if (window.YT && window.YT.Player) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(script);

        // The YouTube API will call this global function when it's ready.
        window.onYouTubeIframeAPIReady = () => {
            resolve();
        };
    });

    return apiLoaded;
}
