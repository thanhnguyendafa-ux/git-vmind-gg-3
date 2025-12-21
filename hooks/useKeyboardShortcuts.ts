import { useEffect } from 'react';

type ShortcutAction = (e: KeyboardEvent) => void;

interface ShortcutConfig {
    [keyCombo: string]: ShortcutAction;
}

/**
 * useKeyboardShortcuts
 * A hook to register global keyboard shortcuts.
 * 
 * @param shortcuts Object mapping key combos to actions. 
 * Example: { 'Ctrl+K': () => openSearch(), 'Ctrl+M': () => toggleMusic() }
 * @param dependencies Array of dependencies to re-bind listeners
 */
export const useKeyboardShortcuts = (shortcuts: ShortcutConfig, dependencies: any[] = []) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            // Ignore if user is typing in an input field
            if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) return;

            Object.entries(shortcuts).forEach(([combo, action]) => {
                const keys = combo.split('+').map(k => k.trim().toLowerCase());
                const mainKey = keys.pop();

                if (!mainKey) return;

                const hasCtrl = keys.includes('ctrl') || keys.includes('cmd') || keys.includes('meta');
                const hasAlt = keys.includes('alt');
                const hasShift = keys.includes('shift');

                const isMatch = (
                    e.key.toLowerCase() === mainKey &&
                    (hasCtrl ? (e.ctrlKey || e.metaKey) : !e.ctrlKey && !e.metaKey) &&
                    (hasAlt ? e.altKey : !e.altKey) &&
                    (hasShift ? e.shiftKey : !e.shiftKey)
                );

                if (isMatch) {
                    e.preventDefault();
                    action(e);
                }
            });
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, dependencies);
};
