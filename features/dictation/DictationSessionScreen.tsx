
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Icon from '../../components/ui/Icon';
import { useSessionStore } from '../../stores/useSessionStore';
import { useNoteStore } from '../../stores/useNoteStore';
import { useUIStore } from '../../stores/useUIStore';
import { useUserStore } from '../../stores/useUserStore';
import { loadYouTubeAPI } from '../../utils/youtubeUtils';
import { extractVideoID } from '../../utils/youtubeUtils';
import { useTableStore } from '../../stores/useTableStore';
import { StudyMode } from '../../types';

const normalizeText = (s: string) => s.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").replace(/\s{2,}/g, " ").trim();

interface LinkedSnippet {
    endSegmentIndex: number;
    audioDuration: number;
    fullText: string;
}

const DictationSessionScreen: React.FC = () => {
    const { activeDictationSession, handleFinishDictationSession } = useSessionStore();
    const { handleSaveToJournal } = useNoteStore();
    const { showToast } = useUIStore();
    const { tables } = useTableStore();
    if (!activeDictationSession) return null;

    const { note, startTime } = activeDictationSession;
    const transcript = note.transcript || [];
    const [activeIndex, setActiveIndex] = useState(0);
    const [userInputs, setUserInputs] = useState<Record<number, string>>({});
    const [results, setResults] = useState<Record<number, 'correct' | 'incorrect' | 'untouched'>>(
        Object.fromEntries(transcript.map((_, i) => [i, 'untouched']))
    );
    const [showAnswer, setShowAnswer] = useState(false);
    const [isTranscriptVisible, setIsTranscriptVisible] = useState(true);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isJournaled, setIsJournaled] = useState(false);
    const [loopCount, setLoopCount] = useState<number>(1);
    const [playbackRate, setPlaybackRate] = useState<number>(1);
    const [practiceMode, setPracticeMode] = useState<'individual' | 'linked'>('individual');
    const [isPlayerVisible, setIsPlayerVisible] = useState(false);
    const [playerError, setPlayerError] = useState<string | null>(null);
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const [isBlindMode, setIsBlindMode] = useState(true);

    const playerRef = useRef<any>(null);
    const segmentTimeoutRef = useRef<number | null>(null);
    const loopCounterRef = useRef(0);

    const videoId = extractVideoID(note.youtubeUrl);
    const currentEntry = transcript[activeIndex];

    const linkedSnippetsMap = useMemo(() => {
        const map = new Map<number, LinkedSnippet>();
        if (practiceMode !== 'linked') return map;

        for (const table of tables) {
            for (const relation of table.relations) {
                if (relation.dictationConfig && relation.dictationConfig.dictationNoteId === note.id) {
                    const { startSegmentIndex, endSegmentIndex } = relation.dictationConfig;
                    const segments = transcript.slice(startSegmentIndex, endSegmentIndex + 1);
                    if (segments.length > 0) {
                        const audioDuration = segments.reduce((sum, s) => sum + s.duration, 0);
                        const fullText = segments.map(s => s.text).join(' ');
                        map.set(startSegmentIndex, { endSegmentIndex, audioDuration, fullText });
                    }
                }
            }
        }
        return map;
    }, [practiceMode, tables, note.id, transcript]);

    const activeSnippet = practiceMode === 'linked' ? linkedSnippetsMap.get(activeIndex) : undefined;


    useEffect(() => {
        if (videoId) {
            loadYouTubeAPI().then(() => {
                if (!playerRef.current) {
                    playerRef.current = new window.YT.Player('yt-player-session', {
                        height: '360',
                        width: '640',
                        videoId: videoId,
                        host: 'https://www.youtube.com', // Explicit host often helps
                        playerVars: {
                            'playsinline': 1,
                            'origin': window.location.origin, // Critical for embedded permissions
                            'enablejsapi': 1,
                            'rel': 0
                        },
                        events: {
                            'onReady': (event: any) => {
                                event.target.setVolume(100);
                                setIsPlayerReady(true);
                            },
                            'onError': (event: any) => {
                                const code = event.data;
                                let msg = "Video error.";
                                if (code === 150 || code === 101 || code === 153) {
                                    msg = "Error 153: Video owner has blocked playback in apps. Please try a different video.";
                                } else if (code === 2) {
                                    msg = "Invalid Video ID.";
                                } else if (code === 5) {
                                    msg = "HTML5 Player Error.";
                                } else if (code === 100) {
                                    msg = "Video not found or private.";
                                }
                                setPlayerError(msg);
                                showToast(msg, "error");
                            }
                        }
                    });
                }
            });
        }
        const timer = setInterval(() => {
            setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
        return () => {
            clearInterval(timer);
            if (segmentTimeoutRef.current) clearTimeout(segmentTimeoutRef.current);
            try {
                playerRef.current?.destroy();
            } catch (e) { /* ignore destruction errors */ }
        };
    }, [videoId, startTime, showToast]);

    // Auto-Sync: Play segment whenever the index changes (e.g. user clicks Transcript Index)
    useEffect(() => {
        // Small delay to ensure state transitions (like practiceMode or activeEntry) are stable
        const timeout = setTimeout(() => {
            playCurrentSegment(true); // true = silent if player not ready
        }, 100);
        return () => clearTimeout(timeout);
    }, [activeIndex, practiceMode, loopCount, playbackRate, isPlayerReady]);

    const playCurrentSegment = (isAutoTrigger = false) => {
        if (playerError) {
            if (!isAutoTrigger) showToast(playerError, "error");
            return;
        }

        if (!playerRef.current || !currentEntry || !isPlayerReady || !playerRef.current.seekTo) {
            if (!isAutoTrigger && !isPlayerReady) showToast("Video player is loading...", "info");
            return;
        }

        if (segmentTimeoutRef.current) {
            clearTimeout(segmentTimeoutRef.current);
        }

        const duration = activeSnippet ? activeSnippet.audioDuration : currentEntry.duration;

        loopCounterRef.current = 1;
        // Ensure playback rate is set
        if (playerRef.current.setPlaybackRate) {
            playerRef.current.setPlaybackRate(playbackRate);
        }

        const executePlay = () => {
            try {
                playerRef.current.seekTo(currentEntry.start, true);
                playerRef.current.playVideo();

                segmentTimeoutRef.current = window.setTimeout(() => {
                    if (loopCount === -1 || loopCounterRef.current < loopCount) {
                        loopCounterRef.current++;
                        executePlay();
                    } else {
                        playerRef.current?.pauseVideo();
                    }
                }, (duration * 1000) / playbackRate);
            } catch (e) {
                console.error("Playback failed", e);
                showToast("Playback failed. Try refreshing.", "error");
            }
        };

        executePlay();
    };

    const handleCheck = () => {
        const userAnswer = userInputs[activeIndex] || '';
        const correctText = activeSnippet ? activeSnippet.fullText : currentEntry.text;
        const isCorrect = normalizeText(userAnswer) === normalizeText(correctText);
        setResults(prev => ({ ...prev, [activeIndex]: isCorrect ? 'correct' : 'incorrect' }));
    };

    const handleFinish = () => {
        const correctCount = Object.values(results).filter(r => r === 'correct').length;
        handleFinishDictationSession(activeDictationSession, { correct: correctCount, total: transcript.length });
    };

    const navigate = (newIndex: number) => {
        if (newIndex >= 0 && newIndex < transcript.length) {
            setActiveIndex(newIndex);
            setShowAnswer(false);
            setIsJournaled(false);
        }
    };

    const handleNext = () => {
        if (activeSnippet) {
            navigate(activeSnippet.endSegmentIndex + 1);
        } else {
            navigate(activeIndex + 1);
        }
    };

    const handleSaveJournalClick = () => {
        const textToSave = activeSnippet ? activeSnippet.fullText : currentEntry.text;
        handleSaveToJournal(`Dictation: ${note.title}`, `> ${textToSave}`);
        setIsJournaled(true);
    };

    const hasChecked = results[activeIndex] !== 'untouched';
    const resultStyle = results[activeIndex] === 'correct' ? 'border-success-500' : (results[activeIndex] === 'incorrect' ? 'border-error-500' : 'border-secondary-300 dark:border-secondary-600');

    return (
        <div className="flex flex-col md:flex-row h-[100dvh] bg-background dark:bg-secondary-900 pb-[env(safe-area-inset-bottom)] overflow-hidden">
            <main className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto hide-scrollbar">
                <header className="flex-shrink-0 flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <button onClick={() => { handleFinishDictationSession(activeDictationSession, { correct: 0, total: 0 }); }} className="md:hidden p-2 -ml-2 rounded-full hover:bg-secondary-200 dark:hover:bg-secondary-700 text-text-subtle">
                            <Icon name="arrowLeft" className="w-6 h-6" />
                        </button>
                        <div className="overflow-hidden">
                            <h1 className="text-xl font-bold text-text-main dark:text-secondary-100 truncate pr-2">{note.title}</h1>
                            <p className="text-sm text-text-subtle">Entry {activeIndex + 1} of {transcript.length}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="hidden md:flex items-center gap-2">
                            <span className="text-xs font-semibold text-text-subtle">Mode:</span>
                            <div className="flex rounded-full bg-secondary-200 dark:bg-secondary-700 p-1 text-xs font-semibold">
                                <button onClick={() => setPracticeMode('individual')} className={`px-2 py-1 rounded-full ${practiceMode === 'individual' ? 'bg-white dark:bg-secondary-600 shadow' : ''}`}>Individual</button>
                                <button onClick={() => setPracticeMode('linked')} className={`px-2 py-1 rounded-full ${practiceMode === 'linked' ? 'bg-white dark:bg-secondary-600 shadow' : ''}`}>Linked</button>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsPlayerVisible(!isPlayerVisible)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${isPlayerVisible ? 'bg-primary-100 text-primary-700 border border-primary-300' : 'bg-secondary-200 dark:bg-secondary-700 text-text-subtle border border-transparent'}`}
                            >
                                <Icon name={isPlayerVisible ? 'eye' : 'eye-off'} className="w-4 h-4" />
                                <span className="hidden sm:inline">{isPlayerVisible ? 'Video ON' : 'Video OFF'}</span>
                            </button>
                        </div>
                        <span className="font-mono text-sm text-text-subtle hidden sm:inline">{new Date(elapsedSeconds * 1000).toISOString().substr(14, 5)}</span>
                        <button onClick={handleFinish} className="bg-primary-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-primary-700 hidden md:block">Finish</button>
                    </div>
                </header>

                {playerError && (
                    <div className="mb-4 p-3 bg-error-100 border border-error-200 text-error-700 rounded-md text-sm flex items-center gap-2">
                        <Icon name="error-circle" className="w-5 h-5" />
                        {playerError}
                    </div>
                )}

                <div className="flex-1 flex flex-col items-center justify-start md:justify-center pb-20 md:pb-0">
                    <div className="w-full max-w-2xl bg-surface dark:bg-secondary-800 border border-secondary-200/80 dark:border-secondary-700/50 rounded-xl shadow-lg p-4 sm:p-6 mb-4">

                        <div className={`relative w-full aspect-video mb-6 rounded-lg overflow-hidden bg-black flex items-center justify-center transition-all duration-300 ${isPlayerVisible ? 'h-auto' : 'h-16 md:h-auto'}`}>
                            {/* The actual YouTube iframe will be placed here by the API */}
                            <div id="yt-player-session" className="w-full h-full"></div>

                            {!isPlayerVisible && (
                                <div className="absolute inset-0 bg-surface dark:bg-secondary-800 flex items-center justify-center border border-secondary-200 dark:border-secondary-700 rounded-lg">
                                    <button
                                        onClick={() => playCurrentSegment()}
                                        className={`w-full h-full flex items-center justify-center gap-3 transition-transform hover:scale-[1.02] ${playerError ? 'bg-secondary-100 cursor-not-allowed' : 'bg-surface dark:bg-secondary-800 hover:bg-secondary-50'}`}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center shadow-sm">
                                            {isPlayerReady || playerError ? (
                                                <Icon name={playerError ? 'error-circle' : 'play'} variant="filled" className="w-5 h-5 ml-0.5" />
                                            ) : (
                                                <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-start">
                                            <span className="text-sm font-bold text-text-main dark:text-secondary-100">
                                                {playerError ? 'Player Error' : (isPlayerReady ? 'Play Audio' : 'Loading Player...')}
                                            </span>
                                            <span className="text-xs text-text-subtle">{activeSnippet ? 'Linked Segment' : `Segment ${activeIndex + 1}`}</span>
                                        </div>
                                    </button>
                                </div>
                            )}

                            {isPlayerVisible && (
                                <div className="absolute inset-x-0 bottom-0 flex items-end justify-center pb-4 opacity-0 hover:opacity-100 transition-opacity bg-gradient-to-t from-black/60 to-transparent pointer-events-none">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); playCurrentSegment(); }}
                                        className="pointer-events-auto bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-6 py-2 rounded-full font-bold flex items-center gap-2"
                                    >
                                        <Icon name="play" className="w-5 h-5" />
                                        Replay Segment
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-center gap-4 mb-4">
                            <div>
                                <select id="loop-select-session" value={loopCount} onChange={e => setLoopCount(Number(e.target.value))} className="bg-secondary-100 dark:bg-secondary-700 border-none rounded-lg px-3 py-2 text-xs font-semibold focus:ring-0">
                                    <option value="1">Loop: 1x</option>
                                    <option value="3">Loop: 3x</option>
                                    <option value="5">Loop: 5x</option>
                                    <option value="-1">Loop: ∞</option>
                                </select>
                            </div>
                            <div>
                                <select id="speed-select-session" value={playbackRate} onChange={e => setPlaybackRate(Number(e.target.value))} className="bg-secondary-100 dark:bg-secondary-700 border-none rounded-lg px-3 py-2 text-xs font-semibold focus:ring-0">
                                    <option value="0.5">0.5x</option>
                                    <option value="0.75">0.75x</option>
                                    <option value="1">1x Speed</option>
                                    <option value="1.5">1.5x</option>
                                </select>
                            </div>
                        </div>

                        <textarea
                            value={userInputs[activeIndex] || ''}
                            onChange={(e) => setUserInputs(prev => ({ ...prev, [activeIndex]: e.target.value }))}
                            disabled={hasChecked}
                            placeholder="Type what you hear..."
                            rows={activeSnippet ? 5 : 3}
                            className={`w-full bg-secondary-100 dark:bg-secondary-700 border-2 rounded-lg px-4 py-3 text-lg transition-all duration-300 ${resultStyle} focus:ring-primary-500 focus:border-primary-500`}
                        />
                        {!hasChecked ? (
                            <button onClick={handleCheck} disabled={!userInputs[activeIndex]} className="mt-4 w-full bg-primary-600 text-white font-bold py-3.5 rounded-lg hover:bg-primary-700 disabled:opacity-50 shadow-lg shadow-primary-500/20 transition-all active:scale-[0.98]">Check Answer</button>
                        ) : (
                            <div className="mt-4 space-y-3 animate-fadeIn">
                                {showAnswer ? (
                                    <div className="p-4 bg-primary-50 dark:bg-primary-900/10 border border-primary-200 dark:border-primary-800/50 rounded-lg text-sm text-text-main dark:text-secondary-100 leading-relaxed animate-fadeIn">
                                        <div className="text-[10px] uppercase font-bold text-primary-600 mb-1 tracking-wider">Correct Transcript</div>
                                        {activeSnippet ? activeSnippet.fullText : currentEntry.text}
                                    </div>
                                ) : (
                                    <div className="p-6 border-2 border-dashed border-secondary-300 dark:border-secondary-700 rounded-lg flex flex-col items-center justify-center bg-secondary-50/50 dark:bg-secondary-900/30 transition-all">
                                        <Icon name="eye-off" className="w-6 h-6 text-secondary-400 mb-2" />
                                        <p className="text-xs font-medium text-text-subtle italic">Answer hidden to prevent spoilers</p>
                                    </div>
                                )}
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                                    <button
                                        onClick={() => setShowAnswer(!showAnswer)}
                                        className={`w-full sm:flex-1 py-3.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${showAnswer ? 'text-text-subtle bg-secondary-100 dark:bg-secondary-700' : 'text-primary-700 bg-primary-100 hover:bg-primary-200 shadow-sm'}`}
                                    >
                                        <Icon name={showAnswer ? 'eye-off' : 'eye'} className="w-5 h-5" />
                                        {showAnswer ? 'Hide Answer' : 'Show Answer'}
                                    </button>
                                    <button
                                        onClick={handleSaveJournalClick}
                                        disabled={isJournaled}
                                        className="w-full sm:flex-1 py-3.5 px-4 text-text-main bg-secondary-100 dark:bg-secondary-800 rounded-xl font-bold hover:bg-secondary-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                    >
                                        <Icon name="book" className="w-5 h-5" /> {isJournaled ? 'Saved to Journal' : 'Save to Journal'}
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="flex justify-between items-center mt-6">
                            <button onClick={() => navigate(activeIndex - 1)} disabled={activeIndex === 0} className="p-3 rounded-full disabled:opacity-30 bg-secondary-100 dark:bg-secondary-700 text-text-main hover:bg-secondary-200"><Icon name="arrowLeft" className="w-5 h-5" /></button>
                            <span className="font-mono font-bold text-text-subtle text-sm tracking-widest">{activeIndex + 1} / {transcript.length}</span>
                            <button onClick={handleNext} disabled={activeIndex >= transcript.length - 1} className="p-3 rounded-full disabled:opacity-30 bg-primary-100 text-primary-700 hover:bg-primary-200"><Icon name="arrowRight" className="w-5 h-5" /></button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Drawer/Sidebar - Collapsible on Mobile */}
            <aside
                className={`fixed inset-x-0 bottom-0 z-40 bg-surface dark:bg-secondary-800 border-t border-secondary-200 dark:border-secondary-700 shadow-[0_-5px_30px_rgba(0,0,0,0.1)] transition-all duration-300 transform md:relative md:w-80 md:inset-auto md:border-t-0 md:border-l md:shadow-none flex flex-col ${isTranscriptVisible ? 'h-[40vh] md:h-full translate-y-0' : 'h-12 md:h-full md:w-0 md:border-none translate-y-0'}`}
            >
                <div
                    onClick={() => setIsTranscriptVisible(!isTranscriptVisible)}
                    className="p-3 flex flex-col md:flex-row md:justify-between md:items-center cursor-pointer md:cursor-default active:bg-secondary-50 md:active:bg-transparent"
                >
                    {/* Mobile Drag Handle Indicator */}
                    <div className="md:hidden w-10 h-1 bg-secondary-300 rounded-full mx-auto absolute top-2 left-1/2 -translate-x-1/2"></div>

                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm mt-2 md:mt-0 flex items-center gap-2">
                                <Icon name="list" className="w-4 h-4" />
                                Transcript Index
                            </h3>
                        </div>

                        <div className="flex items-center gap-1">
                            {/* Blind Mode Toggle - Thumb friendly hit area for iPhone 12 */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsBlindMode(!isBlindMode);
                                }}
                                title={isBlindMode ? "Show all text" : "Hide text (Blind Mode)"}
                                className={`flex items-center justify-center w-11 h-11 md:w-8 md:h-8 rounded-full transition-all ${isBlindMode ? 'bg-primary-100 text-primary-600' : 'bg-secondary-100 dark:bg-secondary-700 text-text-subtle'}`}
                            >
                                <Icon name={isBlindMode ? 'eye-off' : 'eye'} className="w-5 h-5 md:w-4 md:h-4" />
                            </button>
                            <button title="Toggle transcript visibility" className="p-1 text-text-subtle hidden md:block"><Icon name={isTranscriptVisible ? 'eye-off' : 'eye'} className="w-5 h-5" /></button>
                        </div>
                    </div>
                    <span className="md:hidden text-[10px] text-text-subtle mt-1 text-center">{isTranscriptVisible ? 'Tap to collapse' : 'Tap to expand'}</span>
                </div>

                {isTranscriptVisible && (
                    <div className="flex-1 overflow-y-auto bg-background/50 dark:bg-secondary-900/50">
                        {transcript.map((entry, index) => {
                            const isLinkedStart = practiceMode === 'linked' && linkedSnippetsMap.has(index);
                            return (
                                <div key={index} onClick={() => navigate(index)} className={`p-3 cursor-pointer border-l-4 flex items-start gap-3 transition-colors ${activeIndex === index ? 'bg-white dark:bg-secondary-800 border-primary-500 shadow-sm' : 'border-transparent hover:bg-secondary-50 dark:hover:bg-secondary-700/50'}`}>
                                    {isLinkedStart && <Icon name="link" className="w-3.5 h-3.5 text-primary-500 mt-1 flex-shrink-0" title="Linked Snippet" />}
                                    <div className="flex-grow">
                                        <div className="flex items-center gap-2 text-xs font-mono text-text-subtle mb-0.5">
                                            <Icon name={results[index] === 'correct' ? 'check-circle' : (results[index] === 'incorrect' ? 'error-circle' : 'circle-outline')} className={`w-3.5 h-3.5 ${results[index] === 'correct' ? 'text-success-500' : (results[index] === 'incorrect' ? 'text-error-500' : 'text-secondary-400')}`} />
                                            <span>{new Date(entry.start * 1000).toISOString().substr(14, 5)}</span>
                                        </div>
                                        <p className={`text-xs leading-relaxed transition-all duration-500 ${isBlindMode && results[index] === 'untouched' ? 'filter blur-[5px] hover:blur-[2px] opacity-40 select-none cursor-help' : 'text-secondary-600 dark:text-secondary-400 line-clamp-2'}`}>
                                            {entry.text}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </aside>
        </div>
    );
};

export default DictationSessionScreen;
