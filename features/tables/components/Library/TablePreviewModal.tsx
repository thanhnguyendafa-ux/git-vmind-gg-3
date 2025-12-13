
import * as React from 'react';
import Modal from '../../../../components/ui/Modal';
import { Button } from '../../../../components/ui/Button';
import { LibraryItem, Table, VocabRow } from '../../../../types';
import { useTableStore } from '../../../../stores/useTableStore';
import { useUIStore } from '../../../../stores/useUIStore';
import { rehydrateTableFromLibrary } from '../../../../utils/libraryUtils';
import { incrementDownloadCount } from '../../../../services/libraryService';
import { VmindSyncEngine } from '../../../../services/VmindSyncEngine';
import { useUserStore } from '../../../../stores/useUserStore';
import Icon from '../../../../components/ui/Icon';

interface TablePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: LibraryItem;
}

const TablePreviewModal: React.FC<TablePreviewModalProps> = ({ isOpen, onClose, item }) => {
    const { importTables } = useTableStore();
    const { showToast, setIsLibraryMode } = useUIStore();
    const { session, isGuest } = useUserStore();
    const [isImporting, setIsImporting] = React.useState(false);

    const tableData = item.payload as Table;
    const previewRows = tableData.rows.slice(0, 5);

    const handleImport = async () => {
        setIsImporting(true);
        try {
            // 1. Rehydrate (Regenerate IDs)
            const freshTable = rehydrateTableFromLibrary(tableData);
            
            // 2. Import into Store
            importTables([freshTable]);
            
            // 3. Sync to Backend
            if (!isGuest && session) {
                VmindSyncEngine.getInstance().push('UPSERT_TABLE', { tableData: freshTable }, session.user.id);
            }

            // 4. Increment Stats (Fire & Forget)
            incrementDownloadCount(item.id);

            showToast("Table added to your workspace!", "success");
            onClose();
            setIsLibraryMode(false); // Switch back to workspace view

        } catch (error) {
            console.error("Import failed:", error);
            showToast("Failed to import table.", "error");
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Preview Table" containerClassName="max-w-2xl w-full">
            <div className="p-6 space-y-6">
                <div>
                    <h3 className="text-xl font-bold text-text-main dark:text-secondary-100">{item.title}</h3>
                    <p className="text-sm text-text-subtle mt-1">by {item.author_name}</p>
                </div>
                
                <div className="grid grid-cols-3 gap-4 bg-secondary-50 dark:bg-secondary-800/50 p-4 rounded-lg border border-secondary-200 dark:border-secondary-700">
                     <div className="text-center">
                         <p className="text-xs text-text-subtle uppercase font-bold">Rows</p>
                         <p className="text-lg font-bold text-primary-600 dark:text-primary-400">{tableData.rows.length}</p>
                     </div>
                     <div className="text-center">
                         <p className="text-xs text-text-subtle uppercase font-bold">Columns</p>
                         <p className="text-lg font-bold text-text-main dark:text-secondary-100">{tableData.columns.length}</p>
                     </div>
                     <div className="text-center">
                         <p className="text-xs text-text-subtle uppercase font-bold">Relations</p>
                         <p className="text-lg font-bold text-text-main dark:text-secondary-100">{tableData.relations?.length || 0}</p>
                     </div>
                </div>

                <div>
                    <h4 className="text-sm font-bold text-text-subtle mb-2 uppercase">Preview Data</h4>
                    <div className="border border-secondary-200 dark:border-secondary-700 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-secondary-100 dark:bg-secondary-800">
                                <tr>
                                    {tableData.columns.slice(0, 3).map(col => (
                                        <th key={col.id} className="p-2 font-semibold text-text-subtle">{col.name}</th>
                                    ))}
                                    {tableData.columns.length > 3 && <th className="p-2">...</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-100 dark:divide-secondary-800">
                                {previewRows.map((row: VocabRow) => (
                                    <tr key={row.id}>
                                        {tableData.columns.slice(0, 3).map(col => (
                                            <td key={col.id} className="p-2 truncate max-w-[150px]">{row.cols[col.id]}</td>
                                        ))}
                                        {tableData.columns.length > 3 && <td className="p-2 text-text-subtle">...</td>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {tableData.rows.length > 5 && (
                             <div className="p-2 text-center text-xs text-text-subtle bg-secondary-50 dark:bg-secondary-900/30">
                                 +{tableData.rows.length - 5} more rows...
                             </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                    <Button onClick={handleImport} disabled={isImporting}>
                        {isImporting ? <><Icon name="spinner" className="w-4 h-4 mr-2 animate-spin"/> Importing...</> : <><Icon name="arrow-down-tray" className="w-4 h-4 mr-2"/> Add to Workspace</>}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default TablePreviewModal;
