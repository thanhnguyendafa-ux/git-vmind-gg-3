
import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    // Mobile: text-base (16px) prevents iOS zoom. Desktop: md:text-sm (14px) for compactness.
    const baseClasses =
      'flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-base md:text-sm text-text-main dark:text-secondary-100 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors';
      
    return (
      <input
        type={type}
        className={`${baseClasses} ${className || ''}`}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
