
import { create } from 'zustand';
import { ConfidenceProgress, StudyProgress, AnkiProgress, VocabRow } from '../types';
import { useUserStore } from './useUserStore';
import { useTableStore } from './useTableStore';
import { useUIStore } from './useUIStore';
import { supabase } from '../services/supabaseClient';
import { VmindSyncEngine } from '../services/VmindSyncEngine';

interface SessionDataState {
  confidenceProgresses: ConfidenceProgress[];
  studyProgresses: StudyProgress[];
  ankiProgresses: AnkiProgress[];
  
  // Actions
  setConfidenceProgresses: (updater: (prev: ConfidenceProgress[]) => ConfidenceProgress[]) => Promise<void>;
  saveConfidenceProgress: (progress: ConfidenceProgress) => Promise<void>;
  deleteConfidenceProgress: (progressId: string) => Promise<void>;
  
  setStudyProgresses: (updater: (prev: StudyProgress[]) => StudyProgress[]) => Promise<void>;
  saveStudyProgress: (progress: StudyProgress) => Promise<void>; // NEW
  deleteStudyProgress: (progressId: string) => Promise<void>; // NEW

  setAnkiProgresses: (updater: (prev: AnkiProgress[]) => AnkiProgress[]) => Promise<void>;
  saveAnkiProgress: (progress: AnkiProgress) => Promise<void>; // NEW
  deleteAnkiProgress: (progressId: string) => Promise<void>; // NEW
  
  clearNewWordCount: (progressId: string) => Promise<void>;
  resetConfidenceProgress: (progressId: string) => Promise<void>;
  
  setInitialData: (data: { confidenceProgresses?: ConfidenceProgress[], studyProgresses?: StudyProgress[], ankiProgresses?: AnkiProgress[] }) => void;
  
  // NEW: Fetch Payload
  fetchSessionPayload: (setId: string) => Promise<any>;
}

