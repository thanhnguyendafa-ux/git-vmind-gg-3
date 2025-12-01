
import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { UserStats, AppSettings, Screen, Badge } from '../types';
import { useUIStore } from './useUIStore';
import { BADGES } from '../constants';
import { useTableStore } from './useTableStore';
import { useNoteStore } from './useNoteStore';
import { useDictationNoteStore } from './useDictationNoteStore';
import { useSessionDataStore } from './useSessionDataStore';
import { useContextLinkStore } from './useContextLinkStore';
import { useTagStore } from './useTagStore';
import { defaultState } from './appStorage';
import { VmindSyncEngine } from '../services/VmindSyncEngine';


export const defaultStats: UserStats = { xp: 0, level: 1, studyStreak: 0, lastSessionDate: null, activity: {}, totalStudyTime: 0, unlockedBadges: [] };
export const defaultSettings: AppSettings = { folderOrder: [], tagColors: {}, searchShortcut: 'Ctrl+K', reminderSettings: { enabled: false, time: '19:00' } };

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
  setTagColor: (tagName: string, color: string) => void;
  
  handleGuestLogin: () => void;
  handleLogout: () => Promise<void>;
  
  updateStatsFromSession: (durationSeconds: number, xpGained: number, penalty: number) => void;
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
      setStats: (updater) => set(state => ({ stats: typeof updater === 'function' ? updater(state.stats) : updater })),
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
        set({ session: null, isGuest: false, loading: false });
        
        // Perform API signout
        await supabase.auth.signOut();
      },
      
      updateStatsFromSession: (durationSeconds, xpGained, penalty) => {
        set(state => {
          const oldStats = state.stats;
          const newXp = Math.max(0, oldStats.xp + xpGained - penalty);
          const todayStr = new Date().toISOString().split('T')[0];
          const newTotalTime = oldStats.totalStudyTime + durationSeconds;
          
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
              studyStreak: new Date(oldStats.lastSessionDate || 0).toDateString() === new Date(Date.now() - 86400000).toDateString() ? oldStats.studyStreak + 1 : 1,
              lastSessionDate: todayStr,
              activity: { ...oldStats.activity, [todayStr]: (oldStats.activity[todayStr] || 0) + durationSeconds },
              totalStudyTime: newTotalTime,
              unlockedBadges: [...oldStats.unlockedBadges, ...newlyUnlockedBadges.map(b => b.id)],
          };
          
          return { stats: newStats };
        });
        get().saveUserProfile();
      },

      saveUserProfile: () => {
        const { session, isGuest, stats, settings } = get();
        if (isGuest || !session) return;
    
        const { confidenceProgresses, studyProgresses, ankiProgresses } = useSessionDataStore.getState();
        const { tags } = useTagStore.getState();
        
        const user_profile = { 
            stats, 
            settings,
            confidenceProgresses,
            studyProgresses,
            ankiProgresses,
            tags,
        };

        VmindSyncEngine.getInstance().push('UPSERT_PROFILE', { user_profile }, session.user.id);
      },

      init: () => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
          const currentState = get();

          if (session) {
            if (currentState.session?.user.id !== session.user.id) {
              // It's a different user, set loading to trigger a full data fetch in AppContent.
              clearAllStores(); 
              set({ session, isGuest: false, loading: true });
            } else {
              // Session refreshed for the same user, no need to reload all data
              set({ session, isGuest: false });
            }
          } else {
            // User logged out or session expired (handled in handleLogout too, but safeguard here)
            if (currentState.session || currentState.isGuest) {
               clearAllStores();
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
