// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateAnkiReminders } from '../../utils/notificationUtils';
import { AnkiProgress, Table, VocabRow, Screen, NotificationType } from '../../types';

declare var describe: (name: string, fn: () => void) => void;
declare var it: (name: string, fn: () => void) => void;
declare var expect: (actual: any) => any;
declare var beforeEach: (fn: () => void) => void;
declare var vi: any;

const today = new Date('2024-08-15T12:00:00.000Z');
vi.spyOn(Date, 'now').mockImplementation(() => today.getTime());

const yesterdayTimestamp = new Date('2024-08-14T12:00:00.000Z').getTime();

const mockTable: Table = {
    id: 't1', name: 'Test Table', columns: [], relations: [],
    rows: [
        { id: 'r1', cols: {}, stats: { ankiDueDate: yesterdayTimestamp } } as VocabRow, // Due
        { id: 'r2', cols: {}, stats: { ankiDueDate: null } } as VocabRow, // New
        { id: 'r3', cols: {}, stats: { ankiDueDate: today.getTime() + 86400000 } } as VocabRow, // Due tomorrow
    ]
};

const mockProgress: AnkiProgress = {
    id: 'p1', name: 'My Deck', tableIds: ['t1'], relationIds: [],
// FIX: Added missing 'tagIds' and 'tags' properties to conform to the AnkiProgress type.
    tagIds: [],
    tags: [],
    ankiConfig: { newCardsPerDay: 5, maxReviewsPerDay: 10 } as any,
    createdAt: 0
};

describe('generateAnkiReminders', () => {
    let addNotificationMock: any;

    beforeEach(() => {
        addNotificationMock = vi.fn();
    });

    it('should generate a notification when there are due cards', () => {
        generateAnkiReminders([mockProgress], [mockTable], addNotificationMock);

        expect(addNotificationMock).toHaveBeenCalledTimes(1);
        const notificationPayload = addNotificationMock.mock.calls[0][0];
        
        expect(notificationPayload.id).toBe('anki-due-p1-2024-08-15');
        expect(notificationPayload.title).toBe('Anki Deck Due: My Deck');
        expect(notificationPayload.message).toContain('1 cards for review');
        expect(notificationPayload.message).toContain('1 new cards');
        expect(notificationPayload.action.screen).toBe(Screen.AnkiSetup);
    });
    
    it('should not generate a notification if no cards are due or new', () => {
        const tableWithNoDueCards: Table = {
            ...mockTable,
            rows: [
                 { id: 'r3', cols: {}, stats: { ankiDueDate: today.getTime() + 86400000 } } as VocabRow,
            ]
        };
        const progressWithNoNewLimit: AnkiProgress = {
            ...mockProgress,
            ankiConfig: { newCardsPerDay: 0, maxReviewsPerDay: 10 } as any,
        }
        
        generateAnkiReminders([progressWithNoNewLimit], [tableWithNoDueCards], addNotificationMock);
        
        expect(addNotificationMock).not.toHaveBeenCalled();
    });
    
    it('should generate a notification if only new cards are available and within limit', () => {
        const tableWithOnlyNew: Table = {
             ...mockTable,
            rows: [
                 { id: 'r2', cols: {}, stats: { ankiDueDate: null } } as VocabRow,
            ]
        };
        
        generateAnkiReminders([mockProgress], [tableWithOnlyNew], addNotificationMock);
        
        expect(addNotificationMock).toHaveBeenCalledTimes(1);
        const payload = addNotificationMock.mock.calls[0][0];
        expect(payload.message).toContain('0 cards for review');
        expect(payload.message).toContain('1 new cards');
    });

    it('should respect the newCardsPerDay limit in its decision', () => {
        const tableWithOnlyNew: Table = { ...mockTable, rows: [{ id: 'r2', cols: {}, stats: { ankiDueDate: null } } as VocabRow] };
        const progressWithZeroNew: AnkiProgress = { ...mockProgress, ankiConfig: { ...mockProgress.ankiConfig, newCardsPerDay: 0 }};
        
        generateAnkiReminders([progressWithZeroNew], [tableWithOnlyNew], addNotificationMock);
        
        expect(addNotificationMock).not.toHaveBeenCalled();
    });
});