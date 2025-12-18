import React, { useState, useEffect, useRef } from 'react';
import { ContextLink, Screen } from '../../../types';
import Popover from '../../../components/ui/Popover';
import Icon from '../../../components/ui/Icon';
import { useNoteStore } from '../../../stores/useNoteStore';
import { useDictationNoteStore } from '../../../stores/useDictationNoteStore';
import { extractVideoID, loadYouTubeAPI } from '../../../utils/youtubeUtils';
import { useUIStore } from '../../../stores/useUIStore';
import { useSessionStore } from '../../../stores/useSessionStore';

const ReadingContextView: React.FC<{ link: ContextLink }> = ({ link }) => {
    const { notes } = useNoteStore();
    const { setReadingScreenTarget } = useSessionStore();
    const { setCurrentScreen } = useUIStore();
    const note = notes.find(n => n.id === link.sourceId);

    const handleViewNote = () => {
        if (!note) return;
        setReadingScreenTarget({
            noteId: note.id,
            selectionStartIndex: link.metadata.selectionStartIndex,
            selectionText: link.metadata.selection,
        });
        setCurrentScreen(Screen.Reading);
    };

    const highlightedSnippet = () => {
        const { snippet, selection } = link.metadata;
        if (!snippet) {
            return 'No snippet available.';
        }
        
        // The token to look for is the selection wrapped in brackets.
        const token = `[${selection}]`;
        
        // If the snippet contains our special token, replace it.
        if (selection && snippet.includes(token)) {
             const parts = snippet.split(token);
             return (
                <>
                    {parts.map((part, index) => (
                        <React.Fragment key={index}>
                            {part}
                            {index < parts.length - 1 && (
                                <strong className="font-semibold text-text-main dark:text-secondary-100">{selection}</strong>
                            )}
                        </React.Fragment>
                    ))}
                </>
             );
        }

        // Fallback for old format where snippet was just the word, or if the new format fails.
        if (selection) {
            const parts = snippet.split(new RegExp(`(${selection})`, 'i'));
            return (
                <>
                    {parts.map((part, index) =>
                        part.toLowerCase() === selection.toLowerCase() ? (
                            <strong key={index} className="font-semibold text-text-main dark:text-secondary-100">{part}</strong>
                        ) : (
                            part
                        )
                    )}
                </>
            );
        }

        return snippet; // If there's no selection, just return the snippet.
    };

    return (
        <div className="p-2">
            <h5 className="text-xs font-bold text-text-subtle mb-1 flex items-center gap-1.5">
                <Icon name="book" className="w-4 h-4" />
                From "{note?.title || 'a reading note'}"
            </h5>
            <blockquote className="text-sm text-text-subtle border-l-2 border-secondary-300 dark:border-secondary-600 pl-2 italic">
                {highlightedSnippet()}
            </blockquote>
            {note && <button onClick={handleViewNote} className="text-xs text-primary-600 dark:text-primary-400 hover:underline mt-2">View in Context</button>}
        </div>
    );
};

const DictationContextView: React.FC<{ link: ContextLink }> = ({ link }) => {
    const { dictationNotes } = useDictationNoteStore();
    const note = dictationNotes.find(n => n.id === link.sourceId);
    const playerRef = useRef<any>(null);
    const playerContainerId = `yt-player-context-${link.id}`;
    
    const handlePlay = () => {
        if (!note || link.metadata.timestamp === undefined) return;
        const videoId = extractVideoID(note.youtubeUrl);
        if (!videoId) return;

        loadYouTubeAPI().then(() => {
            if (playerRef.current) {
                playerRef.current.destroy();
            }
            playerRef.current = new window.YT.Player(playerContainerId, {
                height: '150',
                width: '100%',
                videoId,
                playerVars: {
                    'playsinline': 1,
                    'autoplay': 1,
                    'controls': 1,
                    'start': Math.floor(link.metadata.timestamp),
                },
                events: {
                    'onReady': (event: any) => {
                        event.target.playVideo();
                    }
                }
            });
        });
    };
    
    const transcriptEntry = note?.transcript?.find(t => t.start === link.metadata.timestamp);

    return (
        <div className="p-2">
             <h5 className="text-xs font-bold text-text-subtle mb-1 flex items-center gap-1.5">
                <Icon name="youtube" className="w-4 h-4 text-error-500" />
                From "{note?.title || 'a dictation'}"
            </h5>
            {transcriptEntry && (
                <p className="text-sm text-text-main dark:text-secondary-200 italic mb-2">"{transcriptEntry.text}"</p>
            )}
            <div id={playerContainerId} className="rounded-md bg-black overflow-hidden -mx-2"></div>
            <button onClick={handlePlay} className="text-xs text-primary-600 dark:text-primary-400 hover:underline mt-2 flex items-center gap-1">
                <Icon name="play" className="w-3 h-3" />
                Play Segment
            </button>
        </div>
    );
};


interface ContextViewerProps {
    links: ContextLink[];
}

const ContextViewer: React.FC<ContextViewerProps> = ({ links }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (links.length === 0) return null;

    return (
        <Popover
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            trigger={
                <button title="View Context" className="p-2 rounded-full bg-surface dark:bg-secondary-700 text-text-subtle hover:text-primary-500 shadow-sm">
                    <Icon name="link" className="w-5 h-5"/>
                </button>
            }
            contentClassName="w-72"
        >
            <div className="space-y-4 max-h-80 overflow-y-auto">
                {links.map(link => (
                    <div key={link.id} className="border-b border-secondary-200 dark:border-secondary-700 last:border-b-0 pb-2 last:pb-0">
                        {link.sourceType === 'reading' && <ReadingContextView link={link} />}
                        {link.sourceType === 'dictation' && <DictationContextView link={link} />}
                    </div>
                ))}
            </div>
        </Popover>
    );
};

export default ContextViewer;