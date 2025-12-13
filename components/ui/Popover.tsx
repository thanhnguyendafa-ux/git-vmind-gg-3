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
    if (isOpen && !isMobile && triggerRef.current && contentRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const contentEl = contentRef.current;
      const contentRect = contentEl.getBoundingClientRect();

      const viewportMargin = 8; // in px
      let newPos: React.CSSProperties = {};
      let newPlacement: Placement;

      // Vertical positioning
      const spaceBelow = window.innerHeight - triggerRect.bottom - viewportMargin;
      const spaceAbove = triggerRect.top - viewportMargin;
      
      if (spaceBelow >= contentRect.height || spaceBelow > spaceAbove) {
        newPos.top = triggerRect.bottom + 8;
        newPlacement = 'bottom-right'; // Placeholder
      } else {
        newPos.top = triggerRect.top - contentRect.height - 8;
        newPlacement = 'top-right'; // Placeholder
      }

      // Horizontal positioning
      if (triggerRect.left + contentRect.width > window.innerWidth - viewportMargin) {
        newPos.left = triggerRect.right - contentRect.width;
        newPlacement = newPlacement.startsWith('top') ? 'top-left' : 'bottom-left';
      } else {
        newPos.left = triggerRect.left;
        newPlacement = newPlacement.startsWith('top') ? 'top-right' : 'bottom-right';
      }
      
      // Clamp to viewport
      if ((newPos.left as number) < viewportMargin) {
        newPos.left = viewportMargin;
      }
      if ((newPos.top as number) < viewportMargin) {
        newPos.top = viewportMargin;
      }

      setPosition(newPos);
      setPlacement(newPlacement as Placement);
    }
  }, [isOpen, isMobile]);

  // Handle closing (click outside, escape key) and focus management
  useEffect(() => {
    if (!isOpen) return;

    const lastFocusedElement = document.activeElement as HTMLElement;

    const handleClickOutside = (event: MouseEvent) => {
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
      if (placement.startsWith('top')) {
          classes += ' -bottom-[0.4375rem]';
      } else {
          classes += ' -top-[0.4375rem]';
      }
      if (placement.endsWith('right')) {
          classes += ' left-5';
      } else {
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
          style={{ ...position, visibility: Object.keys(position).length === 0 ? 'hidden' : 'visible' }}
          className={`fixed z-[9999] rounded-md shadow-lg bg-surface dark:bg-secondary-800 ring-1 ring-black ring-opacity-5 focus:outline-none 
                     w-auto min-w-[17.5rem] max-w-sm animate-fade-scale-in ${getOriginClass()}
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
              <button onClick={() => setIsOpen(false)} className="absolute top-2 right-3 p-3 rounded-full hover:bg-secondary-100 dark:hover:bg-secondary-700 -m-3">
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
