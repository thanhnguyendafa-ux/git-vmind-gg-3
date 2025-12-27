

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { VmindSyncEngine } from '../services/VmindSyncEngine';
import { useUserStore } from './useUserStore';
import { MusicConfig } from '../types';

export type Track = {
  id: string;
  name: string;
  icon: string;
  url: string;
  isCustom?: boolean;
};

export type RepeatMode = 'none' | 'one' | 'all';

interface MusicState {
  isOpen: boolean;
  isPlaying: boolean;
  currentTrack: Track | null;
  volume: number; // 0 to 1
  repeatMode: RepeatMode;
  isShuffled: boolean;
  shuffledQueue: string[]; // Store only IDs for the shuffle queue
  customTracks: Track[]; // New: User added tracks
  isLoadingTrack: boolean;
  loadingTrackId: string | null;

  toggleOpen: () => void;
  setIsOpen: (isOpen: boolean) => void;
  togglePlay: () => void;
  setTrack: (track: Track) => void;
  setIsLoadingTrack: (isLoading: boolean, trackId?: string) => void;
  setTrackReady: () => void;
  setVolume: (volume: number) => void;
  cycleRepeatMode: () => void;
  toggleShuffle: (allTrackIds: string[]) => void;

  // New Actions
  addCustomTrack: (track: Track) => void;
  removeCustomTrack: (id: string) => void;

  // Cloud Sync Support
  hydrate: (config: MusicConfig) => void;
}

// Helper to trigger sync
const triggerMusicSync = () => {
  const { session, isGuest } = useUserStore.getState();
  if (!isGuest && session) {
    const { volume, repeatMode, isShuffled, customTracks } = useMusicStore.getState();
    const musicConfig: MusicConfig = { volume, repeatMode, isShuffled, customTracks };
    VmindSyncEngine.getInstance().push('UPSERT_MUSIC', { musicConfig }, session.user.id);
  }
};

export const useMusicStore = create<MusicState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      isPlaying: false,
      currentTrack: null,
      volume: 0.5,
      repeatMode: 'none',
      isShuffled: false,
      shuffledQueue: [],
      customTracks: [],
      isLoadingTrack: false,
      loadingTrackId: null,

      toggleOpen: () => set(state => ({ isOpen: !state.isOpen })),
      setIsOpen: (isOpen) => set({ isOpen }),
      togglePlay: () => set(state => ({ isPlaying: !state.isPlaying })),

      setTrack: (track) => set(state => {
        // If shuffle is active but the new track isn't in the shuffled queue (e.g., user clicked a specific track),
        // we should insert it into the current position to not break the shuffled flow.
        if (state.isShuffled && state.shuffledQueue.length > 0) {
          const currentTrackId = state.currentTrack?.id;
          const currentIndex = currentTrackId ? state.shuffledQueue.indexOf(currentTrackId) : -1;
          const newQueue = state.shuffledQueue.filter(id => id !== track.id);
          const insertIndex = currentIndex !== -1 ? currentIndex + 1 : 0;
          newQueue.splice(insertIndex, 0, track.id);
          return {
            currentTrack: track,
            isLoadingTrack: true,
            loadingTrackId: track.id,
            isPlaying: false,
            shuffledQueue: newQueue
          };
        }
        return {
          currentTrack: track,
          isLoadingTrack: true,
          loadingTrackId: track.id,
          isPlaying: false
        };
      }),

      setIsLoadingTrack: (isLoading, trackId) => set({
        isLoadingTrack: isLoading,
        loadingTrackId: isLoading ? (trackId || null) : null
      }),

      setTrackReady: () => set({
        isLoadingTrack: false,
        loadingTrackId: null,
        isPlaying: true
      }),

      setVolume: (volume) => {
        set({ volume });
        // Simple debounce or just trigger? For MVP we trigger directly.
        // In production, debounce would be better for slider inputs.
        // triggerMusicSync(); // Optional: Don't sync every volume slide tick to avoid spam
      },

      cycleRepeatMode: () => {
        set(state => {
          const modes: RepeatMode[] = ['none', 'all', 'one'];
          const currentIndex = modes.indexOf(state.repeatMode);
          const nextIndex = (currentIndex + 1) % modes.length;
          return { repeatMode: modes[nextIndex] };
        });
        triggerMusicSync();
      },

      toggleShuffle: (allTrackIds) => {
        set(state => {
          if (!state.isShuffled) {
            // Shuffle the full list of track IDs
            const shuffled = [...allTrackIds].sort(() => Math.random() - 0.5);

            // If a track is currently playing, make sure it's the first in the shuffled queue
            if (state.currentTrack) {
              const currentIndex = shuffled.indexOf(state.currentTrack.id);
              if (currentIndex > -1) {
                const [currentItem] = shuffled.splice(currentIndex, 1);
                shuffled.unshift(currentItem);
              }
            }
            return { isShuffled: true, shuffledQueue: shuffled };
          } else {
            return { isShuffled: false, shuffledQueue: [] };
          }
        });
        triggerMusicSync();
      },

      addCustomTrack: (track) => {
        set(state => ({
          customTracks: [...state.customTracks, { ...track, isCustom: true }]
        }));
        triggerMusicSync();
      },

      removeCustomTrack: (id) => {
        set(state => {
          // If the deleted track is playing, stop playback (simple approach)
          const isPlayingDeleted = state.currentTrack?.id === id;
          return {
            customTracks: state.customTracks.filter(t => t.id !== id),
            currentTrack: isPlayingDeleted ? null : state.currentTrack,
            isPlaying: isPlayingDeleted ? false : state.isPlaying
          };
        });
        triggerMusicSync();
      },

      hydrate: (config: MusicConfig) => {
        set({
          volume: config.volume,
          repeatMode: config.repeatMode,
          isShuffled: config.isShuffled,
          customTracks: config.customTracks || [],
          isLoadingTrack: false,
          loadingTrackId: null
        });
      }
    }),
    {
      name: 'vmind-music-storage',
      partialize: (state) => ({
        volume: state.volume,
        customTracks: state.customTracks,
        repeatMode: state.repeatMode
      }), // Only persist specific fields
    }
  )
);