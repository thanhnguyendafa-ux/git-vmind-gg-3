
import { useMemo } from 'react';

export type GardenAssetId = 
  | 'cracked_soil' 
  | 'tiny_sprouts' 
  | 'morning_mist' 
  | 'ladybugs' 
  | 'wild_flowers' 
  | 'mossy_stones' 
  | 'stream_flow' 
  | 'dragonflies' 
  | 'ferns' 
  | 'stone_lantern' 
  | 'sun_shafts' 
  | 'koi_fish' 
  | 'glowing_mushrooms' 
  | 'white_stag' 
  | 'spirit_portal' 
  | 'aurora_sky';

interface AssetConfig {
  id: GardenAssetId;
  threshold: number;
}

// Gemini 3 Standard: Configuration-driven logic
export const GARDEN_ASSETS_CONFIG: AssetConfig[] = [
  { id: 'cracked_soil', threshold: 0 }, // Visible until higher levels heal it
  { id: 'tiny_sprouts', threshold: 100 },
  { id: 'morning_mist', threshold: 250 },
  { id: 'ladybugs', threshold: 400 },
  { id: 'wild_flowers', threshold: 600 },
  { id: 'mossy_stones', threshold: 800 },
  { id: 'stream_flow', threshold: 1000 },
  { id: 'dragonflies', threshold: 1200 },
  { id: 'ferns', threshold: 1500 },
  { id: 'stone_lantern', threshold: 2000 },
  { id: 'sun_shafts', threshold: 2500 },
  { id: 'koi_fish', threshold: 3500 },
  { id: 'glowing_mushrooms', threshold: 4500 },
  { id: 'white_stag', threshold: 5500 },
  { id: 'spirit_portal', threshold: 7000 },
  { id: 'aurora_sky', threshold: 10000 },
];

export const useGardenDirector = (totalDrops: number) => {
  return useMemo(() => {
    const activeAssets = new Set<GardenAssetId>();
    
    GARDEN_ASSETS_CONFIG.forEach(asset => {
      if (totalDrops >= asset.threshold) {
        activeAssets.add(asset.id);
      }
    });

    // Special logic for Cracked Soil (disappears as garden heals)
    const soilHealth = Math.min(1, totalDrops / 800);
    const crackOpacity = Math.max(0, 0.6 - soilHealth);

    return {
      has: (id: GardenAssetId) => activeAssets.has(id),
      soilHealth,
      crackOpacity,
    };
  }, [totalDrops]);
};
