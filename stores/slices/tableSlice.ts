import { StateCreator } from 'zustand';
import { Table, Column, Relation, RelationDesign, StudyMode, RelationDesign as RelationDesignType, TypographyDesign, TextBox, CardFaceDesign, FlashcardStatus, VocabRow } from '../../types';
import { TableState } from '../useTableStore';
import { useUserStore } from '../useUserStore';
import { useTagStore } from '../useTagStore';
import { useUIStore } from '../useUIStore';
import { useContextLinkStore } from '../useContextLinkStore';
import { generateUUID } from '../../utils/uuidUtils';
import { VmindSyncEngine } from '../../services/VmindSyncEngine';
import { cacheService } from '../../services/cacheService';
import { DESIGN_TEMPLATES, DARK_MODE_DEFAULT_TYPOGRAPHY, DEFAULT_TYPOGRAPHY } from '../../features/tables/designConstants';
import { findContextSentences } from '../../utils/textUtils';

const getEngine = () => VmindSyncEngine.getInstance();

export interface TableSlice {
    createTable: (name: string, columnsStr: string) => Promise<Table | null>;
    createAnkiStyleTable: (name: string, tags: string[]) => Promise<Table | null>;
    deleteTable: (tableId: string) => Promise<void>;
    updateTable: (updatedTable: Table) => Promise<boolean>;
    setTablePublicStatus: (tableId: string, isPublic: boolean) => void;
    importTables: (importedTables: Table[], appendToTableId?: string) => void;
    createClozeCard: (options: {
        note: any;
        selectionText: string;
        selectionStartIndex: number;
        clozeOptions: {
            targetTableId: string;
            contextBefore: number;
            contextAfter: number;
            clozeType: StudyMode;
            hint: 'wordCount' | 'none';
            extraInfo?: string;
            scope: 'single' | 'all';
        }
    }) => Promise<void>;
}

