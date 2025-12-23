

import React, { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Screen, DictationNote } from '../../types';
import Icon from '../../components/ui/Icon';
import { useDictationNoteStore } from '../../stores/useDictationNoteStore';
import { useSessionStore } from '../../stores/useSessionStore';
import { useUIStore } from '../../stores/useUIStore';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import Modal from '../../components/ui/Modal';

const DictationScreen: React.FC = () => {
    const dictationNotes = useDictationNoteStore(useShallow(state => state.dictationNotes));
    // Actions are stable, we can use getState for event handlers or pick them. 
    // Standard pattern: useStore(state => state.action)
    const createDictationNote = useDictationNoteStore(state => state.createDictationNote);
    const deleteDictationNote = useDictationNoteStore(state => state.deleteDictationNote);

    const {
        setEditingDictationNote,
        handleStartDictationSession
    } = useSessionStore();

    const { setCurrentScreen } = useUIStore();

    const [noteToDelete, setNoteToDelete] = useState<DictationNote | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newNoteTitle, setNewNoteTitle] = useState('');

    const handleNewNote = () => {
        if (newNoteTitle.trim()) {
            createDictationNote(newNoteTitle.trim());
            setIsCreateModalOpen(false);
            setNewNoteTitle('');
        }
    }

    const handleSelectNote = (note: DictationNote) => {
        setEditingDictationNote(note);
        setCurrentScreen(Screen.DictationEditor);
    };

    return (
        <div className="p-4 sm:p-6 mx-auto animate-fadeIn">
            <header className="flex items-center gap-3 mb-6">
                <button onClick={() => setCurrentScreen(Screen.Vmind)} className="p-2 rounded-full hover:bg-secondary-200 dark:hover:bg-secondary-700 text-text-subtle">
                    <Icon name="arrowLeft" className="w-6 h-6" />
                </button>
                <div className="flex-grow">
                    <h1 className="text-2xl font-bold text-text-main dark:text-secondary-100">Dictation Library</h1>
                    <p className="text-sm text-text-subtle">Your saved dictation exercises.</p>
                </div>
                <button onClick={() => setIsCreateModalOpen(true)} className="bg-primary-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-primary-700 transition-colors flex items-center gap-2 text-sm">
                    <Icon name="plus" className="w-4 h-4" />
                    <span>New Note</span>
                </button>
            </header>

            <main className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                {dictationNotes.length > 0 ? (
                    dictationNotes.map(note => {
                        const lastPractice = note.practiceHistory.length > 0 ? note.practiceHistory[note.practiceHistory.length - 1] : null;
                        const videoId = note.youtubeUrl ? (note.youtubeUrl.includes('v=') ? note.youtubeUrl.split('v=')[1]?.split('&')[0] : note.youtubeUrl.split('/').pop()) : null;
                        const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;

                        return (
                            <div key={note.id} className="bg-surface dark:bg-secondary-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 flex flex-col relative group overflow-hidden border border-secondary-200 dark:border-secondary-700 hover:-translate-y-1">
                                {/* Card Image / Header */}
                                <div
                                    className="h-32 bg-secondary-200 dark:bg-secondary-700 bg-cover bg-center relative cursor-pointer group-hover:opacity-90 transition-opacity"
                                    style={thumbnailUrl ? { backgroundImage: `url(${thumbnailUrl})` } : {}}
                                    onClick={() => handleStartDictationSession(note)}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                    {note.isStarred && (
                                        <div className="absolute top-2 right-2 z-10 bg-surface/80 dark:bg-black/50 backdrop-blur-sm p-1 rounded-full shadow-sm">
                                            <Icon name="star" variant="filled" className="w-4 h-4 text-warning-500" />
                                        </div>
                                    )}
                                    <div className="absolute bottom-2 left-3 right-3">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-white/90 uppercase tracking-wider mb-1">
                                            <div className="bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded flex items-center gap-1">
                                                <Icon name="youtube" className="w-3 h-3" />
                                                <span>{note.transcript?.length ?? 0} Segments</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Play Overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20 backdrop-blur-[2px]">
                                        <div className="w-12 h-12 bg-primary-600/90 text-white rounded-full flex items-center justify-center shadow-lg transform scale-95 group-hover:scale-110 transition-transform">
                                            <Icon name="play" variant="filled" className="w-6 h-6 ml-1" />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 flex-grow flex flex-col justify-between">
                                    <div>
                                        <h3
                                            className="font-bold text-text-main dark:text-secondary-100 line-clamp-2 leading-tight mb-2 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                                            onClick={() => handleStartDictationSession(note)}
                                        >
                                            {note.title}
                                        </h3>

                                        {lastPractice ? (
                                            <div className="flex items-center gap-1.5 text-xs text-secondary-500 dark:text-secondary-400">
                                                <Icon name="check-circle" className="w-3.5 h-3.5 text-success-500" />
                                                <span className="font-medium text-success-600 dark:text-success-400">{(lastPractice.accuracy * 100).toFixed(0)}% Score</span>
                                                <span className="text-secondary-300 dark:text-secondary-600">•</span>
                                                <span className="truncate">Last: {new Date(lastPractice.timestamp).toLocaleDateString()}</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-xs text-secondary-400 dark:text-secondary-500 italic">
                                                <Icon name="history" className="w-3.5 h-3.5" />
                                                <span>No practice yet</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="border-t border-secondary-100 dark:border-secondary-700/50 p-2 flex items-center justify-between bg-secondary-50/50 dark:bg-secondary-800/50">
                                    <button
                                        onClick={() => handleSelectNote(note)}
                                        className="p-2 text-secondary-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                                        title="Edit"
                                    >
                                        <Icon name="pencil" className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setNoteToDelete(note)}
                                        className="p-2 text-secondary-400 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <Icon name="trash" className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div className="col-span-full text-center py-24 bg-surface dark:bg-secondary-800 rounded-3xl border-2 border-dashed border-secondary-200 dark:border-secondary-700">
                        <div className="w-20 h-20 bg-secondary-100 dark:bg-secondary-700/50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Icon name="youtube" className="w-10 h-10 text-secondary-400 dark:text-secondary-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-text-main dark:text-secondary-100 mb-2">Create Your First Lesson</h2>
                        <p className="text-text-subtle max-w-md mx-auto mb-8">Import any YouTube video to create a custom dictation exercise. Master listening comprehension by slicing content into study segments.</p>
                        <button onClick={() => setIsCreateModalOpen(true)} className="bg-primary-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-500/30 hover:-translate-y-1 transition-all">
                            Start New Dictation
                        </button>
                    </div>
                )}
            </main>

            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Dictation Note">
                <div className="p-6">
                    <form onSubmit={(e) => { e.preventDefault(); handleNewNote(); }}>
                        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">Title</label>
                        <input
                            type="text"
                            value={newNoteTitle}
                            onChange={(e) => setNewNoteTitle(e.target.value)}
                            autoFocus
                            className="w-full bg-secondary-100 dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded-md px-3 py-2 text-text-main dark:text-secondary-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Enter a title..."
                        />
                        <div className="mt-6 flex justify-end gap-2">
                            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="bg-surface dark:bg-secondary-700 text-text-main dark:text-secondary-100 font-semibold px-4 py-2 rounded-md hover:bg-secondary-50 dark:hover:bg-secondary-600 border border-secondary-300 dark:border-secondary-600">Cancel</button>
                            <button type="submit" disabled={!newNoteTitle.trim()} className="bg-primary-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50">Create</button>
                        </div>
                    </form>
                </div>
            </Modal>

            <ConfirmationModal
                isOpen={!!noteToDelete}
                onClose={() => setNoteToDelete(null)}
                onConfirm={() => {
                    if (noteToDelete) deleteDictationNote(noteToDelete.id);
                    setNoteToDelete(null);
                }}
                title="Delete Dictation Note"
                message={`Are you sure you want to delete "${noteToDelete?.title}"?`}
                warning="This action is permanent and cannot be undone."
                confirmText="Delete"
            />
        </div>
    );
};

export default DictationScreen;
