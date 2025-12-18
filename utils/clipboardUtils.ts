
/**
 * Utilities for intelligent clipboard parsing.
 * Supports extraction of structure (tables) and formatting (bold, italic, colors)
 * from rich text sources like Microsoft Word, Excel, and Web Pages.
 */

export interface ParsedTableData {
    rows: string[][];
    source: 'html' | 'text';
}

/**
 * Sanitizes and parses clipboard data.
 * Prioritizes HTML to preserve structure and formatting.
 */
export const parseSmartClipboard = (clipboardData: DataTransfer): ParsedTableData => {
    const html = clipboardData.getData('text/html');
    const text = clipboardData.getData('text/plain');

    if (html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // 1. Look for Table Structure
        const table = doc.querySelector('table');
        if (table) {
            const rows: string[][] = [];
            const trs = table.querySelectorAll('tr');
            
            trs.forEach(tr => {
                // Skip rows that are just sizing spacers (common in Excel HTML)
                if (tr.getAttribute('height') === '0') return;

                const rowData: string[] = [];
                const cells = tr.querySelectorAll('td, th');
                
                cells.forEach(cell => {
                    rowData.push(processNode(cell as HTMLElement));
                });
                
                // Only add non-empty rows
                if (rowData.some(cell => cell.trim() !== '')) {
                    rows.push(rowData);
                }
            });

            if (rows.length > 0) {
                return { rows, source: 'html' };
            }
        }
        
        // 2. Fallback: Parse paragraphs/divs if no table found but HTML exists?
        // For Vmind tables, we primarily care about tabular data.
        // If it's a list from Word, it might be <li> or <p>.
        // For now, if no <table> is found, we fall back to text parsing to ensure
        // we don't break simple copy-pastes, but we could enhance this to support lists.
    }

    // Fallback: Text Parsing
    const rows = text.trim().split(/\r\n|\n/).map(r => r.split('\t'));
    return { rows, source: 'text' };
};

/**
 * Traverses a DOM node and reconstructs a safe HTML string with supported formatting.
 * Supported: <b>, <strong>, <i>, <em>, <span style="color/bg">
 */
function processNode(node: HTMLElement): string {
    let content = '';
    
    node.childNodes.forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
            content += child.textContent;
        } else if (child.nodeType === Node.ELEMENT_NODE) {
            const el = child as HTMLElement;
            
            // Skip Word/Office garbage tags
            if (el.tagName.startsWith('O:') || el.tagName === 'STYLE' || el.tagName === 'SCRIPT') return;

            let inner = processNode(el);
            if (!inner.trim()) return;

            // Extract Styles
            const style = el.getAttribute('style') || '';
            const colorMatch = style.match(/color:\s*([^;"]+)/i);
            const bgMatch = style.match(/background(?:-color)?:\s*([^;"]+)/i);
            const highlightMatch = style.match(/mso-highlight:\s*([^;"]+)/i);
            
            // Logic for formatting tags
            const tagName = el.tagName.toLowerCase();
            const isBold = tagName === 'b' || tagName === 'strong' || /font-weight:\s*(bold|700|800|900)/i.test(style);
            const isItalic = tagName === 'i' || tagName === 'em' || /font-style:\s*italic/i.test(style);
            const isUnderline = tagName === 'u' || /text-decoration:\s*underline/i.test(style);

            // Apply formatting wrappers
            if (isBold) inner = `<b>${inner}</b>`;
            if (isItalic) inner = `<i>${inner}</i>`;
            if (isUnderline) inner = `<u>${inner}</u>`;

            // Apply Color Styles
            let styleStr = '';
            if (colorMatch && isValidColor(colorMatch[1])) {
                styleStr += `color:${colorMatch[1]};`;
            }
            if (bgMatch && isValidColor(bgMatch[1])) {
                styleStr += `background-color:${bgMatch[1]};`;
            } else if (highlightMatch) {
                // Handle Word Highlighting
                styleStr += `background-color:${highlightMatch[1]};`;
            }

            if (styleStr) {
                inner = `<span style="${styleStr}">${inner}</span>`;
            }

            content += inner;
        }
    });

    // Clean up whitespace
    return content.replace(/\s+/g, ' ');
}

// Simple check to avoid injecting malicious CSS, though we are setting specific props
function isValidColor(color: string): boolean {
    const s = new Option().style;
    s.color = color;
    // Exclude 'black' or 'inherit' to keep clean if it matches default
    return s.color !== '' && s.color !== 'black' && s.color !== 'inherit' && s.color !== 'rgb(0, 0, 0)';
}

/**
 * Strips all HTML tags from a string, returning plain text.
 */
export const stripHtml = (html: string): string => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
};
