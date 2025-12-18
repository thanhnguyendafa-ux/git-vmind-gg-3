
import * as React from 'react';
import { TypographyDesign } from '../../types';
import Icon from './Icon';

interface ExpandableTextProps {
  text: string;
  typography: TypographyDesign;
  prefix?: string;
  isZoomed?: boolean;
}

const ExpandableText: React.FC<ExpandableTextProps> = ({ text, typography, prefix, isZoomed }) => {
  const textRef = React.useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isOverflowing, setIsOverflowing] = React.useState(false);

  React.useLayoutEffect(() => {
    const checkOverflow = () => {
      if (textRef.current && !isZoomed) {
        // A small tolerance helps prevent flagging minor overflows
        const tolerance = 2; 
        setIsOverflowing(textRef.current.scrollHeight > textRef.current.clientHeight + tolerance);
      } else {
        setIsOverflowing(false);
      }
    };
    // Check after a short delay to allow for rendering and font loading
    const timeoutId = setTimeout(checkOverflow, 100);
    return () => clearTimeout(timeoutId);
  }, [text, typography, isExpanded, prefix, isZoomed]);

  const style: React.CSSProperties = {
    ...typography,
    // When zoomed, strictly enforce pre-wrap to preserve paragraph spacing in long texts
    whiteSpace: isZoomed ? 'pre-wrap' : 'pre-wrap', 
    wordBreak: 'break-word',
    // In zoom mode, boost font size and relax line height for reading
    fontSize: isZoomed && typography.fontSize ? `calc(${typography.fontSize} * 1.25)` : typography.fontSize,
    lineHeight: isZoomed ? '1.8' : undefined,
    // In zoom mode, limit width for readability on large screens (prose)
    maxWidth: isZoomed ? '75ch' : '100%',
    marginLeft: isZoomed ? 'auto' : undefined,
    marginRight: isZoomed ? 'auto' : undefined,
  };

  const containerClasses = [
    'relative',
    'w-full',
    'transition-all',
    'duration-300',
    'ease-in-out',
  ].join(' ');

  const textClasses = isZoomed 
    ? 'overflow-visible' 
    : [
      !isExpanded ? 'truncate-3-lines' : '',
      isExpanded ? 'max-h-48 overflow-y-auto custom-scrollbar' : '',
    ].join(' ');

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };
  
  // Basic detection of HTML tags for Smart Paste support
  const isHtml = /<[a-z][\s\S]*>/i.test(text);

  return (
    <div className={containerClasses}>
      <div ref={textRef} style={style} className={textClasses}>
        {prefix && <span className="opacity-70 mr-2 font-normal text-[0.9em]">{prefix}</span>}
        {isHtml ? (
            <span dangerouslySetInnerHTML={{ __html: text }} />
        ) : (
            text
        )}
      </div>
      {isOverflowing && !isExpanded && !isZoomed && (
        <button
          onClick={handleToggle}
          className="absolute bottom-0 right-0 bg-white/50 dark:bg-secondary-800/50 rounded-full p-1 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-secondary-700/80"
          aria-label="Show more"
        >
          <Icon name="arrows-pointing-out" className="w-4 h-4 text-secondary-600 dark:text-secondary-300" />
        </button>
      )}
    </div>
  );
};

export default ExpandableText;
