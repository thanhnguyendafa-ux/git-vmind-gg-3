
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useUserStore } from '../stores/useUserStore';
import { useUIStore } from '../stores/useUIStore';
import { UserStats, AppSettings } from '../types';
import { BADGES } from '../constants';

// Declare test globals to satisfy TypeScript in environments without full test runner types.
declare var describe: (name: string, fn: () => void) => void;
declare var it: (name: string, fn: () => void) => void;
declare var expect: (actual: any) => any;
declare var beforeEach: (fn: () => void) => void;
declare var vi: any;

// FIX: Correct property name 'totalStudyTimeSeconds' to 'totalStudyTime' to match UserStats type.
const defaultStats: UserStats = { xp: 0, level: 1, studyStreak: 0, lastSessionDate: null, activity: {}, totalStudyTime: 0, unlockedBadges: [] };
// FIX: Use a valid AppSettings object. The `journalMode` property is obsolete.
const defaultSettings: AppSettings = { folderOrder: [], tagColors: {}, searchShortcut: 'Ctrl+K', reminderSettings: { enabled: false, time: '19:00' } };

// Mock the UI store to spy on its methods
vi.mock('../stores/useUIStore', () => ({
  useUIStore: {
    getState: vi.fn(() => ({
      setUnlockedBadgeNotification: vi.fn(),
    })),
  }
}));

describe('useUserStore', () => {

  beforeEach(() => {
    act(() => {
      useUserStore.setState({
        stats: JSON.parse(JSON.stringify(defaultStats)), // Deep copy to prevent mutation across tests
        settings: defaultSettings,
        session: null,
        isGuest: false,
        loading: false,
      });
    });
    vi.clearAllMocks();
  });

  it('should update stats correctly from a session', () => {
    const durationSeconds = 600; // 10 minutes
    const xpGained = 50;
    const penalty = 10;

    act(() => {
      useUserStore.getState().updateStatsFromSession(durationSeconds, xpGained, penalty);
    });

    const { stats } = useUserStore.getState();
    const todayStr = new Date().toISOString().split('T')[0];

    expect(stats.xp).toBe(40); // 50 - 10
    expect(stats.level).toBe(1);
    // FIX: Correct property name 'totalStudyTimeSeconds' to 'totalStudyTime' to match UserStats type.
    expect(stats.totalStudyTime).toBe(600);
    expect(stats.activity[todayStr]).toBe(600);
    expect(stats.studyStreak).toBe(1);
  });

  it('should increase level when XP threshold is crossed', () => {
    act(() => {
        // Set initial XP to be close to leveling up
        useUserStore.setState({ stats: { ...defaultStats, xp: 980 }});
    });

    act(() => {
      useUserStore.getState().updateStatsFromSession(60, 30, 0); // Gain 30 XP
    });

    const { stats } = useUserStore.getState();
    expect(stats.xp).toBe(1010);
    expect(stats.level).toBe(2);
  });

  it('should unlock a badge when criteria are met and notify the UI', () => {
    // FIX: The test was checking for a non-existent 'xp-1' badge. It's now corrected to check for the first time-based badge.
    const timeBadge = BADGES.find(b => b.id === 'time-1'); // Study for 1 hour
    expect(timeBadge).toBeDefined();

    act(() => {
      // FIX: Provide enough study time (3600s = 1hr) to unlock the 'time-1' badge.
      useUserStore.getState().updateStatsFromSession(3600, 120, 0);
    });

    const { stats } = useUserStore.getState();
    // FIX: Correct property name 'totalStudyTimeSeconds' to 'totalStudyTime' to match UserStats type.
    expect(stats.totalStudyTime).toBe(3600);
    expect(stats.unlockedBadges).toContain('time-1');
    
    const setUnlockedBadgeNotificationMock = useUIStore.getState().setUnlockedBadgeNotification;
    expect(setUnlockedBadgeNotificationMock).toHaveBeenCalledWith(timeBadge);
  });
  
  it('should not notify for an already unlocked badge', () => {
     act(() => {
        // FIX: Use the correct badge ID 'time-1' for the pre-unlocked state.
        // FIX: Replaced invalid `set` call with `useUserStore.setState`.
        useUserStore.setState({ stats: { ...defaultStats, unlockedBadges: ['time-1'], totalStudyTime: 3600 }});
    });

    act(() => {
      useUserStore.getState().updateStatsFromSession(400, 150, 0); // Add more time, but not enough for next badge
    });

    const setUnlockedBadgeNotificationMock = useUIStore.getState().setUnlockedBadgeNotification;
    // This should not be called again for the same badge
    expect(setUnlockedBadgeNotificationMock).not.toHaveBeenCalled();
  });
});
