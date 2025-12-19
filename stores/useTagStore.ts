
import { create } from 'zustand';
import { Tag, TagScope } from '../types';
import { useTableStore } from './useTableStore';
import { useSessionDataStore } from './useSessionDataStore';
import { useUserStore } from './useUserStore';

import { generateUUID } from '../utils/uuidUtils';

interface TagState {
  tags: Tag[];
  addTag: (tagData: Omit<Tag, 'id'>) => Tag;
  updateTag: (tagId: string, updates: Partial<Omit<Tag, 'id'>>) => void;
  deleteTag: (tagId: string, childDeletionStrategy?: 'orphan' | 'delete') => void;
  findOrCreateTagsByName: (tagNames: string[]) => Tag[];
  setTags: (tags: Tag[]) => void;
}

export const useTagStore = create<TagState>()(
  (set, get) => ({
    tags: [],
    addTag: (tagData: Omit<Tag, 'id'>): Tag => {
      const newTag: Tag = { id: generateUUID(), ...tagData, scope: tagData.scope || 'global' };
      set(state => ({ tags: [...state.tags, newTag] }));
      useUserStore.getState().saveUserProfile();
      return newTag;
    },
    updateTag: (tagId: string, updates: Partial<Omit<Tag, 'id'>>): void => {
      set(state => ({
        tags: state.tags.map(tag => (tag.id === tagId ? { ...tag, ...updates } as Tag : tag)),
      }));
      useUserStore.getState().saveUserProfile();
    },
    deleteTag: (tagId: string, childDeletionStrategy?: 'orphan' | 'delete'): void => {
      const { tags, updateTag, deleteTag } = get();
      const children = tags.filter(t => t.parentId === tagId);

      if (children.length > 0 && childDeletionStrategy) {
        if (childDeletionStrategy === 'orphan') {
          children.forEach((child) => updateTag(child.id, { parentId: undefined }));
        } else if (childDeletionStrategy === 'delete') {
          children.forEach((child) => deleteTag(child.id, 'delete'));
        }
      }

      const tablesToUpdate = useTableStore.getState().tables.map(table => {
        const hasTag = table.tagIds?.includes(tagId);
        const hasRowTag = table.rows.some(row => row.tagIds?.includes(tagId));
        if (!hasTag && !hasRowTag) return null;

        return {
          ...table,
          tagIds: table.tagIds?.filter(id => id !== tagId),
          rows: table.rows.map(row => ({
            ...row,
            tagIds: row.tagIds?.filter(id => id !== tagId),
          })),
        };
      }).filter((t): t is any => t !== null);

      tablesToUpdate.forEach(t => useTableStore.getState().updateTable(t));

      useSessionDataStore.getState().setFlashcardProgresses(progresses =>
        progresses.map(p => ({ ...p, tagIds: p.tagIds?.filter(id => id !== tagId) })),
        { skipSave: true }
      );

      useSessionDataStore.getState().setAnkiProgresses(progresses =>
        progresses.map(p => ({ ...p, tagIds: p.tagIds?.filter(id => id !== tagId) })),
        { skipSave: true }
      );

      set(state => ({ tags: state.tags.filter(tag => tag.id !== tagId) }));
      useUserStore.getState().saveUserProfile();
    },
    findOrCreateTagsByName: (tagNames: string[]): Tag[] => {
      const { tags, addTag } = get();
      const tagMap = new Map<string, Tag>();
      tags.forEach(t => tagMap.set(t.name.toLowerCase(), t));

      const results: Tag[] = [];

      tagNames.forEach(name => {
        const lowerCaseName = name.trim().toLowerCase();
        if (!lowerCaseName) return;

        const existingTag = tagMap.get(lowerCaseName);
        if (existingTag) {
          results.push(existingTag);
        } else {
          const newTag = addTag({ name: lowerCaseName, scope: 'global' });
          results.push(newTag);
          tagMap.set(lowerCaseName, newTag);
        }
      });
      return results;
    },
    setTags: (tags: Tag[]): void => set({ tags }),
  })
);
