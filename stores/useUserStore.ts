

import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { UserStats, AppSettings, Screen, Badge, SessionEntry } from '../types';
import { useUIStore } from './useUIStore';
import { BADGES } from '../constants';
import { useTableStore } from './useTableStore';
import { useNoteStore } from './useNoteStore';
import { useDictationNoteStore } from './useDictationNoteStore';
import { useSessionDataStore } from './useSessionDataStore';
import { useContextLinkStore } from './useContextLinkStore';
import { useTagStore } from './useTagStore';
import { useGardenStore } from './useGardenStore';
import { defaultState } from './appStorage';
import { VmindSyncEngine } from '../services/VmindSyncEngine';
import { getLocalDateString } from '../utils/timeUtils';
import { useMusicStore } from './useMusicStore';
import { cacheService } from '../services/cacheService';


export const defaultStats: UserStats = { xp: 0, level: 1, studyStreak: 0, lastSessionDate: null, activity: {}, totalStudyTime: 0, unlockedBadges: [] };
export const defaultSettings: AppSettings = { 
    folderOrder: [], 
    tagColors: {}, 
    searchShortcut: 'Ctrl+K', 
    musicShortcut: 'Ctrl+M', 
    reminderSettings: { enabled: false, time: '19:00' },
    // NEW: Default Reading Configuration
    readingConfig: {
        fontFamily: 'font-serif',
        fontSize: 1.125,
        theme: 'default',
        dictionaryUrlTemplate: 'https://en.wiktionary.org/wiki/{WORD}',
    }
};

const XP_PER_LEVEL = 1000;

export function resetStores() {
    useTableStore.getState().setInitialData({ tables: defaultState.tables, folders: defaultState.folders });
    useNoteStore.getState().setNotes(defaultState.notes);
    useDictationNoteStore.getState().setDictationNotes(defaultState.dictationNotes);
    useContextLinkStore.getState().setContextLinks(defaultState.contextLinks);
    useSessionDataStore.getState().setInitialData({ 
        confidenceProgresses: defaultState.confidenceProgresses,
        studyProgresses: defaultState.studyProgresses,
        ankiProgresses: defaultState.ankiProgresses,
    });
    useTagStore.getState().setTags(defaultState.tags || []);
}

export function clearAllStores() {
    // This function will reset all stores to their initial, empty state.
    useTableStore.getState().setInitialData({ tables: [], folders: [] });
    useNoteStore.getState().setNotes([]);
    useDictationNoteStore.getState().setDictationNotes([]);
    useContextLinkStore.getState().setContextLinks([]);
    useSessionDataStore.getState().setInitialData({
        confidenceProgresses: [],
        studyProgresses: [],
        ankiProgresses: [],
    });
    useTagStore.getState().setTags([]);
    useUserStore.getState().setStats(defaultStats);
    useUserStore.getState().setSettings(defaultSettings);
    // Ensure garden is reset to avoid carrying over state or overwriting with 0 during premature saves if not cleared
    useGardenStore.getState().setTotalDrops(0);
}


interface UserState {
  session: Session | null;
  isGuest: boolean;
  loading: boolean;
  stats: UserStats;
  settings: AppSettings;
  
  setSession: (session: Session | null) => void;
  setIsGuest: (isGuest: boolean) => void;
  setLoading: (loading: boolean) => void;
  setStats: (stats: UserStats | ((prev: UserStats) => UserStats)) => void;
  setSettings: (settings: AppSettings) => void;
  setTagColor: (tagName, color) => void;
  
  handleGuestLogin: () => void;
  handleLogout: () => Promise<void>;
  
  updateStatsFromSession: (durationSeconds: number, xpGained: number, penalty: number, mode: string, droplets: number, interactionCount?: number) => void;
  saveUserProfile: () => void;

  init: () => () => void;
}

