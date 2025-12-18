
import * as React from 'react';
import { createPortal } from 'react-dom';
import { Column, Table } from '../../../types';
import { getTagStyle } from '../../../utils/colorUtils';
import { useUserStore } from '../../../stores/useUserStore';
import { useTableStore } from '../../../stores/useTableStore';
import { useTableView } from '../contexts/TableViewContext';
import Icon from '../../../components/ui/Icon';
import { useAudioStore } from '../../../stores/useAudioStore';
import { detectLanguageFromText } from '../../../services/audioService';
import RowTagEditor from './RowTagEditor';
import Popover from '../../../components/ui/Popover';
import { resolveUrlTemplate } from '../../../utils/textUtils';
import { generateForPrompt } from '../../../services/geminiService';
import { useUIStore } from '../../../stores/useUIStore';

interface RichCellProps {
  value: string;
  column: Column;
  table: Table;
  rowId: string; // Add rowId for tracking
  isTextWrapEnabled: boolean;
  fontSizeClasses: string;
  editable?: boolean; // New prop to enable/disable inline edit
}

const isUrl = (text: string) => /^(https?:\/\/)/.test(text);

const getPosColor = (pos: string) => {
    const lowerPos = pos.toLowerCase();
    if (lowerPos.includes('noun')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
    if (lowerPos.includes('verb')) return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
    if (lowerPos.includes('adjective')) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
    if (lowerPos.includes('adverb')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300';
    return 'bg-secondary-200 text-secondary-800 dark:bg-secondary-700 dark:text-secondary-200';
};

export const RichCell: React.FC<RichCellProps> = ({ value, column, table, rowId, isTextWrapEnabled, fontSizeClasses, editable = false }) => {
    const { settings } = useUserStore();
    const { upsertRow } = useTableStore();
    const { playQueue, audioState } = useAudioStore();
    const { state, dispatch } = useTableView();
    const { setIsApiKeyModalOpen, showToast } = useUIStore();
    
    // --- State for Editing ---
    const isEditing = editable && state.editingCell?.rowId === rowId && state.editingCell?.columnId === column.id;
    const isSelected = editable && state.selectedCell?.rowId === rowId && state.selectedCell?.columnId === column.id;

    const [editValue, setEditValue] = React.useState(value);
    const [isZoomed, setIsZoomed] = React.useState(false);
    const [imageError, setImageError] = React.useState(false);
    const [isGeneratingCell, setIsGeneratingCell] = React.useState(false);
    
    const isImageColumn = table.imageConfig?.imageColumnId === column.id;
    const isTagColumn = /tags?/i.test(column.name);
    const isPosColumn = /part of speech/i.test(column.name);

    // Audio Playback
    const isAudioSource = table.audioConfig?.sourceColumnId === column.id || table.columnAudioConfig?.[column.id];
    const audioId = `cell-${table.id}-${column.id}-${value}`;
    const isPlaying = audioState.playingId === audioId;

    // AI Prompt Configuration
    const activePrompt = React.useMemo(() => 
        table.aiPrompts?.find(p => p.targetColumnId === column.id), 
    [table.aiPrompts, column.id]);

    // Effect to reset local value when prop changes or editing starts
    React.useEffect(() => {
        setEditValue(value);
    }, [value, isEditing]);
    
    // Reset image error when value changes
    React.useEffect(() => {
        setImageError(false);
    }, [value]);

    const handleCellClick = (e: React.MouseEvent) => {
        if (!editable) return;
        e.stopPropagation(); 
        
        // Single Click selects, but doesn't enter editing mode immediately
        dispatch({ type: 'SET_SELECTED_CELL', payload: { rowId, columnId: column.id } });
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        if (!editable) return;
        e.stopPropagation();
        // Enter edit mode
        dispatch({ type: 'SET_EDITING_CELL', payload: { rowId, columnId: column.id } });
    };
    
    const handleHandleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault(); // Prevent text selection
        // Start drag operation
        dispatch({ type: 'SET_IS_DRAGGING_HANDLE', payload: true });
        dispatch({ type: 'SET_DRAG_TARGET', payload: { rowId, columnId: column.id } });
    };
    
    // If dragging handle, track mouse movement over this cell to update target
    const handleMouseEnter = () => {
        if (state.isDraggingHandle && state.selectedCell) {
            // Only update if in same column to enforce vertical fill constraint for MVP
            if (state.selectedCell.columnId === column.id) {
                dispatch({ type: 'SET_DRAG_TARGET', payload: { rowId, columnId: column.id } });
            }
        }
    };

    const handleSave = async () => {
        if (editValue !== value) {
             const row = table.rows.find(r => r.id === rowId);
             if (row) {
                 const updatedRow = { ...row, cols: { ...row.cols, [column.id]: editValue } };
                 await upsertRow(table.id, updatedRow);
             }
        }
        dispatch({ type: 'SET_EDITING_CELL', payload: null });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            setEditValue(value); // Revert
            dispatch({ type: 'SET_EDITING_CELL', payload: null });
        }
    };
    
    const handleUpdateTags = async (newTagIds: string[]) => {
         const row = table.rows.find(r => r.id === rowId);
         if (row) {
             const updatedRow = { ...row, tagIds: newTagIds };
             await upsertRow(table.id, updatedRow);
         }
         // Tag editor doesn't close editing mode immediately to allow multiple selections
    };

    const handlePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        const lang = table.columnAudioConfig?.[column.id]?.language || 
                     (table.audioConfig?.sourceColumnId === column.id ? table.audioConfig.language : undefined) || 
                     detectLanguageFromText(value);
                     
        playQueue([{ text: value, lang }], audioId);
    };
    
    const handleAiGenerate = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isGeneratingCell || !activePrompt) return;
        
        setIsGeneratingCell(true);
        try {
            // Fetch fresh row data to ensure we have latest values
            const currentRow = table.rows.find(r => r.id === rowId);
            if (!currentRow) throw new Error("Row not found");

            const sourceValues = activePrompt.sourceColumnIds.reduce((acc, srcId) => {
                const colName = table.columns.find(c => c.id === srcId)?.name;
                if (colName) acc[colName] = currentRow.cols[srcId] || '';
                return acc;
            }, {} as Record<string, string>);

            const result = await generateForPrompt(activePrompt.prompt, sourceValues);
            
            const updatedRow = { 
                ...currentRow, 
                cols: { ...currentRow.cols, [column.id]: result } 
            };
            await upsertRow(table.id, updatedRow);
            
        } catch (error: any) {
            if (error.message === "API_KEY_MISSING") {
                setIsApiKeyModalOpen(true);
            } else {
                console.error(error);
                showToast("Generation failed", "error");
            }
        } finally {
            setIsGeneratingCell(false);
        }
    };

    const handleSearchImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        const row = table.rows.find(r => r.id === rowId);
        if (!row) return;

        let url = '';
        const template = table.columnUrlTemplates?.[column.id];

        if (template) {
             url = resolveUrlTemplate(template, row, table.columns);
        } else {
             // Fallback: Google Image search on first text column
             const firstTextCol = table.columns.find(c => c.id !== column.id); // Assuming simple text
             if (firstTextCol) {
                 const query = row.cols[firstTextCol.id] || '';
                 if (query) {
                     url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
                 }
             }
        }

        if (url) {
            window.open(url, '_blank');
        }
    };
    
    // --- Container Props for Cell ---
    const containerClasses = `
        w-full h-full relative group cursor-cell flex items-center
        ${isSelected ? 'ring-2 ring-primary-500 z-10 bg-primary-50/20' : 'hover:bg-secondary-100/50 dark:hover:bg-secondary-800'}
        ${isTextWrapEnabled ? '' : 'truncate'}
    `;

    // --- RENDERERS ---

    const aiButton = (activePrompt && !isEditing) ? (
        <button
            onClick={handleAiGenerate}
            disabled={isGeneratingCell}
            className={`
                absolute right-2 top-1/2 -translate-y-1/2 z-20
                p-1 rounded-full transition-all duration-200
                ${isGeneratingCell ? 'bg-transparent text-primary-500 cursor-wait' : ''}
                ${!value && !isGeneratingCell ? 'text-primary-400 opacity-100 hover:bg-primary-50 dark:hover:bg-primary-900/30' : ''}
                ${value && !isGeneratingCell ? 'text-text-subtle opacity-0 group-hover:opacity-100 hover:text-primary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700' : ''}
            `}
            title={`Generate with ${activePrompt.name}`}
        >
            {isGeneratingCell ? <Icon name="spinner" className="w-3.5 h-3.5 animate-spin" /> : <Icon name="sparkles" className="w-3.5 h-3.5" />}
        </button>
    ) : null;

    // 1. Tag Renderer (Special handling for Edit Mode)
    if (isTagColumn) {
        if (isEditing) {
            // Render Popover automatically triggered
            return (
                <div onClick={(e) => e.stopPropagation()} className="w-full">
                     <Popover
                        isOpen={true}
                        setIsOpen={() => dispatch({ type: 'SET_EDITING_CELL', payload: null })}
                        trigger={<div className="h-0" />} // Invisible trigger, open by default
                        contentClassName="w-72"
                    >
                        <RowTagEditor
                          tagIds={table.rows.find(r => r.id === rowId)?.tagIds || []}
                          onUpdateTagIds={handleUpdateTags}
                        />
                    </Popover>
                    {/* Render current tags underneath for context */}
                    <div className="flex flex-wrap gap-1 opacity-50">
                        {(table.rows.find(r => r.id === rowId)?.tagIds || []).map(id => {
                            // Quick lookup logic (simplified for inline)
                            const tag = settings.tagColors ? { name: '...', color: '' } : null; 
                            return <span key={id} className="inline-block w-4 h-4 bg-secondary-200 rounded-full animate-pulse" />;
                        })}
                         <span className="text-xs text-primary-500">Editing Tags...</span>
                    </div>
                </div>
            );
        }

        const row = table.rows.find(r => r.id === rowId);
        const tagNames = value.split(',').map(t => t.trim()).filter(Boolean);
        
        return (
            <div 
                className={`flex flex-wrap gap-1 min-h-[1.5rem] w-full h-full items-center p-1 ${isSelected ? 'ring-2 ring-primary-500 z-10 bg-primary-50/20' : ''}`}
                onClick={handleCellClick}
                onDoubleClick={handleDoubleClick}
                onMouseEnter={handleMouseEnter}
            >
                {tagNames.map(tag => (
                    <span
                        key={tag}
                        style={getTagStyle(tag, settings.tagColors || {})}
                        className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                    >
                        {tag}
                    </span>
                ))}
                {isSelected && !isEditing && (
                    <div 
                        className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-primary-600 border border-white cursor-crosshair z-20"
                        onMouseDown={handleHandleMouseDown}
                    />
                )}
            </div>
        );
    }
    
    // 2. Generic Editing Mode (Textarea for Text/Image/Pos)
    if (isEditing) {
        return (
            <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                autoFocus
                placeholder={isImageColumn ? "Paste image URL..." : ""}
                className={`w-full h-full bg-surface dark:bg-secondary-800 text-text-main dark:text-secondary-100 placeholder:text-text-subtle p-1 font-serif ${fontSizeClasses} resize-none outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset rounded-sm leading-normal block`}
            />
        );
    }

    // 3. Image Renderer
    if (isImageColumn) {
        return (
            <div 
                className={containerClasses + " py-1"} 
                onClick={handleCellClick} 
                onDoubleClick={handleDoubleClick}
                onMouseEnter={handleMouseEnter}
            >
                <div className="relative w-full h-full flex items-center justify-center group">
                    {!value ? (
                        // Empty State
                         <div className="flex gap-1">
                             <button
                                onClick={handleSearchImage}
                                className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary-100 dark:bg-secondary-800 text-text-subtle hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                                title="Search for image"
                             >
                                 <Icon name="search" className="w-4 h-4"/>
                             </button>
                             {editable && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        dispatch({ type: 'SET_EDITING_CELL', payload: { rowId, columnId: column.id } });
                                    }}
                                    className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary-100 dark:bg-secondary-800 text-text-subtle hover:text-primary-500 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors cursor-pointer"
                                    title="Paste Image URL"
                                >
                                    <Icon name="plus" className="w-4 h-4"/>
                                </button>
                             )}
                         </div>
                    ) : (
                        // Filled State
                        <>
                            {imageError ? (
                                <div className="w-full h-full flex items-center gap-2 text-error-500 group px-2" title="Failed to load image">
                                    <Icon name="error-circle" className="w-4 h-4 flex-shrink-0" />
                                    <span className="truncate text-xs underline decoration-dotted opacity-70 group-hover:opacity-100 transition-opacity">{value}</span>
                                </div>
                            ) : (
                                <div 
                                    className="relative w-full h-full flex items-center justify-center cursor-zoom-in"
                                    onClick={(e) => { e.stopPropagation(); setIsZoomed(true); }}
                                >
                                    <img
                                        src={value}
                                        alt="Column content"
                                        className="max-w-full max-h-[3rem] w-auto h-auto object-contain rounded-md shadow-sm border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-black/20"
                                        onError={() => setImageError(true)}
                                    />
                                    
                                    {/* Hover Actions Overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-[1px] rounded-md">
                                        <button
                                            onClick={handleSearchImage}
                                            className="p-1 rounded-full bg-surface/90 dark:bg-secondary-800/90 text-text-subtle hover:text-primary-500 transition-colors shadow-sm"
                                            title="Search again"
                                        >
                                            <Icon name="search" className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {isSelected && !isEditing && (
                    <div 
                        className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-primary-600 border border-white cursor-crosshair z-20"
                        onMouseDown={handleHandleMouseDown}
                    />
                )}

                {isZoomed && createPortal(
                    <div 
                        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn cursor-zoom-out"
                        onClick={() => setIsZoomed(false)}
                    >
                        <button
                            onClick={() => setIsZoomed(false)}
                            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-[101]"
                        >
                            <Icon name="x" className="w-8 h-8" />
                        </button>
                        <img
                            src={value}
                            alt="Zoomed preview"
                            className="max-w-full max-h-[90vh] object-contain shadow-2xl rounded-sm cursor-default"
                            onClick={(e) => e.stopPropagation()} 
                        />
                        <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none px-4">
                            <span className="inline-block px-3 py-1 bg-black/50 text-white/80 text-xs rounded-full backdrop-blur-md font-mono max-w-full truncate">
                                {value}
                            </span>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        );
    }
    
    // 4. Display Mode (Standard)
    
    // Part of Speech Renderer
    if (isPosColumn && value) {
        return (
            <div 
                className={containerClasses + " justify-center"} 
                onClick={handleCellClick} 
                onDoubleClick={handleDoubleClick}
                onMouseEnter={handleMouseEnter}
            >
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${getPosColor(value)}`}>
                    {value}
                </span>
                {aiButton}
                {isSelected && !isEditing && (
                    <div 
                        className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-primary-600 border border-white cursor-crosshair z-20"
                        onMouseDown={handleHandleMouseDown}
                    />
                )}
            </div>
        );
    }

    // URL Renderer
    if (isUrl(value)) {
        return (
            <div 
                className={containerClasses} 
                onClick={handleCellClick} 
                onDoubleClick={handleDoubleClick}
                onMouseEnter={handleMouseEnter}
            >
                <div className="flex items-center gap-2 w-full h-full -m-1 p-1 rounded">
                    <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()} 
                        className={`text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1.5 ${fontSizeClasses}`}
                    >
                        <span className="truncate">{value}</span>
                        <Icon name="arrowRight" className="w-3 h-3 flex-shrink-0 transform -rotate-45" />
                    </a>
                </div>
                {aiButton}
                 {isSelected && !isEditing && (
                    <div 
                        className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-primary-600 border border-white cursor-crosshair z-20"
                        onMouseDown={handleHandleMouseDown}
                    />
                )}
            </div>
        );
    }

    // Default Text Renderer
    return (
        <div 
            className={containerClasses}
            onClick={handleCellClick}
            onDoubleClick={handleDoubleClick}
            onMouseEnter={handleMouseEnter}
        >
            <div className={`flex items-center justify-between gap-2 w-full h-full -m-1 p-1 rounded pr-6`}>
                <div className={`font-serif ${fontSizeClasses} ${isTextWrapEnabled ? 'whitespace-normal break-words' : 'truncate'}`}>
                    {value}
                </div>
                {isAudioSource && value && (
                     <button
                        onClick={handlePlay}
                        className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full ${isPlaying ? 'opacity-100 text-primary-500' : 'text-text-subtle hover:text-primary-500 hover:bg-secondary-100 dark:hover:bg-secondary-800'}`}
                        title="Play"
                    >
                        <Icon name={isPlaying ? "volume-up" : "volume-down"} className="w-4 h-4" />
                    </button>
                )}
            </div>
            {aiButton}
            {isSelected && !isEditing && (
                <div 
                    className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-primary-600 border border-white cursor-crosshair z-20 shadow-sm"
                    onMouseDown={handleHandleMouseDown}
                    title="Drag to fill"
                />
            )}
        </div>
    );
};

export default RichCell;
