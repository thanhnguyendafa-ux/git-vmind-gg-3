
import { create } from 'zustand';
import { Screen, Theme, SyncStatus, Badge, Table, SyncAction, SyncLogEntry } from '../types';
import { useUserStore } from './useUserStore';
import { VmindSyncEngine } from '../services/VmindSyncEngine';

type ToastData = { message: string; type: 'success' | 'error' | 'info'; actionText?: string; onAction?: () => void; };

export interface BackgroundSettings {
  url: string;
  overlayOpacity: number; // 0 to 90 (percent)
  blurIntensity: number; // 0 to 20 (px)
}

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
  isConfidenceAutoplayEnabled: boolean;
  isAnkiAutoplayEnabled: boolean;
  isTablesSidebarOpen: boolean;
  isDesktopSidebarOpen: boolean; // New: Desktop collapsible sidebar state
  isImmersive: boolean;
  backgroundSettings: BackgroundSettings;

  // Concept Section State (Persisted)
  selectedConceptId: string | null;
  expandedConceptIds: string[];

  // Knowledge Sidebar State
  knowledgeSidebarOpen: boolean;
  knowledgeSidebarRowId: string | null;

  // Library Module
  isLibraryMode: boolean;

  // Integrity Bridge State
  integrityFilter: { tableId: string; rowIds: string[] } | null;

  // Global Navigation Guard
  pendingAction: (() => void) | null;
  isBlockingOverlayVisible: boolean;

  // Dynamic Atmosphere
  timeOfDay: 'dawn' | 'noon' | 'twilight' | 'night';
  updateTimeOfDay: () => void;

  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  setCurrentScreen: (screen: Screen) => void;

  // New Navigation Guard Actions
  attemptNavigation: (screen: Screen) => void;
  triggerGlobalAction: (action: () => void) => void;
  resolveGlobalAction: () => void;
  cancelGlobalAction: () => void;

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
  toggleConfidenceAutoplay: () => void;
  toggleAnkiAutoplay: () => void;
  setIsTablesSidebarOpen: (isOpen: boolean) => void;
  toggleDesktopSidebar: () => void; // New action
  setDesktopSidebarOpen: (isOpen: boolean) => void; // New action
  toggleImmersiveMode: () => void;
  setIsImmersive: (isImmersive: boolean) => void;
  setBackgroundSettings: (settings: Partial<BackgroundSettings>) => void;
  setIsLibraryMode: (isLibrary: boolean) => void;

  // Concept Section Actions
  setSelectedConceptId: (id: string | null) => void;
  setExpandedConceptIds: (ids: string[]) => void;
  toggleExpandedConceptId: (id: string) => void;

  // Knowledge Sidebar Actions
  openKnowledgeSidebar: (rowId: string) => void;
  closeKnowledgeSidebar: () => void;

  // Integrity Bridge Actions
  setIntegrityFilter: (filter: { tableId: string; rowIds: string[] } | null) => void;
}

const DEFAULT_BG_SETTINGS: BackgroundSettings = {
  url: '',
  overlayOpacity: 50,
  blurIntensity: 0
};

