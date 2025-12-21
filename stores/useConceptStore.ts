import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Concept, ConceptLevel, VocabRow } from '../types';
import { useTableStore } from './useTableStore';
import { VmindSyncEngine } from '../services/VmindSyncEngine';
import { useUserStore } from './useUserStore';

interface ConceptState {
    concepts: Concept[];
    conceptLevels: ConceptLevel[];
    isHydrated: boolean; // Add hydration flag

    // Actions
    createConcept: (code: string, name: string, description?: string, parentId?: string, isFolder?: boolean) => Promise<Concept>;
    updateConcept: (id: string, updates: Partial<Concept>) => Promise<boolean>;
    deleteConcept: (id: string) => Promise<boolean>;

    createLevel: (conceptId: string, name: string, order: number, description?: string) => Promise<ConceptLevel>;
    updateLevel: (id: string, updates: Partial<ConceptLevel>) => Promise<boolean>;
    deleteLevel: (id: string) => Promise<boolean>;

    // Selectors/Helpers
    getLevelsByConcept: (conceptId: string) => ConceptLevel[];
    getConceptByCode: (code: string) => Concept | undefined;
    getRowsByLevel: (levelId: string) => VocabRow[];

    // Hierarchy Helpers
    getChildConcepts: (parentId: string | null) => Concept[];
    getRootConcepts: () => Concept[];
    getConceptHierarchy: (conceptId: string) => Concept[];
    getRecursiveChildIds: (parentId: string) => string[];

    // Search Functions
    searchConceptsByName: (query: string) => Concept[];
    searchCardsByConceptLevel: (levelId: string, query: string) => VocabRow[];
    setInitialData: (data: { concepts: Concept[], conceptLevels: ConceptLevel[] }) => void;
    cleanupDuplicateConcepts: () => Promise<void>;
}

