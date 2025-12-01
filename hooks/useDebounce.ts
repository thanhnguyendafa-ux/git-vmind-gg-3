import * as React from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    // Set up a timer to update the debounced value after the specified delay.
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Return a cleanup function that will be called if the value or delay changes
    // before the timeout has completed. This prevents the state from updating
    // until the user has stopped typing for the specified delay.
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // The effect will re-run only if value or delay changes.

  return debouncedValue;
}