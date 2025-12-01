
import { create } from 'zustand';
import { Screen, Theme, SyncStatus, Badge, Table, SyncAction, SyncLogEntry } from '../types';

type ToastData = { message: string; type: 'success' | 'error' | 'info'; actionText?: string; onAction?: () => void; };

interface UIState {
  theme: Theme;
  currentScreen: Screen;
  syncStatus: SyncStatus;
  syncQueue: SyncAction[]; // New: Visible Queue State
  syncLogs: SyncLogEntry[]; // New: Sync History Logs
  toast: ToastData | null;
  unlockedBadgeNotification: Badge | null;
  galleryViewData: { table: Table; initialRowId?: string } | null;
  lastMutatedTableId: string | null;
  isSearchOpen: boolean;
  isChatbotOpen: boolean;
  isApiKeyModalOpen: boolean;
  isSyncModalOpen: boolean; // New: Control visibility of Sync/Needs Attention modal
  realtimeStatus: 'idle' | 'updating' | 'updated';
  realtimeTimeoutId: number | null;
  isPulling: boolean;
  pullData: (() => Promise<any>) | null;
  isPullDisabled: boolean;
  
  toggleTheme: () => void;
  setCurrentScreen: (screen: Screen) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setSyncQueue: (queue: SyncAction[]) => void;
  addSyncLog: (log: SyncLogEntry) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info', actionText?: string, onAction?: () => void) => void;
  setToast: (toast: ToastData | null) => void;
  setUnlockedBadgeNotification: (badge: Badge | null) => void;
  setGalleryViewData: (data: { table: Table; initialRowId?: string } | null) => void;
  setLastMutatedTableId: (id: string | null) => void;
  setIsSearchOpen: (isOpen: boolean) => void;
  setIsChatbotOpen: (isOpen: boolean) => void;
  setIsApiKeyModalOpen: (isOpen: boolean) => void;
  setIsSyncModalOpen: (isOpen: boolean) => void;
  setIsPulling: (isPulling: boolean) => void;
  setPullData: (fn: () => Promise<any>) => void;
  setIsPullDisabled: (isPullDisabled: boolean) => void;
  handleNavigation: (screen: keyof typeof Screen) => void;
  reportRealtimeUpdate: () => void;
}

export const useUIStore = create<UIState>()(
    (set, get) => ({
      theme: 'light',
      currentScreen: Screen.Home,
      syncStatus: 'idle',
      syncQueue: [],
      syncLogs: [],
      toast: null,
      unlockedBadgeNotification: null,
      galleryViewData: null,
      lastMutatedTableId: null,
      isSearchOpen: false,
      isChatbotOpen: false,
      isApiKeyModalOpen: false,
      isSyncModalOpen: false,
      realtimeStatus: 'idle',
      realtimeTimeoutId: null,
      isPulling: false,
      pullData: null,
      isPullDisabled: false,

      toggleTheme: () => set(state => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setCurrentScreen: (screen) => set({ currentScreen: screen }),
      setSyncStatus: (status) => set({ syncStatus: status }),
      setSyncQueue: (queue) => set({ syncQueue: queue }),
      addSyncLog: (log) => set(state => ({ syncLogs: [log, ...state.syncLogs].slice(0, 50) })), // Keep last 50 logs
      showToast: (message, type = 'success', actionText, onAction) => set({ toast: { message, type, actionText, onAction } }),
      setToast: (toast) => set({ toast }),
      setUnlockedBadgeNotification: (badge) => set({ unlockedBadgeNotification: badge }),
      setGalleryViewData: (data) => set({ galleryViewData: data }),
      setLastMutatedTableId: (id) => set({ lastMutatedTableId: id }),
      setIsSearchOpen: (isOpen) => set({ isSearchOpen: isOpen }),
      setIsChatbotOpen: (isOpen) => set({ isChatbotOpen: isOpen }),
      setIsApiKeyModalOpen: (isOpen) => set({ isApiKeyModalOpen: isOpen }),
      setIsSyncModalOpen: (isOpen) => set({ isSyncModalOpen: isOpen }),
      setIsPulling: (isPulling) => set({ isPulling }),
      setPullData: (fn) => set({ pullData: fn }),
      setIsPullDisabled: (isPullDisabled) => set({ isPullDisabled }),
      handleNavigation: (screen) => {
        const screenEnum = Screen[screen];
        if (screenEnum !== undefined) {
          set({ currentScreen: screenEnum });
        }
      },
      reportRealtimeUpdate: () => {
        const { realtimeTimeoutId } = get();
        if (realtimeTimeoutId) {
          clearTimeout(realtimeTimeoutId);
        }

        set({ realtimeStatus: 'updating' });

        const newTimeoutId = window.setTimeout(() => {
          set({ realtimeStatus: 'updated' });
          const nestedTimeoutId = window.setTimeout(() => {
            set({ realtimeStatus: 'idle' });
          }, 1500);
          // We only need to manage the outer timeout for debouncing
        }, 2000);

        set({ realtimeTimeoutId: newTimeoutId });
      },
    })
);
