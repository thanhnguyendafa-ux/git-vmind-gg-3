
import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Screen, Table, Relation, VocabRow, ConfidenceProgress, AnkiProgress, StudyProgress, Theme } from './types';
import { useUIStore } from './stores/useUIStore';
import { useUserStore, defaultStats, defaultSettings, resetStores, clearAllStores } from './stores/useUserStore';
import { useSessionStore } from './stores/useSessionStore';
import { useTableStore } from './stores/useTableStore';
import { useNoteStore } from './stores/useNoteStore';
import { useDictationNoteStore } from './stores/useDictationNoteStore';
import { useContextLinkStore } from './stores/useContextLinkStore';
import { useConceptStore } from './stores/useConceptStore';
import { useSessionDataStore } from './stores/useSessionDataStore';
import { useTagStore } from './stores/useTagStore';
import { useGardenStore } from './stores/useGardenStore';
import { supabase } from './services/supabaseClient';
import { defaultState } from './stores/appStorage';
import { migrateUserData } from './services/migrationService';
import { useMusicStore } from './stores/useMusicStore';


import Icon from './components/ui/Icon';
import BottomNavBar from './components/layout/BottomNavBar';
import Notification from './components/ui/Notification';
import Toast from './components/ui/Toast';
import GalleryViewModal from './features/tables/components/GalleryViewModal';
import DataSyncManager from './features/data/DataSyncManager';
import BlockingSaveOverlay from './components/ui/BlockingSaveOverlay';
import AuroraBackground from './components/ui/AuroraBackground';

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

const LoadingFallback = () => (
    <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center">
        {/* Atmosphere Layer */}
        <AuroraBackground />
        {/* Foreground Loader */}
        <div className="relative z-10">
            <Icon name="spinner" className="w-10 h-10 text-primary-500 animate-spin" />
        </div>
    </div>
);

const normalizeServerTable = (serverObj: any): Table => {
    const relationsData = serverObj.relations as any[];
    const relations: Relation[] = (Array.isArray(relationsData) ? relationsData : [])
        .filter((r): r is object & { id: string; name: string } => r && typeof r === 'object' && r.id && r.name)
        .map((r: any): Relation => ({
            id: r.id,
            name: r.name,
            questionColumnIds: r.question_column_ids ?? r.questionColumnIds ?? [],
            answerColumnIds: r.answer_column_ids ?? r.answerColumnIds ?? [],
            answerFormula: r.answer_formula ?? r.answerFormula,
            targetLabel: r.target_label ?? r.targetLabel,
            compatibleModes: r.compatible_modes ?? r.compatibleModes ?? [],
            design: (r.design && r.design.front && r.design.back) ? r.design : undefined,
            tags: Array.isArray(r.tags) ? r.tags : [],
            audioConfig: r.audio_config ?? r.audioConfig,
            displayTiers: r.displayTiers,
            scrambleConfig: r.scrambleConfig,
            clozeConfig: r.clozeConfig,
            dictationConfig: r.dictationConfig,
            promptType: r.promptType,
            customPromptText: r.customPromptText,
            interactionType: r.interactionType,
            interactionModes: r.interactionModes,
            interactionConfig: r.interactionConfig,
            speedModeDefault: r.speedModeDefault,
        }));

    return {
        id: serverObj.id,
        name: serverObj.name || 'Untitled Table',
        columns: Array.isArray(serverObj.columns) ? serverObj.columns : [],
        rows: [] as VocabRow[], // Explicitly initialize empty rows for Metadata First strategy
        rowCount: serverObj.vocab_rows?.[0]?.count ?? serverObj.rowCount ?? 0,
        relations: relations,
        imageConfig: serverObj.image_config ?? serverObj.imageConfig,
        columnAudioConfig: serverObj.column_audio_config ?? serverObj.columnAudioConfig,
        aiPrompts: serverObj.ai_prompts ?? serverObj.aiPrompts,
        description: serverObj.description,
        tagIds: serverObj.tag_ids ?? serverObj.tagIds ?? [],
        tags: serverObj.tags ?? [],
        isPublic: serverObj.is_public ?? serverObj.isPublic,
        createdAt: serverObj.created_at ? new Date(serverObj.created_at).getTime() : undefined,
        modifiedAt: serverObj.modified_at ? new Date(serverObj.modified_at).getTime() : undefined,
        ankiConfig: serverObj.anki_config ?? serverObj.ankiConfig,
        viewConfig: serverObj.view_settings ?? serverObj.viewConfig, // Map backend view_settings to frontend viewConfig
        columnUrlTemplates: serverObj.column_url_templates ?? serverObj.columnUrlTemplates, // Map backend column_url_templates
    } as Table;
};