export const useUserStore = create<UserState>()(
    (set, get) => ({
      session: null,
      isGuest: false,
      loading: true,
      stats: defaultStats,
      settings: defaultSettings,

      setSession: (session) => set({ session }),
      setIsGuest: (isGuest) => set({ isGuest }),
      setLoading: (loading) => set({ loading }),
      setStats: (updater) => {
        set(state => ({ stats: typeof updater === 'function' ? updater(state.stats) : updater }));
        get().saveUserProfile();
      },
      setSettings: (settings) => {
        set({ settings });
        get().saveUserProfile();
      },
      setTagColor: (tagName, color) => {
        const { settings, setSettings } = get();
        const newTagColors = { ...(settings.tagColors || {}), [tagName]: color };
        setSettings({ ...settings, tagColors: newTagColors });
      },
      
      handleGuestLogin: () => {
        resetStores(); // Load sample data for guests
        set({ isGuest: true, loading: false, session: null });
        useUIStore.getState().setCurrentScreen(Screen.Home);
      },
      
      handleLogout: async () => {
        // Atomic Reset: Clear stores immediately before network call to avoid ghost data
        clearAllStores();
        // Clear cache and queue on logout
        await cacheService.clearCache();
        await VmindSyncEngine.getInstance().clearQueue();
        
        set({ session: null, isGuest: false, loading: false });
        
        // Perform API signout
        await supabase.auth.signOut();
      },
      
      updateStatsFromSession: (durationSeconds, xpGained, penalty, mode, droplets, interactionCount = 0) => {
        set(state => {
          const oldStats = state.stats;
          const newXp = Math.max(0, oldStats.xp + xpGained - penalty);
          
          const today = new Date();
          const todayStr = getLocalDateString(today);
          
          const yesterday = new Date();
          yesterday.setDate(today.getDate() - 1);
          const yesterdayStr = getLocalDateString(yesterday);

          let newStreak = 1;
          if (oldStats.lastSessionDate === todayStr) {
            newStreak = oldStats.studyStreak; // Already studied today, don't change streak
          } else if (oldStats.lastSessionDate === yesterdayStr) {
            newStreak = oldStats.studyStreak + 1; // Studied yesterday, increment streak
          }
          
          const newTotalTime = oldStats.totalStudyTime + durationSeconds;
          
          const newEntry: SessionEntry = {
            timestamp: Date.now(),
            duration: durationSeconds,
            mode: mode,
            droplets: droplets,
            count: interactionCount,
          };
      
          let todayActivityData: { total: number; entries: SessionEntry[] };
          const existingTodayActivity = oldStats.activity[todayStr];
      
          if (typeof existingTodayActivity === 'number') {
            // Backward compatibility: convert old format
            todayActivityData = {
              total: existingTodayActivity + durationSeconds,
              entries: [newEntry],
            };
          } else if (typeof existingTodayActivity === 'object' && existingTodayActivity !== null) {
            // Append to new format
            todayActivityData = {
              total: existingTodayActivity.total + durationSeconds,
              entries: [...existingTodayActivity.entries, newEntry],
            };
          } else {
            // First entry for today
            todayActivityData = {
              total: durationSeconds,
              entries: [newEntry],
            };
          }

          const newlyUnlockedBadges = BADGES.filter(badge => 
              !oldStats.unlockedBadges.includes(badge.id) && 
              newTotalTime >= badge.value
          );

          if(newlyUnlockedBadges.length > 0) {
              newlyUnlockedBadges.sort((a, b) => a.value - b.value);
              useUIStore.getState().setUnlockedBadgeNotification(newlyUnlockedBadges[0]);
          }
          
          const newStats: UserStats = {
              ...oldStats,
              xp: newXp,
              level: Math.floor(newXp / XP_PER_LEVEL) + 1,
              studyStreak: newStreak,
              lastSessionDate: todayStr,
              activity: { ...oldStats.activity, [todayStr]: todayActivityData },
              totalStudyTime: newTotalTime,
              unlockedBadges: [...oldStats.unlockedBadges, ...newlyUnlockedBadges.map(b => b.id)],
          };
          
          return { stats: newStats };
        });
        get().saveUserProfile();
      },

      saveUserProfile: () => {
        // RESILIENCE FIX: Do not save if we are in the initial loading/hydration phase.
        // This prevents overwriting server data with default empty state (e.g. 0 Garden Drops)
        // during the split-second race condition where hydration is happening.
        const { session, isGuest, stats, settings, loading } = get();
        if (isGuest || !session || loading) return;
    
        const { confidenceProgresses, studyProgresses, ankiProgresses } = useSessionDataStore.getState();
        const { tags } = useTagStore.getState();
        const { totalDrops } = useGardenStore.getState();
        const { volume, repeatMode, isShuffled, customTracks } = useMusicStore.getState();
        
        const user_profile = { 
            stats, 
            settings,
            confidenceProgresses,
            studyProgresses,
            ankiProgresses,
            tags,
            garden: { totalDrops },
            music: { volume, repeatMode, isShuffled, customTracks }
        };

        VmindSyncEngine.getInstance().push('UPSERT_PROFILE', { user_profile }, session.user.id);
      },

      init: () => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
          const currentState = get();

          if (session) {
            // Security / Data Integrity: Ensure sync queue only contains data for this user
            VmindSyncEngine.getInstance().validateQueueForUser(session.user.id);

            if (currentState.session?.user.id !== session.user.id) {
              // It's a different user, set loading to trigger a full data fetch in AppContent.
              clearAllStores();
              
              // NEW: Atomic Cache Invalidation on Login to prevent stale data
              await cacheService.clearCache();
              await VmindSyncEngine.getInstance().clearQueue();
              
              set({ session, isGuest: false, loading: true });
            } else {
              // Session refreshed for the same user, no need to reload all data
              set({ session, isGuest: false });
            }
          } else {
            // User logged out or session expired (handled in handleLogout too, but safeguard here)
            if (currentState.session || currentState.isGuest) {
               clearAllStores();
               await cacheService.clearCache();
               await VmindSyncEngine.getInstance().clearQueue();
            }
            set({ session: null, isGuest: false, loading: false });
          }
        });
        
        return () => subscription.unsubscribe();
      },
    })
);

// Initialize the store and its listeners
useUserStore.getState().init();