
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

    const loopLabel = loopMode === -1 ? '∞' : `${loopMode}x`;
    const speedLabel = `${playbackSpeed}x`;

    return (
        <div className="w-full flex flex-col items-center gap-2">
            {/* Video Container */}
            <div className={`w-full ${isMobile ? 'max-w-full' : 'max-w-[400px]'} aspect-video bg-black rounded-lg overflow-hidden shadow-md relative`}>
                <div id={`player-${videoId}`} className="w-full h-full"></div>

                {/* Tap to Play Overlay (for mobile autoplay issues) */}
                {!isPlaying && (
                    <div
                        onClick={togglePlay}
                        className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px] cursor-pointer"
                    >
                        <div className="w-16 h-16 rounded-full bg-primary-600/90 text-white flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
                            <Icon name="play" className="w-8 h-8 ml-1" />
                        </div>
                    </div>
                )}
            </div>

            {/* Controls */}
            {isMobile && (
                <button
                    onClick={() => setShowControls(!showControls)}
                    className="text-xs text-secondary-500 hover:text-primary-600 dark:text-secondary-400 dark:hover:text-primary-400 py-1"
                >
                    {showControls ? '▲ Hide Controls' : '▼ Show Controls'}
                </button>
            )}

            {showControls && (
                <div className="flex items-center gap-2 bg-secondary-100 dark:bg-secondary-800 rounded-lg p-2 shadow-sm">
                    {/* Loop Toggle */}
                    <button
                        onClick={cycleLoop}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg bg-surface dark:bg-secondary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors min-w-[44px] min-h-[44px]"
                        title="Loop"
                    >
                        <Icon name="repeat" className="w-4 h-4" />
                        <span className="text-xs font-bold">{loopLabel}</span>
                    </button>

                    {/* Speed Toggle */}
                    <button
                        onClick={cycleSpeed}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg bg-surface dark:bg-secondary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors min-w-[44px] min-h-[44px]"
                        title="Speed"
                    >
                        <span className="text-xs font-bold">{speedLabel}</span>
                    </button>

                    {/* Play/Pause */}
                    <button
                        onClick={togglePlay}
                        className={`p-2 rounded-lg transition-colors min-w-[44px] min-h-[44px] ${isPlaying
                            ? 'bg-primary-500 text-white hover:bg-primary-600'
                            : 'bg-surface dark:bg-secondary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                            }`}
                        title={isPlaying ? 'Pause' : 'Play'}
                    >
                        <Icon name={isPlaying ? 'pause' : 'play'} className="w-5 h-5" />
                    </button>

                    {/* Repeat */}
                    <button
                        onClick={handleRepeat}
                        className="p-2 rounded-lg bg-surface dark:bg-secondary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors min-w-[44px] min-h-[44px]"
                        title="Restart segment"
                    >
                        <Icon name="refresh" className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default EmbeddedVideoPlayer;
