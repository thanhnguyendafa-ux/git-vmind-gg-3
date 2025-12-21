import { useEffect, useCallback } from 'react';
import { useUIStore } from '../stores/useUIStore';
import { Theme } from '../types';

const THEME_STORAGE_KEY = 'vmind-theme-preference';

export const useThemeManager = () => {
    const { theme, setTheme } = useUIStore();

    // Effect to apply theme classes to HTML root
    useEffect(() => {
        const root = document.documentElement;

        // Reset classes and attributes
        root.classList.remove('dark');
        root.removeAttribute('data-theme');

        if (theme === 'dark') {
            root.classList.add('dark');
            root.setAttribute('data-theme', 'forest');
        } else if (theme === 'blue') {
            root.setAttribute('data-theme', 'blue');
        }
        // 'light' is default, requires no class or attribute in this system

        // Persist preference
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    }, [theme]);

    // Effect to load saved theme on mount
    useEffect(() => {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme && ['light', 'dark', 'blue'].includes(savedTheme)) {
            // Only update if different to avoid infinite loops or unnecessary updates
            if (useUIStore.getState().theme !== savedTheme) {
                setTheme(savedTheme as Theme);
            }
        }
    }, [setTheme]);

    return { theme, setTheme };
};
