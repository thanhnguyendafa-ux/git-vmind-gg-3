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
  saveConfidenceProgress: (progress: ConfidenceProgress) => Promise<void>; // NEW ACTION
  deleteConfidenceProgress: (progressId: string) => Promise<void>;
  setStudyProgresses: (updater: (prev: StudyProgress[]) => StudyProgress[]) => Promise<void>;
  setAnkiProgresses: (updater: (prev: AnkiProgress[]) => AnkiProgress[]) => Promise<void>;
  
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
        // We don't automatically save full profile here anymore to avoid overwriting study_sets with JSON
      },

      saveConfidenceProgress: async (progress) => {
         const { session, isGuest } = useUserStore.getState();
         
         // 1. Update Local State
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
        await useUserStore.getState().saveUserProfile();
      },
      
      setAnkiProgresses: async (updater) => {
        const newProgresses = updater(get().ankiProgresses);
        set({ ankiProgresses: newProgresses });
        await useUserStore.getState().saveUserProfile();
      },

      clearNewWordCount: async (progressId) => {
        const { setConfidenceProgresses } = get();
        // Note: This local update triggers a re-render but doesn't persist to DB immediately unless we call saveConfidenceProgress
        // For UI responsiveness, local update is fine. We could optionally debounce a save.
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

      // --- NEW: Payload Loading Logic ---
      fetchSessionPayload: async (setId: string) => {
          try {
              const { data, error } = await supabase.rpc('get_study_session_payload', { p_set_id: setId });
              if (error) throw error;
              
              // The RPC returns an array of objects. Since we query for 1 set, we take index 0.
              const result = data[0]; 
              if (!result) return null;

              const { set_info, items, rows_data } = result;

              // 1. Hydrate Vocab Rows into TableStore (Cache)
              // This ensures the app knows the words involved in this session
              if (rows_data && rows_data.length > 0) {
                   const engine = VmindSyncEngine.getInstance();
                   // Lock the engine to prevent these hydration updates from being treated as local changes
                   engine.suspend();

                   const { upsertRow } = useTableStore.getState();
                   
                   // Iterate and update robustly
                   for (const r of rows_data) {
                        const { stats, tag_ids, ...rest } = r;
                        
                        // Manual mapping of snake_case DB stats to camelCase App stats
                        const formattedStats = {
                            ...stats,
                            // Basic
                            correct: stats.correct || 0,
                            incorrect: stats.incorrect || 0,
                            // Legacy/Confidence
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
                            // Anki
                            ankiRepetitions: stats.anki_repetitions,
                            ankiEaseFactor: stats.anki_ease_factor,
                            ankiInterval: stats.anki_interval,
                            ankiDueDate: stats.anki_due_date,
                        };
                        
                        const formattedRow: VocabRow = { 
                            id: r.id,
                            cols: r.cols || {},
                            stats: formattedStats,
                            tagIds: tag_ids || [], // Map tag_ids (DB) to tagIds (App)
                        };
                        
                        // Upsert without triggering a sync push
                        await upsertRow(r.table_id, formattedRow);
                   }
                   
                   engine.unsuspend();
              }

              // 2. Return structured data for the session to use
              // Reconstruction of "queue" and "cardStates" from 'items'
              const queue = items ? items.map((i: any) => i.row_id) : [];
              const cardStates: Record<string, any> = {};
              items?.forEach((i: any) => {
                  if (i.status) cardStates[i.row_id] = i.status;
              });

              const intervalConfig = set_info.settings?.intervalConfig;

              // Update the local store with the fetched payload to make it available for the session
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

              return {
                  ...set_info,
                  queue,
                  cardStates,
                  // settings from DB might need mapping back to App types
                  intervalConfig
              };

          } catch (e) {
              console.error("Failed to fetch session payload", e);
              useUIStore.getState().showToast("Error loading session data.", "error");
              return null;
          }
      }
    })
);