const fetchUserData = async (userId: string) => {
    const [
        profileRes,
        tablesRes,
        foldersRes,
        notesRes,
        dictationNotesRes,
        contextLinksRes,
        studySetsRes,
        conceptsRes,
        conceptLevelsRes,
    ] = await Promise.all([
        supabase.from('profiles').select('user_profile').eq('id', userId).single(),
        supabase.from('tables').select('*, vocab_rows(count)').eq('user_id', userId),
        supabase.from('folders').select('*').eq('user_id', userId),
        supabase.from('notes_metadata').select('*').eq('user_id', userId),
        supabase.from('dictation_metadata').select('*').eq('user_id', userId),
        supabase.from('context_links').select('*').eq('user_id', userId),
        // NEW: Fetch study sets (lighter than profile JSON)
        supabase.from('study_sets').select('*').eq('user_id', userId),
        supabase.from('concepts').select('*').eq('user_id', userId),
        supabase.from('concept_levels').select('*').eq('user_id', userId),
    ]);

    if (profileRes.error && profileRes.status !== 406) throw profileRes.error;
    if (tablesRes.error) throw tablesRes.error;
    if (foldersRes.error) throw foldersRes.error;
    if (notesRes.error) throw notesRes.error;
    if (dictationNotesRes.error) throw dictationNotesRes.error;
    if (contextLinksRes.error) throw contextLinksRes.error;
    if (studySetsRes.error) throw studySetsRes.error;
    if (conceptsRes.error) throw conceptsRes.error;
    if (conceptLevelsRes.error) throw conceptLevelsRes.error;

    // --- MIGRATION TRIGGER ---
    // If study_sets is empty but profile has data, trigger migration
    const hasOldData = profileRes.data?.user_profile?.confidenceProgresses?.length > 0;
    const hasNewData = studySetsRes.data && studySetsRes.data.length > 0;

    if (hasOldData && !hasNewData) {
        await migrateUserData(userId, profileRes.data?.user_profile);
        // Re-fetch study sets after migration
        const { data: migratedSets } = await supabase.from('study_sets').select('*').eq('user_id', userId);
        studySetsRes.data = migratedSets || [];
    }
    // -------------------------

    return {
        profile: profileRes.data?.user_profile,
        tables: tablesRes.data || [],
        folders: foldersRes.data || [],
        notes: notesRes.data || [],
        dictationNotes: dictationNotesRes.data || [],
        contextLinks: contextLinksRes.data || [],
        studySets: studySetsRes.data || [],
        concepts: conceptsRes.data || [],
        conceptLevels: conceptLevelsRes.data || [],
    };
};


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
        toggleTheme,
        setTheme,
        isSearchOpen,
        setIsSearchOpen,
        isChatbotOpen,
        setIsChatbotOpen,
        showToast,
        isImmersive,
        backgroundSettings,
        // Global Navigation Guard Props
        isBlockingOverlayVisible,
        resolveGlobalAction,
        pendingAction,
        syncStatus,
        syncQueue
    } = useUIStore();

    const { loading, settings, session, isGuest, setLoading, setStats, setSettings } = useUserStore();
    const { setInitialData: setTableData } = useTableStore();
    const { setNotes } = useNoteStore();
    const { setDictationNotes } = useDictationNoteStore();
    const { setContextLinks } = useContextLinkStore();
    const { setInitialData: setSessionData } = useSessionDataStore();
    const { setTags } = useTagStore();

    // --- Global Sync Completion Listener ---
    React.useEffect(() => {
        // If there is a pending action (like navigation) and the sync queue has cleared
        // and status is idle/saved, execute the action.
        if (pendingAction && isBlockingOverlayVisible) {
            const isQueueEmpty = syncQueue.length === 0;
            const isIdle = syncStatus === 'idle' || syncStatus === 'saved';

            if (isQueueEmpty && isIdle) {
                resolveGlobalAction();
            }
        }
    }, [syncStatus, syncQueue, pendingAction, isBlockingOverlayVisible, resolveGlobalAction]);
    // ----------------------------------------

    React.useEffect(() => {
        const root = document.documentElement;
        // Reset classes and attributes
        root.classList.remove('dark');
        root.removeAttribute('data-theme');

        if (theme === 'dark') {
            root.classList.add('dark');
            root.setAttribute('data-theme', 'forest');
        } else if (theme === 'pastel') {
            root.setAttribute('data-theme', 'pastel');
        }
        // 'light' is default, requires no class or attribute in this system

        localStorage.setItem('vmind-theme-preference', theme);
    }, [theme]);

    React.useEffect(() => {
        const savedTheme = localStorage.getItem('vmind-theme-preference');
        if (savedTheme && ['light', 'dark', 'pastel'].includes(savedTheme)) {
            if (useUIStore.getState().theme !== savedTheme) {
                setTheme(savedTheme as Theme);
            }
        }
    }, [setTheme]);

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

    // Data fetching with React Query
    const { isLoading, isSuccess, isError, data } = useQuery({
        queryKey: ['userData', session?.user.id],
        queryFn: () => fetchUserData(session!.user.id),
        enabled: !!session && !isGuest,
        staleTime: Infinity, // Important: Trust local optimistic updates, do not auto-refetch
        refetchOnWindowFocus: false, // Prevent overwriting local state on focus
        refetchOnReconnect: false, // Prevent overwriting local state on reconnect
    });

    // Effect to populate stores when data is successfully fetched/refetched
    React.useEffect(() => {
        if (isSuccess && data) {
            const userProfile = data.profile;

            if (userProfile) {
                setStats(userProfile.stats || defaultStats);
                setSettings(userProfile.settings || defaultSettings);
                setTags(userProfile.tags || defaultState.tags || []);

                // Hydrate Garden State from Cloud
                if (userProfile.garden) {
                    useGardenStore.getState().setTotalDrops(userProfile.garden.totalDrops || 0);
                }

                // Sync Theme from Cloud
                if (userProfile.settings?.theme) {
                    const currentTheme = useUIStore.getState().theme;
                    if (userProfile.settings.theme !== currentTheme) {
                        useUIStore.getState().setTheme(userProfile.settings.theme);
                    }
                }

                // Sync Music Config from Cloud
                if (userProfile.music) {
                    useMusicStore.getState().hydrate(userProfile.music);
                }
            } else {
                setStats(defaultStats);
                setSettings(defaultSettings);
                setTags(defaultState.tags || []);
            }

            // Map study_sets from DB to Store Types
            const dbSets = data.studySets || [];
            const confidenceProgresses: ConfidenceProgress[] = dbSets
                .filter((s: any) => s.type === 'confidence')
                .map((s: any) => ({
                    id: s.id,
                    name: s.name,
                    tableIds: s.settings.tableIds,
                    relationIds: s.settings.relationIds,
                    tags: s.settings.tags,
                    createdAt: new Date(s.created_at).getTime(),
                    // Initial Queue: Try to load from settings snapshot first (Metadata First)
                    // If empty, the session will fetch from payload later.
                    queue: s.settings.queue || [],
                    currentIndex: s.settings.currentIndex || 0,
                    intervalConfig: s.settings.intervalConfig,
                    newWordCount: s.settings.newWordCount,
                    cardStates: s.settings.cardStates || {},
                }));

            const ankiProgresses: AnkiProgress[] = dbSets
                .filter((s: any) => s.type === 'anki')
                .map((s: any) => ({
                    id: s.id,
                    name: s.name,
                    tableIds: s.settings.tableIds,
                    relationIds: s.settings.relationIds,
                    tags: s.settings.tags,
                    ankiConfig: s.settings.ankiConfig,
                    createdAt: new Date(s.created_at).getTime(),
                }));

            const studyProgresses: StudyProgress[] = dbSets
                .filter((s: any) => s.type === 'queue')
                .map((s: any) => ({
                    id: s.id,
                    name: s.name,
                    createdAt: new Date(s.created_at).getTime(),
                    settings: s.settings.studySettings,
                    queue: [], // Loaded on demand
                    currentIndex: s.settings.currentIndex || 0
                }));

            setSessionData({
                confidenceProgresses,
                studyProgresses,
                ankiProgresses,
            });

            const tablesData = data.tables.map(normalizeServerTable);
            const foldersData = data.folders.map((f: any) => ({ ...f, tableIds: f.table_ids, createdAt: new Date(f.created_at).getTime() }));
            setTableData({ tables: tablesData, folders: foldersData });

            setNotes(data.notes.map((n: any) => ({ ...n, createdAt: new Date(n.created_at).getTime() })));
            setDictationNotes(data.dictationNotes.map((d: any) => ({ ...d, youtubeUrl: d.youtube_url, practiceHistory: d.practice_history || [] })));
            setContextLinks(data.contextLinks.map((l: any) => ({ ...l, rowId: l.row_id, sourceType: l.source_type, sourceId: l.source_id, createdAt: new Date(l.created_at).getTime() })));

            // Hydrate Concepts
            useConceptStore.getState().setInitialData({
                concepts: data.concepts.map((c: any) => ({
                    ...c,
                    parentId: c.parent_id,
                    isFolder: c.is_folder,
                    createdAt: c.created_at,
                    modifiedAt: c.modified_at
                })),
                conceptLevels: data.conceptLevels.map((l: any) => ({
                    ...l,
                    conceptId: l.concept_id,
                    createdAt: l.created_at
                }))
            });

            if (loading) {
                setLoading(false);
            }
        }
    }, [isSuccess, data, setStats, setSettings, setSessionData, setTags, setTableData, setNotes, setDictationNotes, setContextLinks, setLoading, loading]);

    React.useEffect(() => {
        if (isError) {
            showToast("Could not load your data. Please refresh.", "error");
            setLoading(false);
        }
    }, [isError, showToast, setLoading]);

    const {
        activeSession,
        activeConfidenceSession,
        activeTheaterSession,
        activeDictationSession,
        activeAnkiSession,
        editingDictationNote,
        activeTableId
    } = useSessionStore();

    // Keyboard shortcuts
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) return;

            // Search Shortcut
            const searchShortcut = settings.searchShortcut || 'Ctrl+K';
            const checkShortcut = (shortcut: string, event: KeyboardEvent) => {
                const key = shortcut.split('+').pop()?.toLowerCase();
                if (!key) return false;

                const hasCtrl = shortcut.toLowerCase().includes('ctrl');
                const hasMeta = shortcut.toLowerCase().includes('cmd') || shortcut.toLowerCase().includes('meta');
                const hasAlt = shortcut.toLowerCase().includes('alt');
                const hasShift = shortcut.toLowerCase().includes('shift');

                return (
                    event.key.toLowerCase() === key &&
                    (hasCtrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey) &&
                    (hasAlt ? event.altKey : !event.altKey) &&
                    (hasShift ? event.shiftKey : !event.shiftKey)
                );
            };

            if (checkShortcut(searchShortcut, e)) {
                e.preventDefault();
                setIsSearchOpen(true);
            }

            // Music Toggle Shortcut (Global)
            const musicShortcut = settings.musicShortcut || 'Ctrl+M';
            if (checkShortcut(musicShortcut, e)) {
                e.preventDefault();
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
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [settings.searchShortcut, settings.musicShortcut, setIsSearchOpen, showToast]);

    const isAppLoading = loading || (isLoading && !data);

    if (isAppLoading) {
        return <LoadingFallback />;
    }

    const renderContent = () => {
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
            case Screen.Community: return <CommunityScreen />; // New
            case Screen.Vmind: return <VmindScreen />;
            case Screen.Settings: return <SettingsScreen />;
            case Screen.TableDetail: return activeTableId ? <TableScreen tableId={activeTableId} /> : <TablesScreen />;
            case Screen.Confidence: return <ConfidenceScreen />;
            case Screen.ConfidenceSetup: return <ConfidenceSetupScreen />;
            case Screen.StudyProgress: return <StudyProgressScreen />;
            case Screen.StudySetup: return <StudySetupScreen />;
            case Screen.TheaterSetup: return <TheaterSetupScreen />;
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
            default: return <HomeScreen />;
        }
    };

    const isSessionActive = !!(activeSession || activeConfidenceSession || activeTheaterSession || activeDictationSession || activeAnkiSession);
    const hasSession = !!session || isGuest;
    // Immersive Mode Logic: Don't check isImmersive here to unmount. 
    // Just check normal conditions. CSS handles the hiding.
    const showNavBar = hasSession && currentScreen !== Screen.Auth && !isSessionActive;

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
                        {renderContent()}
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
