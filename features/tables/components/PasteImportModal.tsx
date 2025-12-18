
import * as React from 'react';
import { Table, VocabRow, FlashcardStatus, Column } from '../../../types';
import Modal from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { useTableStore } from '../../../stores/useTableStore';
import { useUIStore } from '../../../stores/useUIStore';
import { stripHtml } from '../../../utils/clipboardUtils';
import ExpandableText from '../../../components/ui/ExpandableText';

interface PasteImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (rows: VocabRow[]) => void;
  pastedData: { rows: string[][] };
  table: Table;
}

const PasteImportModal: React.FC<PasteImportModalProps> = ({ isOpen, onClose, onConfirm, pastedData, table }) => {
  const [ignoreFirstLine, setIgnoreFirstLine] = React.useState(true);
  const [useHeadersAsColumns, setUseHeadersAsColumns] = React.useState(false);
  const [preserveFormatting, setPreserveFormatting] = React.useState(true);
  const [columnMap, setColumnMap] = React.useState<Record<number, string | 'ignore'>>({});
  
  const { updateTable } = useTableStore();
  const { showToast } = useUIStore();

  const hasExistingData = table.rows.length > 0;

  // Detect if pasted data actually contains HTML to show/hide the toggle
  const hasRichText = React.useMemo(() => {
      return pastedData.rows.some(row => row.some(cell => /<[a-z][\s\S]*>/i.test(cell)));
  }, [pastedData]);

  React.useEffect(() => {
    if (isOpen) {
      // Auto-map columns based on header names
      const initialMap: Record<number, string | 'ignore'> = {};
      // For auto-mapping, we should strip HTML from headers first to match names
      const rawHeaders = pastedData.rows[0] || [];
      const dataHeaders = rawHeaders.map(stripHtml); 
      
      dataHeaders.forEach((header, index) => {
        const foundColumn = table.columns.find(c => c.name.toLowerCase() === header.toLowerCase().trim());
        initialMap[index] = foundColumn ? foundColumn.id : 'ignore';
      });
      setColumnMap(initialMap);
      // If no headers match, default to mapping first N columns sequentially
      if (Object.values(initialMap).every(v => v === 'ignore')) {
        const sequentialMap: Record<number, string | 'ignore'> = {};
        dataHeaders.forEach((_, index) => {
            if (index < table.columns.length) {
                sequentialMap[index] = table.columns[index].id;
            } else {
                sequentialMap[index] = 'ignore';
            }
        });
        setColumnMap(sequentialMap);
      }

    }
  }, [isOpen, pastedData, table.columns]);

  const handleMapChange = (pastedColumnIndex: number, tableColumnId: string) => {
    setColumnMap(prev => ({ ...prev, [pastedColumnIndex]: tableColumnId }));
  };
  
  const handleHeaderOptionToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
      const checked = e.target.checked;
      setUseHeadersAsColumns(checked);
      if (checked) {
          // If we use headers, we MUST ignore the first line as data
          setIgnoreFirstLine(true);
          
          // Auto-map sequentially for preview purposes
          const sequentialMap: Record<number, string | 'ignore'> = {};
          pastedData.rows[0].forEach((_, index) => {
               // We will map index 0 to col 0, index 1 to col 1, etc.
               // Even if the table has fewer columns now, we will create them on save.
               // For preview visualization, we map to existing or placeholder.
               if (index < table.columns.length) {
                   sequentialMap[index] = table.columns[index].id;
               } else {
                   // This will be a new column, we can't map to an ID yet.
                   // But for the UI dropdown, we might leave it as ignore or visual placeholder?
                   // Ideally we disable the dropdowns if this mode is on.
                   sequentialMap[index] = 'new_column_placeholder'; 
               }
          });
          setColumnMap(sequentialMap);
      }
  };

  const handleConfirmImport = async () => {
    const dataToImport = (ignoreFirstLine || useHeadersAsColumns) ? pastedData.rows.slice(1) : pastedData.rows;
    
    // Process formatting option: If preserve is off, strip HTML
    const processedData = preserveFormatting 
        ? dataToImport 
        : dataToImport.map(row => row.map(stripHtml));

    // --- Logic for "Use first row as Column names" ---
    if (useHeadersAsColumns) {
        const headers = pastedData.rows[0].map(stripHtml); // Always strip headers
        const newColumns: Column[] = [...table.columns];
        
        // 1. Rename existing columns or Create new ones
        headers.forEach((headerName, index) => {
            if (index < newColumns.length) {
                // Rename existing
                newColumns[index] = { ...newColumns[index], name: headerName.trim() || `Column ${index + 1}` };
            } else {
                // Create new
                newColumns.push({ id: crypto.randomUUID(), name: headerName.trim() || `Column ${index + 1}` });
            }
        });

        // 2. Update Table Structure
        await updateTable({ ...table, columns: newColumns });
        showToast("Table columns updated from clipboard.", "success");
        
        // 3. Remap data to NEW column structure
        const newVocabRows: VocabRow[] = processedData.map(rowArray => {
            const newRow: VocabRow = {
                id: crypto.randomUUID(),
                cols: {},
                stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null },
            };
            
            rowArray.forEach((cellValue, index) => {
                if (index < newColumns.length) {
                    newRow.cols[newColumns[index].id] = cellValue.trim();
                }
            });
            return newRow;
        }).filter(row => Object.keys(row.cols).length > 0);

        onConfirm(newVocabRows);
        return;
    }

    // --- Standard Import Logic ---
    const newVocabRows: VocabRow[] = processedData.map(rowArray => {
      const newRow: VocabRow = {
        id: crypto.randomUUID(),
        cols: {},
        stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null },
      };
      
      rowArray.forEach((cellValue, index) => {
        const mappedColumnId = columnMap[index];
        if (mappedColumnId && mappedColumnId !== 'ignore' && mappedColumnId !== 'new_column_placeholder') {
          newRow.cols[mappedColumnId] = cellValue.trim();
        }
      });
      return newRow;
    }).filter(row => Object.keys(row.cols).length > 0); // Filter out empty rows
    
    onConfirm(newVocabRows);
  };

  const headers = pastedData.rows[0] || [];
  const previewRows = ((ignoreFirstLine || useHeadersAsColumns) ? pastedData.rows.slice(1, 6) : pastedData.rows.slice(0, 5));
  
  // If creating new columns, we consider it ready if we have headers
  const isReady = useHeadersAsColumns 
    ? headers.length > 0 
    : Object.values(columnMap).some(v => v !== 'ignore');

  // Helper for preview text
  const renderCellPreview = (text: string) => {
      if (preserveFormatting) {
          // Use ExpandableText but simplify props since we just want the renderer
          return <ExpandableText text={text} typography={{ fontSize: '0.875rem', color: 'inherit', fontFamily: 'inherit' }} />;
      }
      return stripHtml(text);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import from Clipboard" containerClassName="max-w-4xl w-full">
      <div className="p-6">
        <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-center gap-4 flex-wrap">
                 <div className="flex items-center gap-2">
                    <input 
                        type="checkbox" 
                        id="ignore-first-line" 
                        checked={ignoreFirstLine || useHeadersAsColumns} 
                        onChange={e => !useHeadersAsColumns && setIgnoreFirstLine(e.target.checked)} 
                        disabled={useHeadersAsColumns}
                        className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor="ignore-first-line" className={`text-sm font-medium ${useHeadersAsColumns ? 'opacity-50' : ''}`}>
                        Ignore first line (headers)
                    </label>
                </div>
                
                {hasRichText && (
                    <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded border border-purple-100 dark:border-purple-800">
                        <input 
                            type="checkbox" 
                            id="preserve-formatting" 
                            checked={preserveFormatting} 
                            onChange={e => setPreserveFormatting(e.target.checked)} 
                            className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                        />
                        <label htmlFor="preserve-formatting" className="text-sm font-medium text-purple-800 dark:text-purple-200">
                            Preserve Formatting (Colors, Bold)
                        </label>
                    </div>
                )}
            </div>
            
            <div className="flex items-center gap-2">
                <input 
                    type="checkbox" 
                    id="use-headers" 
                    checked={useHeadersAsColumns} 
                    onChange={handleHeaderOptionToggle} 
                    disabled={hasExistingData}
                    className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 disabled:opacity-50"
                />
                <div className="flex flex-col">
                    <label htmlFor="use-headers" className={`text-sm font-medium ${hasExistingData ? 'text-text-subtle' : ''}`}>
                        Use first row as Column names
                    </label>
                    {hasExistingData && (
                        <span className="text-xs text-error-500">
                            Disabled: Table already contains data. Column names are locked.
                        </span>
                    )}
                </div>
            </div>
        </div>

        <p className="text-sm text-text-subtle mb-2">
            {useHeadersAsColumns 
                ? "Previewing new column structure based on first row:"
                : "Map pasted columns to your table columns. Showing a preview of the first 5 rows."
            }
        </p>

        <div className="overflow-x-auto border border-secondary-200 dark:border-secondary-700 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-secondary-50 dark:bg-secondary-900/50">
              <tr>
                {headers.map((headerText, index) => (
                  <th key={index} className="p-2 border-b border-secondary-200 dark:border-secondary-700 min-w-[120px]">
                    {useHeadersAsColumns ? (
                         <div className="text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-2 py-1 rounded border border-primary-200 dark:border-primary-800 truncate">
                             {stripHtml(headerText) || `Column ${index + 1}`}
                         </div>
                    ) : (
                        <select
                          value={columnMap[index] || 'ignore'}
                          onChange={e => handleMapChange(index, e.target.value)}
                          className="w-full bg-surface dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded-md px-2 py-1 text-xs"
                        >
                          <option value="ignore">Ignore Column</option>
                          {table.columns.map(col => (
                            <option key={col.id} value={col.id}>{col.name}</option>
                          ))}
                        </select>
                    )}
                  </th>
                ))}
              </tr>
              {(ignoreFirstLine || useHeadersAsColumns) && (
                <tr className="text-left bg-secondary-100/50 dark:bg-secondary-800/50">
                    {headers.map((header, index) => (
                        <th key={index} className="p-2 font-semibold text-text-subtle text-xs truncate border-b border-secondary-200 dark:border-secondary-700 max-w-[150px]">
                            <span className="opacity-50 mr-1 block text-[10px] uppercase">Raw Header:</span>
                            {renderCellPreview(header)}
                        </th>
                    ))}
                </tr>
              )}
            </thead>
            <tbody>
              {previewRows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-secondary-200 dark:border-secondary-700 last:border-b-0">
                  {headers.map((_, colIndex) => (
                    <td key={colIndex} className="p-2 text-text-subtle max-w-xs break-words">
                        {renderCellPreview(row[colIndex] || '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="p-4 bg-secondary-50 dark:bg-secondary-800/50 border-t border-secondary-200 dark:border-secondary-700 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleConfirmImport} disabled={!isReady} className="bg-primary-500 hover:bg-primary-600 text-white">
            {useHeadersAsColumns ? "Update Columns & Import" : "Import Rows"}
        </Button>
      </div>
    </Modal>
  );
};

export default PasteImportModal;
