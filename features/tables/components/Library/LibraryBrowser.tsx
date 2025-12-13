
import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchLibraryItems, fetchMyLibraryItems, deleteLibraryItem } from '../../../../services/libraryService';
import { LibraryItem } from '../../../../types';
import LibraryCard from './LibraryCard';
import TablePreviewModal from './TablePreviewModal';
import EditPublicationModal from './EditPublicationModal';
import ConfirmationModal from '../../../../components/ui/ConfirmationModal';
import Icon from '../../../../components/ui/Icon';
import { Input } from '../../../../components/ui/Input';
import { useDebounce } from '../../../../hooks/useDebounce';
import { useUIStore } from '../../../../stores/useUIStore';
import { useUserStore } from '../../../../stores/useUserStore';
import { useTableStore } from '../../../../stores/useTableStore';

const LibraryBrowser: React.FC = () => {
    const { setIsLibraryMode, showToast } = useUIStore();
    const { session } = useUserStore();
    const { setTablePublicStatus } = useTableStore();
    const queryClient = useQueryClient();
    
    const [view, setView] = React.useState<'explore' | 'mine'>('explore');
    const [searchTerm, setSearchTerm] = React.useState('');
    const debouncedSearch = useDebounce(searchTerm, 300);
    
    // Modals State
    const [selectedItem, setSelectedItem] = React.useState<LibraryItem | null>(null);
    const [editingItem, setEditingItem] = React.useState<LibraryItem | null>(null);
    const [deletingItem, setDeletingItem] = React.useState<LibraryItem | null>(null);
    
    // Fetch Global Items
    const { data: globalItems, isLoading: isGlobalLoading, error: globalError } = useQuery({
        queryKey: ['libraryItems'],
        queryFn: fetchLibraryItems
    });

    // Fetch My Items (Only if logged in)
    const { data: myItems, isLoading: isMyLoading } = useQuery({
        queryKey: ['myLibraryItems', session?.user.id],
        queryFn: () => fetchMyLibraryItems(session!.user.id),
        enabled: !!session?.user.id && view === 'mine'
    });

    const displayItems = view === 'explore' ? (globalItems || []) : (myItems || []);
    const isLoading = view === 'explore' ? isGlobalLoading : isMyLoading;

    const filteredItems = React.useMemo(() => {
        if (!displayItems) return [];
        if (!debouncedSearch) return displayItems;
        const lower = debouncedSearch.toLowerCase();
        return displayItems.filter(item => 
            item.title.toLowerCase().includes(lower) || 
            item.tags?.some(tag => tag.toLowerCase().includes(lower)) ||
            item.author_name?.toLowerCase().includes(lower)
        );
    }, [displayItems, debouncedSearch]);

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ['libraryItems'] });
        queryClient.invalidateQueries({ queryKey: ['myLibraryItems'] });
    };

    const handleConfirmDelete = async () => {
        if (!deletingItem) return;
        try {
            await deleteLibraryItem(deletingItem.id);
            
            // Sync local table state: Update isPublic flag if the original table still exists
            if (deletingItem.payload?.id) {
                setTablePublicStatus(deletingItem.payload.id, false);
            }
            
            showToast("Table unpublished successfully.", "success");
            handleRefresh();
        } catch (e) {
            console.error(e);
            showToast("Failed to unpublish table.", "error");
        } finally {
            setDeletingItem(null);
        }
    };

    if (globalError) return <div className="h-full flex flex-col items-center justify-center text-error-500"><Icon name="error-circle" className="w-12 h-12 mb-2"/><p>Failed to load library.</p></div>;

    return (
        <div className="flex flex-col h-full bg-background dark:bg-secondary-900">
            {/* Navigation & Search Header */}
            <header className="flex-shrink-0 px-4 sm:px-6 py-4 border-b border-secondary-200 dark:border-secondary-700 sticky top-0 bg-background/95 dark:bg-secondary-900/95 backdrop-blur-md z-20 flex flex-col gap-4 transition-all">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsLibraryMode(false)}
                        className="p-2 rounded-full hover:bg-secondary-200 dark:hover:bg-secondary-700 text-text-subtle transition-colors"
                        title="Back to Workspace"
                    >
                        <Icon name="arrowLeft" className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-text-main dark:text-secondary-100">Community Library</h1>
                    </div>
                </div>
                
                <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                    {/* View Toggle */}
                    <div className="flex bg-secondary-100 dark:bg-secondary-800 p-1 rounded-lg self-start">
                        <button
                            onClick={() => setView('explore')}
                            className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${view === 'explore' ? 'bg-white dark:bg-secondary-600 shadow text-text-main dark:text-white' : 'text-text-subtle hover:text-text-main'}`}
                        >
                            Explore
                        </button>
                        <button
                            onClick={() => setView('mine')}
                            disabled={!session}
                            className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${view === 'mine' ? 'bg-white dark:bg-secondary-600 shadow text-text-main dark:text-white' : 'text-text-subtle hover:text-text-main disabled:opacity-50 disabled:cursor-not-allowed'}`}
                        >
                            My Publications
                        </button>
                    </div>

                    <div className="relative w-full md:max-w-md">
                         <Icon name="search" className="w-5 h-5 text-text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
                         <Input 
                            placeholder={view === 'explore' ? "Search community..." : "Search your uploads..."}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-10 h-11 shadow-sm bg-surface dark:bg-secondary-800"
                        />
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-4 custom-scrollbar">
                {isLoading ? (
                    <div className="h-64 flex items-center justify-center text-primary-500">
                        <Icon name="spinner" className="w-8 h-8 animate-spin"/>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="text-center py-16 text-text-subtle">
                        <Icon name={view === 'explore' ? "book" : "arrow-up-tray"} className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>{view === 'explore' ? "No community items found." : "You haven't published anything yet."}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredItems.map(item => (
                            <LibraryCard 
                                key={item.id} 
                                item={item} 
                                onDownload={() => setSelectedItem(item)} 
                                isOwner={session?.user.id === item.author_id}
                                onEdit={(i) => setEditingItem(i)}
                                onDelete={(i) => setDeletingItem(i)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {selectedItem && (
                <TablePreviewModal 
                    isOpen={true} 
                    onClose={() => setSelectedItem(null)} 
                    item={selectedItem} 
                />
            )}

            {editingItem && (
                <EditPublicationModal
                    isOpen={true}
                    onClose={() => setEditingItem(null)}
                    item={editingItem}
                    onSuccess={handleRefresh}
                />
            )}

            <ConfirmationModal
                isOpen={!!deletingItem}
                onClose={() => setDeletingItem(null)}
                onConfirm={handleConfirmDelete}
                title="Unpublish Table?"
                message="Are you sure you want to remove this table from the Community Library? Users who have already downloaded it will keep their copy, but no new users will be able to find it."
                confirmText="Unpublish"
            />
        </div>
    );
};

export default LibraryBrowser;
