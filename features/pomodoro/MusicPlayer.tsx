import * as React from 'react';
import Icon from '../../components/ui/Icon';
import { useMusicStore, Track, RepeatMode } from '../../stores/useMusicStore';
import { playClickSound, playToggleSound } from '../../services/soundService';

// Configured 4 tracks as requested
const tracks: Track[] = [
    { id: 'rain', name: 'Rain', icon: 'cloud-rain', url: 'https://storage.googleapis.com/aai-web-samples/vmind/audio/rain.mp3' },
    { id: 'lofi', name: 'Lofi', icon: 'headphones', url: 'https://storage.googleapis.com/aai-web-samples/vmind/audio/lofi.mp3' },
    { id: 'whitenoise', name: 'White Noise', icon: 'waveform', url: 'https://storage.googleapis.com/aai-web-samples/vmind/audio/whitenoise.mp3' },
    { id: 'brownnoise', name: 'Brown Noise', icon: 'waveform', url: 'https://storage.googleapis.com/aai-web-samples/vmind/audio/brownnoise.mp3' },
];

const allTrackIds = tracks.map(t => t.id);

const MusicPlayer: React.FC = () => {
    const { 
        isOpen, isPlaying, currentTrack, volume, repeatMode, isShuffled, shuffledQueue,
        togglePlay, setTrack, setVolume, setIsOpen, cycleRepeatMode, toggleShuffle 
    } = useMusicStore();
    const audioRef = React.useRef<HTMLAudioElement>(null);
    
    const playNext = React.useCallback(() => {
        const { isShuffled, shuffledQueue, currentTrack, repeatMode, togglePlay, setTrack } = useMusicStore.getState();
        const queue = isShuffled ? shuffledQueue : allTrackIds;
        const currentId = currentTrack?.id;
        if (!currentId || queue.length === 0) return;
        
        let currentIndex = queue.indexOf(currentId);
        let nextIndex = currentIndex + 1;

        if (nextIndex >= queue.length) {
            if (repeatMode === 'all') {
                nextIndex = 0;
            } else {
                togglePlay(); // Stop playing
                return;
            }
        }
        
        const nextTrackId = queue[nextIndex];
        const nextTrack = tracks.find(t => t.id === nextTrackId);
        if (nextTrack) {
            setTrack(nextTrack);
        }
    }, []);

    React.useEffect(() => {
        const audioEl = audioRef.current;
        if (!audioEl) return;
        audioEl.volume = volume;

        const handleEnded = () => {
            const { repeatMode } = useMusicStore.getState();
            if (repeatMode === 'one') {
                audioEl.currentTime = 0;
                audioEl.play();
            } else {
                playNext();
            }
        };

        audioEl.addEventListener('ended', handleEnded);
        return () => audioEl.removeEventListener('ended', handleEnded);
    }, [volume, playNext]);

    React.useEffect(() => {
        const audioEl = audioRef.current;
        if (!audioEl) return;

        if (isPlaying && currentTrack) {
            if (audioEl.src !== currentTrack.url) {
                audioEl.src = currentTrack.url;
            }
    
            const playPromise = audioEl.play();
    
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    if (error.name === 'AbortError') return;
                    console.error("Audio play failed:", error);
                    if (useMusicStore.getState().isPlaying) useMusicStore.getState().togglePlay();
                });
            }
        } else {
            audioEl.pause();
        }
    }, [isPlaying, currentTrack]);
    
    React.useEffect(() => {
        if (isOpen && !currentTrack) {
            setTrack(tracks[0]);
        }
    }, [isOpen, currentTrack, setTrack]);

    if (!isOpen) {
        return null;
    }

    const handleTrackSelect = (track: Track) => {
        playClickSound();
        setTrack(track);
    };
    
    const playPrev = () => {
        const queue = isShuffled ? shuffledQueue : allTrackIds;
        if (!currentTrack || queue.length === 0) return;
        
        let currentIndex = queue.indexOf(currentTrack.id);
        let prevIndex = currentIndex - 1;

        if (prevIndex < 0) {
            if (repeatMode === 'all') {
                prevIndex = queue.length - 1;
            } else {
                return; // Do nothing if at the start and not repeating
            }
        }
        
        const prevTrackId = queue[prevIndex];
        const prevTrack = tracks.find(t => t.id === prevTrackId);
        if (prevTrack) handleTrackSelect(prevTrack);
    };
    
    const repeatIcon: { [key in RepeatMode]: string } = {
        none: 'repeat',
        one: 'repeat-one',
        all: 'repeat',
    };

    return (
        <div className="fixed bottom-24 left-5 z-40 w-full max-w-xs bg-surface dark:bg-secondary-800 rounded-xl shadow-2xl flex flex-col border border-secondary-200 dark:border-secondary-700 animate-slideInUp">
            <audio ref={audioRef} loop={false} />
            <header className="flex justify-between items-center p-3 border-b border-secondary-200 dark:border-secondary-700">
                <h3 className="font-bold text-sm text-text-main dark:text-secondary-100 flex items-center gap-2">
                    <Icon name="music-note" className="w-5 h-5 text-primary-500" />
                    Focus Music
                </h3>
                 <button onClick={() => setIsOpen(false)} className="text-secondary-400 hover:text-text-main dark:hover:text-secondary-100 transition-colors p-1 rounded-full hover:bg-secondary-200 dark:hover:bg-secondary-700">
                    <Icon name="x" className="w-4 h-4" />
                </button>
            </header>
            <div className="p-4">
                <div className="flex items-center justify-around">
                     <button onClick={() => { playToggleSound(); toggleShuffle(allTrackIds); }} className={`p-2 transition-colors ${isShuffled ? 'text-primary-500' : 'text-text-subtle hover:text-primary-500'}`} title="Shuffle"><Icon name="shuffle" className="w-5 h-5"/></button>
                     <button onClick={playPrev} className="p-2 text-text-subtle hover:text-primary-500"><Icon name="arrowLeft" className="w-6 h-6"/></button>
                     <button onClick={togglePlay} className="w-14 h-14 flex items-center justify-center bg-primary-500 hover:bg-primary-600 text-white rounded-full shadow-lg">
                        <Icon name={isPlaying ? 'pause' : 'play'} className="w-7 h-7"/>
                    </button>
                     <button onClick={playNext} className="p-2 text-text-subtle hover:text-primary-500"><Icon name="arrowRight" className="w-6 h-6"/></button>
                     <button onClick={() => { playToggleSound(); cycleRepeatMode(); }} className={`p-2 transition-colors ${repeatMode !== 'none' ? 'text-primary-500' : 'text-text-subtle hover:text-primary-500'}`} title={`Repeat: ${repeatMode}`}><Icon name={repeatIcon[repeatMode]} className="w-5 h-5"/></button>
                </div>
                <div className="text-center mt-3">
                    <p className="font-semibold text-text-main dark:text-secondary-100">{currentTrack?.name || 'Select a track'}</p>
                    <p className="text-xs text-text-subtle mt-1">~2 min duration</p>
                </div>

                <div className="flex items-center gap-2 mt-4">
                    <Icon name="volume-down" className="w-5 h-5 text-text-subtle"/>
                    <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.01" 
                        value={volume} 
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="w-full h-2 bg-secondary-200 rounded-lg appearance-none cursor-pointer dark:bg-secondary-700"
                    />
                    <Icon name="volume-up" className="w-5 h-5 text-text-subtle"/>
                </div>
                
                <div className="mt-4 pt-4 border-t border-secondary-200 dark:border-secondary-700 grid grid-cols-2 gap-2">
                    {tracks.map(track => (
                        <button 
                            key={track.id}
                            onClick={() => handleTrackSelect(track)}
                            className={`flex items-center justify-between p-2 rounded-md text-sm font-semibold transition-colors ${currentTrack?.id === track.id ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300' : 'hover:bg-secondary-100 dark:hover:bg-secondary-700/50'}`}
                        >
                            <div className="flex items-center gap-2">
                                <Icon name={track.icon} className="w-4 h-4"/>
                                {track.name}
                            </div>
                            {currentTrack?.id === track.id && isPlaying && (
                                <span className="flex h-2 w-2 relative">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MusicPlayer;