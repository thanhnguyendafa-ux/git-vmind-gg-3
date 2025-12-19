
import { RelationDesign, TypographyDesign, Relation, CardFaceDesign } from '../../types';

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

export interface ThemeButtonStyle {
    background: string;
    border: string;
    text: string;
    radius: string;
    shadow: string;
    hover: string;
    active: string;
    success: string;
    error: string;
    font?: string;
    backdrop?: string;
}

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
    interaction?: ThemeButtonStyle;
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
            fontFamily: 'Lora, serif'
        },
        interaction: {
            background: 'bg-[#132720]/80',
            backdrop: 'backdrop-blur-md',
            border: 'border border-[#88A496]/30',
            text: 'text-[#E9F5EE]',
            radius: 'rounded-2xl',
            shadow: 'shadow-lg',
            hover: 'hover:bg-[#1A332B] hover:border-[#3DDC84]/50',
            active: 'active:scale-95',
            success: 'bg-[#10B981]/30 border-[#10B981] text-[#A7F3D0]',
            error: 'bg-red-900/40 border-red-700 text-red-200',
            font: 'font-serif'
        }
    },
    {
        id: 'sage-archive',
        name: 'Sage Archive',
        previewColor: '#162221',
        background: { type: 'solid', value: '#162221' },
        typography: {
            primary: '#ECFDF5',
            secondary: '#D1D5DB',
            fontFamily: '"Be Vietnam Pro", sans-serif'
        },
        interaction: {
            background: 'bg-[#1F2F2D]',
            backdrop: '',
            border: 'border border-[#1F2F2D]',
            text: 'text-[#ECFDF5]',
            radius: 'rounded-sm',
            shadow: 'shadow-md',
            hover: 'hover:bg-[#2A3F3C] hover:border-emerald-700',
            active: 'active:scale-[0.99]',
            success: 'bg-emerald-900/40 border-emerald-600 text-emerald-100',
            error: 'bg-rose-900/40 border-rose-600 text-rose-100',
            font: 'font-bevietnam'
        }
    },
    {
        id: 'deep-scholar',
        name: 'Deep Scholar',
        previewColor: '#0F172A',
        background: { type: 'solid', value: '#0F172A' },
        typography: {
            primary: '#F1F5F9',
            secondary: '#94A3B8',
            fontFamily: 'Inter, sans-serif'
        },
        interaction: {
            background: 'bg-[#1E293B]/60',
            backdrop: 'backdrop-blur-sm',
            border: 'border border-indigo-500/30',
            text: 'text-indigo-100',
            radius: 'rounded-md',
            shadow: 'shadow-sm',
            hover: 'hover:bg-[#334155]/80 hover:border-indigo-400/50',
            active: 'active:bg-[#1E293B]',
            success: 'bg-blue-900/30 border-blue-500 text-blue-100',
            error: 'bg-red-900/30 border-red-500 text-red-100',
            font: 'font-sans'
        }
    },
    {
        id: 'royal-lavender',
        name: 'Royal Lavender',
        previewColor: '#1E1B4B',
        background: { type: 'solid', value: '#1E1B4B' },
        typography: {
            primary: '#E0E7FF',
            secondary: '#A5B4FC',
            fontFamily: 'Lora, serif'
        },
        interaction: {
            background: 'bg-[#312E81]/50',
            backdrop: 'backdrop-blur-md',
            border: 'border border-[#FDE047]/20',
            text: 'text-[#E0E7FF]',
            radius: 'rounded-xl',
            shadow: 'shadow-lg shadow-indigo-900/50',
            hover: 'hover:bg-[#3730A3]/70 hover:border-[#FDE047]/40',
            active: 'active:scale-95',
            success: 'bg-indigo-800/50 border-yellow-400/50 text-yellow-100',
            error: 'bg-red-900/40 border-red-400 text-red-100',
            font: 'font-serif'
        }
    },
    {
        id: 'obsidian-paper',
        name: 'Obsidian Paper',
        previewColor: '#111111',
        background: { type: 'solid', value: '#111111' },
        typography: {
            primary: '#D4D4D8',
            secondary: '#A1A1AA',
            fontFamily: '"Plus Jakarta Sans", sans-serif'
        },
        interaction: {
            background: 'bg-[#18181B]',
            backdrop: '',
            border: 'border border-[#27272A]',
            text: 'text-[#E4E4E7]',
            radius: 'rounded-none',
            shadow: 'shadow-none',
            hover: 'hover:bg-[#27272A] hover:border-[#3F3F46]',
            active: 'active:bg-[#3F3F46]',
            success: 'bg-zinc-800 border-zinc-500 text-zinc-100',
            error: 'bg-red-950 border-red-800 text-red-200',
            font: 'font-jakarta'
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
        },
        interaction: {
            background: 'bg-white',
            border: 'border border-secondary-300',
            text: 'text-[#0D1F1A]',
            radius: 'rounded-lg',
            shadow: 'shadow-sm',
            hover: 'hover:bg-secondary-50 hover:border-primary-500',
            active: 'active:scale-[0.98]',
            success: 'bg-green-100 border-green-600 text-green-900',
            error: 'bg-red-100 border-red-600 text-red-900',
            font: 'font-serif',
            backdrop: ''
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
        },
        interaction: {
            background: 'bg-zinc-800',
            border: 'border border-zinc-700',
            text: 'text-zinc-200',
            radius: 'rounded-md',
            shadow: 'shadow-none',
            hover: 'hover:bg-zinc-700 hover:text-white',
            active: 'active:bg-zinc-600',
            success: 'bg-emerald-900/50 border-emerald-500 text-emerald-200',
            error: 'bg-red-900/50 border-red-500 text-red-200',
            font: 'font-sans',
            backdrop: ''
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
        },
        interaction: {
            background: 'bg-black/80',
            backdrop: 'backdrop-blur-md',
            border: 'border-2 border-cyan-500',
            text: 'text-cyan-400',
            radius: 'rounded-none',
            shadow: 'shadow-[0_0_10px_rgba(34,211,238,0.3)]',
            hover: 'hover:bg-cyan-500/20 hover:shadow-[0_0_15px_rgba(34,211,238,0.5)]',
            active: 'active:scale-[0.98]',
            success: 'bg-green-500/20 text-green-400 border-green-500 shadow-[0_0_15px_rgba(74,222,128,0.5)]',
            error: 'bg-red-500/20 text-red-400 border-red-500 shadow-[0_0_15px_rgba(248,113,113,0.5)]',
            font: 'font-mono'
        }
    },
    {
        id: 'azure-breeze',
        name: 'Azure Breeze',
        previewColor: '#0EA5E9',
        background: { type: 'solid', value: '#F0F9FF' },
        typography: {
            primary: '#075985',
            secondary: '#0EA5E9',
            fontFamily: 'Inter, sans-serif'
        },
        interaction: {
            background: 'bg-white/70',
            backdrop: 'backdrop-blur-md',
            border: 'border border-sky-200',
            text: 'text-sky-900',
            radius: 'rounded-2xl',
            shadow: 'shadow-sm',
            hover: 'hover:bg-sky-50 hover:border-sky-400 hover:scale-[1.02] hover:shadow-md',
            active: 'active:scale-95',
            success: 'bg-emerald-100 border-emerald-500 text-emerald-900',
            error: 'bg-rose-100 border-rose-500 text-rose-900',
            font: 'font-sans'
        }
    },
    {
        id: 'solar-flare',
        name: 'Solar Flare',
        previewColor: '#F59E0B',
        background: { type: 'gradient', value: '#F59E0B,#EF4444', gradientAngle: 45 },
        typography: {
            primary: '#FFFFFF',
            secondary: '#FEF3C7',
            fontFamily: 'Inter, sans-serif'
        },
        interaction: {
            background: 'bg-white/20',
            backdrop: 'backdrop-blur-md',
            border: 'border border-white/40',
            text: 'text-white',
            radius: 'rounded-xl',
            shadow: 'shadow-lg',
            hover: 'hover:bg-white/30',
            active: 'active:scale-95',
            success: 'bg-green-500/30 border-green-300 text-white',
            error: 'bg-red-900/40 border-red-300 text-white',
            font: 'font-sans'
        }
    },
    {
        id: 'royal-navy',
        name: 'Royal Navy',
        previewColor: '#172554',
        background: { type: 'solid', value: '#172554' },
        typography: {
            primary: '#E0F2FE',
            secondary: '#94A3B8',
            fontFamily: 'Merriweather, serif'
        },
        interaction: {
            background: 'bg-[#0f172a]',
            backdrop: '',
            border: 'border border-amber-500/30',
            text: 'text-[#E0F2FE]',
            radius: 'rounded-lg',
            shadow: 'shadow-md',
            hover: 'hover:bg-[#1e293b] hover:border-amber-500/60',
            active: 'active:scale-[0.98]',
            success: 'bg-emerald-900/50 border-emerald-500 text-emerald-100',
            error: 'bg-red-900/50 border-red-500 text-red-100',
            font: 'font-merriweather'
        }
    },
    {
        id: 'high-voltage',
        name: 'High Voltage',
        previewColor: '#FAEA48',
        background: { type: 'solid', value: '#FAEA48' },
        typography: {
            primary: '#000000',
            secondary: '#1A1A1A',
            fontFamily: 'Inter, sans-serif'
        },
        interaction: {
            background: 'bg-black',
            backdrop: '',
            border: 'border-2 border-black',
            text: 'text-yellow-400',
            radius: 'rounded-none',
            shadow: 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
            hover: 'hover:translate-y-1 hover:shadow-none',
            active: 'active:scale-[0.98]',
            success: 'bg-green-600 text-white border-black',
            error: 'bg-red-600 text-white border-black',
            font: 'font-sans'
        }
    },
    {
        id: 'nordic-frost',
        name: 'Nordic Frost',
        previewColor: '#F8FAFC',
        background: { type: 'gradient', value: '#F8FAFC,#CBD5E1', gradientAngle: 180 },
        typography: {
            primary: '#334155',
            secondary: '#64748B',
            fontFamily: 'Inter, sans-serif'
        },
        interaction: {
            background: 'bg-white',
            backdrop: '',
            border: 'border border-slate-200',
            text: 'text-[#334155]',
            radius: 'rounded-md',
            shadow: 'shadow-sm',
            hover: 'hover:bg-slate-50 hover:border-slate-300',
            active: 'active:bg-slate-100',
            success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
            error: 'bg-rose-50 border-rose-200 text-rose-800',
            font: 'font-sans'
        }
    },
    {
        id: 'jungle-explorer',
        name: 'Jungle Explorer',
        previewColor: '#ECFDF5',
        background: { type: 'solid', value: '#ECFDF5' },
        typography: {
            primary: '#064E3B',
            secondary: '#059669',
            fontFamily: 'Fredoka, sans-serif'
        },
        interaction: {
            background: 'bg-[#10B981]',
            backdrop: '',
            border: 'border-2 border-[#064E3B]',
            text: 'text-white',
            radius: 'rounded-xl',
            shadow: 'shadow-md',
            hover: 'hover:bg-[#059669]',
            active: 'active:scale-95',
            success: 'bg-[#064E3B] border-white text-[#6EE7B7]',
            error: 'bg-red-600 border-white text-white',
            font: 'font-fredoka'
        }
    },
    {
        id: 'space-academy',
        name: 'Space Academy',
        previewColor: '#1E1B4B',
        background: { type: 'solid', value: '#1E1B4B' },
        typography: {
            primary: '#FB7185',
            secondary: '#6EE7B7',
            fontFamily: 'Space Grotesk, sans-serif'
        },
        interaction: {
            background: 'bg-[#1E1B4B]/80',
            backdrop: 'backdrop-blur-sm',
            border: 'border border-[#FB7185] shadow-[0_0_10px_#FB7185]', // Glow effect
            text: 'text-[#FB7185]',
            radius: 'rounded-lg',
            shadow: 'shadow-lg',
            hover: 'hover:bg-[#FB7185]/20',
            active: 'active:scale-95',
            success: 'bg-green-900/50 border-green-400 text-green-400 shadow-[0_0_10px_#4ade80]',
            error: 'bg-red-900/50 border-red-500 text-red-500 shadow-[0_0_10px_#ef4444]',
            font: 'font-space'
        }
    },
    {
        id: 'paper-craft',
        name: 'Paper Craft',
        previewColor: '#FFFBEB',
        background: { type: 'solid', value: '#FFFBEB' },
        typography: {
            primary: '#451A03',
            secondary: '#78350F',
            fontFamily: 'Comfortaa, cursive'
        },
        interaction: {
            background: 'bg-[#FFFBEB]',
            backdrop: '',
            border: 'border-2 border-dashed border-[#78350F]',
            text: 'text-[#451A03]',
            radius: 'rounded-sm',
            shadow: 'shadow-sm',
            hover: 'hover:border-solid hover:bg-[#FEF3C7]',
            active: 'active:translate-y-0.5',
            success: 'bg-green-100 border-green-600 text-green-800 border-dashed',
            error: 'bg-red-100 border-red-600 text-red-800 border-dashed',
            font: 'font-comfortaa'
        }
    },
    {
        id: 'ocean-discovery',
        name: 'Ocean Discovery',
        previewColor: '#E0F2FE',
        background: { type: 'gradient', value: '#E0F2FE,#7DD3FC', gradientAngle: 180 },
        typography: {
            primary: '#0C4A6E',
            secondary: '#0369A1',
            fontFamily: 'Nunito, sans-serif'
        },
        interaction: {
            background: 'bg-[#38BDF8]/20',
            backdrop: 'backdrop-blur-md',
            border: 'border border-[#BAE6FD]',
            text: 'text-[#0C4A6E]',
            radius: 'rounded-3xl',
            shadow: 'shadow-lg shadow-blue-200',
            hover: 'hover:bg-[#38BDF8]/30',
            active: 'active:scale-95',
            success: 'bg-teal-100 border-teal-500 text-teal-900',
            error: 'bg-rose-100 border-rose-500 text-rose-900',
            font: 'font-nunito'
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
        },
        interaction: {
            background: 'bg-white/60',
            backdrop: 'backdrop-blur-sm',
            border: 'border border-cyan-200',
            text: 'text-cyan-900',
            radius: 'rounded-xl',
            shadow: 'shadow-sm',
            hover: 'hover:bg-white hover:border-cyan-400 hover:shadow-md',
            active: 'active:scale-95',
            success: 'bg-teal-100 border-teal-500 text-teal-800',
            error: 'bg-rose-100 border-rose-500 text-rose-800',
            font: 'font-sans'
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
        },
        interaction: {
            background: 'bg-[#5D4037]',
            backdrop: '',
            border: 'border border-[#FFAB91]',
            text: 'text-[#FFCCBC]',
            radius: 'rounded-lg',
            shadow: 'shadow-md',
            hover: 'hover:bg-[#4E342E] hover:border-[#FF5722]',
            active: 'active:scale-[0.98]',
            success: 'bg-green-900 border-green-500 text-green-200',
            error: 'bg-red-900 border-red-500 text-red-200',
            font: 'font-serif'
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
        },
        interaction: {
            background: 'bg-white/80',
            backdrop: 'backdrop-blur',
            border: 'border border-pink-200',
            text: 'text-pink-900',
            radius: 'rounded-3xl',
            shadow: 'shadow-sm',
            hover: 'hover:bg-pink-50 hover:border-pink-300',
            active: 'active:scale-95',
            success: 'bg-green-50 border-green-400 text-green-800',
            error: 'bg-red-50 border-red-400 text-red-800',
            font: 'font-sans'
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
        },
        interaction: {
            background: 'bg-gray-900',
            backdrop: '',
            border: 'border border-gray-700',
            text: 'text-gray-200',
            radius: 'rounded-md',
            shadow: 'shadow-inner',
            hover: 'hover:bg-gray-800 hover:border-gray-500',
            active: 'active:bg-black',
            success: 'bg-green-900 border-green-500 text-green-300',
            error: 'bg-red-900 border-red-500 text-red-300',
            font: 'font-sans'
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
        },
        interaction: {
            background: 'bg-[#fef3c7]/90',
            backdrop: '',
            border: 'border-2 border-dashed border-[#78350f]',
            text: 'text-[#451a03]',
            radius: 'rounded-sm',
            shadow: 'shadow-sm',
            hover: 'hover:bg-[#fffbeb] hover:border-solid',
            active: 'active:rotate-1',
            success: 'bg-green-100 border-green-700 text-green-900 border-solid',
            error: 'bg-red-100 border-red-700 text-red-900 border-solid',
            font: 'font-serif'
        }
    }
];

export const applyThemeToRelation = (relation: Relation, theme: UnifiedTheme): Relation => {
    const newRelation = JSON.parse(JSON.stringify(relation));
    if (!newRelation.design) return newRelation;

    const applyToFace = (face: CardFaceDesign) => {
        if (!face) return;
        face.backgroundType = theme.background.type;
        face.backgroundValue = theme.background.value;
        if (theme.background.gradientAngle !== undefined) {
            face.gradientAngle = theme.background.gradientAngle;
        }
        if (face.typography) {
            Object.keys(face.typography).forEach(key => {
                face.typography[key].color = theme.typography.primary;
                face.typography[key].fontFamily = theme.typography.fontFamily;
            });
        }
        if (face.textBoxes) {
            face.textBoxes.forEach(box => {
                box.typography.color = theme.typography.primary;
                box.typography.fontFamily = theme.typography.fontFamily;
            });
        }
    };

    applyToFace(newRelation.design.front);
    applyToFace(newRelation.design.back);

    return newRelation;
};

// Keeping legacy templates for backward compatibility if needed, but UI will use UNIFIED_THEMES
export const DESIGN_TEMPLATES: { name: string, design: RelationDesign, frontTypography: TypographyDesign, backTypography: TypographyDesign }[] = [
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
