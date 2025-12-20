
import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Table, TypographyDesign } from '../../../../types';
import Icon from '../../../../components/ui/Icon';
import Popover from '../../../../components/ui/Popover';

// --- SmartTextarea ---
export const SmartTextarea: React.FC<{
    value: string;
    onChange: (val: string) => void;
    typography: TypographyDesign;
    table?: Table;
    onBlur?: () => void;
    autoFocus?: boolean;
}> = ({ value: initialValue, onChange, typography, table, onBlur, autoFocus }) => {
    const [localValue, setLocalValue] = useState(initialValue);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [cursorIndex, setCursorIndex] = useState<number | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const valueRef = useRef(initialValue);

    // Sync local state when external value changes (e.g. reset)
    useEffect(() => {
        setLocalValue(initialValue);
        valueRef.current = initialValue;
    }, [initialValue]);

    // Handle Auto-Focus
    useEffect(() => {
        if (autoFocus && textareaRef.current) {
            setTimeout(() => {
                textareaRef.current?.focus();
                const len = textareaRef.current?.value.length || 0;
                textareaRef.current?.setSelectionRange(len, len);
            }, 10);
        }
    }, [autoFocus]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        const pos = e.target.selectionStart;

        setLocalValue(val);
        valueRef.current = val;

        // Detect '@' trigger for insertion menu
        if (val.slice(pos - 1, pos) === '@') {
            setCursorIndex(pos);
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    };

    const commitChange = () => {
        if (localValue !== initialValue) {
            onChange(localValue);
        }
    };

    const handleBlur = () => {
        commitChange();
        if (onBlur) onBlur();
        setTimeout(() => setShowSuggestions(false), 200);
    };

    const insertText = (textToInsert: string) => {
        if (cursorIndex === null) return;
        const before = localValue.slice(0, cursorIndex - 1);
        const after = localValue.slice(cursorIndex);
        const newVal = before + textToInsert + after;
        setLocalValue(newVal);
        valueRef.current = newVal;
        onChange(newVal); // Immediate save on insert
        setShowSuggestions(false);
        setTimeout(() => {
            textareaRef.current?.focus();
        }, 0);
    };

    return (
        <div className="relative w-full pointer-events-auto z-20">
            <textarea
                ref={textareaRef}
                value={localValue}
                onChange={handleChange}
                onBlur={handleBlur}
                style={{ ...typography, width: '100%', resize: 'none', background: 'transparent', border: 'none', outline: 'none', minHeight: '1.5em' }}
                placeholder="Type text... use '@' for variables"
                className="focus:ring-0 p-0 m-0 whitespace-pre-wrap break-words"
            />
            {showSuggestions && table && (
                <div className="absolute z-50 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 shadow-xl rounded-lg p-1 w-72 max-h-64 overflow-y-auto top-full left-0 mt-1">
                    <p className="text-[10px] uppercase font-bold text-text-subtle px-2 py-1.5 bg-secondary-50 dark:bg-secondary-900/50 rounded mb-1">Insert Variable</p>
                    {table.columns.map(col => (
                        <div key={col.id} className="mb-2 border-b border-secondary-100 dark:border-secondary-700/50 last:border-0 pb-2 last:pb-0">
                            <p className="px-2 text-xs font-semibold text-text-subtle mb-1 flex items-center gap-1.5">
                                <Icon name="table-cells" className="w-3.5 h-3.5" />
                                {col.name}
                            </p>
                            <button
                                onMouseDown={(e) => { e.preventDefault(); insertText(`{${col.name}}`); }}
                                className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-secondary-100 dark:hover:bg-secondary-700 flex items-center gap-2 group"
                            >
                                <span className="text-xs font-mono bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-1 rounded min-w-[3rem] text-center">Data</span>
                                <span className="text-text-main dark:text-secondary-100 text-xs font-medium truncate">{`{${col.name}}`}</span>
                            </button>
                            <button
                                onMouseDown={(e) => { e.preventDefault(); insertText(col.name); }}
                                className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-secondary-100 dark:hover:bg-secondary-700 flex items-center gap-2 group"
                            >
                                <span className="text-xs font-mono bg-secondary-200 dark:bg-secondary-700 text-secondary-600 dark:text-secondary-300 px-1 rounded min-w-[3rem] text-center">Label</span>
                                <span className="text-text-main dark:text-secondary-100 text-xs font-medium truncate">{col.name}</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- QuickInsertHandle ---
export const QuickInsertHandle: React.FC<{
    index: number;
    onInsert: (index: number, type: 'data' | 'label' | 'text' | 'divider' | 'inline_composite', colId?: string) => void;
    table?: Table;
    isFallback?: boolean;
    isMobile?: boolean;
    className?: string;
}> = ({ index, onInsert, table, isFallback, isMobile, className }) => {
    const [isOpen, setIsOpen] = useState(false);

    // Explicit positioning classes, overridden if className is provided
    // Updated z-index to 70 to ensure visibility over other UI elements
    // Adjusted mobile offset to -left-2 to prevent clipping in container
    const containerClasses = className || (isFallback
        ? 'relative inline-block z-30'
        : `absolute z-[70] top-1/2 -translate-y-1/2 ${isMobile ? '-left-2' : 'left-2'}`);

    return (
        <div className={containerClasses}>
            <Popover
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                trigger={
                    <button
                        className={`
                            flex items-center justify-center 
                            bg-primary-500 text-white shadow-md hover:scale-110 transition-transform cursor-pointer pointer-events-auto
                            ${isFallback
                                ? 'w-8 h-8 rounded-full animate-pulse'
                                : 'w-5 h-5 rounded-full -translate-x-1/2 opacity-100 lg:group-hover/block:opacity-100 lg:opacity-0 group-hover/dropzone:opacity-100'
                            }
                        `}
                        title="Insert Block"
                        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                    >
                        <Icon name="plus" className={isFallback ? "w-5 h-5" : "w-3 h-3"} />
                    </button>
                }
                contentClassName="w-60 z-[1100]"
            >
                <div className="p-1 space-y-1 max-h-72 overflow-y-auto">
                    <button onClick={() => { onInsert(index, 'text'); setIsOpen(false); }} className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-secondary-100 dark:hover:bg-secondary-700 flex items-center gap-2">
                        <Icon name="file-text" className="w-4 h-4 text-text-subtle" /> Text Block
                    </button>
                    <button onClick={() => { onInsert(index, 'divider'); setIsOpen(false); }} className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-secondary-100 dark:hover:bg-secondary-700 flex items-center gap-2">
                        <Icon name="minus" className="w-4 h-4 text-text-subtle" /> Divider
                    </button>

                    {table && table.columns.length > 0 && (
                        <>
                            <div className="h-px bg-secondary-200 dark:bg-secondary-700 my-1" />
                            <p className="text-[10px] font-bold text-text-subtle uppercase px-2 py-1">Inline Rows</p>
                            {table.columns.map(col => (
                                <button key={`inline-${col.id}`} onClick={() => { onInsert(index, 'inline_composite', col.id); setIsOpen(false); }} className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-secondary-100 dark:hover:bg-secondary-700 flex items-center gap-2">
                                    <Icon name="table-cells" className="w-4 h-4 text-success-500" />
                                    <span><strong>{col.name}:</strong> [Data]</span>
                                </button>
                            ))}
                            <div className="h-px bg-secondary-200 dark:bg-secondary-700 my-1" />
                            <p className="text-[10px] font-bold text-text-subtle uppercase px-2 py-1">Single Fields</p>
                            {table.columns.map(col => (
                                <button key={`data-${col.id}`} onClick={() => { onInsert(index, 'data', col.id); setIsOpen(false); }} className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-secondary-100 dark:hover:bg-secondary-700 flex items-center gap-2">
                                    <Icon name="tag" className="w-4 h-4 text-primary-500" /> Data: {col.name}
                                </button>
                            ))}
                        </>
                    )}
                </div>
            </Popover>
        </div>
    );
};

// --- DesignerBlock ---
export const DesignerBlock: React.FC<{
    id: string;
    isSelected: boolean;
    onSelect: () => void;
    children: React.ReactNode;
    typography: TypographyDesign;
    onUpdate: (updates: { typography?: Partial<TypographyDesign>; text?: string }) => void;
    onDelete: () => void;
    type: 'data' | 'label' | 'text' | 'divider';
    onChangeType?: () => void;
    index: number;
    isMobile: boolean;
    isLocked?: boolean; // New Prop for System Blocks
}> = ({ id, isSelected, onSelect, children, typography, onUpdate, onDelete, type, onChangeType, index, isMobile, isLocked }) => {

    const changeFontSize = (direction: 'up' | 'down') => {
        const FONT_SIZES = ['0.75rem', '0.875rem', '1rem', '1.125rem', '1.25rem', '1.5rem', '2rem', '3rem'];

        const currentIndex = FONT_SIZES.indexOf(typography.fontSize);
        let nextIndex = currentIndex;
        if (direction === 'up') nextIndex = Math.min(currentIndex + 1, FONT_SIZES.length - 1);
        else nextIndex = Math.max(currentIndex - 1, 0);

        if (currentIndex === -1) nextIndex = direction === 'up' ? 2 : 1;

        onUpdate({ typography: { fontSize: FONT_SIZES[nextIndex] } });
    };

    const toggleStyle = (key: 'fontWeight' | 'fontStyle', onVal: string, offVal: string) => {
        onUpdate({ typography: { [key]: typography[key] === onVal ? offVal : onVal } });
    };

    const setAlign = (align: 'left' | 'center' | 'right') => {
        onUpdate({ typography: { textAlign: align } });
    };

    const menuPositionClass = (isMobile && index === 0)
        ? 'top-full mt-2' // Below block
        : '-top-9';       // Above block (default)

    const borderClass = isLocked
        ? (isSelected ? 'border-amber-500/50' : 'border-transparent')
        : (isSelected ? 'border-primary-200/50 dark:border-primary-800/50' : 'border-transparent hover:border-primary-200/50 dark:hover:border-primary-800/50');

    const bgClass = isLocked
        ? (isSelected ? 'bg-amber-50/30 dark:bg-amber-900/10 ring-1 ring-amber-500' : '')
        : (isSelected ? 'bg-primary-50/30 dark:bg-primary-900/10 ring-1 ring-primary-500' : '');

    return (
        <div
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            className={`group/block relative w-full min-h-[1.5rem] py-0.5 transition-all cursor-pointer border ${borderClass} ${bgClass} ${isSelected ? 'z-30' : 'z-10'}`}
        >
            {isSelected && type !== 'divider' && (
                <div
                    className={`absolute ${menuPositionClass} right-0 z-50 flex items-center gap-0.5 p-0.5 bg-surface dark:bg-secondary-800 text-text-main dark:text-white rounded-md shadow-lg border border-secondary-200 dark:border-secondary-700 animate-fade-scale-in pointer-events-auto overflow-x-auto max-w-[95vw]`}
                    onMouseDown={(e) => {
                        e.preventDefault(); // Prevent focus loss on textarea
                        e.stopPropagation(); // Stop bubbling to block selector
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {isLocked && <div className="px-2 text-[10px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1"><Icon name="lock-closed" className="w-3 h-3" /> System</div>}
                    {!isLocked && <div className="w-px h-3 bg-secondary-300 dark:bg-secondary-600 mx-0.5" />}

                    <button onClick={() => changeFontSize('down')} className="p-1 md:p-1.5 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded"><span className="text-xs font-bold">A-</span></button>
                    <button onClick={() => changeFontSize('up')} className="p-1 md:p-1.5 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded"><span className="text-sm font-bold">A+</span></button>
                    <div className="w-px h-3 bg-secondary-300 dark:bg-secondary-600 mx-0.5" />
                    <button onClick={() => toggleStyle('fontWeight', 'bold', 'normal')} className={`p-1 md:p-1.5 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded ${typography.fontWeight === 'bold' ? 'text-primary-500 bg-primary-50 dark:bg-primary-900/20' : ''}`}><span className="font-bold text-xs">B</span></button>
                    <button onClick={() => toggleStyle('fontStyle', 'italic', 'normal')} className={`p-1 md:p-1.5 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded ${typography.fontStyle === 'italic' ? 'text-primary-500 bg-primary-50 dark:bg-primary-900/20' : ''}`}><span className="italic text-xs">I</span></button>
                    <div className="w-px h-3 bg-secondary-300 dark:bg-secondary-600 mx-0.5" />
                    <button onClick={() => setAlign('left')} className={`p-1 md:p-1.5 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded ${typography.textAlign === 'left' ? 'text-primary-500' : ''}`}><Icon name="align-left" className="w-3.5 h-3.5 md:w-3 md:h-3" /></button>
                    <button onClick={() => setAlign('center')} className={`p-1 md:p-1.5 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded ${typography.textAlign === 'center' ? 'text-primary-500' : ''}`}><Icon name="align-center" className="w-3.5 h-3.5 md:w-3 md:h-3" /></button>

                    {onChangeType && !isLocked && (
                        <>
                            <div className="w-px h-3 bg-secondary-300 dark:bg-secondary-600 mx-0.5" />
                            <button onClick={onChangeType} className="p-1 md:p-1.5 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded" title="Switch Data/Label">
                                <Icon name="arrows-right-left" className="w-3.5 h-3.5 md:w-3 md:h-3" />
                            </button>
                        </>
                    )}

                    {!isLocked && (
                        <>
                            <div className="w-px h-3 bg-secondary-300 dark:bg-secondary-600 mx-0.5" />
                            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 md:p-1.5 hover:bg-error-50 dark:hover:bg-error-900/20 rounded text-error-500">
                                <Icon name="trash" className="w-3.5 h-3.5 md:w-3 md:h-3" />
                            </button>
                        </>
                    )}
                </div>
            )}
            {isSelected && type === 'divider' && !isLocked && (
                <div
                    className={`absolute ${menuPositionClass} right-0 z-50 flex items-center gap-0.5 p-0.5 bg-surface dark:bg-secondary-800 text-text-main dark:text-white rounded-md shadow-lg border border-secondary-200 dark:border-secondary-700 animate-fade-scale-in pointer-events-auto`}
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 hover:bg-error-50 dark:hover:bg-error-900/20 rounded text-error-500">
                        <Icon name="trash" className="w-3.5 h-3.5 md:w-3 md:h-3" />
                    </button>
                </div>
            )}

            {children}

            <div className="absolute inset-x-0 bottom-0 h-0 group-hover/block:border-b-2 group-hover/block:border-primary-500/30 pointer-events-none" />
        </div>
    );
};
