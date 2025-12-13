
import * as React from 'react';
import { Table, Column, VocabRow } from '../../../types';
import Modal from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import Icon from '../../../components/ui/Icon';
import { resolveUrlTemplate } from '../../../utils/textUtils';

interface LinkTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    table: Table;
    column: Column;
    onSave: (template: string) => void;
}

const PRESETS = [
    { name: 'Google Images', url: 'https://www.google.com/search?tbm=isch&q={Word}', icon: 'photo' },
    { name: 'Pinterest', url: 'https://www.pinterest.com/search/pins/?q={Word}', icon: 'photo' },
    { name: 'Unsplash', url: 'https://unsplash.com/s/photos/{Word}', icon: 'photo' },
    { name: 'Google Search', url: 'https://www.google.com/search?q={Word}', icon: 'search' },
];

const LinkTemplateModal: React.FC<LinkTemplateModalProps> = ({ isOpen, onClose, table, column, onSave }) => {
    const [template, setTemplate] = React.useState('');
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (isOpen) {
            setTemplate(table.columnUrlTemplates?.[column.id] || '');
        }
    }, [isOpen, table, column]);

    const handleInsertVariable = (colName: string) => {
        if (!inputRef.current) return;
        
        const start = inputRef.current.selectionStart || 0;
        const end = inputRef.current.selectionEnd || 0;
        const textToInsert = `{${colName}}`;
        const newTemplate = template.substring(0, start) + textToInsert + template.substring(end);
        
        setTemplate(newTemplate);
        
        // Restore focus and move cursor
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
                const newCursorPos = start + textToInsert.length;
                inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
        }, 0);
    };

    const handleApplyPreset = (url: string) => {
        // Try to replace {Word} with the first text column if "Word" doesn't exist
        let adaptedUrl = url;
        const hasWordCol = table.columns.some(c => c.name.toLowerCase() === 'word');
        if (!hasWordCol && table.columns.length > 0) {
            // Find the first text column that isn't the current image column
            const firstTextCol = table.columns.find(c => c.id !== column.id);
            if (firstTextCol) {
                adaptedUrl = url.replace('{Word}', `{${firstTextCol.name}}`);
            }
        }
        setTemplate(adaptedUrl);
    };

    const previewUrl = React.useMemo(() => {
        if (!template) return '';
        const sampleRow = table.rows[0];
        if (!sampleRow) return '(No data to preview)';
        return resolveUrlTemplate(template, sampleRow, table.columns);
    }, [template, table]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Link Settings for "${column.name}"`}>
            <div className="p-6 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">URL Template</label>
                    <Input
                        ref={inputRef}
                        value={template}
                        onChange={(e) => setTemplate(e.target.value)}
                        placeholder="https://example.com/search?q={Word}"
                        className="font-mono text-sm"
                    />
                    <p className="text-xs text-text-subtle mt-2">
                        Enter a URL and insert variables from your table columns.
                    </p>
                </div>

                <div>
                    <h4 className="text-xs font-bold text-text-subtle uppercase mb-2">Insert Column</h4>
                    <div className="flex flex-wrap gap-2">
                        {table.columns.filter(c => c.id !== column.id).map(col => (
                            <button
                                key={col.id}
                                onClick={() => handleInsertVariable(col.name)}
                                className="px-2 py-1 bg-secondary-100 dark:bg-secondary-700 hover:bg-secondary-200 dark:hover:bg-secondary-600 rounded text-xs font-medium text-text-main dark:text-secondary-100 transition-colors border border-secondary-200 dark:border-secondary-600"
                            >
                                {col.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <h4 className="text-xs font-bold text-text-subtle uppercase mb-2">Quick Presets</h4>
                    <div className="grid grid-cols-2 gap-2">
                        {PRESETS.map((preset) => (
                            <button
                                key={preset.name}
                                onClick={() => handleApplyPreset(preset.url)}
                                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10 rounded-lg text-sm text-text-main dark:text-secondary-100 transition-all text-left"
                            >
                                <Icon name={preset.icon} className="w-4 h-4 text-primary-500" />
                                {preset.name}
                            </button>
                        ))}
                    </div>
                </div>

                {previewUrl && (
                    <div className="bg-secondary-50 dark:bg-secondary-900/50 p-3 rounded-lg border border-secondary-200 dark:border-secondary-700">
                        <h4 className="text-xs font-bold text-text-subtle uppercase mb-1">Live Preview (Row 1)</h4>
                        <div className="text-xs font-mono text-primary-600 dark:text-primary-400 break-all">
                            {previewUrl}
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-secondary-200 dark:border-secondary-700">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => { onSave(template); onClose(); }}>Save Config</Button>
                </div>
            </div>
        </Modal>
    );
};

export default LinkTemplateModal;