export const useSessionDataStore = create<SessionDataState>()(
    (set, get) => ({
      confidenceProgresses: [],
      studyProgresses: [],
      ankiProgresses: [],
      
      setConfidenceProgresses: async (updater) => {
        const newProgresses = updater(get().confidenceProgresses);
        set({ confidenceProgresses: newProgresses });
      },

      saveConfidenceProgress: async (progress) => {
         const { session, isGuest } = useUserStore.getState();
         
         // 1. Update Local State (Complete Replacement)
         // This is a "set" operation, not a deep merge, so whatever is passed in `progress` becomes the truth.
         // This relies on the caller (ConfidenceSessionScreen) providing a COMPLETE object.
         set(state => {
             const exists = state.confidenceProgresses.find(p => p.id === progress.id);
             if (exists) {
                 return { confidenceProgresses: state.confidenceProgresses.map(p => p.id === progress.id ? progress : p) };
             }
             return { confidenceProgresses: [...state.confidenceProgresses, progress] };
         });

         // 2. Push to Sync Engine (if logged in)
         if (isGuest || !session) return;
         
         VmindSyncEngine.getInstance().push('UPSERT_STUDY_SET', { progress }, session.user.id);
      },

      deleteConfidenceProgress: async (progressId) => {
        const { session, isGuest } = useUserStore.getState();

        // 1. Optimistic Update
        set(state => ({
            confidenceProgresses: state.confidenceProgresses.filter(p => p.id !== progressId)
        }));

        // 2. Push to Sync Engine
        if (isGuest || !session) return;
        
        VmindSyncEngine.getInstance().push('DELETE_STUDY_SET', { setId: progressId }, session.user.id);
      },

      setStudyProgresses: async (updater) => {
        const newProgresses = updater(get().studyProgresses);
        set({ studyProgresses: newProgresses });
        // Legacy fallback: save full profile if not using atomic actions
        await useUserStore.getState().saveUserProfile();
      },

      saveStudyProgress: async (progress) => {
         const { session, isGuest } = useUserStore.getState();
         
         set(state => {
             const exists = state.studyProgresses.find(p => p.id === progress.id);
             if (exists) {
                 return { studyProgresses: state.studyProgresses.map(p => p.id === progress.id ? progress : p) };
             }
             return { studyProgresses: [...state.studyProgresses, progress] };
         });

         if (isGuest || !session) return;
         
         VmindSyncEngine.getInstance().push('UPSERT_STUDY_SET', { progress }, session.user.id);
      },

      deleteStudyProgress: async (progressId) => {
        const { session, isGuest } = useUserStore.getState();

        set(state => ({
            studyProgresses: state.studyProgresses.filter(p => p.id !== progressId)
        }));

        if (isGuest || !session) return;
        
        VmindSyncEngine.getInstance().push('DELETE_STUDY_SET', { setId: progressId }, session.user.id);
      },
      
      setAnkiProgresses: async (updater) => {
        const newProgresses = updater(get().ankiProgresses);
        set({ ankiProgresses: newProgresses });
        // Legacy fallback
        await useUserStore.getState().saveUserProfile();
      },

      saveAnkiProgress: async (progress) => {
         const { session, isGuest } = useUserStore.getState();
         
         set(state => {
             const exists = state.ankiProgresses.find(p => p.id === progress.id);
             if (exists) {
                 return { ankiProgresses: state.ankiProgresses.map(p => p.id === progress.id ? progress : p) };
             }
             return { ankiProgresses: [...state.ankiProgresses, progress] };
         });

         if (isGuest || !session) return;
         
         VmindSyncEngine.getInstance().push('UPSERT_STUDY_SET', { progress }, session.user.id);
      },

      deleteAnkiProgress: async (progressId) => {
        const { session, isGuest } = useUserStore.getState();

        set(state => ({
            ankiProgresses: state.ankiProgresses.filter(p => p.id !== progressId)
        }));

        if (isGuest || !session) return;
        
        VmindSyncEngine.getInstance().push('DELETE_STUDY_SET', { setId: progressId }, session.user.id);
      },

      clearNewWordCount: async (progressId) => {
        const { setConfidenceProgresses } = get();
        await setConfidenceProgresses(prev => 
            prev.map(p => p.id === progressId ? { ...p, newWordCount: 0 } : p)
        );
      },

      resetConfidenceProgress: async (progressId) => {
        const { confidenceProgresses, saveConfidenceProgress } = get();
        const progress = confidenceProgresses.find(p => p.id === progressId);
        if (progress) {
            const resetProgress = { ...progress, currentIndex: 0, cardStates: {} };
            await saveConfidenceProgress(resetProgress);
        }
      },

      setInitialData: (data) => set({ 
          confidenceProgresses: data.confidenceProgresses || [],
          studyProgresses: data.studyProgresses || [],
          ankiProgresses: data.ankiProgresses || [],
      }),

      // --- Payload Loading Logic ---
      fetchSessionPayload: async (setId: string) => {
          try {
              const { data, error } = await supabase.rpc('get_study_session_payload', { p_set_id: setId });
              if (error) throw error;
              
              const result = data[0]; 
              if (!result) return null;

              const { set_info, items, rows_data } = result;

              // 1. Hydrate Vocab Rows into TableStore (Cache)
              if (rows_data && rows_data.length > 0) {
                   const engine = VmindSyncEngine.getInstance();
                   engine.suspend();

                   const { upsertRow } = useTableStore.getState();
                   
                   for (const r of rows_data) {
                        const { stats, tag_ids, ...rest } = r;
                        
                        const formattedStats = {
                            ...stats,
                            correct: stats.correct || 0,
                            incorrect: stats.incorrect || 0,
                            lastStudied: stats.last_studied,
                            flashcardStatus: stats.flashcard_status,
                            flashcardEncounters: stats.flashcard_encounters,
                            isFlashcardReviewed: stats.is_flashcard_reviewed,
                            lastPracticeDate: stats.last_practice_date,
                            scrambleEncounters: stats.scramble_encounters,
                            scrambleRatings: stats.scramble_ratings,
                            theaterEncounters: stats.theater_encounters,
                            inQueueCount: stats.in_queue_count,
                            wasQuit: stats.was_quit,
                            ankiRepetitions: stats.anki_repetitions,
                            ankiEaseFactor: stats.anki_ease_factor,
                            ankiInterval: stats.anki_interval,
                            ankiDueDate: stats.anki_due_date,
                        };
                        
                        const formattedRow: VocabRow = { 
                            id: r.id,
                            cols: r.cols || {},
                            stats: formattedStats,
                            tagIds: tag_ids || [],
                        };
                        
                        await upsertRow(r.table_id, formattedRow);
                   }
                   
                   engine.unsuspend();
              }

              // 2. Reconstruct session state
              if (set_info.type === 'confidence') {
                  // PRIORITY: Use Metadata in Settings (Layer 1 - Fast & Safe)
                  let queue = set_info.settings?.queue;
                  let cardStates = set_info.settings?.cardStates;

                  // Fallback: Reconstruct from Items (Layer 2 - Legacy/Analytics)
                  // This is only used if the JSON metadata is missing (e.g. from old migration)
                  if (!queue || !cardStates) {
                      queue = items ? items.map((i: any) => i.row_id) : [];
                      cardStates = {};
                      items?.forEach((i: any) => {
                          if (i.status) cardStates[i.row_id] = i.status;
                      });
                  }

                  const intervalConfig = set_info.settings?.intervalConfig;
                  
                  // Ensure defaults
                  if (!cardStates) cardStates = {};
                  if (!queue) queue = [];

                  set(state => ({
                      confidenceProgresses: state.confidenceProgresses.map(p => {
                          if (p.id === setId) {
                              return {
                                  ...p,
                                  queue,
                                  cardStates,
                                  intervalConfig
                              };
                          }
                          return p;
                      })
                  }));

                  return { ...set_info, queue, cardStates, intervalConfig };
              }
              
              return set_info;

          } catch (e) {
              console.error("Failed to fetch session payload", e);
              useUIStore.getState().showToast("Error loading session data.", "error");
              return null;
          }
      }
    })
);
