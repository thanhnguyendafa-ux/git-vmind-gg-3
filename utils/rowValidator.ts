
import { VocabRow, Relation, Table, StudyMode } from '../types';
import { createQuestion } from './studySessionGenerator';

export interface ValidationIssue {
    columnId: string;
    columnName: string;
    reason: 'missing' | 'formula_error' | 'invalid_mode';
    affectedModes: StudyMode[];
}

export interface RowValidationResult {
    isValid: boolean;
    issues: ValidationIssue[];
    validModes: StudyMode[];  // Modes that work despite issues
    invalidModes: StudyMode[]; // Modes that fail
}

/**
 * The Integrity Shield Validator Engine
 * 
 * Validates a Row against a Relation by testing ALL compatible interaction modes.
 * Returns detailed information about which columns are problematic and which modes fail.
 * 
 * @param row The row to validate
 * @param relation The relation defining question/answer structure
 * @param table The table containing column definitions
 * @returns Validation result with issues and mode compatibility
 */
export const validateRow = (
    row: VocabRow,
    relation: Relation,
    table: Table
): RowValidationResult => {
    const issues: ValidationIssue[] = [];
    const validModes: StudyMode[] = [];
    const invalidModes: StudyMode[] = [];

    // Get all modes this relation supports
    let modesToUse = relation.interactionModes || [];
    if (modesToUse.length === 0) {
        modesToUse = relation.compatibleModes || [StudyMode.Flashcards];
    }

    // Test each mode
    for (const mode of modesToUse) {
        try {
            // Attempt to create a question for this mode
            const question = createQuestion(row, relation, table, [], mode);

            if (question) {
                validModes.push(mode);
            } else {
                invalidModes.push(mode);

                // Determine what's missing for this mode
                // Check answer columns (most common issue)
                const answerValue = relation.answerFormula
                    ? evaluateFormulaSimple(relation.answerFormula, row, table.columns)
                    : relation.answerColumnIds.map(id => row.cols[id]).filter(Boolean).join(' / ');

                if (!answerValue && mode !== StudyMode.Flashcards && mode !== StudyMode.Scrambled) {
                    // Answer is required for most modes except Flashcards and Scrambled
                    relation.answerColumnIds.forEach(colId => {
                        const col = table.columns.find(c => c.id === colId);
                        if (col && !row.cols[colId]) {
                            // Check if issue already recorded
                            const existingIssue = issues.find(i => i.columnId === colId);
                            if (existingIssue) {
                                if (!existingIssue.affectedModes.includes(mode)) {
                                    existingIssue.affectedModes.push(mode);
                                }
                            } else {
                                issues.push({
                                    columnId: colId,
                                    columnName: col.name,
                                    reason: 'missing',
                                    affectedModes: [mode]
                                });
                            }
                        }
                    });
                }

                // Check question columns
                const questionValue = relation.questionColumnIds.map(id => row.cols[id]).filter(Boolean).join(' ');
                if (!questionValue && mode !== StudyMode.Scrambled) {
                    relation.questionColumnIds.forEach(colId => {
                        const col = table.columns.find(c => c.id === colId);
                        if (col && !row.cols[colId]) {
                            const existingIssue = issues.find(i => i.columnId === colId);
                            if (existingIssue) {
                                if (!existingIssue.affectedModes.includes(mode)) {
                                    existingIssue.affectedModes.push(mode);
                                }
                            } else {
                                issues.push({
                                    columnId: colId,
                                    columnName: col.name,
                                    reason: 'missing',
                                    affectedModes: [mode]
                                });
                            }
                        }
                    });
                }
            }
        } catch (error) {
            // Formula evaluation error or other issue
            invalidModes.push(mode);
            if (relation.answerFormula) {
                issues.push({
                    columnId: 'formula',
                    columnName: 'Answer Formula',
                    reason: 'formula_error',
                    affectedModes: [mode]
                });
            }
        }
    }

    return {
        isValid: invalidModes.length === 0,
        issues,
        validModes,
        invalidModes
    };
};

/**
 * Simple formula evaluator (mirrors textUtils.evaluateFormula but safe for validation)
 */
function evaluateFormulaSimple(formula: string, row: VocabRow, columns: any[]): string {
    try {
        let result = formula;
        const placeholderPattern = /\{([^}]+)\}/g;

        result = result.replace(placeholderPattern, (_, colName) => {
            const col = columns.find((c: any) => c.name === colName.trim());
            if (col) {
                return row.cols[col.id] || '';
            }
            return '';
        });

        return result.trim();
    } catch {
        return '';
    }
}

/**
 * Batch validate multiple rows
 */
export const validateRows = (
    rows: VocabRow[],
    relation: Relation,
    table: Table
): Map<string, RowValidationResult> => {
    const results = new Map<string, RowValidationResult>();

    for (const row of rows) {
        results.set(row.id, validateRow(row, relation, table));
    }

    return results;
};