export const useConceptStore = create<ConceptState>()(
    persist(
        (set, get) => ({
            concepts: [],
            conceptLevels: [],
            isHydrated: false, // Default to false

            createConcept: async (code, name, description, parentId, isFolder = false) => {
                // Validation: Check uniqueness of code
                const existing = get().concepts.find(c => c.code === code);
                if (existing) {
                    throw new Error(`Concept with code ${code} already exists.`);
                }

                const newConcept: Concept = {
                    id: crypto.randomUUID(),
                    code,
                    name,
                    description,
                    parentId,
                    isFolder,
                    createdAt: Date.now(),
                    modifiedAt: Date.now(),
                };

                set(state => ({
                    concepts: [...state.concepts, newConcept]
                }));

                const { session, isGuest } = useUserStore.getState();
                if (!isGuest && session) {
                    VmindSyncEngine.getInstance().push('UPSERT_CONCEPT', { concept: newConcept }, session.user.id);
                }

                return newConcept;
            },

            updateConcept: async (id, updates) => {
                set(state => ({
                    concepts: state.concepts.map(c =>
                        c.id === id ? { ...c, ...updates, modifiedAt: Date.now() } : c
                    )
                }));

                const { session, isGuest } = useUserStore.getState();
                if (!isGuest && session) {
                    const updated = get().concepts.find(c => c.id === id);
                    if (updated) {
                        VmindSyncEngine.getInstance().push('UPSERT_CONCEPT', { concept: updated }, session.user.id);
                    }
                }
                return true;
            },

            deleteConcept: async (id) => {
                // 1. Get all IDs to delete (self + recursive children)
                const allConceptIdsToDelete = [id, ...get().getRecursiveChildIds(id)];

                set(state => ({
                    concepts: state.concepts.filter(c => !allConceptIdsToDelete.includes(c.id)),
                    conceptLevels: state.conceptLevels.filter(l => !allConceptIdsToDelete.includes(l.conceptId))
                }));

                const { session, isGuest } = useUserStore.getState();
                if (!isGuest && session) {
                    // Sync each deletion to backup
                    for (const conceptId of allConceptIdsToDelete) {
                        VmindSyncEngine.getInstance().push('DELETE_CONCEPT', { conceptId }, session.user.id);
                    }
                }
                return true;
            },

            createLevel: async (conceptId, name, order, description) => {
                const newLevel: ConceptLevel = {
                    id: crypto.randomUUID(),
                    conceptId,
                    name,
                    order,
                    description,
                    createdAt: Date.now()
                };

                set(state => ({
                    conceptLevels: [...state.conceptLevels, newLevel]
                }));

                const { session, isGuest } = useUserStore.getState();
                if (!isGuest && session) {
                    VmindSyncEngine.getInstance().push('UPSERT_CONCEPT_LEVEL', { level: newLevel }, session.user.id);
                }

                return newLevel;
            },

            updateLevel: async (id, updates) => {
                set(state => ({
                    conceptLevels: state.conceptLevels.map(l =>
                        l.id === id ? { ...l, ...updates } : l
                    )
                }));

                const { session, isGuest } = useUserStore.getState();
                if (!isGuest && session) {
                    const updated = get().conceptLevels.find(l => l.id === id);
                    if (updated) {
                        VmindSyncEngine.getInstance().push('UPSERT_CONCEPT_LEVEL', { level: updated }, session.user.id);
                    }
                }
                return true;
            },

            deleteLevel: async (id) => {
                set(state => ({
                    conceptLevels: state.conceptLevels.filter(l => l.id !== id)
                }));

                const { session, isGuest } = useUserStore.getState();
                if (!isGuest && session) {
                    VmindSyncEngine.getInstance().push('DELETE_CONCEPT_LEVEL', { levelId: id }, session.user.id);
                }
                return true;
            },

            getLevelsByConcept: (conceptId) => {
                return get().conceptLevels
                    .filter(l => l.conceptId === conceptId)
                    .sort((a, b) => a.order - b.order);
            },

            getConceptByCode: (code) => {
                return get().concepts.find(c => c.code === code);
            },

            getRowsByLevel: (levelId) => {
                // This is a cross-store query.
                // Access useTableStore directly.
                const allTables = useTableStore.getState().tables;
                const matchingRows: VocabRow[] = [];

                allTables.forEach(table => {
                    table.rows.forEach(row => {
                        if (row.conceptLevelIds?.includes(levelId) || row.conceptLevelId === levelId) {
                            matchingRows.push(row);
                        }
                    });
                });

                return matchingRows;
            },

            // Hierarchy Helpers
            getChildConcepts: (parentId) => {
                return get().concepts.filter(c => c.parentId === parentId);
            },

            getRootConcepts: () => {
                return get().concepts.filter(c => !c.parentId);
            },

            getConceptHierarchy: (conceptId) => {
                const hierarchy: Concept[] = [];
                const concepts = get().concepts;

                let current = concepts.find(c => c.id === conceptId);
                while (current) {
                    hierarchy.unshift(current);
                    current = current.parentId ? concepts.find(c => c.id === current!.parentId) : undefined;
                }

                return hierarchy;
            },

            // Search Functions
            searchConceptsByName: (query) => {
                if (!query.trim()) return get().concepts;

                const lowerQuery = query.toLowerCase();
                return get().concepts.filter(c =>
                    c.name.toLowerCase().includes(lowerQuery) ||
                    c.code.toLowerCase().includes(lowerQuery) ||
                    c.description?.toLowerCase().includes(lowerQuery)
                );
            },

            searchCardsByConceptLevel: (levelId, query) => {
                const rows = get().getRowsByLevel(levelId);

                if (!query.trim()) return rows;

                const lowerQuery = query.toLowerCase();
                return rows.filter(row => {
                    // Search across all column values
                    return Object.values(row.cols).some(value =>
                        value.toLowerCase().includes(lowerQuery)
                    );
                });
            },

            // Hierarchy Helpers
            getRecursiveChildIds: (parentId: string) => {
                const { concepts } = get();
                const children = concepts.filter(c => c.parentId === parentId);
                let ids = children.map(c => c.id);
                for (const child of children) {
                    ids = [...ids, ...get().getRecursiveChildIds(child.id)];
                }
                return ids;
            },
            setInitialData: (data) => {
                set({
                    concepts: data.concepts,
                    conceptLevels: data.conceptLevels,
                    isHydrated: true // Mark as hydrated
                });
            },

            cleanupDuplicateConcepts: async () => {
                const { concepts } = get();
                const uniqueCodes = new Set<string>();
                const idsToDelete: string[] = [];

                // 1. Identify duplicates
                concepts.forEach(c => {
                    const key = c.code; // Key by code only
                    if (uniqueCodes.has(key)) {
                        idsToDelete.push(c.id);
                    } else {
                        uniqueCodes.add(key);
                    }
                });

                if (idsToDelete.length === 0) return;

                console.log(`[Cleanup] Found ${idsToDelete.length} duplicate concepts. Deleting...`);

                // 2. Remove from local state
                set(state => ({
                    concepts: state.concepts.filter(c => !idsToDelete.includes(c.id)),
                    // Also cleanup orphan levels if necessary, though simpler to just leave orphans or cascade delete
                    // For now, let's just delete the concepts.
                }));

                // 3. Sync deletions to Server
                const { session, isGuest } = useUserStore.getState();
                if (!isGuest && session) {
                    for (const conceptId of idsToDelete) {
                        try {
                            VmindSyncEngine.getInstance().push('DELETE_CONCEPT', { conceptId }, session.user.id);
                        } catch (e) {
                            console.error(`[Cleanup] Failed to queue delete for ${conceptId}`, e);
                        }
                    }
                }
            }
        }),
        {
            name: 'vmind-concept-store',
            onRehydrateStorage: () => (state) => {
                // Only mark as hydrated if we actually restored some data.
                // Otherwise custom initial fetch will handle it.
                if (state && (state.concepts.length > 0 || state.conceptLevels.length > 0)) {
                    state.setInitialData({
                        concepts: state.concepts,
                        conceptLevels: state.conceptLevels
                    });
                }
            }
            // We persist mainly for local dev/testing if generic sync isn't hooking this up yet.
        }
    )
);
