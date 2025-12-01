
import React, { useState, useRef, useEffect, ReactNode, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

interface PopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  contentClassName?: string;
  breakpoint?: number; // e.g., 640 for mobile cutoff
}

type Placement = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

const Popover: React.FC<PopoverProps> = ({
  trigger,
  children,
  isOpen,
  setIsOpen,
  contentClassName = '',
  breakpoint = 640,
}) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);
  const [position, setPosition] = useState<React.CSSProperties>({});
  const [placement, setPlacement] = useState<Placement>('bottom-right');

  const triggerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Check for mobile view on mount and resize
  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, [breakpoint]);

  // Calculate position for desktop popover
  useLayoutEffect(() => {
    if (isOpen && !isMobile && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      
      // We need to calculate position before rendering to avoid flickering, 
      // but we can't measure the content ref if it's not rendered yet.
      // We'll render it essentially invisible first if needed, but for now,
      // let's use a rough estimation or render-then-measure via effect if we were not using portals.
      // With Portals, we can render immediately.
      
      // Note: contentRef.current might be null on first pass if we conditionally render.
      // However, since we render the portal conditionally based on isOpen, 
      // we need to rely on a microtask or layout effect after render.
      
      // Simplified approach: Assume standard width or adjust after mount if needed.
      // For robustness with Portals, we calculate based on triggerRect immediately.
      
      // Default estimation (will be corrected if we could measure content, 
      // but strict measurement requires a two-pass render which is complex).
      // We will position relative to trigger and let CSS handle max-height/width constraints.

      const viewportMargin = 8;
      let newPos: React.CSSProperties = {};
      let newPlacement: Placement = 'bottom-right';

      // Decide vertical (default down)
      const spaceBelow = window.innerHeight - triggerRect.bottom - viewportMargin;
      const spaceAbove = triggerRect.top - viewportMargin;
      const estimatedHeight = 200; // Heuristic

      if (spaceBelow >= estimatedHeight || spaceBelow > spaceAbove) {
        newPos.top = triggerRect.bottom + 8;
        newPlacement = 'bottom-right';
      } else {
        // Calculate bottom position so it grows upwards
        newPos.bottom = window.innerHeight - triggerRect.top + 8;
        newPlacement = 'top-right';
      }

      // Decide horizontal (default align left with trigger, extends right)
      // Actually, let's try to center or align based on available space
      const estimatedWidth = 280;
      
      if (triggerRect.left + estimatedWidth > window.innerWidth - viewportMargin) {
         // Align right edge with trigger right edge (extends left)
         newPos.left = triggerRect.right - estimatedWidth; // This is rough
         // Better: set Right
         delete newPos.left;
         newPos.right = window.innerWidth - triggerRect.right;
         newPlacement = newPlacement.startsWith('top') ? 'top-left' : 'bottom-left';
      } else {
         // Align left edge with trigger left edge (extends right)
         newPos.left = triggerRect.left;
         newPlacement = newPlacement.startsWith('top') ? 'top-right' : 'bottom-right';
      }

      // Refinement: If we have contentRef (after first render cycle), adjust strictly
      if (contentRef.current) {
          const contentRect = contentRef.current.getBoundingClientRect();
          
          // Reset
          newPos = {};
          
          // Vertical
          if (spaceBelow >= contentRect.height || spaceBelow > spaceAbove) {
              newPos.top = triggerRect.bottom + 8;
          } else {
              newPos.top = triggerRect.top - contentRect.height - 8;
          }

          // Horizontal
          if (triggerRect.left + contentRect.width > window.innerWidth - viewportMargin) {
              newPos.left = triggerRect.right - contentRect.width;
          } else {
              newPos.left = triggerRect.left;
          }
      }
      
      // Clamp
      if (typeof newPos.left === 'number' && newPos.left < viewportMargin) newPos.left = viewportMargin;
      if (typeof newPos.top === 'number' && newPos.top < viewportMargin) newPos.top = viewportMargin;

      setPosition(newPos);
      setPlacement(newPlacement as Placement);
    }
  }, [isOpen, isMobile]);

  // Handle closing (click outside, escape key) and focus management
  useEffect(() => {
    if (!isOpen) return;

    const lastFocusedElement = document.activeElement as HTMLElement;

    const handleClickOutside = (event: MouseEvent) => {
        // With Portals, contentRef is in document.body, triggerRef is in app flow.
        // We check if click is contained in neither.
        if (
            triggerRef.current && !triggerRef.current.contains(event.target as Node) &&
            contentRef.current && !contentRef.current.contains(event.target as Node)
        ) {
            setIsOpen(false);
        }
    };
    
    const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            setIsOpen(false);
        }
    };

    // Slight delay to avoid capturing the click that opened it
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      lastFocusedElement?.focus();
    };
  }, [isOpen, setIsOpen]);
  
  const getArrowClasses = () => {
      let classes = 'absolute w-3 h-3 bg-surface dark:bg-secondary-800 rotate-45 ring-1 ring-black/5 dark:ring-white/10';
      // Simplify arrow logic for portal positioning
      if (placement.startsWith('top')) {
          classes += ' -bottom-[7px]';
      } else {
          classes += ' -top-[7px]';
      }
      if (placement.endsWith('right')) {
           // If we aligned left (extends right), arrow on left
          classes += ' left-5';
      } else {
          // If we aligned right (extends left), arrow on right
          classes += ' right-5';
      }
      return classes;
  }

  const getOriginClass = () => {
      switch (placement) {
          case 'top-left': return 'origin-bottom-right';
          case 'top-right': return 'origin-bottom-left';
          case 'bottom-left': return 'origin-top-right';
          case 'bottom-right': return 'origin-top-left';
      }
  }

  const renderDesktopPopover = () => {
      const content = (
        <div
          ref={contentRef}
          style={{ ...position }}
          className={`fixed z-[9999] rounded-md shadow-xl bg-surface dark:bg-secondary-800 ring-1 ring-black ring-opacity-5 focus:outline-none 
                     w-auto min-w-[280px] max-w-sm animate-fade-scale-in ${getOriginClass()}
                     ${contentClassName}`}
          role="dialog"
          aria-modal="false"
        >
            <div className={getArrowClasses()} />
            <div className="p-4 relative rounded-md max-h-[50vh] overflow-y-auto break-words" role="none">
                {children}
            </div>
        </div>
      );
      
      return createPortal(content, document.body);
  };

  const renderMobileBottomSheet = () => {
      const content = (
        <>
          <div 
            className="fixed inset-0 bg-black/60 z-[9998] animate-fadeIn" 
            onClick={() => setIsOpen(false)} 
            aria-hidden="true"
          />
          <div
            ref={contentRef}
            className={`fixed bottom-0 left-0 right-0 z-[9999] bg-surface dark:bg-secondary-800 rounded-t-2xl shadow-2xl flex flex-col max-h-[80vh] w-full animate-slideInUp
                       ${contentClassName}`}
            role="dialog"
            aria-modal="true"
          >
            <div className="p-4 flex-shrink-0 text-center relative border-b border-secondary-200 dark:border-secondary-700">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-secondary-300 dark:bg-secondary-600 rounded-full" />
              <button onClick={() => setIsOpen(false)} className="absolute top-2 right-3 p-2 rounded-full hover:bg-secondary-100 dark:hover:bg-secondary-700">
                <Icon name="x" className="w-5 h-5"/>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 break-words">
              {children}
            </div>
          </div>
        </>
      );

      return createPortal(content, document.body);
  };

  return (
    <>
      <div ref={triggerRef} onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} className="inline-block">
        {trigger}
      </div>
      {isOpen && (isMobile ? renderMobileBottomSheet() : renderDesktopPopover())}
    </>
  );
};

export default Popover;
