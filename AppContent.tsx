import * as React from 'react';
import { Screen } from './types';
import { useUIStore } from './stores/useUIStore';
import { useUserStore, defaultStats, defaultSettings, resetStores, clearAllStores } from './stores/useUserStore';
import { useSessionStore } from './stores/useSessionStore';
import { useMusicStore } from './stores/useMusicStore';

import Icon from './components/ui/Icon';
import BottomNavBar from './components/layout/BottomNavBar';
import Notification from './components/ui/Notification';
import Toast from './components/ui/Toast';
import GalleryViewModal from './features/tables/components/GalleryViewModal';
import DataSyncManager from './features/data/DataSyncManager';
import BlockingSaveOverlay from './components/ui/BlockingSaveOverlay';
import { SyncGuard } from './components/providers/SyncGuard';

import { useThemeManager } from './hooks/useThemeManager';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useDataHydration } from './hooks/useDataHydration';

// Lazy load screens for code splitting and improved initial performance
const AuthScreen = React.lazy(() => import('./features/auth/AuthScreen'));
const HomeScreen = React.lazy(() => import('./features/home/HomeScreen'));
const TablesScreen = React.lazy(() => import('./features/tables/TablesScreen'));
const TableScreen = React.lazy(() => import('./features/tables/TableScreen'));
const LibraryScreen = React.lazy(() => import('./features/library/LibraryScreen'));
const CommunityScreen = React.lazy(() => import('./features/community/CommunityScreen')); // New
const VmindScreen = React.lazy(() => import('./features/vmind/VmindScreen'));
const SettingsScreen = React.lazy(() => import('./features/settings/SettingsScreen'));
const ReadingScreen = React.lazy(() => import('./features/reading/ReadingScreen'));
const JournalScreen = React.lazy(() => import('./features/journal/JournalScreen'));
const StudyProgressScreen = React.lazy(() => import('./features/study-progress/StudyProgressScreen'));
const StudySetupScreen = React.lazy(() => import('./features/study/StudySetupScreen'));
const StudySessionScreen = React.lazy(() => import('./features/study/StudySessionScreen'));
const ConfidenceScreen = React.lazy(() => import('./features/confidence/ConfidenceScreen'));
const ConfidenceSetupScreen = React.lazy(() => import('./features/confidence/ConfidenceSetupScreen'));
const ConfidenceSessionScreen = React.lazy(() => import('./features/confidence/ConfidenceSessionScreen'));
const TheaterSetupScreen = React.lazy(() => import('./features/theater/TheaterSetupScreen'));
const TheaterSessionScreen = React.lazy(() => import('./features/theater/TheaterSessionScreen'));
const DictationScreen = React.lazy(() => import('./features/dictation/DictationScreen'));
const DictationEditorScreen = React.lazy(() => import('./features/dictation/DictationEditorScreen'));
const DictationSessionScreen = React.lazy(() => import('./features/dictation/DictationSessionScreen'));
const SearchScreen = React.lazy(() => import('./features/search/SearchScreen'));
const SearchFlyoutButton = React.lazy(() => import('./features/search/SearchFlyoutButton'));
const VmindChatModal = React.lazy(() => import('./features/vmind-chat/VmindChatModal'));
const ApiKeyModal = React.lazy(() => import('./components/ui/ApiKeyModal'));
const MusicFlyoutButton = React.lazy(() => import('./features/pomodoro/MusicFlyoutButton'));
const MusicPlayer = React.lazy(() => import('./features/pomodoro/MusicPlayer'));
const AnkiSetupScreen = React.lazy(() => import('./features/anki/AnkiSetupScreen'));
const AnkiSessionScreen = React.lazy(() => import('./features/anki/AnkiSessionScreen'));
const AnkiProgressSetupScreen = React.lazy(() => import('./features/anki/AnkiProgressSetupScreen'));
const AnkiStatsScreen = React.lazy(() => import('./features/anki/AnkiStatsScreen'));
const ReminderManager = React.lazy(() => import('./features/reminders/ReminderManager'));
const NotificationsScreen = React.lazy(() => import('./features/notifications/NotificationsScreen'));
const NotificationGenerator = React.lazy(() => import('./features/notifications/NotificationGenerator'));
const MapScreen = React.lazy(() => import('./features/map/MapScreen'));
const TagManagerScreen = React.lazy(() => import('./features/tags/TagManagerScreen'));
const TimeTrackingScreen = React.lazy(() => import('./features/tracking/TimeTrackingScreen'));
const StatsScreen = React.lazy(() => import('./features/profile/StatsScreen'));
const ConceptLinksScreen = React.lazy(() => import('./features/concepts/ConceptLinksScreen'));

