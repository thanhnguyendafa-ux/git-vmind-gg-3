// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from './useDebounce';

// Declare test globals to satisfy TypeScript in environments without full test runner types.
declare var describe: (name: string, fn: () => void) => void;
declare var it: (name: string, fn: () => void) => void;
declare var expect: (actual: any) => any;
declare var beforeEach: (fn: () => void) => void;
declare var afterEach: (fn: () => void) => void;
declare var vi: any;

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('should not update the value immediately after a change', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'first', delay: 500 },
    });

    rerender({ value: 'second', delay: 500 });

    expect(result.current).toBe('first');
  });

  it('should update the value after the specified delay', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'first', delay: 500 },
    });

    rerender({ value: 'second', delay: 500 });
    
    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe('second');
  });

  it('should reset the timer if the value changes within the delay period', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'first', delay: 500 },
    });

    rerender({ value: 'second', delay: 500 });
    
    // Fast-forward time, but not enough for the debounce to trigger
    act(() => {
      vi.advanceTimersByTime(250);
    });
    
    // Value changes again, resetting the timer
    rerender({ value: 'third', delay: 500 });
    
    // The debounced value should still be the first one
    expect(result.current).toBe('first');

    // Fast-forward time again for the full delay
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Now the value should be the last one ('third')
    expect(result.current).toBe('third');
  });
});
