
import { Table, VocabRow, StudyMode, ConfidenceSession } from '../../../types';
import { createQuestion } from '../../../utils/studySessionGenerator';

export interface HealthCheckIssue {
    rowId: string;
    term: string; // Front text or Term
    reason: 'missing_answer' | 'missing_question' | 'unknown';
}

export interface HealthCheckResult {
    issues: HealthCheckIssue[];
    checkedCount: number;
}

/**
 * Scans the session queue to identify items that fail to generate a valid question.
 * @param session The active confidence session (or any object with queue, tableIds, relationIds)
 * @param tables All available tables (to look up row data)
 * @param limit Max items to scan (default 50 to avoid performance hit)
 */
export const checkSessionHealth = (
    session: ConfidenceSession,
    tables: Table[],
    limit = 50
): HealthCheckResult => {
    const queueToScan = session.queue.slice(0, limit);
    const issues: HealthCheckIssue[] = [];

    // Pre-map tables for faster lookup
    const sessionTables = tables.filter(t => session.tableIds.includes(t.id));

    for (const rowId of queueToScan) {
        let found = false;
        let row: VocabRow | undefined;
        let table: Table | undefined;

        // Find Row and Table
        for (const t of sessionTables) {
            const r = t.rows.find(row => row.id === rowId);
            if (r) {
                row = r;
                table = t;
                found = true;
                break;
            }
        }

        if (!found || !row || !table) {
            issues.push({
                rowId,
                term: 'Unknown (Row not found)',
                reason: 'unknown'
            });
            continue;
        }

        // Find Relation
        // Logic mirrored from ConfidenceSessionScreen: use first matching relation from session.relationIds
        let relId = session.relationIds.find(rid => table!.relations.some(r => r.id === rid));
        let relation = table.relations.find(r => r.id === relId);

        if (!relation && table.relations.length > 0) {
            relation = table.relations[0];
        }

        if (!relation) {
            const firstColId = table.columns[0]?.id;
            issues.push({
                rowId,
                term: (firstColId && row.cols[firstColId]) ? String(row.cols[firstColId]) : 'Unknown',
                reason: 'unknown' // No relation found
            });
            continue;
        }

        // Determine Mode
        let modesToUse = relation.interactionModes || [];
        if (modesToUse.length === 0) {
            modesToUse = relation.compatibleModes || [StudyMode.Flashcards];
        }

        // STRICT CHECK (v2):
        // We must check if ALL potential modes can be generated.
        // If the relation allows "Random", any of them might be picked.
        // Even if not random, checking all ensures data integrity.

        let hasError = false;
        let failedReason: 'missing_answer' | 'missing_question' | 'unknown' = 'unknown';

        for (const mode of modesToUse) {
            // Pass empty array for allRows to avoid expensive filtering, 
            // knowing that createQuestion falls back safely for MCQ distractions (to Typing).
            // If it returns null even then, it's a data issue.
            const question = createQuestion(row, relation, table, [], mode);

            if (!question) {
                hasError = true;
                failedReason = 'missing_answer'; // Most common
                break;
            }
        }

        if (hasError) {
            const firstColId = table.columns[0]?.id;
            const term = (firstColId && row.cols[firstColId]) ? String(row.cols[firstColId]) : 'Untitled Row';
            issues.push({
                rowId,
                term,
                reason: failedReason
            });
        }
    }

    return {
        issues,
        checkedCount: queueToScan.length
    };
};
