import { create } from 'zustand';
import { Table, Folder, VocabRow, Note, StudyMode } from '../types';
import { createTableSlice, TableSlice } from './slices/tableSlice';
import { createRowSlice, RowSlice } from './slices/rowSlice';
import { createFolderSlice, FolderSlice } from './slices/folderSlice';
import { createCacheSlice, CacheSlice } from './slices/cacheSlice';

export interface TableState extends TableSlice, RowSlice, FolderSlice, CacheSlice {
    tables: Table[];
    folders: Folder[];
    loadingTableIds: Set<string>;
}

export const useTableStore = create<TableState>()((...args) => ({
    tables: [],
    folders: [],
    loadingTableIds: new Set<string>(),

    ...createTableSlice(...args),
    ...createRowSlice(...args),
    ...createFolderSlice(...args),
    ...createCacheSlice(...args),
}));