const LoadingFallback = () => (
    <div className="min-h-screen bg-background dark:bg-secondary-900 flex items-center justify-center">
        <Icon name="spinner" className="w-10 h-10 text-primary-500 animate-spin" />
    </div>
);

export const AppContent: React.FC = () => {
    const {
        currentScreen,
        toast,
        setToast,
        unlockedBadgeNotification,
        setUnlockedBadgeNotification,
        galleryViewData,
        setGalleryViewData,
        theme,
        setIsSearchOpen,
        isSearchOpen,
        isChatbotOpen,
        setIsChatbotOpen,
        showToast,
        isImmersive,
        backgroundSettings,
        isBlockingOverlayVisible,
        resolveGlobalAction,
        syncStatus,
        syncQueue
    } = useUIStore();

    const { loading, settings, session, isGuest, setLoading } = useUserStore();

    // --- Hooks Integration ---

    // 1. Theme Management
    useThemeManager();

    // 2. Data Hydration
    // loading state in useUserStore is managed by this hook as well
    const { isLoading, data } = useDataHydration();

    // 3. Keyboard Shortcuts
    const shortcuts = React.useMemo(() => ({
        [settings.searchShortcut || 'Ctrl+K']: (e: KeyboardEvent) => setIsSearchOpen(true),
        [settings.musicShortcut || 'Ctrl+M']: (e: KeyboardEvent) => {
            const { isPlaying, currentTrack, customTracks, togglePlay } = useMusicStore.getState();
            // Safety check: Don't try to play if playlist is empty (Clean Slate)
            const hasTracks = customTracks.length > 0;

            if (!currentTrack && !hasTracks) {
                showToast("Please add a track first to play music.", "info");
                return;
            }

            const wasPlaying = isPlaying;
            togglePlay();
            showToast(wasPlaying ? "Music Paused" : "Music Playing", "info");
        }
    }), [settings.searchShortcut, settings.musicShortcut, setIsSearchOpen, showToast]);

    useKeyboardShortcuts(shortcuts);

    // Handle Guest and Logout states
    React.useEffect(() => {
        if (isGuest) {
            resetStores();
            setLoading(false);
        } else if (!session) {
            // Ensure clean state when no session
            clearAllStores();
            setLoading(false);
        }
    }, [session, isGuest, setLoading]);

    // Correcting reactivity for session check
    const activeSession = useSessionStore(s => s.activeSession);
    const activeConfidenceSession = useSessionStore(s => s.activeConfidenceSession);
    const activeTheaterSession = useSessionStore(s => s.activeTheaterSession);
    const activeDictationSession = useSessionStore(s => s.activeDictationSession);
    const activeAnkiSession = useSessionStore(s => s.activeAnkiSession);
    const editingDictationNote = useSessionStore(s => s.editingDictationNote);
    const activeTableId = useSessionStore(s => s.activeTableId);

    const isAppLoading = loading || (isLoading && !data);

    if (isAppLoading) {
        return <LoadingFallback />;
    }

    const getRenderContent = () => {
        if (!session && !isGuest) {
            return <AuthScreen />;
        }

        if (activeAnkiSession) return <AnkiSessionScreen />;
        if (activeDictationSession) return <DictationSessionScreen />;
        if (activeTheaterSession) return <TheaterSessionScreen />;
        if (activeConfidenceSession) return <ConfidenceSessionScreen />;
        if (activeSession) return <StudySessionScreen />;

        switch (currentScreen) {
            case Screen.Auth: return <AuthScreen />;
            case Screen.Home: return <HomeScreen />;
            case Screen.Tables: return <TablesScreen />;
            case Screen.Library: return <LibraryScreen />;
            case Screen.Community: return <CommunityScreen />;
            case Screen.Vmind: return <VmindScreen />;
            case Screen.Settings: return <SettingsScreen />;
            case Screen.TableDetail: return activeTableId ? <TableScreen tableId={activeTableId} /> : <TablesScreen />;
            case Screen.Confidence: return <ConfidenceScreen />;
            case Screen.ConfidenceSetup: return <ConfidenceSetupScreen />;
            case Screen.StudyProgress: return <StudyProgressScreen />;
            case Screen.StudySetup: return <StudySetupScreen />;
            case Screen.TheaterSetup: return <TheaterSetupScreen />;
            case Screen.TheaterSession: return <TheaterSessionScreen />;
            case Screen.Reading: return <ReadingScreen />;
            case Screen.Journal: return <JournalScreen />;
            case Screen.Dictation: return <DictationScreen />;
            case Screen.DictationEditor: return editingDictationNote ? <DictationEditorScreen /> : <DictationScreen />;
            case Screen.AnkiSetup: return <AnkiSetupScreen />;
            case Screen.AnkiProgressSetup: return <AnkiProgressSetupScreen />;
            case Screen.AnkiStats: return <AnkiStatsScreen />;
            case Screen.Notifications: return <NotificationsScreen />;
            case Screen.Map: return <MapScreen />;
            case Screen.TagManager: return <TagManagerScreen />;
            case Screen.TimeTracking: return <TimeTrackingScreen />;
            case Screen.Stats: return <StatsScreen />;
            case Screen.ConceptLinks: return <ConceptLinksScreen />;
            default: return <HomeScreen />;
        }
    }


    const isSessionActive = !!(activeSession || activeConfidenceSession || activeTheaterSession || activeDictationSession || activeAnkiSession);
    const hasSession = !!session || isGuest;
    const showNavBar = hasSession && currentScreen !== Screen.Auth && !isSessionActive && !isImmersive;

    // Background Logic
    const hasCustomBg = !!backgroundSettings.url;
    // Use 100dvh for the outer container to fix mobile Safari issues
    const containerClasses = hasCustomBg
        ? "h-[100dvh] w-screen flex flex-col overflow-hidden bg-transparent text-text-main dark:text-secondary-100 transition-colors duration-300"
        : "h-[100dvh] w-screen flex flex-col overflow-hidden bg-background dark:bg-secondary-900 text-text-main dark:text-secondary-100 transition-colors duration-300";

    const overlayColor = theme === 'dark' ? '0,0,0' : '255,255,255';

    return (
        <>
            {/* Custom Background Layers */}
            {hasCustomBg && (
                <>
                    {/* Image Layer - Fixed to z-0 so it sits on top of body bg but below content */}
                    <div
                        className="fixed inset-0 z-0 w-full h-full"
                        style={{
                            backgroundImage: `url(${backgroundSettings.url})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            filter: `blur(${backgroundSettings.blurIntensity}px)`,
                            transform: 'scale(1.05)' // Prevent blur edge artifacts
                        }}
                    />
                    {/* Overlay Layer - Also z-0, rendered after image to sit on top */}
                    <div
                        className="fixed inset-0 z-0 w-full h-full transition-colors duration-300"
                        style={{
                            backgroundColor: `rgba(${overlayColor}, ${backgroundSettings.overlayOpacity / 100})`
                        }}
                    />
                </>
            )}

            {/* Main App Container - z-10 and relative ensures it sits above the fixed background layers */}
            <div className={`${containerClasses} relative z-10`}>
                <React.Suspense fallback={<div />}>
                    {session && <DataSyncManager />}
                    <ReminderManager />
                    <NotificationGenerator />
                    {/* Sync Guard Component */}
                    <SyncGuard />
                </React.Suspense>

                {/* Global Blocking Overlay */}
                <BlockingSaveOverlay
                    isVisible={isBlockingOverlayVisible}
                    status={syncStatus}
                    pendingCount={syncQueue.length}
                    onForceExit={() => {
                        // Allow user to break out if stuck (Offline/Error)
                        resolveGlobalAction();
                    }}
                />

                <main className="flex-1 relative overflow-hidden flex flex-col">
                    <React.Suspense fallback={<LoadingFallback />}>
                        {getRenderContent()}
                    </React.Suspense>
                </main>
                {showNavBar && <BottomNavBar />}
                {showNavBar && (
                    <>
                        <React.Suspense fallback={<div />}>
                            <SearchFlyoutButton />
                        </React.Suspense>
                        <React.Suspense fallback={<div />}>
                            <MusicFlyoutButton />
                        </React.Suspense>
                    </>
                )}
                {isSearchOpen && (
                    <React.Suspense fallback={<div />}>
                        <SearchScreen onClose={() => setIsSearchOpen(false)} />
                    </React.Suspense>
                )}
                {isChatbotOpen && (
                    <React.Suspense fallback={<div />}>
                        <VmindChatModal onClose={() => setIsChatbotOpen(false)} />
                    </React.Suspense>
                )}
                <React.Suspense fallback={<div />}>
                    <MusicPlayer />
                </React.Suspense>
                <React.Suspense fallback={<div />}>
                    <ApiKeyModal />
                </React.Suspense>
                {galleryViewData && (
                    <GalleryViewModal
                        table={galleryViewData.table}
                        initialRowId={galleryViewData.initialRowId}
                        onClose={() => setGalleryViewData(null)}
                    />
                )}
                {unlockedBadgeNotification && (
                    <Notification
                        message={unlockedBadgeNotification.name}
                        icon={unlockedBadgeNotification.icon}
                        onClose={() => setUnlockedBadgeNotification(null)}
                    />
                )}
                {toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        actionText={toast.actionText}
                        onAction={toast.onAction}
                        onClose={() => setToast(null)}
                        duration={7000}
                    />
                )}
            </div>
        </>
    );
};
