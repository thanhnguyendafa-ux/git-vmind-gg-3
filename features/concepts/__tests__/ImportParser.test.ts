
import { ImportParser } from '../utils/ImportParser';

describe('ImportParser', () => {
    describe('detectFormat', () => {
        it('should detect Markdown tables', () => {
            const input = `
| Term | Def |
|---|---|
| A | B |
            `;
            expect(ImportParser.detectFormat(input)).toBe('MARKDOWN');
        });

        it('should detect TSV (Excel)', () => {
            const input = "Term\tDef\nA\tB";
            expect(ImportParser.detectFormat(input)).toBe('TSV');
        });

        it('should detect CSV', () => {
            const input = "Term,Def\nA,B";
            expect(ImportParser.detectFormat(input)).toBe('CSV');
        });
    });

    describe('extractMarkdownTable', () => {
        it('should parse standard markdown table', () => {
            const input = `
| Term | Def |
|---|---|
| Apple | Fruit |
| Dog | Animal |
            `;
            const grid = ImportParser.extractMarkdownTable(input);
            expect(grid[0]).toEqual(['Term', 'Def']);
            expect(grid[1]).toEqual(['Apple', 'Fruit']);
            expect(grid[2]).toEqual(['Dog', 'Animal']);
            expect(grid.length).toBe(3);
        });

        it('should ignore separator line', () => {
            const input = `
| A | B |
|:---:|:---|
| 1 | 2 |
            `;
            const grid = ImportParser.extractMarkdownTable(input);
            expect(grid.length).toBe(2);
            expect(grid[0]).toEqual(['A', 'B']);
        });
    });

    describe('parseDSV', () => {
        it('should parse tab separated values', () => {
            const input = "A\tB\n1\t2";
            const grid = ImportParser.parseDSV(input, '\t');
            expect(grid[0]).toEqual(['A', 'B']);
            expect(grid[1]).toEqual(['1', '2']);
        });

        it('should parse comma separated values', () => {
            const input = "A,B\n1,2";
            const grid = ImportParser.parseDSV(input, ',');
            expect(grid[0]).toEqual(['A', 'B']);
            expect(grid[1]).toEqual(['1', '2']);
        });

        it('should handle quoted values simple', () => {
            const input = '"A",B\n"1",2';
            const grid = ImportParser.parseDSV(input, ',');
            expect(grid[0]).toEqual(['A', 'B']);
        });
    });

    describe('parse (Main)', () => {
        it('should return ParsedGrid structure', () => {
            const input = `
| Col1 | Col2 |
|---|---|
| Val1 | Val2 |
            `;
            const result = ImportParser.parse(input);
            expect(result.format).toBe('MARKDOWN');
            expect(result.headers).toEqual(['Col1', 'Col2']);
            expect(result.rows[0]).toEqual(['Val1', 'Val2']);
        });
    });
});
