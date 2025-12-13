// This is a test file for a framework like Jest or Vitest.
// A test runner needs to be configured in the project to execute these tests.

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}
declare var describe: (name: string, fn: () => void) => void;
declare var it: (name: string, fn: () => void) => void;
declare var expect: (actual: any) => any;

import { extractVideoID, parseTimestampedTranscript } from '../utils/youtubeUtils';

// Mock global functions for environments without a test runner setup.
if (typeof describe === 'undefined') { (globalThis as any).describe = (name: string, fn: () => void) => fn(); }
if (typeof it === 'undefined') { (globalThis as any).it = (name: string, fn: () => void) => fn(); }
if (typeof expect === 'undefined') {
    (globalThis as any).expect = (actual: any) => ({
        toBe: (expected: any) => {
            if (actual !== expected) {
                throw new Error(`TEST FAILED: Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
            }
        },
        toEqual: (expected: any) => {
            if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                throw new Error(`TEST FAILED: Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
            }
        },
        toBeNull: () => {
            if (actual !== null) {
                throw new Error(`TEST FAILED: Expected ${JSON.stringify(actual)} to be null`);
            }
        },
    });
}


describe('youtubeUtils', () => {
  describe('extractVideoID', () => {
    it('should extract video ID from standard watch URL', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      expect(extractVideoID(url)).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from short youtu.be URL', () => {
      const url = 'https://youtu.be/dQw4w9WgXcQ';
      expect(extractVideoID(url)).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from embed URL', () => {
      const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
      expect(extractVideoID(url)).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from URL with other parameters', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&ab_channel=RickAstley';
      expect(extractVideoID(url)).toBe('dQw4w9WgXcQ');
    });

    it('should return null for invalid URLs', () => {
      const url = 'https://www.google.com';
      expect(extractVideoID(url)).toBeNull();
    });
  });

  describe('parseTimestampedTranscript', () => {
    it('should parse simple MM:SS format', () => {
      const text = '[00:05] Hello world\n[00:08] This is a test';
      const result = parseTimestampedTranscript(text);
      expect(result).toEqual([
        { text: 'Hello world', start: 5, duration: 3 },
        { text: 'This is a test', start: 8, duration: 5 },
      ]);
    });

    it('should parse HH:MM:SS format', () => {
      const text = '[01:02:03] A long time ago';
      const result = parseTimestampedTranscript(text);
      expect(result).toEqual([
        { text: 'A long time ago', start: 3723, duration: 5 },
      ]);
    });

    it('should handle lines without timestamps', () => {
      const text = 'This is a comment\n[00:10] Actual content';
      const result = parseTimestampedTranscript(text);
      expect(result).toEqual([
        { text: 'Actual content', start: 10, duration: 5 },
      ]);
    });

    it('should correctly calculate duration between entries', () => {
      const text = '[00:15] First part.\n[00:22] Second part.';
      const result = parseTimestampedTranscript(text);
      expect(result[0].duration).toBe(7);
    });
    
    it('should handle optional brackets and milliseconds', () => {
        const text = '01:10.123 This has milliseconds\n[01:15] This is next.';
        const result = parseTimestampedTranscript(text);
        expect(result).toEqual([
            { text: 'This has milliseconds', start: 70, duration: 5 },
            { text: 'This is next.', start: 75, duration: 5 },
        ]);
    });
  });
});
