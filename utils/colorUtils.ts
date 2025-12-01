import * as React from 'react';

// A curated list of pleasant, light gradients suitable for a light theme.
export const gradients = [
  'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)', // Light Blue Sky
  'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)', // Lime Green
  'linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)', // Soft Yellow to Blue
  'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)', // Pink to Blue
  'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)', // Aqua Marine
  'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)', // Orange to Purple
  'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)', // Lavender
  'linear-gradient(135deg, #f6d365 0%, #fda085 100%)', // Peach
  'linear-gradient(135deg, #ffdde1 0%, #ee9ca7 100%)', // Soft Pink
  'linear-gradient(135deg, #c1dfc4 0%, #deecdd 100%)', // Mint
  'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)', // Vanilla
  'linear-gradient(135deg, #fff1eb 0%, #ace0f9 100%)', // Cloud
  'linear-gradient(135deg, #f09819 0%, #edde5d 100%)', // Golden
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', // Soft Petals
];


/**
 * Generates a simple hash from a string.
 * @param str The input string.
 * @returns A number hash.
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Gets a consistent gradient style for a given tag name, prioritizing custom colors.
 * @param tagName The name of the tag.
 * @param customColors A map of user-defined tag colors.
 * @returns A React CSSProperties object with the background gradient and text color.
 */
export const getTagStyle = (tagName: string, customColors: Record<string, string> = {}): React.CSSProperties => {
  if (!tagName) {
    return {};
  }

  const customGradient = customColors[tagName];
  const selectedGradient = customGradient || gradients[simpleHash(tagName) % gradients.length];
  
  return {
    background: selectedGradient,
    color: '#1e293b', // Dark charcoal for readability on light gradients
    textShadow: '0 1px 1px rgba(255, 255, 255, 0.4)',
    border: '1px solid rgba(0, 0, 0, 0.05)',
  };
};

const solidColors = {
  light: ['#bae6fd', '#a7f3d0', '#fde68a', '#fecdd3', '#ddd6fe', '#a5f3fc', '#fed7aa'], // sky-200, emerald-200, amber-200, rose-200, violet-200, cyan-200, orange-200
  dark: ['#38bdf8', '#34d399', '#fbbf24', '#fb7185', '#a78bfa', '#22d3ee', '#fb923c']  // sky-400, emerald-400, amber-400, rose-400, violet-400, cyan-400, orange-400
};

/**
 * Gets a consistent solid color for a given tag name, aware of light/dark themes.
 * @param tagName The name of the tag.
 * @param theme The current theme ('light' or 'dark').
 * @param customColors A map of user-defined tag colors (assumed to be solid colors).
 * @returns A hex color string.
 */
export const getTagSolidColor = (tagName: string, theme: 'light' | 'dark', customColors: Record<string, string> = {}): string => {
  if (!tagName) {
    return 'transparent';
  }
  // Custom colors are not theme-aware for now, they override everything.
  if (customColors[tagName] && !customColors[tagName].includes('gradient')) {
    return customColors[tagName];
  }
  const palette = solidColors[theme];
  return palette[simpleHash(tagName) % palette.length];
};