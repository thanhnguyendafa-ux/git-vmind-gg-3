
import React, { useState, useEffect, useRef } from 'react';
import Icon from '../../../../../components/ui/Icon';

interface EmbeddedVideoPlayerProps {
    videoId: string;
    startTime?: number;
    endTime?: number;
    isMobile?: boolean;
}

const EmbeddedVideoPlayer: React.FC<EmbeddedVideoPlayerProps> = ({
    videoId,
    startTime = 0,
    endTime,
    isMobile = false
}) => {
    const [loopMode, setLoopMode] = useState<1 | 3 | -1>(1); // 1x, 3x, or ∞
    const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 0.5x, 1x, 1.5x
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [showControls, setShowControls] = useState<boolean>(!isMobile);
    const playerRef = useRef<any>(null);
    const loopCountRef = useRef<number>(0);
    const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Load YouTube iframe API
    useEffect(() => {
        if (typeof window === 'undefined' || (window as any).YT) return;

        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

        (window as any).onYouTubeIframeAPIReady = () => {
            initializePlayer();
        };

        return () => {
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if ((window as any).YT && (window as any).YT.Player) {
            initializePlayer();
        }
    }, [videoId, startTime, endTime]);

    const initializePlayer = () => {
        if (!playerRef.current && videoId) {
            playerRef.current = new (window as any).YT.Player(`player-${videoId}`, {
                videoId: videoId,
                playerVars: {
                    start: Math.floor(startTime),
                    end: endTime ? Math.ceil(endTime) : undefined,
                    controls: 0,
                    modestbranding: 1,
                    rel: 0,
                },
                events: {
                    onReady: onPlayerReady,
                    onStateChange: onPlayerStateChange,
                },
            });
        }
    };

    const onPlayerReady = (event: any) => {
        event.target.setPlaybackRate(playbackSpeed);
    };

    const onPlayerStateChange = (event: any) => {
        if (event.data === (window as any).YT.PlayerState.PLAYING) {
            setIsPlaying(true);
            startLoopCheck();
        } else if (event.data === (window as any).YT.PlayerState.PAUSED || event.data === (window as any).YT.PlayerState.ENDED) {
            setIsPlaying(false);
        }
    };

    const startLoopCheck = () => {
        if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
        }

        checkIntervalRef.current = setInterval(() => {
            if (playerRef.current && playerRef.current.getCurrentTime) {
                const currentTime = playerRef.current.getCurrentTime();
                const segmentEnd = endTime || playerRef.current.getDuration();

                if (currentTime >= segmentEnd) {
                    loopCountRef.current++;

                    if (loopMode === -1 || loopCountRef.current < loopMode) {
                        // Restart segment
                        playerRef.current.seekTo(startTime, true);
                        playerRef.current.playVideo();
                    } else {
                        // Stop after reaching loop count
                        playerRef.current.pauseVideo();
                        loopCountRef.current = 0;
                    }
                }
            }
        }, 100);
    };

    const togglePlay = () => {
        if (playerRef.current) {
            if (isPlaying) {
                playerRef.current.pauseVideo();
            } else {
                playerRef.current.playVideo();
            }
        }
    };

    const handleRepeat = () => {
        if (playerRef.current) {
            loopCountRef.current = 0;
            playerRef.current.seekTo(startTime, true);
            playerRef.current.playVideo();
        }
    };

    const cycleLoop = () => {
        setLoopMode(prev => {
            if (prev === 1) return 3;
            if (prev === 3) return -1;
            return 1;
        });
        loopCountRef.current = 0;
    };

    const cycleSpeed = () => {
        setPlaybackSpeed(prev => {
            const speeds = [0.5, 1, 1.5];
            const currentIndex = speeds.indexOf(prev);
            const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
            if (playerRef.current) {
                playerRef.current.setPlaybackRate(nextSpeed);
            }
            return nextSpeed;
        });
    };

    const handleStop = () => {
        if (playerRef.current) {
            setIsPlaying(false);
            playerRef.current.pauseVideo();
            playerRef.current.seekTo(startTime, true);
        }
    };

    const loopLabel = loopMode === -1 ? '∞' : `${loopMode}x`;
    const speedLabel = `${playbackSpeed}x`;

    return (
        <div className="w-full flex flex-col items-center gap-3">
            {/* Video Container */}
            <div className={`w-full ${isMobile ? 'max-w-full' : 'max-w-[400px]'} aspect-video bg-black rounded-lg overflow-hidden shadow-md relative group`}>
                <div id={`player-${videoId}`} className="w-full h-full"></div>

                {/* Tap to Play Overlay */}
                {!isPlaying && (
                    <div
                        onClick={togglePlay}
                        className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px] cursor-pointer z-10"
                    >
                        <div className="w-16 h-16 rounded-full bg-primary-600/90 text-white flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
                            <Icon name="play" className="w-8 h-8 ml-1" />
                        </div>
                    </div>
                )}
            </div>

            {/* Listening Deck (Fixed Control Bar) - Option A */}
            <div className="flex items-center justify-between gap-2 w-full max-w-[400px] bg-secondary-100 dark:bg-secondary-800 rounded-xl p-2 shadow-sm border border-secondary-200 dark:border-secondary-700">
                {/* Loop */}
                <button
                    onClick={cycleLoop}
                    className="flex flex-col items-center justify-center gap-0.5 w-[calc(20%-8px)] h-[56px] rounded-lg bg-surface dark:bg-secondary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 active:scale-95 transition-all"
                    title="Toggle Loop Mode"
                >
                    <Icon name="repeat" className={`w-5 h-5 ${loopMode !== 1 ? 'text-primary-500' : 'text-text-subtle'}`} />
                    <span className={`text-[10px] font-bold ${loopMode !== 1 ? 'text-primary-600' : 'text-text-subtle'}`}>{loopLabel}</span>
                </button>

                {/* Speed */}
                <button
                    onClick={cycleSpeed}
                    className="flex flex-col items-center justify-center gap-0.5 w-[calc(20%-8px)] h-[56px] rounded-lg bg-surface dark:bg-secondary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 active:scale-95 transition-all"
                    title="Playback Speed"
                >
                    <Icon name="lightning-bolt" className={`w-5 h-5 ${playbackSpeed !== 1 ? 'text-amber-500' : 'text-text-subtle'}`} />
                    <span className={`text-[10px] font-bold ${playbackSpeed !== 1 ? 'text-amber-600' : 'text-text-subtle'}`}>{speedLabel}</span>
                </button>

                {/* Play/Pause (Center Highlight) */}
                <button
                    onClick={togglePlay}
                    className={`flex items-center justify-center w-[calc(20%-8px)] h-[56px] rounded-lg shadow-sm active:scale-95 transition-all ${isPlaying
                        ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400 border border-primary-200 dark:border-primary-800'
                        : 'bg-primary-500 text-white hover:bg-primary-600 shadow-md'
                        }`}
                    title={isPlaying ? 'Pause' : 'Play'}
                >
                    <Icon name={isPlaying ? 'pause' : 'play'} className="w-8 h-8" />
                </button>

                {/* Stop (New) */}
                <button
                    onClick={handleStop}
                    className="flex flex-col items-center justify-center gap-0.5 w-[calc(20%-8px)] h-[56px] rounded-lg bg-surface dark:bg-secondary-700 hover:bg-error-50 dark:hover:bg-error-900/20 active:scale-95 transition-all group"
                    title="Stop & Reset"
                >
                    <div className="w-4 h-4 bg-text-subtle group-hover:bg-error-500 rounded-sm transition-colors mb-1"></div>
                    <span className="text-[10px] font-bold text-text-subtle group-hover:text-error-600">Stop</span>
                </button>

                {/* Repeat */}
                <button
                    onClick={handleRepeat}
                    className="flex flex-col items-center justify-center gap-0.5 w-[calc(20%-8px)] h-[56px] rounded-lg bg-surface dark:bg-secondary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 active:scale-95 transition-all"
                    title="Replay Segment"
                >
                    <Icon name="refresh" className="w-5 h-5 text-text-subtle hover:text-primary-500" />
                    <span className="text-[10px] font-bold text-text-subtle">Replay</span>
                </button>
            </div>
        </div>
    );
};

export default EmbeddedVideoPlayer;
