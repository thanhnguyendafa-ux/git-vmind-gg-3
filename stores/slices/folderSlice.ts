import { StateCreator } from 'zustand';
import { Folder } from '../../types';
import { TableState } from '../useTableStore';
import { useUserStore } from '../useUserStore';
import { generateUUID } from '../../utils/uuidUtils';
import { VmindSyncEngine } from '../../services/VmindSyncEngine';

const getEngine = () => VmindSyncEngine.getInstance();

export interface FolderSlice {
    createFolder: (name: string) => Promise<void>;
    updateFolder: (folderId: string, updates: Partial<Folder>) => Promise<void>;
    deleteFolder: (folderId: string) => Promise<void>;
    moveTableToFolder: (tableId: string, folderId: string | null) => Promise<void>;
    moveNoteToFolder: (noteId: string, folderId: string | null) => Promise<void>;
    reorderFolders: (draggedId: string, targetId: string) => void;
}

export const createFolderSlice: StateCreator<TableState, [], [], FolderSlice> = (set, get) => ({
    createFolder: async (name) => {
        const { session, isGuest, settings, setSettings } = useUserStore.getState();
        const newFolder: Folder = { id: generateUUID(), name, tableIds: [], noteIds: [], createdAt: Date.now() };

        set(state => ({ folders: [...state.folders, newFolder] }));
        const newOrder = [...(settings.folderOrder || []), newFolder.id];
        setSettings({ ...settings, folderOrder: newOrder });

        if (isGuest || !session) return;

        getEngine().push('UPSERT_FOLDER', { folder: newFolder }, session.user.id);
    },
    updateFolder: async (folderId, updates) => {
        const { session, isGuest } = useUserStore.getState();
        const folder = get().folders.find(f => f.id === folderId);
        if (!folder) return;

        const updatedFolder = { ...folder, ...updates };

        set(state => ({
            folders: state.folders.map(f => f.id === folderId ? updatedFolder : f)
        }));

        if (isGuest || !session) return;
        getEngine().push('UPSERT_FOLDER', { folder: updatedFolder }, session.user.id);
    },
    deleteFolder: async (folderId) => {
        const { session, isGuest, settings, setSettings } = useUserStore.getState();

        set(state => ({ folders: state.folders.filter(f => f.id !== folderId) }));
        const newOrder = (settings.folderOrder || []).filter(id => id !== folderId);
        setSettings({ ...settings, folderOrder: newOrder });

        if (isGuest || !session) return;

        getEngine().push('DELETE_FOLDER', { folderId }, session.user.id);
    },
    moveTableToFolder: async (tableId, folderId) => {
        const { session, isGuest } = useUserStore.getState();
        const originalFolders = get().folders;

        let oldFolderToSync: Folder | undefined;
        let newFolderToSync: Folder | undefined;

        set(state => {
            const folders = state.folders.map(f => ({ ...f, tableIds: f.tableIds.filter(id => id !== tableId) }));
            const oldFolder = originalFolders.find(f => f.tableIds.includes(tableId));
            if (oldFolder) {
                oldFolderToSync = folders.find(f => f.id === oldFolder.id)!;
            }

            if (folderId) {
                const folder = folders.find(f => f.id === folderId);
                if (folder) {
                    folder.tableIds.push(tableId);
                    newFolderToSync = folder;
                }
            }
            return { folders };
        });

        if (isGuest || !session) return;

        if (oldFolderToSync) {
            getEngine().push('UPSERT_FOLDER', { folder: oldFolderToSync }, session.user.id);
        }
        if (newFolderToSync) {
            getEngine().push('UPSERT_FOLDER', { folder: newFolderToSync }, session.user.id);
        }
    },
    moveNoteToFolder: async (noteId, folderId) => {
        const { session, isGuest } = useUserStore.getState();
        const originalFolders = get().folders;

        let oldFolderToSync: Folder | undefined;
        let newFolderToSync: Folder | undefined;

        set(state => {
            const folders = state.folders.map(f => ({ ...f, noteIds: (f.noteIds || []).filter(id => id !== noteId) }));
            const oldFolder = originalFolders.find(f => (f.noteIds || []).includes(noteId));
            if (oldFolder) {
                oldFolderToSync = folders.find(f => f.id === oldFolder.id)!;
            }

            if (folderId) {
                const folder = folders.find(f => f.id === folderId);
                if (folder) {
                    if (!folder.noteIds) folder.noteIds = [];
                    folder.noteIds.push(noteId);
                    newFolderToSync = folder;
                }
            }
            return { folders };
        });

        if (isGuest || !session) return;

        if (oldFolderToSync) {
            getEngine().push('UPSERT_FOLDER', { folder: oldFolderToSync }, session.user.id);
        }
        if (newFolderToSync) {
            getEngine().push('UPSERT_FOLDER', { folder: newFolderToSync }, session.user.id);
        }
    },
    reorderFolders: (draggedId, targetId) => {
        const { folders } = get();
        const { settings, setSettings } = useUserStore.getState();
        const currentOrder = settings.folderOrder && settings.folderOrder.length > 0
            ? settings.folderOrder
            : [...folders].sort((a, b) => a.createdAt - b.createdAt).map(f => f.id);

        const draggedIndex = currentOrder.indexOf(draggedId);
        const targetIndex = currentOrder.indexOf(targetId);

        if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return;

        const newOrder = [...currentOrder];
        const [draggedItem] = newOrder.splice(draggedIndex, 1);
        newOrder.splice(targetIndex, 0, draggedItem);

        setSettings({ ...settings, folderOrder: newOrder });
    },
});