// Helper to load from storage
const loadBgSettings = (): BackgroundSettings => {
  try {
    const saved = localStorage.getItem('vmind-bg-settings');
    return saved ? JSON.parse(saved) : DEFAULT_BG_SETTINGS;
  } catch {
    return DEFAULT_BG_SETTINGS;
  }
};

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
    isConfidenceAutoplayEnabled: false,
    isAnkiAutoplayEnabled: false,
    isTablesSidebarOpen: false,
    // Load initial state from local storage, default true
    isDesktopSidebarOpen: localStorage.getItem('vmind-sidebar-open') !== 'false',
    isImmersive: false,
    backgroundSettings: loadBgSettings(),
    isLibraryMode: false,

    // Concept Section State
    selectedConceptId: localStorage.getItem('vmind-selected-concept') || null,
    expandedConceptIds: JSON.parse(localStorage.getItem('vmind-expanded-concepts') || '[]'),

    // Knowledge Sidebar State
    knowledgeSidebarOpen: false,
    knowledgeSidebarRowId: null,

    // Navigation Guard State
    pendingAction: null,
    isBlockingOverlayVisible: false,

    timeOfDay: 'noon', // Default
    updateTimeOfDay: () => {
      const hour = new Date().getHours();
      let time: 'dawn' | 'noon' | 'twilight' | 'night' = 'noon';
      if (hour >= 5 && hour < 9) time = 'dawn';
      else if (hour >= 9 && hour < 17) time = 'noon';
      else if (hour >= 17 && hour < 20) time = 'twilight';
      else time = 'night';
      set({ timeOfDay: time });
    },

    toggleTheme: () => set(state => {
      const modes: Theme[] = ['light', 'dark', 'blue'];
      const nextIndex = (modes.indexOf(state.theme) + 1) % modes.length;
      const newTheme = modes[nextIndex];

      // Sync theme change to user settings if logged in
      const { isGuest, settings, setSettings } = useUserStore.getState();
      if (!isGuest) {
        setSettings({ ...settings, theme: newTheme });
      }
      return { theme: newTheme };
    }),
    setTheme: (theme) => set({ theme }),

    setCurrentScreen: (screen) => set({ currentScreen: screen }),

    // Global Navigation Guard Implementation
    attemptNavigation: (screen) => {
      get().triggerGlobalAction(() => set({ currentScreen: screen }));
    },

    triggerGlobalAction: (action) => {
      const { syncQueue } = get();
      // Check if there are pending items in the queue
      if (syncQueue.length > 0) {
        // Block navigation, show overlay, and flush batch
        set({
          pendingAction: action,
          isBlockingOverlayVisible: true
        });

        // Force sync engine to flush any batched changes immediately
        VmindSyncEngine.getInstance().endBatchMode();
      } else {
        // Safe to proceed immediately
        action();
      }
    },

    resolveGlobalAction: () => {
      const { pendingAction } = get();
      if (pendingAction) {
        pendingAction();
      }
      set({
        pendingAction: null,
        isBlockingOverlayVisible: false
      });
    },

    cancelGlobalAction: () => {
      set({
        pendingAction: null,
        isBlockingOverlayVisible: false
      });
    },

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
    toggleConfidenceAutoplay: () => set(state => ({ isConfidenceAutoplayEnabled: !state.isConfidenceAutoplayEnabled })),
    toggleAnkiAutoplay: () => set(state => ({ isAnkiAutoplayEnabled: !state.isAnkiAutoplayEnabled })),
    setIsTablesSidebarOpen: (isOpen) => set({ isTablesSidebarOpen: isOpen }),
    toggleDesktopSidebar: () => set(state => {
      const next = !state.isDesktopSidebarOpen;
      localStorage.setItem('vmind-sidebar-open', String(next));
      return { isDesktopSidebarOpen: next };
    }),
    setDesktopSidebarOpen: (isOpen) => {
      localStorage.setItem('vmind-sidebar-open', String(isOpen));
      set({ isDesktopSidebarOpen: isOpen });
    },
    toggleImmersiveMode: () => set(state => ({ isImmersive: !state.isImmersive })),
    setIsImmersive: (isImmersive) => set({ isImmersive }),
    setBackgroundSettings: (newSettings) => set(state => {
      const updated = { ...state.backgroundSettings, ...newSettings };
      localStorage.setItem('vmind-bg-settings', JSON.stringify(updated));
      return { backgroundSettings: updated };
    }),
    setIsLibraryMode: (isLibrary) => set({ isLibraryMode: isLibrary }),

    // Concept Section Actions
    setSelectedConceptId: (id) => set(() => {
      if (id) localStorage.setItem('vmind-selected-concept', id);
      else localStorage.removeItem('vmind-selected-concept');
      return { selectedConceptId: id };
    }),
    setExpandedConceptIds: (ids) => set(() => {
      localStorage.setItem('vmind-expanded-concepts', JSON.stringify(ids));
      return { expandedConceptIds: ids };
    }),
    toggleExpandedConceptId: (id) => set(state => {
      const next = state.expandedConceptIds.includes(id)
        ? state.expandedConceptIds.filter(i => i !== id)
        : [...state.expandedConceptIds, id];
      localStorage.setItem('vmind-expanded-concepts', JSON.stringify(next));
      return { expandedConceptIds: next };
    }),

    // Knowledge Sidebar Actions
    openKnowledgeSidebar: (rowId) => set({ knowledgeSidebarOpen: true, knowledgeSidebarRowId: rowId }),
    closeKnowledgeSidebar: () => set({ knowledgeSidebarOpen: false, knowledgeSidebarRowId: null }),

    // Integrity Bridge Actions
    integrityFilter: null,
    setIntegrityFilter: (integrityFilter) => set({ integrityFilter }),
  })
);
