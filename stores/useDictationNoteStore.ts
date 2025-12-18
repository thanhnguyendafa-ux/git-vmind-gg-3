
import { create } from 'zustand';
import { DictationNote } from '../types';
import { useUserStore } from './useUserStore';
import { supabase } from '../services/supabaseClient';
import { useUIStore } from './useUIStore';
import { VmindSyncEngine } from '../services/VmindSyncEngine';

interface DictationNoteState {
  dictationNotes: DictationNote[];
  createDictationNote: (title: string) => Promise<string>;
  updateDictationNote: (updatedNote: DictationNote) => Promise<void>;
  deleteDictationNote: (noteId: string) => Promise<void>;
  setDictationNotes: (notes: DictationNote[]) => void;
  // NEW: Lazy Load Action
  fetchDictationContent: (noteId: string) => Promise<void>;
}

const getEngine = () => VmindSyncEngine.getInstance();

export const useDictationNoteStore = create<DictationNoteState>()(
    (set, get) => ({
      dictationNotes: [],
      
      fetchDictationContent: async (noteId: string) => {
          const notes = get().dictationNotes;
          const note = notes.find(n => n.id === noteId);
          
          // If transcript is already loaded (array exists), skip
          if (note && note.transcript && note.transcript.length > 0) return;
          // Note: An empty transcript might be valid, but we assume undefined/null means unloaded.
          // Our types say transcript is optional `?`.

          try {
              const { data, error } = await supabase
                  .from('dictation_notes')
                  .select('transcript, practice_history')
                  .eq('id', noteId)
                  .single();
              
              if (error) throw error;
              
              if (data) {
                  set(state => ({
                      dictationNotes: state.dictationNotes.map(n => n.id === noteId ? { 
                          ...n, 
                          transcript: data.transcript,
                          practiceHistory: data.practice_history || [] 
                      } : n)
                  }));
              }
          } catch (e) {
              console.error("Failed to load dictation content", e);
              useUIStore.getState().showToast("Failed to load transcript.", "error");
          }
      },

      createDictationNote: async (title) => {
        const { session, isGuest } = useUserStore.getState();
        const newNote: DictationNote = { 
            id: crypto.randomUUID(), 
            title, 
            youtubeUrl: '', 
            transcript: [], 
            practiceHistory: [],
            isStarred: false 
        };
        
        // Optimistic update
        set(state => ({ dictationNotes: [...state.dictationNotes, newNote] }));
        
        if (isGuest || !session) return newNote.id;

        // Use Sync Engine
        getEngine().push('UPSERT_DICTATION', { note: newNote }, session.user.id);

        return newNote.id;
      },
      updateDictationNote: async (updatedNote) => {
        const { session, isGuest } = useUserStore.getState();

        // Optimistic update
        set(state => ({
          dictationNotes: state.dictationNotes.map(n => n.id === updatedNote.id ? updatedNote : n)
        }));

        if (isGuest || !session) return;
        
        // Use Sync Engine
        getEngine().push('UPSERT_DICTATION', { note: updatedNote }, session.user.id);
      },
      deleteDictationNote: async (noteId) => {
        const { session, isGuest } = useUserStore.getState();
        
        // Optimistic update
        set(state => ({
          dictationNotes: state.dictationNotes.filter(n => n.id !== noteId)
        }));

        if (isGuest || !session) return;

        // Use Sync Engine
        getEngine().push('DELETE_DICTATION', { noteId }, session.user.id);
      },
      setDictationNotes: (notes) => set({ dictationNotes: notes }),
    })
);
