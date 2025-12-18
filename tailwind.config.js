
// This file is not directly used by the browser in this setup.
// It serves as the single source of truth for the design system.
// The configuration object is copied into a <script> tag in index.html.

module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Based on architecture.md "Deep Forest" Theme
        primary: { // neon-mint
          50: '#f0fdf4', 
          100: '#dcfce7', 
          200: '#bbf7d0', 
          300: '#86efac', 
          400: '#4ade80', 
          500: '#3DDC84', // Neon Mint
          600: '#2ECC71', 
          700: '#15803d', 
          800: '#166534', 
          900: '#14532d', 
          950: '#052e16' 
        },
        secondary: { // hunter-green / sage / stone
          50: '#f8fafc', 
          100: '#F4F7F5', // Light BG
          200: '#EDF2EE', // Light Surface
          300: '#D8E0DC', // Light Borders
          400: '#88A496', // Dark Text Subtle
          500: '#64748b', 
          600: '#60736D', // Light Text Subtle
          700: '#1F3A32', // Dark Borders
          800: '#132720', // Dark Surface/Cards
          900: '#0D1F1A', // Light Text Main / Dark BG
          950: '#020617'
        },
        success: { // jade -> teal
          50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4', 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a', 950: '#042f2e'
        },
        error: { // terracotta -> rose
          50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337', 950: '#4c0519'
        },
        warning: { // amber
          50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f', 950: '#451a03'
        },
        info: { // cyan
          50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9', 400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490', 800: '#155e75', 900: '#164e63', 950: '#083344'
        },
        // Custom semantic colors from architecture
        'background': 'var(--color-background)',
        'surface': 'var(--color-surface)',
        'text-main': 'var(--color-text-main)',
        'text-subtle': 'var(--color-text-subtle)',
        'border': 'var(--color-border)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Lora', 'serif'],
      },
    },
  },
  plugins: [],
};
