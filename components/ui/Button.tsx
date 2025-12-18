import * as React from 'react';
import { playClickSound } from '../../services/soundService';

const getVariantClasses = (variant: ButtonProps['variant']) => {
  switch (variant) {
    case 'secondary':
      return 'bg-surface dark:bg-secondary-800 border border-border text-secondary-700 dark:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-700';
    case 'destructive':
      return 'bg-error-500 text-white hover:bg-error-600';
    case 'ghost':
      return 'text-text-subtle hover:bg-secondary-200 dark:hover:bg-secondary-700 hover:text-text-main dark:hover:text-secondary-100';
    case 'primary':
    default:
      // Soft Focus: Use text-text-main (Charcoal) on Primary (Pastel) backgrounds for contrast
      return 'bg-primary-500 text-text-main hover:bg-primary-600';
  }
};

const getSizeClasses = (size: ButtonProps['size']) => {
  switch (size) {
    case 'sm':
      return 'h-10 px-3 rounded-md text-xs';
    case 'lg':
      return 'h-11 px-8 rounded-md text-base';
    case 'md':
    default:
      return 'h-10 py-2 px-4 text-sm';
  }
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => {
    const { className, variant = 'primary', size = 'md', ...rest } = props;
    // Soft Focus: Changed font-semibold to font-bold
    const baseClasses =
      'inline-flex items-center justify-center rounded-md font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ring-offset-2 ring-offset-background dark:ring-offset-secondary-900 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variantClasses = getVariantClasses(variant);
    const sizeClasses = getSizeClasses(size);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Per Zen philosophy, don't play sound on subtle (ghost) or destructive actions.
      if (variant === 'primary' || variant === 'secondary') {
        playClickSound();
      }
      // Call original onClick if it exists
      if (props.onClick) {
        props.onClick(e);
      }
    };

    return (
      <button
        className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className || ''}`}
        ref={ref}
        {...rest}
        onClick={handleClick}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };