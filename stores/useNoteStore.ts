
import { create } from 'zustand';
import { Note, Screen } from '../types';
import { useUIStore } from './useUIStore';
import { useUserStore } from './useUserStore';
import { supabase } from '../services/supabaseClient';
import { VmindSyncEngine } from '../services/VmindSyncEngine';

interface NoteState {
  notes: Note[];
  createNote: (initialNote?: Partial<Note>) => Promise<void>;
  updateNote: (updatedNote: Note) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  handleSaveToJournal: (source: string, content: string) => void;
  setNotes: (notes: Note[]) => void;
  // NEW: Lazy Load Action
  fetchNoteContent: (noteId: string) => Promise<void>;
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
          
          // If content is already loaded (not undefined), skip
          if (note && note.content !== undefined) return;

          try {
              const { data, error } = await supabase
                  .from('notes')
                  .select('content')
                  .eq('id', noteId)
                  .single();
              
              if (error) throw error;
              
              if (data) {
                  set(state => ({
                      notes: state.notes.map(n => n.id === noteId ? { ...n, content: data.content } : n)
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
      setNotes: (notes) => set({ notes }),
    })
);