export const createTableSlice: StateCreator<TableState, [], [], TableSlice> = (set, get) => ({
    createTable: async (name, columnsStr) => {
        const { session, isGuest } = useUserStore.getState();
        const { generateUniqueShortCode } = get();
        const columnNames = columnsStr.split(',').map(s => s.trim()).filter(Boolean);
        if (columnNames.length === 0) return null;

        const newColumns: Column[] = columnNames.map((colName) => ({ id: generateUUID(), name: colName }));
        const shortCode = generateUniqueShortCode(name);

        const newTable: Table = {
            id: generateUUID(),
            name,
            shortCode,
            columns: newColumns,
            rows: [],
            relations: [],
            createdAt: Date.now(),
            modifiedAt: Date.now()
        };

        set(state => ({ tables: [...state.tables, newTable] }));

        if (isGuest || !session) return newTable;

        getEngine().push('UPSERT_TABLE', { tableData: newTable }, session.user.id);
        await cacheService.saveTableRows(newTable.id, []);

        return newTable;
    },
    createAnkiStyleTable: async (name, tags) => {
        const { session, isGuest } = useUserStore.getState();
        const { findOrCreateTagsByName } = useTagStore.getState();
        const { generateUniqueShortCode } = get();

        const frontCol: Column = { id: generateUUID(), name: 'Front' };
        const backCol: Column = { id: generateUUID(), name: 'Back' };

        const randomTemplate = DESIGN_TEMPLATES[Math.floor(Math.random() * DESIGN_TEMPLATES.length)];

        const createDesignForRelation = (relation: Relation): RelationDesign => {
            const theme = useUIStore.getState().theme;
            const defaultTypo = theme === 'dark' ? DARK_MODE_DEFAULT_TYPOGRAPHY : DEFAULT_TYPOGRAPHY;
            const labelTypo: TypographyDesign = { ...defaultTypo, color: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: '0.875rem', fontWeight: 'normal', textAlign: 'left' };

            const design: RelationDesign = JSON.parse(JSON.stringify(randomTemplate.design));
            design.front.typography = {};
            design.back.typography = {};

            relation.questionColumnIds.forEach(id => {
                design.front.typography[id] = { ...randomTemplate.frontTypography };
            });
            relation.answerColumnIds.forEach(id => {
                design.back.typography[id] = { ...randomTemplate.backTypography };
            });

            const frontLabelBox: TextBox = { id: generateUUID(), text: 'Question:', typography: labelTypo };
            design.front.textBoxes = [frontLabelBox];
            design.front.elementOrder = [frontLabelBox.id, ...relation.questionColumnIds];

            const backLabelBox: TextBox = { id: generateUUID(), text: 'Answer:', typography: labelTypo };
            design.back.textBoxes = [backLabelBox];
            design.back.elementOrder = [backLabelBox.id, ...relation.answerColumnIds];

            design.designLinked = true;
            return design;
        };

        const relation1: Relation = {
            id: generateUUID(),
            name: 'Front -> Back',
            questionColumnIds: [frontCol.id],
            answerColumnIds: [backCol.id],
            compatibleModes: [StudyMode.Flashcards],
            tags: ['Anki']
        };
        relation1.design = createDesignForRelation(relation1);

        const relation2: Relation = {
            id: generateUUID(),
            name: 'Back -> Front',
            questionColumnIds: [backCol.id],
            answerColumnIds: [frontCol.id],
            compatibleModes: [StudyMode.Flashcards],
            tags: ['Anki']
        };
        relation2.design = createDesignForRelation(relation2);

        const tagObjects = findOrCreateTagsByName(tags);
        const tagIds = tagObjects.map(t => t.id);
        const shortCode = generateUniqueShortCode(name);

        const newTable: Table = {
            id: generateUUID(),
            name,
            shortCode,
            columns: [frontCol, backCol],
            rows: [],
            relations: [relation1, relation2],
            tagIds: tagIds,
            tags: [],
            createdAt: Date.now(),
            modifiedAt: Date.now(),
        };

        set(state => ({ tables: [...state.tables, newTable] }));

        if (isGuest || !session) {
            return newTable;
        }

        getEngine().push('UPSERT_TABLE', { tableData: newTable }, session.user.id);
        await cacheService.saveTableRows(newTable.id, []);

        return newTable;
    },
    deleteTable: async (tableId) => {
        const { session, isGuest } = useUserStore.getState();
        set(state => ({
            tables: state.tables.filter(t => t.id !== tableId),
        }));

        if (isGuest || !session) return;
        getEngine().push('DELETE_TABLE', { tableId }, session.user.id);
    },
    updateTable: async (updatedTable) => {
        const { session, isGuest } = useUserStore.getState();
        const originalTables = get().tables;
        const index = originalTables.findIndex(t => t.id === updatedTable.id);
        if (index === -1) return false;

        set(state => ({
            tables: state.tables.map(t => t.id === updatedTable.id ? { ...updatedTable, modifiedAt: Date.now() } : t)
        }));

        if (isGuest || !session) return true;
        getEngine().push('UPSERT_TABLE', { tableData: updatedTable }, session.user.id);
        return true;
    },
    setTablePublicStatus: (tableId, isPublic) => {
        const table = get().tables.find(t => t.id === tableId);
        if (table) {
            get().updateTable({ ...table, isPublic });
        }
    },
    importTables: (importedTables, appendToTableId) => {
        set(state => {
            if (appendToTableId) {
                const rowsToAppend = importedTables[0]?.rows || [];
                const targetTable = state.tables.find(t => t.id === appendToTableId);
                let currentMax = targetTable?.rows.reduce((max, r) => Math.max(max, r.rowIdNum || 0), 0) || 0;
                const rowsWithIds = rowsToAppend.map(r => ({ ...r, rowIdNum: ++currentMax }));
                const updatedRows = targetTable ? [...targetTable.rows, ...rowsWithIds] : [];

                if (!useUserStore.getState().isGuest && targetTable) {
                    cacheService.saveTableRows(appendToTableId, updatedRows);
                }

                return {
                    tables: state.tables.map(t =>
                        t.id === appendToTableId ? { ...t, rows: updatedRows, rowCount: updatedRows.length } : t
                    )
                };
            } else {
                const existingIds = new Set(state.tables.map(t => t.id));
                const newTables = importedTables.map(t =>
                    existingIds.has(t.id) ? { ...t, id: generateUUID() } : t
                );

                newTables.forEach(t => {
                    let currentMax = 0;
                    t.rows = t.rows.map(r => ({ ...r, rowIdNum: ++currentMax }));
                    if (!t.shortCode) {
                        t.shortCode = get().generateUniqueShortCode(t.name);
                    }
                });

                if (!useUserStore.getState().isGuest) {
                    newTables.forEach(t => cacheService.saveTableRows(t.id, t.rows));
                }

                return { tables: [...state.tables, ...newTables] };
            }
        });
    },
    createClozeCard: async ({ note, selectionText, selectionStartIndex, clozeOptions }) => {
        const { updateTable, addRows } = get();
        const { addContextLink } = useContextLinkStore.getState();

        let targetTable: Table | undefined | null;

        if (clozeOptions.targetTableId === 'new') {
            const newTableName = `Reading Notes - ${note.title}`;
            targetTable = await get().createTable(newTableName, 'Cloze Question,Cloze Answer');
            if (!targetTable) throw new Error("Failed to create new table for cloze card.");
            targetTable = get().tables.find(t => t.id === targetTable!.id);
        } else {
            targetTable = get().tables.find(t => t.id === clozeOptions.targetTableId);
        }

        if (!targetTable) throw new Error("Target table not found for cloze card.");

        let updatedTable = JSON.parse(JSON.stringify(targetTable));

        let questionCol = updatedTable.columns.find((c: Column) => c.name === 'Cloze Question');
        if (!questionCol) {
            questionCol = { id: generateUUID(), name: 'Cloze Question' };
            updatedTable.columns.push(questionCol);
        }
        let answerCol = updatedTable.columns.find((c: Column) => c.name === 'Cloze Answer');
        if (!answerCol) {
            answerCol = { id: generateUUID(), name: 'Cloze Answer' };
            updatedTable.columns.push(answerCol);
        }

        let infoCol: Column | undefined;
        if (clozeOptions.extraInfo) {
            infoCol = updatedTable.columns.find((c: Column) =>
                ['notes', 'extra', 'info', 'explanation'].includes(c.name.toLowerCase())
            );
            if (!infoCol) {
                infoCol = { id: generateUUID(), name: 'Notes' };
                updatedTable.columns.push(infoCol);
            }
        }

        let relation = updatedTable.relations.find((r: Relation) =>
            r.compatibleModes?.includes(StudyMode.ClozeTyping) ||
            r.tags?.includes('Cloze')
        );

        const relationId = relation ? relation.id : generateUUID();
        const defaultTypo = DEFAULT_TYPOGRAPHY;

        const frontDesign: CardFaceDesign = relation?.design?.front || {
            backgroundType: 'solid',
            backgroundValue: 'var(--color-surface)',
            layout: 'vertical',
            typography: {},
            elementOrder: []
        };

        if (!frontDesign.elementOrder) frontDesign.elementOrder = [];
        if (!frontDesign.elementOrder.includes(questionCol.id)) {
            frontDesign.elementOrder.push(questionCol.id);
            frontDesign.typography[questionCol.id] = { ...defaultTypo, fontSize: '1.25rem' };
        }

        const backDesign: CardFaceDesign = relation?.design?.back || {
            backgroundType: 'solid',
            backgroundValue: 'var(--color-secondary-50)',
            layout: 'vertical',
            typography: {},
            elementOrder: []
        };

        if (!backDesign.elementOrder) backDesign.elementOrder = [];
        if (!backDesign.elementOrder.includes(answerCol.id)) {
            backDesign.elementOrder.push(answerCol.id);
            backDesign.typography[answerCol.id] = { ...defaultTypo, fontSize: '1.25rem', color: '#16a34a' };
        }

        if (infoCol) {
            if (!backDesign.elementOrder.includes(infoCol.id)) {
                backDesign.elementOrder.push(infoCol.id);
                backDesign.typography[infoCol.id] = { ...defaultTypo, fontSize: '1rem', fontStyle: 'italic', fontWeight: 'normal' };
            }
        }

        const newRelation: Relation = {
            id: relationId,
            name: relation ? relation.name : 'Cloze Practice',
            questionColumnIds: [questionCol.id],
            answerColumnIds: [answerCol.id],
            compatibleModes: [clozeOptions.clozeType],
            interactionModes: [clozeOptions.clozeType],
            tags: ['StudySession', 'Cloze'],
            clozeConfig: {
                hint: clozeOptions.hint,
                contextBefore: clozeOptions.contextBefore,
                contextAfter: clozeOptions.contextAfter,
                extraInfoColId: infoCol?.id
            },
            design: {
                front: frontDesign,
                back: backDesign,
                designLinked: true
            }
        };

        if (relation) {
            updatedTable.relations = updatedTable.relations.map((r: Relation) => r.id === relationId ? newRelation : r);
        } else {
            updatedTable.relations.push(newRelation);
        }

        await updateTable(updatedTable);

        const rowsToInsert: VocabRow[] = [];
        const linksToInsert: any[] = [];

        const _generateRowAndLink = (startIndex: number) => {
            const contextData = findContextSentences(
                note.content || '',
                startIndex,
                selectionText.length,
                clozeOptions.contextBefore,
                clozeOptions.contextAfter
            );

            const fullSentence = contextData.fullContext;
            const newRowId = generateUUID();

            const newRow: VocabRow = {
                id: newRowId,
                cols: {
                    [questionCol!.id]: fullSentence,
                    [answerCol!.id]: selectionText,
                    ...(infoCol ? { [infoCol.id]: clozeOptions.extraInfo || '' } : {})
                },
                stats: {
                    correct: 0, incorrect: 0, lastStudied: null,
                    flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null
                },
                createdAt: Date.now(),
                modifiedAt: Date.now(),
                conceptLevelIds: []
            };

            const link = {
                rowId: newRowId,
                sourceType: 'reading' as const,
                sourceId: note.id,
                metadata: {
                    snippet: fullSentence,
                    selection: selectionText,
                    selectionStartIndex: startIndex,
                }
            };

            return { newRow, link };
        };

        if (clozeOptions.scope === 'all' && note.content) {
            const escapedText = selectionText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedText, 'gi');
            let match;
            while ((match = regex.exec(note.content)) !== null) {
                const { newRow, link } = _generateRowAndLink(match.index);
                rowsToInsert.push(newRow);
                linksToInsert.push(link);
            }
        } else {
            const { newRow, link } = _generateRowAndLink(selectionStartIndex);
            rowsToInsert.push(newRow);
            linksToInsert.push(link);
        }

        if (rowsToInsert.length > 0) {
            await addRows(targetTable!.id, rowsToInsert);
            for (const link of linksToInsert) {
                await addContextLink(link);
            }
        }
    },
});
