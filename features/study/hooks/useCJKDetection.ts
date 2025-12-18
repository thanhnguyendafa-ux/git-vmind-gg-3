
import { useMemo } from 'react';

/**
 * Detects if a string contains CJK (Chinese, Japanese, Korean) characters.
 * Used to conditionally enable the Handwriting Input mode.
 */
export const useCJKDetection = (text: string | undefined | null) => {
  return useMemo(() => {
    if (!text) return false;
    // Unicode ranges for:
    // CJK Unified Ideographs (4E00-9FFF)
    // CJK Unified Ideographs Extension A (3400-4DBF)
    // CJK Compatibility Ideographs (F900-FAFF)
    const cjkRegex = /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/;
    return cjkRegex.test(text);
  }, [text]);
};
