
import { create } from 'zustand';
import { Note, Bookmark, Screen } from '../types';
import { useUIStore } from './useUIStore';
import { useUserStore } from './useUserStore';
import { supabase } from '../services/supabaseClient';
import { VmindSyncEngine } from '../services/VmindSyncEngine';
import { useCounterStore } from './useCounterStore';

interface NoteState {
  notes: Note[];
  createNote: (initialNote?: Partial<Note>) => Promise<void>;
  updateNote: (updatedNote: Note) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  handleSaveToJournal: (source: string, content: string) => void;
  setNotes: (notes: Note[]) => void;
  // NEW: Lazy Load Action
  fetchNoteContent: (noteId: string) => Promise<void>;
  // Bookmark actions
  addBookmark: (noteId: string, bookmarkData: Omit<Bookmark, 'id' | 'noteId' | 'createdAt'>) => Promise<void>;
  removeBookmark: (noteId: string, bookmarkId: string) => Promise<void>;
  // NEW: Reading Progress Update Action
  updateNoteProgress: (noteId: string, progress: NonNullable<Note['progress']>) => Promise<void>;
}

// Helper to get date in yy-mm-dd format
const getFormattedDate = () => {
    const today = new Date();
    const year = String(today.getFullYear()).slice(-2);
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getEngine = () => VmindSyncEngine.getInstance();

export const useNoteStore = create<NoteState>()(
    (set, get) => ({
      notes: [],
      
      fetchNoteContent: async (noteId: string) => {
          const notes = get().notes;
          const note = notes.find(n => n.id === noteId);
          
          // Strict Guard: Only return if BOTH content and bookmarks are fully loaded.
          // This fixes the issue where initial metadata load sets content to null/string but bookmarks remains undefined.
          if (note && note.content !== undefined && note.bookmarks !== undefined) return;

          try {
              const { data, error } = await supabase
                  .from('notes')
                  .select('content, bookmarks') // Fetch bookmarks alongside content
                  .eq('id', noteId)
                  .single();
              
              if (error) throw error;
              
              if (data) {
                  set(state => ({
                      notes: state.notes.map(n => n.id === noteId ? { 
                          ...n, 
                          content: data.content,
                          bookmarks: data.bookmarks || [] // Hydrate bookmarks
                      } : n)
                  }));
              }
          } catch (e) {
              console.error("Failed to load note content", e);
              useUIStore.getState().showToast("Failed to load note content.", "error");
          }
      },

      createNote: async (initialNote) => {
        const { session, isGuest } = useUserStore.getState();
        const newNote: Note = { 
            id: crypto.randomUUID(), 
            title: 'New Note', 
            content: 'Start writing...', 
            tagIds: [],
            bookmarks: [],
            createdAt: Date.now(),
            ...initialNote 
        };
        
        // Optimistic update
        set(state => ({ notes: [...state.notes, newNote] }));
        
        if (isGuest || !session) return;
        
        // Use Sync Engine
        getEngine().push('UPSERT_NOTE', { note: newNote }, session.user.id);
      },
      updateNote: async (updatedNote) => {
        const { session, isGuest } = useUserStore.getState();

        // Optimistic update
        set(state => ({ notes: state.notes.map(n => n.id === updatedNote.id ? updatedNote : n) }));
        
        // Activity Tracking: Increment counter for this note
        useCounterStore.getState().increment(updatedNote.id);
        
        if (isGuest || !session) return;

        // Use Sync Engine
        getEngine().push('UPSERT_NOTE', { note: updatedNote }, session.user.id);
      },
      deleteNote: async (noteId) => {
        const { session, isGuest } = useUserStore.getState();
        
        // Optimistic update
        set(state => ({ notes: state.notes.filter(n => n.id !== noteId) }));

        if (isGuest || !session) return;
        
        // Use Sync Engine
        getEngine().push('DELETE_NOTE', { noteId }, session.user.id);
      },
      handleSaveToJournal: (source, content) => {
        const todayStr = getFormattedDate();
        const journalTitle = `[${todayStr} Journal]`;
        
        const existingNotes = get().notes;
        let todayNote = existingNotes.find(n => n.title === journalTitle);
        
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const contentToAppend = `\n\n---\n**${source}** (${time})\n${content}`;

        if (todayNote) {
            // Ensure we have content before appending
            const currentContent = todayNote.content || ''; 
            const updatedNote = { ...todayNote, content: `${currentContent}${contentToAppend}`};
            get().updateNote(updatedNote);
        } else {
            const initialContent = `Journal entry for ${todayStr}.${contentToAppend}`;
            const newNote: Partial<Note> = { title: journalTitle, content: initialContent, createdAt: Date.now() };
            get().createNote(newNote);
        }
        useUIStore.getState().showToast("Saved to Journal", "success", "View", () => {
            useUIStore.getState().setCurrentScreen(Screen.Journal);
        });
      },
      addBookmark: async (noteId, bookmarkData) => {
        const { notes } = get();
        const { session, isGuest } = useUserStore.getState();
        
        const note = notes.find(n => n.id === noteId);
        if (!note) return;
        
        const newBookmark: Bookmark = {
            id: crypto.randomUUID(),
            noteId,
            createdAt: Date.now(),
            ...bookmarkData
        };
        
        // Fallback: If bookmarks undefined (shouldn't happen with new fetch logic), initialize empty
        const currentBookmarks = note.bookmarks || [];

        const updatedNote = {
            ...note,
            bookmarks: [...currentBookmarks, newBookmark]
        };
        
        // 1. Optimistic Update (Local State Only)
        set(state => ({ notes: state.notes.map(n => n.id === noteId ? updatedNote : n) }));
        
        if (isGuest || !session) return;
        
        // 2. Atomic Sync Action
        getEngine().push('UPSERT_BOOKMARK', { noteId, bookmark: newBookmark }, session.user.id);
      },
      removeBookmark: async (noteId, bookmarkId) => {
        const { notes } = get();
        const { session, isGuest } = useUserStore.getState();
        
        const note = notes.find(n => n.id === noteId);
        if (!note) return;

        const updatedNote = {
            ...note,
            bookmarks: (note.bookmarks || []).filter(b => b.id !== bookmarkId)
        };
        
        // 1. Optimistic Update (Local State Only)
        set(state => ({ notes: state.notes.map(n => n.id === noteId ? updatedNote : n) }));
        
        if (isGuest || !session) return;
        
        // 2. Atomic Sync Action
        getEngine().push('DELETE_BOOKMARK', { noteId, bookmarkId }, session.user.id);
      },
      setNotes: (notes) => set({ notes }),
      
      updateNoteProgress: async (noteId, progress) => {
        const { session, isGuest } = useUserStore.getState();
        const note = get().notes.find(n => n.id === noteId);
        if (!note) return;

        const updatedNote = { ...note, progress };
        
        // Optimistic update (Silent, no toast)
        set(state => ({ notes: state.notes.map(n => n.id === noteId ? updatedNote : n) }));

        if (isGuest || !session) return;
        
        // Use Sync Engine (This will be batched by the component logic)
        getEngine().push('UPSERT_NOTE', { note: updatedNote }, session.user.id);
      },
    })
);
