import * as React from 'react';
import { Table, Relation, StudyMode, RelationDesign, CardFaceDesign, TypographyDesign, Theme, TextBox } from '../../../types';
import Icon from '../../../components/ui/Icon';
import { useUIStore } from '../../../stores/useUIStore';
import { DEFAULT_TYPOGRAPHY, DARK_MODE_DEFAULT_TYPOGRAPHY } from '../designConstants';
import ExpandableText from '../../../components/ui/ExpandableText';
import { useDictationNoteStore } from '../../../stores/useDictationNoteStore';
import DictationIcon from '../../../components/ui/DictationIcon';

// A new component to render a rich preview of a relation card
const RelationPreviewCard: React.FC<{
    relation: Relation;
    table: Table;
    onOpenRelationSettings: (relation: Relation, initialTab: 'setup' | 'design') => void;
    setRelationToDelete: (relation: Relation | null) => void;
}> = ({ relation, table, onOpenRelationSettings, setRelationToDelete }) => {
    const { theme } = useUIStore();
    const { dictationNotes } = useDictationNoteStore();
    const [isFlipped, setIsFlipped] = React.useState(false);
    const defaultTypo = theme === 'dark' ? DARK_MODE_DEFAULT_TYPOGRAPHY : DEFAULT_TYPOGRAPHY;

    const getCardStyle = (design?: CardFaceDesign): React.CSSProperties => {
        if (!design) return { background: theme === 'dark' ? '#1f2937' : '#ffffff' };
        
        let background = design.backgroundValue;
        if (design.backgroundType === 'gradient' && design.backgroundValue.includes(',')) {
            const [color1, color2] = design.backgroundValue.split(',');
            background = `linear-gradient(${design.gradientAngle}deg, ${color1 || '#ffffff'}, ${color2 || '#e0e0e0'})`;
        } else if (design.backgroundType === 'image') {
            background = `url("${design.backgroundValue}") center/cover no-repeat, #f0f0f0`;
        }
        return { background };
    };

    const renderFace = (face: 'front' | 'back') => {
        const design = face === 'front' ? relation.design?.front : relation.design?.back;
        const cardStyle = getCardStyle(design);
        const hasDesign = !!relation.design;
        const columnIds = face === 'front' ? relation.questionColumnIds : relation.answerColumnIds;

        if (relation.dictationConfig) {
            const { dictationNoteId, startSegmentIndex, endSegmentIndex } = relation.dictationConfig;
            const note = dictationNotes.find(n => n.id === dictationNoteId);
            return (
                <div style={cardStyle} className="bg-surface dark:bg-secondary-800 border border-slate-200/80 dark:border-slate-700/50 rounded-xl flex flex-col h-full w-full">
                    <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 text-center">
                        <DictationIcon className="w-12 h-12 text-text-subtle mb-2"/>
                        <p className="font-bold text-base text-text-main dark:text-secondary-100">
                            {note?.title || 'Unknown Dictation'}
                        </p>
                        <p className="text-xs text-text-subtle mt-1">
                            Segments: {startSegmentIndex} - {endSegmentIndex}
                        </p>
                    </div>
                    <div className="relative z-10 p-3 bg-black/20 backdrop-blur-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-sm truncate" style={{ color: '#FFFFFF', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{relation.name}</h3>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white/90">{StudyMode.Dictation}</span>
                                </div>
                            </div>
                            <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); onOpenRelationSettings(relation, 'setup'); }} title="Edit Setup" className={`p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20`}><Icon name="cog" className="w-4 h-4"/></button>
                                <button onClick={(e) => { e.stopPropagation(); setRelationToDelete(relation); }} title="Delete Relation" className={`p-1.5 rounded-full text-red-400 hover:text-red-300 hover:bg-red-500/10`}><Icon name="trash" className="w-4 h-4"/></button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        const isDarkBg = React.useMemo(() => {
            if (!hasDesign || !design || design.backgroundType !== 'solid' || !design.backgroundValue.startsWith('#')) return false;
            try {
                const hex = design.backgroundValue.substring(1);
                const rgb = parseInt(hex, 16);
                const r = (rgb >> 16) & 0xff;
                const g = (rgb >> 8) & 0xff;
                const b = (rgb >> 0) & 0xff;
                const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                return luma < 128;
            } catch {
                return false;
            }
        }, [hasDesign, design]);
        
        const textColor = isDarkBg ? '#FFFFFF' : '#111827';
        const buttonColorClass = isDarkBg ? 'text-white/80 hover:text-white hover:bg-white/20' : 'text-slate-500 hover:text-primary-500 hover:bg-slate-200 dark:hover:bg-slate-700';
    
        return (
            <div style={cardStyle} className="border border-slate-200/80 dark:border-slate-700/50 rounded-xl flex flex-col h-full w-full">
                {hasDesign && <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>}
                <div className="relative z-10 flex-1 flex items-center justify-center p-4">
                    {design ? (
                        <div className={`flex items-center justify-center w-full ${design.layout === 'vertical' ? 'flex-col gap-1' : 'flex-row gap-2'}`}>
                            {(design.elementOrder || columnIds).map(id => {
                                const col = table.columns.find(c => c.id === id);
                                const txt = design.textBoxes?.find(t => t.id === id);
                                if (col) {
                                    const typography = design.typography[col.id] || defaultTypo;
                                    return <div key={id} className="p-1 w-full"><ExpandableText text={`[${col.name}]`} typography={typography} /></div>;
                                }
                                if (txt) {
                                    return <div key={id} className="p-1 w-full"><ExpandableText text={txt.text} typography={txt.typography} /></div>;
                                }
                                return null;
                            })}
                        </div>
                    ) : (
                        <div className="text-center">
                            <p className="font-bold text-lg" style={{ color: theme === 'dark' ? '#f1f5f9' : '#1e293b' }}>{relation.name}</p>
                            <p className="text-xs text-text-subtle">{face === 'front' ? 'Q' : 'A'}: {columnIds.map(id => table.columns.find(c => c.id === id)?.name).join(', ')}</p>
                        </div>
                    )}
                </div>
                
                <div className="relative z-10 p-3 bg-black/20 backdrop-blur-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-bold text-sm truncate" style={{ color: textColor, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{relation.name}</h3>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {(relation.compatibleModes || []).slice(0, 2).map(mode => (
                                    <span key={mode} className="px-1.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white/90">{mode}</span>
                                ))}
                            </div>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); onOpenRelationSettings(relation, 'design'); }} title="Customize Card Design" className={`p-1.5 rounded-full ${buttonColorClass}`}><Icon name="palette" className="w-4 h-4"/></button>
                            <button onClick={(e) => { e.stopPropagation(); onOpenRelationSettings(relation, 'setup'); }} title="Edit Setup" className={`p-1.5 rounded-full ${buttonColorClass}`}><Icon name="cog" className="w-4 h-4"/></button>
                            <button onClick={(e) => { e.stopPropagation(); setRelationToDelete(relation); }} title="Delete Relation" className={`p-1.5 rounded-full ${isDarkBg ? 'text-red-400 hover:text-red-300' : 'text-red-600 dark:text-red-500'} hover:bg-red-500/10`}><Icon name="trash" className="w-4 h-4"/></button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={`card-container h-64 group perspective-1000 ${isFlipped && !relation.dictationConfig ? 'flipped' : ''}`} onClick={() => !relation.dictationConfig && setIsFlipped(!isFlipped)}>
            <div className="card-flip relative w-full h-full transform-style-3d cursor-pointer">
                <div className="card-front absolute w-full h-full">
                    {renderFace('front')}
                </div>
                <div className="card-back absolute w-full h-full">
                    {renderFace('back')}
                </div>
            </div>
        </div>
    );
};


interface RelationsTabProps {
    table: Table;
    onOpenNewRelation: () => void;
    onOpenRelationSettings: (relation: Relation, initialTab: 'setup' | 'design') => void;
    setRelationToDelete: (relation: Relation | null) => void;
}

const RelationsTab: React.FC<RelationsTabProps> = ({ table, onOpenNewRelation, onOpenRelationSettings, setRelationToDelete }) => {
    const [modeFilter, setModeFilter] = React.useState<StudyMode | null>(null);
    const allModes = Object.values(StudyMode);
    
    if ((table.relations || []).length === 0) {
        return (
            <div className="text-center py-16 bg-surface dark:bg-secondary-800/50 border border-secondary-200/80 dark:border-secondary-700/50 rounded-lg">
                 <Icon name="unlink" className="w-16 h-16 text-secondary-300 dark:text-secondary-700 mx-auto mb-4" />
                 <h2 className="text-xl font-semibold text-secondary-700 dark:text-secondary-300">No Relations Yet</h2>
                 <p className="text-text-subtle mt-2 max-w-md mx-auto">Relations define how questions and answers are formed from your columns for different study modes.</p>
                 <button onClick={onOpenNewRelation} className="mt-6 bg-primary-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-primary-700">Create Your First Relation</button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex flex-wrap items-center gap-2">
                    <Icon name="filter" className="w-5 h-5 text-slate-400" />
                    <button onClick={() => setModeFilter(null)} className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${modeFilter === null ? 'bg-primary-100 text-primary-800 border-primary-300 dark:bg-primary-900/50 dark:text-primary-300 dark:border-primary-700' : 'bg-surface text-secondary-600 border-secondary-300 dark:bg-secondary-700 dark:text-secondary-300 dark:border-secondary-600'}`}>All</button>
                    {allModes.map(mode => (
                        <button key={mode} onClick={() => setModeFilter(mode)} className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${modeFilter === mode ? 'bg-primary-100 text-primary-800 border-primary-300 dark:bg-primary-900/50 dark:text-primary-300 dark:border-primary-700' : 'bg-surface text-secondary-600 border-secondary-300 dark:bg-secondary-700 dark:text-secondary-300 dark:border-secondary-600'}`}>{mode}</button>
                    ))}
                </div>
                 <button onClick={() => { onOpenRelationSettings(table.relations[0], 'design'); }} className="flex items-center gap-2 bg-surface dark:bg-secondary-700 text-secondary-700 dark:text-secondary-200 font-semibold px-4 py-2 rounded-md hover:bg-secondary-200 dark:hover:bg-secondary-600 border border-secondary-300 dark:border-secondary-600 transition-colors text-sm">
                    <Icon name="palette" className="w-5 h-5 text-primary-500" />
                    <span>Card Designer</span>
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(table.relations || []).filter(rel => modeFilter === null || (rel.compatibleModes || []).includes(modeFilter)).map(rel => (
                    <RelationPreviewCard
                        key={rel.id}
                        relation={rel}
                        table={table}
                        onOpenRelationSettings={onOpenRelationSettings}
                        setRelationToDelete={setRelationToDelete}
                    />
                ))}
            </div>
            <button onClick={onOpenNewRelation} className="w-full border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 text-center text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-primary-500 transition-colors">
                <Icon name="plus" className="w-6 h-6 mx-auto mb-2"/>
                <span className="font-semibold">Add New Relation</span>
            </button>
        </div>
    );
};

export default RelationsTab;