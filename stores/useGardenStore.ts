
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useUserStore } from './useUserStore';

export enum TreeStage {
  Seed = 'Seed',
  Germination = 'Germination',
  Sprout = 'Sprout',
  Seedling = 'Seedling',
  Sapling = 'Sapling',
  YoungTree = 'YoungTree',
  Tree = 'Tree',
  Mature = 'Mature',
  Ancient = 'Ancient',
  Eternal = 'Eternal',
}

export interface StageConfig {
  stage: TreeStage;
  threshold: number; // Minimum drops required to reach this stage
  label: string;
}

export const TREE_STAGE_DEFINITIONS: StageConfig[] = [
  { stage: TreeStage.Seed, threshold: 0, label: 'Seed' },
  { stage: TreeStage.Germination, threshold: 16, label: 'Germination' },
  { stage: TreeStage.Sprout, threshold: 41, label: 'Sprout' },
  { stage: TreeStage.Seedling, threshold: 91, label: 'Seedling' },
  { stage: TreeStage.Sapling, threshold: 181, label: 'Sapling' },
  { stage: TreeStage.YoungTree, threshold: 351, label: 'Young Tree' },
  { stage: TreeStage.Tree, threshold: 601, label: 'Tree' },
  { stage: TreeStage.Mature, threshold: 1001, label: 'Mature Tree' },
  { stage: TreeStage.Ancient, threshold: 3001, label: 'Ancient Tree' },
  { stage: TreeStage.Eternal, threshold: 6001, label: 'Eternal Spirit' },
];

export const getTreeStage = (drops: number): TreeStage => {
  // Iterate in reverse to find the highest matching threshold
  for (let i = TREE_STAGE_DEFINITIONS.length - 1; i >= 0; i--) {
    if (drops >= TREE_STAGE_DEFINITIONS[i].threshold) {
      return TREE_STAGE_DEFINITIONS[i].stage;
    }
  }
  return TreeStage.Seed;
};

// --- Restoration Project Logic ---

export type GardenTier = 'Barren' | 'Spring' | 'Forest' | 'Ecosystem' | 'Sanctuary';

export interface TierConfig {
    tier: GardenTier;
    threshold: number; // Minimum drops required
    label: string;
}

export const GARDEN_TIER_DEFINITIONS: TierConfig[] = [
    { tier: 'Barren', threshold: 0, label: 'Barren Land' },
    { tier: 'Spring', threshold: 1000, label: 'Awakening Spring' },
    { tier: 'Forest', threshold: 3000, label: 'Lush Forest' },
    { tier: 'Ecosystem', threshold: 6000, label: 'Thriving Ecosystem' },
    { tier: 'Sanctuary', threshold: 9000, label: 'Spirit Sanctuary' },
];

export const getGardenTier = (drops: number): GardenTier => {
  for (let i = GARDEN_TIER_DEFINITIONS.length - 1; i >= 0; i--) {
      if (drops >= GARDEN_TIER_DEFINITIONS[i].threshold) {
          return GARDEN_TIER_DEFINITIONS[i].tier;
      }
  }
  return 'Barren';
};

export const isGardenAwake = (lastSessionDate: string | null): boolean => {
  if (!lastSessionDate) return false;
  const today = new Date().toISOString().split('T')[0];
  return lastSessionDate === today;
};

interface GardenState {
  totalDrops: number;
  isWatering: boolean;
  addDrops: (amount: number) => void;
  setWatering: (status: boolean) => void;
  setTotalDrops: (amount: number) => void;
}

export const useGardenStore = create<GardenState>()(
  persist(
    (set) => ({
      totalDrops: 0,
      isWatering: false,
      addDrops: (amount: number) => {
        set((state) => ({
          totalDrops: state.totalDrops + amount,
          isWatering: true,
        }));

        // Sync with server if logged in
        const { isGuest, session, saveUserProfile } = useUserStore.getState();
        if (!isGuest && session) {
            saveUserProfile();
        }

        setTimeout(() => {
          set({ isWatering: false });
        }, 2000); // Animation duration for watering
      },
      setWatering: (status: boolean) => set({ isWatering: status }),
      setTotalDrops: (amount: number) => set({ totalDrops: amount }),
    }),
    {
      name: 'vmind-garden-storage', // name of the item in the storage (must be unique)
    }
  )
);
