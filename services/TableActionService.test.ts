import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TableActionService } from '../TableActionService';
import { useTableStore } from '../../stores/useTableStore';
import { useSessionDataStore } from '../../stores/useSessionDataStore';

// Mock the stores
vi.mock('../../stores/useTableStore', () => ({
    useTableStore: {
        getState: vi.fn()
    }
}));

vi.mock('../../stores/useSessionDataStore', () => ({
    useSessionDataStore: {
        getState: vi.fn()
    }
}));

describe('TableActionService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getAffectedConfidenceSets', () => {
        it('should return sets that use the given tableId', () => {
            const mockProgresses = [
                { id: 'S1', name: 'Set 1', tableIds: ['T1', 'T2'] },
                { id: 'S2', name: 'Set 2', tableIds: ['T2'] },
                { id: 'S3', name: 'Set 3', tableIds: ['T3'] },
            ];

            vi.mocked(useSessionDataStore.getState).mockReturnValue({
                confidenceProgresses: mockProgresses
            } as any);

            const result = TableActionService.getAffectedConfidenceSets('T1');
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('S1');

            const result2 = TableActionService.getAffectedConfidenceSets('T2');
            expect(result2).toHaveLength(2);
        });

        it('should return empty array if no sets match', () => {
            vi.mocked(useSessionDataStore.getState).mockReturnValue({
                confidenceProgresses: []
            } as any);

            const result = TableActionService.getAffectedConfidenceSets('T1');
            expect(result).toHaveLength(0);
        });
    });

    describe('getUncategorizedTables', () => {
        it('should return tables that are not in any folder', () => {
            const mockTables = [
                { id: 'T1', name: 'Table 1' },
                { id: 'T2', name: 'Table 2' },
                { id: 'T3', name: 'Table 3' },
            ];
            const mockFolders = [
                { id: 'F1', name: 'Folder 1', tableIds: ['T1'] },
                { id: 'F2', name: 'Folder 2', tableIds: ['T2'] },
            ];

            const result = TableActionService.getUncategorizedTables(mockTables, mockFolders);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('T3');
        });

        it('should return all tables if there are no folders', () => {
            const mockTables = [{ id: 'T1', name: 'Table 1' }];
            const result = TableActionService.getUncategorizedTables(mockTables, []);
            expect(result).toHaveLength(1);
        });
    });

    describe('getDeleteWarning', () => {
        it('should return a simple warning if no dependencies exist', () => {
            // Mock empty dependencies
            vi.mocked(useSessionDataStore.getState).mockReturnValue({
                confidenceProgresses: []
            } as any);
            vi.mocked(useTableStore.getState).mockReturnValue({
                tables: [{ id: 'T1', rows: [] }]
            } as any);

            const msg = TableActionService.getDeleteWarning('T1', 'My Table');
            expect(msg).toContain('Are you sure you want to permanently delete "My Table"');
        });

        it('should warn about affected confidence sets', () => {
            vi.mocked(useSessionDataStore.getState).mockReturnValue({
                confidenceProgresses: [
                    { id: 'S1', name: 'Important Set', tableIds: ['T1'] }
                ]
            } as any);
            vi.mocked(useTableStore.getState).mockReturnValue({
                tables: [{ id: 'T1', rows: [] }]
            } as any);

            const msg = TableActionService.getDeleteWarning('T1', 'My Table');
            expect(msg).toContain('This table is used by 1 Confidence Set(s)');
            expect(msg).toContain('• Important Set');
        });

        it('should warn about linked concepts', () => {
            vi.mocked(useSessionDataStore.getState).mockReturnValue({
                confidenceProgresses: []
            } as any);
            vi.mocked(useTableStore.getState).mockReturnValue({
                tables: [{
                    id: 'T1',
                    rows: [{ id: 'r1', conceptLevelId: 'some-concept-id' }]
                }]
            } as any);

            const msg = TableActionService.getDeleteWarning('T1', 'My Table');
            expect(msg).toContain('Warning: This table contains cards linked to Concept Links');
        });
    });
});
