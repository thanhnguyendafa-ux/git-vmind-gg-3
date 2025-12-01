import * as React from 'react';
import { Column, Table, RelationAudioConfig } from '../../../types';
import Icon from '../../../components/ui/Icon';
import Modal from '../../../components/ui/Modal';

interface ColumnEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: Table;
  onSave: (newColumns: Column[], newAudioConfig: Record<string, { language: string }>, newImageConfig: Table['imageConfig']) => void;
}

const LANGUAGES = [
    { code: 'en-US', label: 'English (US)' },
    { code: 'en-GB', label: 'English (UK)' },
    { code: 'ja-JP', label: 'Japanese' },
    { code: 'ko-KR', label: 'Korean' },
    { code: 'zh-CN', label: 'Chinese (Simplified)' },
    { code: 'es-ES', label: 'Spanish' },
    { code: 'fr-FR', label: 'French' },
    { code: 'de-DE', label: 'German' },
    { code: 'it-IT', label: 'Italian' },
    { code: 'vi-VN', label: 'Vietnamese' },
    { code: 'ru-RU', label: 'Russian' },
    { code: 'pt-BR', label: 'Portuguese (Brazil)' },
];

type ColumnType = 'text' | 'audio' | 'image';

const ColumnEditorModal: React.FC<ColumnEditorModalProps> = ({ isOpen, onClose, table, onSave }) => {
  const [editableColumns, setEditableColumns] = React.useState<Column[]>([]);
  // Local state to track configs before saving
  const [localAudioConfig, setLocalAudioConfig] = React.useState<Record<string, { language: string }>>({});
  const [localImageColumnId, setLocalImageColumnId] = React.useState<string | null>(null);
  
  const [expandedColId, setExpandedColId] = React.useState<string | null>(null);

  const dragItem = React.useRef<number | null>(null);
  const dragOverItem = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setEditableColumns(JSON.parse(JSON.stringify(table.columns)));
      setLocalAudioConfig(JSON.parse(JSON.stringify(table.columnAudioConfig || {})));
      setLocalImageColumnId(table.imageConfig?.imageColumnId || null);
      setExpandedColId(null);
    }
  }, [isOpen, table]);

  const handleUpdateName = (id: string, name: string) => {
    setEditableColumns(prev => prev.map(c => c.id === id ? { ...c, name } : c));
  };

  const handleAddColumn = () => {
    const newCol: Column = { id: crypto.randomUUID(), name: 'New Column' };
    setEditableColumns(prev => [...prev, newCol]);
    // Automatically expand the new column for setup
    setExpandedColId(newCol.id);
  };

  const handleDeleteColumn = (id: string) => {
    setEditableColumns(prev => prev.filter(c => c.id !== id));
    // Cleanup configs for deleted column
    const newAudio = { ...localAudioConfig };
    delete newAudio[id];
    setLocalAudioConfig(newAudio);
    if (localImageColumnId === id) setLocalImageColumnId(null);
  };

  const handleDragSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const newColumns = [...editableColumns];
    const dragItemContent = newColumns.splice(dragItem.current, 1)[0];
    newColumns.splice(dragOverItem.current, 0, dragItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setEditableColumns(newColumns);
  };
  
  const handleTypeChange = (colId: string, type: ColumnType) => {
      if (type === 'text') {
          // Clear both
          const newAudio = { ...localAudioConfig };
          delete newAudio[colId];
          setLocalAudioConfig(newAudio);
          if (localImageColumnId === colId) setLocalImageColumnId(null);
      } else if (type === 'audio') {
          // Set audio default, clear image
          setLocalAudioConfig(prev => ({ ...prev, [colId]: { language: 'en-US' } })); // Default to US English
          if (localImageColumnId === colId) setLocalImageColumnId(null);
      } else if (type === 'image') {
          // Set image, clear audio
          const newAudio = { ...localAudioConfig };
          delete newAudio[colId];
          setLocalAudioConfig(newAudio);
          setLocalImageColumnId(colId);
      }
  };

  const handleLanguageChange = (colId: string, language: string) => {
      setLocalAudioConfig(prev => ({ ...prev, [colId]: { language } }));
  };

  const handleSave = () => {
      // Construct the final image config object. 
      // If we have a localImageColumnId, preserve the existing sourceColumnId if it exists on the table, or leave it undefined for now.
      let finalImageConfig: Table['imageConfig'] = null;
      if (localImageColumnId) {
          finalImageConfig = {
              imageColumnId: localImageColumnId,
              sourceColumnId: table.imageConfig?.sourceColumnId || '' // Preserve or default
          };
      }

      onSave(editableColumns, localAudioConfig, finalImageConfig);
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Columns">
      <div className="p-6 space-y-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
            Define your table structure. Assign specific types like <strong>Audio</strong> or <strong>Image</strong> to enable special features.
        </p>
        
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {editableColumns.map((col, index) => {
            const isAudio = !!localAudioConfig[col.id];
            const isImage = localImageColumnId === col.id;
            const currentType: ColumnType = isImage ? 'image' : (isAudio ? 'audio' : 'text');

            return (
            <div key={col.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden transition-all shadow-sm">
                {/* Header Row */}
                <div 
                  className="flex items-center gap-2 p-2"
                  draggable
                  onDragStart={() => dragItem.current = index}
                  onDragEnter={() => dragOverItem.current = index}
                  onDragEnd={handleDragSort}
                  onDragOver={(e) => e.preventDefault()}
                >
                    <div className="cursor-move text-slate-400 p-1 hover:text-slate-600 dark:hover:text-slate-300">
                        <Icon name="drag-handle" className="w-5 h-5"/>
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                        <input
                            type="text"
                            value={col.name}
                            onChange={e => handleUpdateName(col.id, e.target.value)}
                            className="flex-1 bg-transparent border-b border-transparent focus:border-primary-500 hover:border-slate-300 dark:hover:border-slate-600 px-2 py-1 text-sm text-slate-800 dark:text-white focus:outline-none font-medium transition-colors"
                            placeholder="Column Name"
                        />
                        {/* Visual Badges */}
                        {isAudio && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 uppercase tracking-wide">Audio</span>}
                        {isImage && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 uppercase tracking-wide">Image</span>}
                    </div>
                    
                    <button 
                        onClick={() => setExpandedColId(expandedColId === col.id ? null : col.id)} 
                        className={`p-2 rounded-full transition-colors ${expandedColId === col.id ? 'bg-slate-100 dark:bg-slate-700 text-primary-600' : 'text-slate-400 hover:text-primary-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                        title="Column Settings"
                    >
                        <Icon name="sliders" className="w-4 h-4"/>
                    </button>
                    <button onClick={() => handleDeleteColumn(col.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors" title="Delete Column">
                        <Icon name="trash" className="w-4 h-4"/>
                    </button>
                </div>

                {/* Expanded Settings Panel */}
                {expandedColId === col.id && (
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 border-t border-slate-200 dark:border-slate-700 animate-fadeIn">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase">Data Type</label>
                                <div className="flex bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 p-1">
                                    <button 
                                        onClick={() => handleTypeChange(col.id, 'text')}
                                        className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-all ${currentType === 'text' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                                    >
                                        Text
                                    </button>
                                    <button 
                                        onClick={() => handleTypeChange(col.id, 'audio')}
                                        className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-all flex items-center justify-center gap-1 ${currentType === 'audio' ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-200 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                                    >
                                        <Icon name="volume-up" className="w-3 h-3"/> Audio
                                    </button>
                                    <button 
                                        onClick={() => handleTypeChange(col.id, 'image')}
                                        className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-all flex items-center justify-center gap-1 ${currentType === 'image' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-200 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                                    >
                                        <Icon name="photo" className="w-3 h-3"/> Image
                                    </button>
                                </div>
                            </div>

                            {/* Conditional Inputs */}
                            {currentType === 'audio' && (
                                <div className="flex-1 animate-fadeIn">
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase">Language</label>
                                    <select 
                                        value={localAudioConfig[col.id]?.language || 'en-US'} 
                                        onChange={(e) => handleLanguageChange(col.id, e.target.value)}
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
                                    >
                                        {LANGUAGES.map(lang => (
                                            <option key={lang.code} value={lang.code}>{lang.label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                             {currentType === 'image' && (
                                <div className="flex-1 animate-fadeIn flex items-center text-xs text-slate-500 dark:text-slate-400 italic bg-purple-50 dark:bg-purple-900/10 p-2 rounded border border-purple-100 dark:border-purple-900/30">
                                    <Icon name="info" className="w-4 h-4 mr-2 text-purple-400"/>
                                    Content in this column will be rendered as images. Paste URLs directly.
                                </div>
                            )}
                            {currentType === 'text' && (
                                <div className="flex-1 hidden sm:block" /> // Spacer
                            )}
                        </div>
                    </div>
                )}
            </div>
          )})}
        </div>
        
        <button onClick={handleAddColumn} className="w-full py-2 text-sm font-semibold text-emerald-600 dark:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-dashed border-emerald-300 dark:border-emerald-700 rounded-md flex items-center justify-center gap-2 transition-colors">
          <Icon name="plus" className="w-4 h-4"/> Add New Column
        </button>
      </div>
      <footer className="p-4 bg-slate-100 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
        <button onClick={onClose} className="bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold px-4 py-2 rounded-md border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors text-sm">Cancel</button>
        <button onClick={handleSave} className="bg-emerald-600 text-white font-semibold px-6 py-2 rounded-md hover:bg-emerald-700 transition-colors text-sm flex items-center gap-2 shadow-sm">
            <Icon name="check" className="w-4 h-4"/>
            Save Changes
        </button>
      </footer>
    </Modal>
  );
};

export default ColumnEditorModal;