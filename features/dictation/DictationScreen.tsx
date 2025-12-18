

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
            
            <main className="space-y-4">
                {dictationNotes.length > 0 ? (
                    dictationNotes.map(note => {
                        const lastPractice = note.practiceHistory.length > 0 ? note.practiceHistory[note.practiceHistory.length - 1] : null;

                        return (
                        <div key={note.id} className="bg-surface dark:bg-secondary-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow flex flex-col relative group">
                            {note.isStarred && (
                                <div className="absolute top-2 right-2 z-10">
                                    <Icon name="star" variant="filled" className="w-5 h-5 text-warning-500" />
                                </div>
                            )}
                            <div className="p-4 cursor-pointer flex-grow hover:bg-secondary-50 dark:hover:bg-secondary-800/50 rounded-t-xl" onClick={() => handleStartDictationSession(note)}>
                                <h3 className="font-bold text-text-main dark:text-secondary-100 truncate pr-6">{note.title}</h3>
                                <div className="flex items-center gap-4 text-xs text-text-subtle mt-1">
                                    <div className="flex items-center gap-1.5">
                                        <Icon name="youtube" className="w-4 h-4" />
                                        <span>{note.transcript?.length ?? 0} segments</span>
                                    </div>
                                    {lastPractice && (
                                        <div className="flex items-center gap-1.5">
                                            <Icon name="check-circle" className="w-4 h-4 text-success-500" />
                                            <span>{(lastPractice.accuracy * 100).toFixed(0)}% last score</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="bg-secondary-50 dark:bg-secondary-800/50 border-t border-secondary-200/80 dark:border-secondary-700/50 p-2 flex justify-end items-center gap-2 rounded-b-xl">
                                <button onClick={() => handleSelectNote(note)} className="font-semibold text-sm text-secondary-600 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-700 px-3 py-1.5 rounded-md flex items-center gap-1.5">
                                    <Icon name="pencil" className="w-4 h-4"/>
                                    Edit
                                </button>
                                <button onClick={() => setNoteToDelete(note)} className="font-semibold text-sm text-error-600 dark:text-error-400 hover:bg-error-500/10 px-3 py-1.5 rounded-md flex items-center gap-1.5">
                                    <Icon name="trash" className="w-4 h-4"/>
                                    Delete
                                </button>
                                <button onClick={() => handleStartDictationSession(note)} className="bg-primary-600 text-white font-semibold text-sm px-4 py-1.5 rounded-md hover:bg-primary-700 flex items-center gap-1.5">
                                    <Icon name="play" className="w-4 h-4" />
                                    Practice
                                </button>
                            </div>
                        </div>
                    )})
                ) : (
                    <div className="text-center py-16">
                        <Icon name="youtube" className="w-16 h-16 text-secondary-300 dark:text-secondary-700 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-secondary-700 dark:text-secondary-300">No Dictation Notes</h2>
                        <p className="text-text-subtle mt-2">Click "New Note" to create your first dictation exercise from a YouTube video.</p>
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
