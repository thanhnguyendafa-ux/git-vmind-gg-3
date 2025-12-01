import { create } from 'zustand';

export type Track = {
  id: string;
  name: string;
  icon: string;
  url: string;
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
  toggleOpen: () => void;
  setIsOpen: (isOpen: boolean) => void;
  togglePlay: () => void;
  setTrack: (track: Track) => void;
  setVolume: (volume: number) => void;
  cycleRepeatMode: () => void;
  toggleShuffle: (allTrackIds: string[]) => void;
}

export const useMusicStore = create<MusicState>()(
    (set, get) => ({
      isOpen: false,
      isPlaying: false,
      currentTrack: null,
      volume: 0.5,
      repeatMode: 'none',
      isShuffled: false,
      shuffledQueue: [],
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
            return { currentTrack: track, isPlaying: true, shuffledQueue: newQueue };
        }
        return { currentTrack: track, isPlaying: true };
      }),
      setVolume: (volume) => set({ volume }),
      cycleRepeatMode: () => set(state => {
        const modes: RepeatMode[] = ['none', 'all', 'one'];
        const currentIndex = modes.indexOf(state.repeatMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        return { repeatMode: modes[nextIndex] };
      }),
      toggleShuffle: (allTrackIds) => set(state => {
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
      }),
    })
);