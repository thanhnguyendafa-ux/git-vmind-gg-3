
import * as React from 'react';
import Icon from '../../components/ui/Icon';
import { useMusicStore, Track, RepeatMode } from '../../stores/useMusicStore';
import { playClickSound, playToggleSound } from '../../services/soundService';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useUIStore } from '../../stores/useUIStore';
import { extractVideoID, loadYouTubeAPI } from '../../utils/youtubeUtils';

// Clean Slate: No default tracks
const DEFAULT_TRACKS: Track[] = [];

const MusicPlayer: React.FC = () => {
    const { 
        isOpen, isPlaying, currentTrack, volume, repeatMode, isShuffled, shuffledQueue, customTracks,
        togglePlay, setTrack, setVolume, setIsOpen, cycleRepeatMode, toggleShuffle, addCustomTrack, removeCustomTrack 
    } = useMusicStore();
    const { showToast } = useUIStore();
    
    // Engine 1: HTML5 Audio
    const audioRef = React.useRef<HTMLAudioElement>(null);
    // Engine 2: YouTube IFrame
    const playerRef = React.useRef<any>(null);
    
    // UI State for adding tracks
    const [isAdding, setIsAdding] = React.useState(false);
    const [newTrackName, setNewTrackName] = React.useState('');
    const [newTrackUrl, setNewTrackUrl] = React.useState('');
    
    // Combine defaults with custom tracks
    const allTracks = React.useMemo(() => [...DEFAULT_TRACKS, ...customTracks], [customTracks]);
    const allTrackIds = React.useMemo(() => allTracks.map(t => t.id), [allTracks]);

    // Determine current engine type
    const currentVideoId = React.useMemo(() => currentTrack ? extractVideoID(currentTrack.url) : null, [currentTrack]);
    const isYouTube = !!currentVideoId;

    const playNext = React.useCallback(() => {
        const { isShuffled, shuffledQueue, currentTrack, repeatMode, togglePlay, setTrack } = useMusicStore.getState();
        
        // Re-derive tracks inside callback to ensure freshness
        const combinedTracks = [...DEFAULT_TRACKS, ...useMusicStore.getState().customTracks];
        const combinedIds = combinedTracks.map(t => t.id);

        const queue = isShuffled ? shuffledQueue : combinedIds;
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
        const nextTrack = combinedTracks.find(t => t.id === nextTrackId);
        if (nextTrack) {
            setTrack(nextTrack);
        }
    }, []);

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
        const prevTrack = allTracks.find(t => t.id === prevTrackId);
        if (prevTrack) {
            playClickSound();
            setTrack(prevTrack);
        }
    };

    // --- Engine 1: HTML5 Audio Setup ---
    React.useEffect(() => {
        const audioEl = audioRef.current;
        if (!audioEl) return;
        
        const handleEnded = () => {
            const { repeatMode } = useMusicStore.getState();
            if (repeatMode === 'one') {
                audioEl.currentTime = 0;
                audioEl.play();
            } else {
                playNext();
            }
        };

        const handleError = () => {
            // Only handle error if we are supposed to be playing via Audio Engine
            if (!isYouTube && audioEl.error) {
                console.error("Audio Playback Error", audioEl.error);
                showToast("Cannot play this track. Skipping...", "error");
                playNext();
            }
        };

        audioEl.addEventListener('ended', handleEnded);
        audioEl.addEventListener('error', handleError);
        
        return () => {
            audioEl.removeEventListener('ended', handleEnded);
            audioEl.removeEventListener('error', handleError);
        };
    }, [isYouTube, playNext, showToast]);

    // --- Engine 2: YouTube API Setup ---
    React.useEffect(() => {
        loadYouTubeAPI().then(() => {
            if (!playerRef.current) {
                // Initialize hidden player
                playerRef.current = new window.YT.Player('youtube-music-player', {
                    height: '0',
                    width: '0',
                    playerVars: {
                        'playsinline': 1,
                        'controls': 0,
                        'enablejsapi': 1,
                        'origin': window.location.origin,
                    },
                    events: {
                        'onReady': (event: any) => {
                            event.target.setVolume(useMusicStore.getState().volume * 100);
                        },
                        'onStateChange': (event: any) => {
                            // YT.PlayerState.ENDED = 0
                            if (event.data === 0) {
                                const { repeatMode } = useMusicStore.getState();
                                if (repeatMode === 'one') {
                                    event.target.seekTo(0);
                                    event.target.playVideo();
                                } else {
                                    playNext();
                                }
                            }
                        },
                        'onError': (event: any) => {
                             console.error("YouTube Player Error:", event.data);
                             // Error codes: 2 (invalid param), 5 (HTML5 error), 100 (not found), 101/150 (embedded restricted)
                             let msg = "Playback error.";
                             if (event.data === 150 || event.data === 101) msg = "This video restricts playback.";
                             showToast(msg + " Skipping...", "error");
                             playNext();
                        }
                    }
                });
            }
        });
        
        return () => {
            // Cleanup if needed, though keeping player instance is usually better for performance
        };
    }, [playNext, showToast]);

    // --- Dual-Engine Synchronization (Play/Pause/Track) ---
    React.useEffect(() => {
        const audioEl = audioRef.current;
        const ytPlayer = playerRef.current;
        
        // 1. YouTube Active
        if (isYouTube && ytPlayer && ytPlayer.loadVideoById) {
            // Ensure HTML5 audio is silent
            if (audioEl) audioEl.pause();

            // Load video if changed
            // We check getVideoData to see if the ID matches to avoid reloading same video
            const currentData = ytPlayer.getVideoData ? ytPlayer.getVideoData() : null;
            if (!currentData || currentData.video_id !== currentVideoId) {
                ytPlayer.loadVideoById(currentVideoId);
            }

            // Sync State
            if (isPlaying) {
                 ytPlayer.playVideo();
            } else {
                 ytPlayer.pauseVideo();
            }
        } 
        // 2. HTML5 Audio Active
        else if (!isYouTube && audioEl && currentTrack) {
            // Ensure YT is silent
            if (ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();

            if (audioEl.src !== currentTrack.url && !currentTrack.url.includes('youtube.com')) {
                const src = currentTrack.url.startsWith('/') 
                    ? window.location.origin + currentTrack.url 
                    : currentTrack.url;
                
                if (audioEl.src !== src) {
                    audioEl.src = src;
                }
            }

            if (isPlaying) {
                const playPromise = audioEl.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        if (error.name === 'AbortError') return;
                        console.error("Audio play failed:", error);
                        useMusicStore.getState().togglePlay();
                    });
                }
            } else {
                audioEl.pause();
            }
        }
        // 3. No Track / Reset
        else {
             if (audioEl) audioEl.pause();
             if (ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
        }

    }, [isYouTube, currentVideoId, currentTrack, isPlaying]);

    // --- Synchronization (Volume) ---
    React.useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
        if (playerRef.current && playerRef.current.setVolume) {
            playerRef.current.setVolume(volume * 100);
        }
    }, [volume]);
    
    // Auto-select first track if opened and none selected
    React.useEffect(() => {
        if (isOpen && !currentTrack && allTracks.length > 0) {
            setTrack(allTracks[0]);
        }
    }, [isOpen, currentTrack, setTrack, allTracks]);

    const handleAddTrack = () => {
        if (!newTrackName.trim() || !newTrackUrl.trim()) return;
        
        // Auto-detect YouTube
        const ytId = extractVideoID(newTrackUrl.trim());
        const iconName = ytId ? 'youtube' : 'link';

        const newTrack: Track = {
            id: `custom-${crypto.randomUUID()}`,
            name: newTrackName.trim(),
            url: newTrackUrl.trim(),
            icon: iconName,
            isCustom: true
        };
        
        addCustomTrack(newTrack);
        
        // Auto-select the new track if it's the first one
        if (allTracks.length === 0) {
            setTrack(newTrack);
        }

        setNewTrackName('');
        setNewTrackUrl('');
        setIsAdding(false);
        showToast(ytId ? "YouTube track added" : "Track added to playlist", "success");
    };

    const handleDeleteTrack = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        removeCustomTrack(id);
        showToast("Track removed", "info");
    };

    
    const repeatIcon: { [key in RepeatMode]: string } = {
        none: 'repeat',
        one: 'repeat-one',
        all: 'repeat',
    };

    return (
        <>
            {/* Engine 1: HTML5 Audio */}
            <audio ref={audioRef} loop={false} crossOrigin="anonymous" />
            
            {/* Engine 2: YouTube IFrame (Hidden) */}
            <div id="youtube-music-player" className="absolute top-0 left-0 w-0 h-0 overflow-hidden pointer-events-none opacity-0" />
            
            {/* The UI widget */}
            {isOpen && (
                <div className="fixed bottom-24 left-5 z-50 w-full max-w-xs bg-surface dark:bg-secondary-800 rounded-xl shadow-2xl flex flex-col border border-secondary-200 dark:border-secondary-700 animate-slideInUp">
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
                        {/* Controls */}
                        <div className="flex items-center justify-around mb-4">
                            <button onClick={() => { playToggleSound(); toggleShuffle(allTrackIds); }} disabled={allTracks.length === 0} className={`p-2 transition-colors ${isShuffled ? 'text-primary-500' : 'text-text-subtle hover:text-primary-500'} disabled:opacity-50`} title="Shuffle"><Icon name="shuffle" className="w-5 h-5"/></button>
                            <button onClick={playPrev} disabled={allTracks.length === 0} className="p-2 text-text-subtle hover:text-primary-500 disabled:opacity-50"><Icon name="arrowLeft" className="w-6 h-6"/></button>
                            <button onClick={togglePlay} disabled={allTracks.length === 0} className="w-14 h-14 flex items-center justify-center bg-primary-500 hover:bg-primary-600 text-white rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                                <Icon name={isPlaying ? 'pause' : 'play'} className="w-7 h-7"/>
                            </button>
                            <button onClick={playNext} disabled={allTracks.length === 0} className="p-2 text-text-subtle hover:text-primary-500 disabled:opacity-50"><Icon name="arrowRight" className="w-6 h-6"/></button>
                            <button onClick={() => { playToggleSound(); cycleRepeatMode(); }} className={`p-2 transition-colors ${repeatMode !== 'none' ? 'text-primary-500' : 'text-text-subtle hover:text-primary-500'}`} title={`Repeat: ${repeatMode}`}><Icon name={repeatIcon[repeatMode]} className="w-5 h-5"/></button>
                        </div>

                        {/* Now Playing Info */}
                        <div className="text-center mb-4">
                            <p className="font-semibold text-text-main dark:text-secondary-100 truncate px-4">{currentTrack?.name || (allTracks.length === 0 ? 'No tracks added' : 'Select a track')}</p>
                            <p className="text-xs text-text-subtle mt-1 flex items-center justify-center gap-1">
                                {isYouTube && <Icon name="youtube" className="w-3 h-3 text-error-500" variant="filled" />}
                                {currentTrack?.isCustom ? (isYouTube ? 'YouTube Audio' : 'Custom URL') : (allTracks.length === 0 ? 'Add YouTube/MP3 below' : 'Local Asset')}
                            </p>
                        </div>

                        {/* Volume Slider */}
                        <div className="flex items-center gap-2 mb-4">
                            <Icon name="volume-down" className="w-4 h-4 text-text-subtle"/>
                            <input 
                                type="range" 
                                min="0" 
                                max="1" 
                                step="0.01" 
                                value={volume} 
                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-secondary-200 rounded-lg appearance-none cursor-pointer dark:bg-secondary-700 accent-primary-500"
                            />
                            <Icon name="volume-up" className="w-4 h-4 text-text-subtle"/>
                        </div>
                        
                        {/* Playlist / Add Form */}
                        <div className="border-t border-secondary-200 dark:border-secondary-700 pt-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-text-subtle uppercase">Playlist</span>
                                <button 
                                    onClick={() => setIsAdding(!isAdding)} 
                                    className={`p-1 rounded hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors ${isAdding ? 'text-primary-500' : 'text-text-subtle'}`}
                                    title="Add Custom Track"
                                >
                                    <Icon name={isAdding ? 'minus' : 'plus'} className="w-4 h-4" />
                                </button>
                            </div>

                            {isAdding && (
                                <div className="mb-3 p-3 bg-secondary-50 dark:bg-secondary-900/50 rounded-lg border border-secondary-200 dark:border-secondary-700 space-y-2 animate-fadeIn">
                                    <Input 
                                        placeholder="Track Name" 
                                        value={newTrackName} 
                                        onChange={e => setNewTrackName(e.target.value)} 
                                        className="h-8 text-xs"
                                    />
                                    <Input 
                                        placeholder="https://...mp3 or YouTube Link" 
                                        value={newTrackUrl} 
                                        onChange={e => setNewTrackUrl(e.target.value)} 
                                        className="h-8 text-xs font-mono"
                                    />
                                    <div className="flex justify-end gap-2 pt-1">
                                        <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)} className="h-7 text-xs px-2">Cancel</Button>
                                        <Button size="sm" onClick={handleAddTrack} disabled={!newTrackName || !newTrackUrl} className="h-7 text-xs px-2">Add</Button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                {allTracks.length === 0 && !isAdding && (
                                    <div className="text-center py-4 text-text-subtle text-xs italic">
                                        Your playlist is empty. <br/>Click + to add YouTube or MP3 links.
                                    </div>
                                )}
                                {allTracks.map(track => {
                                    // Helper to identify youtube in list for visual cue
                                    const isYtItem = !!extractVideoID(track.url);
                                    return (
                                        <div 
                                            key={track.id}
                                            onClick={() => { playClickSound(); setTrack(track); }}
                                            className={`group flex items-center justify-between p-2 rounded-md text-sm font-semibold transition-colors cursor-pointer ${currentTrack?.id === track.id ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300' : 'hover:bg-secondary-100 dark:hover:bg-secondary-700/50'}`}
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                {currentTrack?.id === track.id && isPlaying ? (
                                                    <span className="flex h-2 w-2 relative flex-shrink-0">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                                                    </span>
                                                ) : (
                                                    <Icon name={isYtItem ? 'youtube' : track.icon} className={`w-4 h-4 flex-shrink-0 opacity-70 ${isYtItem ? 'text-error-500' : ''}`}/>
                                                )}
                                                <span className="truncate">{track.name}</span>
                                            </div>
                                            
                                            {track.isCustom && (
                                                <button 
                                                    onClick={(e) => handleDeleteTrack(track.id, e)}
                                                    className="p-1 text-text-subtle hover:text-error-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Delete"
                                                >
                                                    <Icon name="trash" className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default MusicPlayer;
