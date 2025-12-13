import * as XLSX from 'xlsx';
import { Table, VocabRow, Column, Tag } from '../types';

export interface ExcelExportOptions {
    includeStats: boolean;
    includeMetadata: boolean;
}

/**
 * Flattens a Table object into an array of objects suitable for SheetJS.
 * Handles user columns, system metadata, and statistics based on options.
 */
export const generateExcelData = (
    table: Table, 
    options: ExcelExportOptions,
    tags?: Tag[] // Optional list of all tags to resolve IDs to Names
): any[] => {
    return table.rows.map(row => {
        const flatRow: any = {};

        // 1. System Metadata (Optional)
        if (options.includeMetadata) {
            flatRow['[Meta] ID'] = row.id;
            flatRow['[Meta] Row Num'] = row.rowIdNum;
        }

        // 2. User Data Columns
        table.columns.forEach(col => {
            flatRow[col.name] = row.cols[col.id] || '';
        });

        // 3. Tags (Flatten to string)
        if (row.tagIds && row.tagIds.length > 0 && tags) {
            const tagNames = row.tagIds
                .map(id => tags.find(t => t.id === id)?.name)
                .filter(Boolean)
                .join(', ');
            flatRow['[Meta] Tags'] = tagNames;
        } else if (row.tags && row.tags.length > 0) {
            // Fallback for legacy tags
             flatRow['[Meta] Tags'] = row.tags.join(', ');
        }

        // 4. Statistics (Optional)
        if (options.includeStats) {
            const stats = row.stats;
            flatRow['[Stat] Correct'] = stats.correct;
            flatRow['[Stat] Incorrect'] = stats.incorrect;
            flatRow['[Stat] Flashcard Status'] = stats.flashcardStatus;
            flatRow['[Stat] Success Rate'] = stats.correct + stats.incorrect > 0 
                ? ((stats.correct / (stats.correct + stats.incorrect)) * 100).toFixed(1) + '%' 
                : '0%';
            
            if (stats.lastStudied) {
                flatRow['[Stat] Last Studied'] = new Date(stats.lastStudied).toLocaleDateString();
            }
            if (stats.ankiDueDate) {
                flatRow['[Stat] Next Due'] = new Date(stats.ankiDueDate).toLocaleDateString();
            }
            if (stats.ankiInterval) {
                flatRow['[Stat] Interval (Days)'] = stats.ankiInterval;
            }
            if (stats.ankiEaseFactor) {
                 flatRow['[Stat] Ease Factor'] = stats.ankiEaseFactor.toFixed(2);
            }
        }

        return flatRow;
    });
};

/**
 * Triggers a browser download of the Excel file.
 */
export const exportToExcel = (table: Table, options: ExcelExportOptions, tags?: Tag[]) => {
    try {
        const data = generateExcelData(table, options, tags);
        
        // Create Workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        
        // Auto-width for columns (Basic heuristic)
        if (data.length > 0) {
            const cols = Object.keys(data[0]).map(key => ({ wch: Math.max(key.length, 15) }));
            ws['!cols'] = cols;
        }

        // Append Worksheet
        // Sheet name max length is 31 chars
        const sheetName = table.name.substring(0, 31).replace(/[\\/?*[\]]/g, ''); 
        XLSX.utils.book_append_sheet(wb, ws, sheetName || "Data");
        
        // Generate File
        const fileName = `${table.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        return true;
    } catch (error) {
        console.error("Excel export failed:", error);
        return false;
    }
};
