/**
 * Generates a UUID v4 string.
 * Uses crypto.randomUUID if available (secure context), otherwise falls back to a math-based generator.
 */
export const generateUUID = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    // Fallback for non-secure contexts (e.g. http localhost on some browsers)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};
