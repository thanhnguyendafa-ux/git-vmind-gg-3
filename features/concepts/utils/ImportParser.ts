
export interface ParsedGrid {
    headers: string[];
    rows: string[][];
    format: 'TSV' | 'MARKDOWN' | 'CSV';
    originalText: string;
}

/**
 * Pure logic parser for "Copy-Paste" content from Excel or ChatGPT.
 * Handles:
 * 1. Excel/Google Sheets (Tab-Separated Values)
 * 2. Markdown Tables (ChatGPT output)
 * 3. CSV (Comma Separated - basic support)
 */
export const ImportParser = {
    /**
     * Main entry point to parse raw pasted text
     */
    parse(text: string): ParsedGrid {
        const cleanedText = text.trim();
        const format = this.detectFormat(cleanedText);

        let grid: string[][] = [];

        switch (format) {
            case 'MARKDOWN':
                grid = this.extractMarkdownTable(cleanedText);
                break;
            case 'TSV':
                grid = this.parseDSV(cleanedText, '\t');
                break;
            case 'CSV':
                grid = this.parseDSV(cleanedText, ',');
                break;
        }

        // Extract headers (assuming first row is header)
        // If grid is empty, return empty
        if (grid.length === 0) {
            return { headers: [], rows: [], format, originalText: text };
        }

        const headers = grid[0];
        const rows = grid.slice(1);

        return {
            headers,
            rows,
            format,
            originalText: text
        };
    },

    detectFormat(text: string): 'TSV' | 'MARKDOWN' | 'CSV' {
        const lines = text.split('\n');
        // Check for Markdown Table syntax (lines starting with |)
        // At least 2 lines should contain pipes for it to be a table
        const pipeLines = lines.filter(l => l.trim().startsWith('|') || l.trim().includes('|'));
        if (pipeLines.length >= 2) {
            // Further check: Markdown separator line usually |---|---|
            const hasSeparator = lines.some(l => l.includes('---') && l.includes('|'));
            if (hasSeparator) return 'MARKDOWN';

            // Or just lot of pipes
            if (pipeLines.length > lines.length * 0.5) return 'MARKDOWN';
        }

        // Check for Tabs (Excel)
        if (text.includes('\t')) return 'TSV';

        // Fallback or CSV
        if (lines[0] && lines[0].includes(',')) return 'CSV';

        // Default to TSV as it's the most common copy-paste format even for single column
        return 'TSV';
    },

    extractMarkdownTable(text: string): string[][] {
        const lines = text.split('\n');
        const grid: string[][] = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Skip separator line (e.g. |---|---|)
            if (trimmed.startsWith('|') && trimmed.includes('---')) continue;

            // Simple parser: Split by pipe
            // Note: This is a basic implementation. Robust markdown parsing handles escaped pipes, but for copy-paste this largely suffices.
            if (trimmed.includes('|')) {
                const cells = trimmed
                    .split('|')
                    // Remove first and last empty elements if the line starts/ends with pipe
                    .filter((_, index, arr) => {
                        // Keep internal cells. 
                        // If line is "| A | B |", split gives ["", " A ", " B ", ""]
                        if (index === 0 && trimmed.startsWith('|')) return false;
                        if (index === arr.length - 1 && trimmed.endsWith('|')) return false;
                        return true;
                    })
                    .map(cell => cell.trim());

                if (cells.length > 0) {
                    grid.push(cells);
                }
            }
        }
        return grid;
    },

    parseDSV(text: string, delimiter: string): string[][] {
        // Handle quoted CSV/TSV is complex, but for simple copy-paste
        // we often just split by newline and delimiter.
        // TODO: Upgrade to a robust CSV parser if needed for quoted content containing delimiters.
        return text.split('\n').map(line =>
            line.trim().split(delimiter).map(cell => {
                let val = cell.trim();
                // Remove wrapping quotes if simple check passes
                if (val.startsWith('"') && val.endsWith('"')) {
                    val = val.substring(1, val.length - 1);
                }
                return val;
            })
        ).filter(row => row.some(cell => cell.length > 0)); // Filter empty rows
    }
};
