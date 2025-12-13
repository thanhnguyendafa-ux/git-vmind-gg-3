
import { RelationDesign, TypographyDesign } from '../../types';

// This file centralizes constants related to flashcard design.

// Using CSS variables for adaptive colors
export const DEFAULT_TYPOGRAPHY: TypographyDesign = {
  color: 'var(--color-text-main)',
  fontSize: '0.875rem',
  fontFamily: 'Lora, serif', // Updated to Serif for Academic feel
  textAlign: 'center',
  fontWeight: 'bold',
};

export const DARK_MODE_DEFAULT_TYPOGRAPHY: TypographyDesign = { ...DEFAULT_TYPOGRAPHY };

export const DEFAULT_RELATION_DESIGN: RelationDesign = {
  front: { backgroundType: 'solid', backgroundValue: 'var(--color-surface)', gradientAngle: 135, typography: {}, layout: 'vertical' },
  back: { backgroundType: 'solid', backgroundValue: 'var(--color-secondary-50)', gradientAngle: 135, typography: {}, layout: 'vertical' },
  designLinked: true,
  isRandom: true, // Default to true for new relations
};

export interface UnifiedTheme {
    id: string;
    name: string;
    previewColor: string;
    background: { type: 'solid' | 'gradient' | 'image', value: string, gradientAngle?: number };
    typography: {
        primary: string;
        secondary: string;
        fontFamily: string;
    };
}

export const UNIFIED_THEMES: UnifiedTheme[] = [
    {
        id: 'deep-forest',
        name: 'Deep Forest',
        previewColor: '#0F1A17',
        background: { type: 'solid', value: '#0F1A17' },
        typography: {
            primary: '#E9F5EE',
            secondary: '#88A496',
            fontFamily: 'Lora, serif' // Updated to Serif
        }
    },
    {
        id: 'classic-ivory',
        name: 'Classic Ivory',
        previewColor: '#F4F7F5',
        background: { type: 'solid', value: '#F4F7F5' },
        typography: {
            primary: '#0D1F1A',
            secondary: '#52605B',
            fontFamily: 'Lora, serif'
        }
    },
    {
        id: 'minimalist-dark',
        name: 'Minimalist Dark',
        previewColor: '#18181b',
        background: { type: 'solid', value: '#18181b' },
        typography: {
            primary: '#e4e4e7',
            secondary: '#a1a1aa',
            fontFamily: 'Inter, sans-serif'
        }
    },
    {
        id: 'neon-city',
        name: 'Neon City',
        previewColor: '#0f172a',
        background: { type: 'gradient', value: '#1e293b,#0f172a', gradientAngle: 120 },
        typography: {
            primary: '#22d3ee',
            secondary: '#e879f9',
            fontFamily: 'monospace'
        }
    },
    {
        id: 'ocean-breeze',
        name: 'Ocean Breeze',
        previewColor: '#E0F7FA',
        background: { type: 'gradient', value: '#E0F7FA,#FFFFFF', gradientAngle: 180 },
        typography: {
            primary: '#00695C',
            secondary: '#004D40',
            fontFamily: 'Inter, sans-serif'
        }
    },
    {
        id: 'autumn',
        name: 'Autumn',
        previewColor: '#bf360c',
        background: { type: 'solid', value: '#bf360c' },
        typography: {
            primary: '#FFF8E1',
            secondary: '#FFCCBC',
            fontFamily: 'Lora, serif'
        }
    },
    {
        id: 'sakura',
        name: 'Sakura',
        previewColor: '#FCE4EC',
        background: { type: 'solid', value: '#FCE4EC' },
        typography: {
            primary: '#880E4F',
            secondary: '#AD1457',
            fontFamily: 'Poppins, sans-serif'
        }
    },
    {
        id: 'midnight',
        name: 'Midnight',
        previewColor: '#000000',
        background: { type: 'solid', value: '#000000' },
        typography: {
            primary: '#FFFFFF',
            secondary: '#9CA3AF',
            fontFamily: 'Inter, sans-serif'
        }
    },
    {
        id: 'paper',
        name: 'Paper',
        previewColor: '#fef3c7',
        background: { type: 'image', value: 'https://www.transparenttextures.com/patterns/cream-paper.png' },
        typography: {
            primary: '#451a03',
            secondary: '#78350f',
            fontFamily: 'Merriweather, serif'
        }
    }
];

// Keeping legacy templates for backward compatibility if needed, but UI will use UNIFIED_THEMES
export const DESIGN_TEMPLATES: {name: string, design: RelationDesign, frontTypography: TypographyDesign, backTypography: TypographyDesign}[] = [
    {
        name: 'Graphite & Gold',
        frontTypography: { color: '#cda434', fontSize: '0.875rem', fontFamily: 'Poppins, sans-serif', textAlign: 'center', fontWeight: 'bold' },
        backTypography: { color: '#e0c585', fontSize: '0.875rem', fontFamily: 'Poppins, sans-serif', textAlign: 'center', fontWeight: 'normal' },
        design: {
            front: { backgroundType: 'solid', backgroundValue: '#2d3748', gradientAngle: 135, typography: {}, layout: 'vertical' },
            back: { backgroundType: 'solid', backgroundValue: '#1a202c', gradientAngle: 135, typography: {}, layout: 'vertical' }
        }
    },
    // ... (Other templates can remain or be removed if fully migrated)
    {
        name: 'Classic Ivory',
        frontTypography: { color: 'var(--color-text-main)', fontSize: '0.875rem', fontFamily: 'Lora, serif', textAlign: 'center', fontWeight: 'normal' },
        backTypography: { color: 'var(--color-text-main)', fontSize: '0.875rem', fontFamily: 'Lora, serif', textAlign: 'center', fontWeight: 'normal' },
        design: {
            front: { backgroundType: 'solid', backgroundValue: 'var(--color-background)', gradientAngle: 135, typography: {}, layout: 'vertical' },
            back: { backgroundType: 'solid', backgroundValue: 'var(--color-background)', gradientAngle: 135, typography: {}, layout: 'vertical' }
        }
    },
    {
        name: 'Minimalist',
        frontTypography: { color: 'var(--color-text-main)', fontSize: '0.875rem', fontFamily: 'Inter, sans-serif', textAlign: 'center', fontWeight: 'normal' },
        backTypography: { color: 'var(--color-text-subtle)', fontSize: '0.875rem', fontFamily: 'Inter, sans-serif', textAlign: 'center', fontWeight: 'normal' },
        design: {
            front: { backgroundType: 'solid', backgroundValue: 'var(--color-surface)', gradientAngle: 135, typography: {}, layout: 'vertical' },
            back: { backgroundType: 'solid', backgroundValue: 'var(--color-secondary-50)', gradientAngle: 135, typography: {}, layout: 'vertical' }
        }
    }
];
