import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Concept, ConceptLevel, VocabRow } from '../types';
import { useTableStore } from './useTableStore';

interface ConceptState {
    concepts: Concept[];
    conceptLevels: ConceptLevel[];

    // Actions
    createConcept: (code: string, name: string, description?: string) => Promise<Concept>;
    updateConcept: (id: string, updates: Partial<Concept>) => Promise<boolean>;
    deleteConcept: (id: string) => Promise<boolean>;

    createLevel: (conceptId: string, name: string, order: number, description?: string) => Promise<ConceptLevel>;
    updateLevel: (id: string, updates: Partial<ConceptLevel>) => Promise<boolean>;
    deleteLevel: (id: string) => Promise<boolean>;

    // Selectors/Helpers
    getLevelsByConcept: (conceptId: string) => ConceptLevel[];
    getConceptByCode: (code: string) => Concept | undefined;
    getRowsByLevel: (levelId: string) => VocabRow[];
}

export const useConceptStore = create<ConceptState>()(
    persist(
        (set, get) => ({
            concepts: [],
            conceptLevels: [],

            createConcept: async (code, name, description) => {
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
                    createdAt: Date.now(),
                    modifiedAt: Date.now(),
                };

                set(state => ({
                    concepts: [...state.concepts, newConcept]
                }));

                return newConcept;
            },

            updateConcept: async (id, updates) => {
                set(state => ({
                    concepts: state.concepts.map(c =>
                        c.id === id ? { ...c, ...updates, modifiedAt: Date.now() } : c
                    )
                }));
                return true;
            },

            deleteConcept: async (id) => {
                // Cascade delete levels
                const levels = get().conceptLevels.filter(l => l.conceptId === id);
                const levelIds = levels.map(l => l.id);

                // Ideally we should also unlink rows, but that might be expensive to scan all tables.
                // For now, we'll leave rows with dangling conceptLevelIds or handle it lazily.

                set(state => ({
                    concepts: state.concepts.filter(c => c.id !== id),
                    conceptLevels: state.conceptLevels.filter(l => l.conceptId !== id)
                }));
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

                return newLevel;
            },

            updateLevel: async (id, updates) => {
                set(state => ({
                    conceptLevels: state.conceptLevels.map(l =>
                        l.id === id ? { ...l, ...updates } : l
                    )
                }));
                return true;
            },

            deleteLevel: async (id) => {
                set(state => ({
                    conceptLevels: state.conceptLevels.filter(l => l.id !== id)
                }));
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
                        if (row.conceptLevelId === levelId) {
                            matchingRows.push(row);
                        }
                    });
                });

                return matchingRows;
            }

        }),
        {
            name: 'vmind-concept-store',
            // We persist mainly for local dev/testing if generic sync isn't hooking this up yet.
        }
    )
);
