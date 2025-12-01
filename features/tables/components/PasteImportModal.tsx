import * as React from 'react';
import { Table, VocabRow, FlashcardStatus } from '../../../types';
import Modal from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';

interface PasteImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (rows: VocabRow[]) => void;
  pastedData: { rows: string[][] };
  table: Table;
}

const PasteImportModal: React.FC<PasteImportModalProps> = ({ isOpen, onClose, onConfirm, pastedData, table }) => {
  const [ignoreFirstLine, setIgnoreFirstLine] = React.useState(true);
  const [columnMap, setColumnMap] = React.useState<Record<number, string | 'ignore'>>({});

  React.useEffect(() => {
    if (isOpen) {
      // Auto-map columns based on header names
      const initialMap: Record<number, string | 'ignore'> = {};
      const dataHeaders = pastedData.rows[0]; // Use first row as potential headers
      
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

  const handleConfirmImport = () => {
    const dataToImport = ignoreFirstLine ? pastedData.rows.slice(1) : pastedData.rows;
    
    const newVocabRows: VocabRow[] = dataToImport.map(rowArray => {
      const newRow: VocabRow = {
        id: crypto.randomUUID(),
        cols: {},
        stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null },
      };
      
      rowArray.forEach((cellValue, index) => {
        const mappedColumnId = columnMap[index];
        if (mappedColumnId && mappedColumnId !== 'ignore') {
          newRow.cols[mappedColumnId] = cellValue.trim();
        }
      });
      return newRow;
    }).filter(row => Object.keys(row.cols).length > 0); // Filter out empty rows
    
    onConfirm(newVocabRows);
  };

  const headers = pastedData.rows[0] || [];
  const previewRows = (ignoreFirstLine ? pastedData.rows.slice(1, 6) : pastedData.rows.slice(0, 5));
  const isReady = Object.values(columnMap).some(v => v !== 'ignore');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import from Clipboard" containerClassName="max-w-4xl w-full">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <input type="checkbox" id="ignore-first-line" checked={ignoreFirstLine} onChange={e => setIgnoreFirstLine(e.target.checked)} className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"/>
          <label htmlFor="ignore-first-line" className="text-sm font-medium">Ignore the first line (headers)</label>
        </div>

        <p className="text-sm text-text-subtle mb-2">Map pasted columns to your table columns. Showing a preview of the first 5 rows.</p>

        <div className="overflow-x-auto border border-secondary-200 dark:border-secondary-700 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-secondary-50 dark:bg-secondary-900/50">
              <tr>
                {headers.map((_, index) => (
                  <th key={index} className="p-2 border-b border-secondary-200 dark:border-secondary-700">
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
                  </th>
                ))}
              </tr>
              {ignoreFirstLine && (
                <tr className="text-left">
                    {headers.map((header, index) => (
                        <th key={index} className="p-2 font-semibold text-text-subtle text-xs truncate">{header}</th>
                    ))}
                </tr>
              )}
            </thead>
            <tbody>
              {previewRows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-secondary-200 dark:border-secondary-700 last:border-b-0">
                  {headers.map((_, colIndex) => (
                    <td key={colIndex} className="p-2 text-text-subtle truncate max-w-xs">{row[colIndex] || ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="p-4 bg-secondary-50 dark:bg-secondary-800/50 border-t border-secondary-200 dark:border-secondary-700 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleConfirmImport} disabled={!isReady}>Import Rows</Button>
      </div>
    </Modal>
  );
};

export default PasteImportModal;
