import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    const baseClasses =
      'flex h-10 w-full rounded-md border border-secondary-300 bg-background dark:border-secondary-600 px-3 py-2 text-sm text-text-main dark:text-secondary-100 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors';
      
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