import { create } from 'zustand';
import { playSpeech, stopSpeech } from '../services/audioService';

type AudioStateStatus = 'loading' | 'playing' | 'error' | 'idle';

type AudioState = {
    playingId: string | null;
    status: AudioStateStatus;
};

// Define the shape of a single speech request
export interface SpeechRequest {
    text: string;
    lang: string;
}

interface AudioStoreState {
    audioState: AudioState;
    speechQueue: SpeechRequest[];
    queueId: string | null;
    // The main function to play a sequence of texts
    playQueue: (requests: SpeechRequest[], id: string) => void;
    // Function to stop the current queue
    stopQueue: () => void;
}

export const useAudioStore = create<AudioStoreState>((set, get) => ({
    audioState: { playingId: null, status: 'idle' },
    speechQueue: [],
    queueId: null,

    playQueue: (requests, id) => {
        const { audioState, stopQueue } = get();

        // If the same queue is already playing, stop it.
        if (audioState.playingId === id && (audioState.status === 'playing' || audioState.status === 'loading')) {
            stopQueue();
            return;
        }

        // Stop any currently playing audio before starting a new queue.
        stopQueue();
        
        if (requests.length === 0) {
            return;
        }

        set({ speechQueue: requests, queueId: id, audioState: { playingId: id, status: 'playing' } });
        
        const playNextInQueue = () => {
            const { speechQueue, stopQueue: internalStop } = get();
            
            if (speechQueue.length === 0) {
                // End of queue, but wait for final delay before resetting state
                setTimeout(() => {
                    const { queueId: currentQueueId } = get();
                    if (currentQueueId === id) { // Ensure another queue hasn't started
                       set({ audioState: { playingId: null, status: 'idle' }, queueId: null });
                    }
                }, 3000);
                return;
            }

            const [nextRequest, ...remainingQueue] = speechQueue;
            set({ speechQueue: remainingQueue });

            playSpeech(nextRequest.text, nextRequest.lang)
                .then(() => {
                    // After utterance ends, wait 3 seconds before playing the next one if there are more items
                    if (get().speechQueue.length > 0) {
                        setTimeout(() => {
                            // Check if the queue was stopped during the timeout
                            if (get().audioState.status === 'playing' && get().queueId === id) {
                               playNextInQueue();
                            }
                        }, 3000);
                    } else {
                        // This was the last item, start the final timeout to clear the state
                        playNextInQueue();
                    }
                })
                .catch(error => {
                    console.error("Speech synthesis error:", error);
                    internalStop();
                });
        };

        playNextInQueue();
    },

    stopQueue: () => {
        stopSpeech(); // Stop browser TTS
        set({ 
            speechQueue: [], 
            queueId: null,
            audioState: { playingId: null, status: 'idle' }
        });
    },
}));