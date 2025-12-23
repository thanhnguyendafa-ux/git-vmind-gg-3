/**
 * YouTube Transcript Service
 * (DEPRECATED: Auto-fetch functionality removed in favor of manual import)
 * 
 * Re-purposed to provide shared utilities for transcript display.
 */

/**
 * Formats time from seconds to MM:SS or HH:MM:SS
 * Used by DictationEditorScreen to show segment start times.
 */
export const formatTimestamp = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};
