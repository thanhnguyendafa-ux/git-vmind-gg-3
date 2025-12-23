
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
 * Extremely robust for 2024 YouTube "Show Transcript" copy-pastes.
 * @param text The raw transcript text.
 * @returns An array of TranscriptEntry objects.
 */
export function parseTimestampedTranscript(text: string): TranscriptEntry[] {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line !== '');

    // Robust regex for timestamps: "1:18", "01:18", "1:02:03", "[1:18]"
    // Support hours:min:sec or min:sec
    const timestampRegex = /^(?:\[\s*)?(?:(?:(\d+):)?(\d+):(\d+))(?:\])?$/;

    // Regex for mixed lines: "[0:00] Hello world" or "0:00 Hello world"
    const mixedRegex = /^(?:\[\s*)?(?:(?:(\d+):)?(\d+):(\d+))(?:\])?\s+(.+)$/;

    const entries: { text: string; start: number }[] = [];
    let currentEntry: { text: string; start: number } | null = null;

    const parseTime = (match: RegExpMatchArray): number => {
        const hours = match[1] ? parseInt(match[1], 10) : 0;
        const minutes = parseInt(match[2], 10);
        const seconds = parseInt(match[3], 10);
        return hours * 3600 + minutes * 60 + seconds;
    };

    for (const line of lines) {
        const timeMatch = line.match(timestampRegex);
        const mixedMatch = line.match(mixedRegex);

        if (timeMatch) {
            // New timestamp found on its own line
            if (currentEntry && currentEntry.text) {
                entries.push(currentEntry);
                currentEntry = null;
            }

            const totalSeconds = parseTime(timeMatch);
            currentEntry = { text: '', start: totalSeconds };
        } else if (mixedMatch) {
            // Mixed line: timestamp + text
            if (currentEntry && currentEntry.text) {
                entries.push(currentEntry);
            }

            const totalSeconds = parseTime(mixedMatch);
            const content = mixedMatch[4].trim();
            currentEntry = { text: content, start: totalSeconds };
        } else {
            // Pure text line - append to current entry
            if (currentEntry) {
                currentEntry.text = currentEntry.text ? currentEntry.text + ' ' + line : line;
            } else {
                // Orphan text before any timestamp - start at 0
                currentEntry = { text: line, start: 0 };
            }
        }
    }

    if (currentEntry && currentEntry.text) {
        entries.push(currentEntry);
    }

    if (entries.length === 0) return [];

    // Sort by start time just in case the paste was messy
    entries.sort((a, b) => a.start - b.start);

    // Calculate durations and return final TranscriptEntry types
    return entries.map((entry, index) => {
        let duration = 3; // Default
        if (index < entries.length - 1) {
            duration = entries[index + 1].start - entry.start;
        }
        return {
            text: entry.text,
            start: entry.start,
            duration: Math.max(1, duration)
        };
    });
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
