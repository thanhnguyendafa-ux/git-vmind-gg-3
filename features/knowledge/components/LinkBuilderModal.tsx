import React, { useState, useMemo } from 'react';
import { Table, VocabRow, StudyMode, Column } from '../../../types';
import Modal from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import Icon from '../../../components/ui/Icon';
import { useTableStore } from '../../../stores/useTableStore';
import { useContextLinkStore } from '../../../stores/useContextLinkStore';
import { useDebounce } from '../../../hooks/useDebounce';

interface LinkBuilderModalProps {
    sourceRow: VocabRow;
    sourceTable: Table;
    isOpen: boolean;
    onClose: () => void;
}

type LinkType = 'parent' | 'child' | 'peer';

interface SearchResult {
    tableId: string;
    tableName: string;
    rowId: string;
    preview: string;
}

const LinkBuilderModal: React.FC<LinkBuilderModalProps> = ({ sourceRow, sourceTable, isOpen, onClose }) => {
    const { tables } = useTableStore();
    const { addRelationship } = useContextLinkStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState<LinkType>('peer');
    const [description, setDescription] = useState('');
    const [selectedTarget, setSelectedTarget] = useState<SearchResult | null>(null);

    const debouncedQuery = useDebounce(searchQuery, 300);

    // --- Search Logic ---
    const searchResults: SearchResult[] = useMemo(() => {
        if (!debouncedQuery || debouncedQuery.length < 2) return [];

        const results: SearchResult[] = [];
        const lowerQuery = debouncedQuery.toLowerCase();

        tables.forEach(table => {
            // Optimization: Find the "Main" column (usually the first text column) for display
            const mainColId = table.columns[0]?.id;

            table.rows.forEach(row => {
                if (row.id === sourceRow.id) return; // Don't link to self

                // Check all columns
                let matches = false;
                let matchText = '';

                for (const col of table.columns) {
                    const cellText = row.cols[col.id] || '';
                    if (cellText.toLowerCase().includes(lowerQuery)) {
                        matches = true;
                        matchText = cellText; // Store the matching text
                        break;
                    }
                }

                if (matches) {
                    const mainText = row.cols[mainColId] || '';
                    results.push({
                        tableId: table.id,
                        tableName: table.name,
                        rowId: row.id,
                        preview: `${mainText} ${mainText !== matchText ? `(${matchText})` : ''}`
                    });
                }
            });
        });

        return results.slice(0, 20); // Limit results
    }, [debouncedQuery, tables, sourceRow.id]);

    const handleCreateLink = async () => {
        if (!selectedTarget) return;

        await addRelationship(sourceRow.id, selectedTarget.rowId, selectedType, description);

        // Reset and close
        setSearchQuery('');
        setSelectedTarget(null);
        setDescription('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Connect Knowledge" containerClassName="max-w-xl w-full">
            <div className="p-6 space-y-6">

                {/* 1. Header context */}
                <div className="flex items-center gap-3 p-3 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
                    <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-full text-primary-600">
                        <Icon name="link" className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-text-subtle uppercase font-semibold">Connecting from</p>
                        <p className="font-bold text-lg text-text-main">{sourceRow.cols[sourceTable.columns[0]?.id] || 'Selected Item'}</p>
                    </div>
                </div>

                {/* 2. Relationship Type Selector */}
                <div>
                    <label className="block text-sm font-medium text-text-subtle mb-2">Relationship Type</label>
                    <div className="grid grid-cols-3 gap-3">
                        {(['parent', 'peer', 'child'] as LinkType[]).map(type => (
                            <button
                                key={type}
                                onClick={() => setSelectedType(type)}
                                className={`
                                    flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all
                                    ${selectedType === type
                                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                                        : 'border-secondary-200 dark:border-secondary-700 hover:border-primary-300 hover:bg-secondary-50 dark:hover:bg-secondary-800'}
                                `}
                            >
                                <Icon name={
                                    type === 'parent' ? 'arrow-up' :
                                        type === 'child' ? 'arrow-down' : 'arrows-left-right'
                                } className="w-6 h-6" />
                                <span className="capitalize font-medium text-sm">{type}</span>
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-text-subtle mt-2 ml-1">
                        {selectedType === 'parent' && "The selected target is the PARENT (Category/Topic) of this item."}
                        {selectedType === 'child' && "The selected target is a CHILD (Sub-concept) of this item."}
                        {selectedType === 'peer' && "Items are related equally (Synonyms, Associated Words)."}
                    </p>
                </div>

                {/* 3. Search Target */}
                <div className="relative">
                    <label className="block text-sm font-medium text-text-subtle mb-2">Find Target Concept</label>
                    {selectedTarget ? (
                        <div className="flex items-center justify-between p-3 border border-primary-500 bg-primary-50 dark:bg-primary-900/10 rounded-lg">
                            <div>
                                <p className="font-semibold text-text-main">{selectedTarget.preview}</p>
                                <p className="text-xs text-text-subtle">in {selectedTarget.tableName}</p>
                            </div>
                            <button onClick={() => setSelectedTarget(null)} className="p-1 hover:bg-black/10 rounded-full">
                                <Icon name="x" className="w-4 h-4 text-text-subtle" />
                            </button>
                        </div>
                    ) : (
                        <div>
                            <Input
                                placeholder="Search definitions, words, examples..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                icon="search"
                            />
                            {/* Search Dropdown */}
                            {debouncedQuery && !selectedTarget && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-surface dark:bg-surface-900 border border-secondary-200 dark:border-secondary-700 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
                                    {searchResults.length === 0 ? (
                                        <div className="p-4 text-center text-text-subtle text-sm">No matches found</div>
                                    ) : (
                                        searchResults.map(result => (
                                            <button
                                                key={`${result.tableId}-${result.rowId}`}
                                                className="w-full text-left p-3 hover:bg-secondary-100 dark:hover:bg-secondary-700 border-b border-secondary-100 dark:border-secondary-800 last:border-0"
                                                onClick={() => setSelectedTarget(result)}
                                            >
                                                <div className="font-medium text-text-main text-sm truncate">{result.preview}</div>
                                                <div className="text-xs text-text-subtle opacity-75">{result.tableName}</div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 4. Description (Optional) */}
                <div>
                    <label className="block text-sm font-medium text-text-subtle mb-2">Note (Optional)</label>
                    <Input
                        placeholder="Why are these connected?"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 pt-4 border-t border-secondary-200 dark:border-secondary-700">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button
                        disabled={!selectedTarget}
                        onClick={handleCreateLink}
                    >
                        Create Link
                    </Button>
                </div>

            </div>
        </Modal>
    );
};

export default LinkBuilderModal;
