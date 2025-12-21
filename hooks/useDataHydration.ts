import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUserStore, defaultStats, defaultSettings } from '../stores/useUserStore';
import { useUIStore } from '../stores/useUIStore';
import { useTableStore } from '../stores/useTableStore';
import { useNoteStore } from '../stores/useNoteStore';
import { useDictationNoteStore } from '../stores/useDictationNoteStore';
import { useContextLinkStore } from '../stores/useContextLinkStore';
import { useConceptStore } from '../stores/useConceptStore';
import { useSessionDataStore } from '../stores/useSessionDataStore';
import { useTagStore } from '../stores/useTagStore';
import { useGardenStore } from '../stores/useGardenStore';
import { useMusicStore } from '../stores/useMusicStore';
import { defaultState } from '../stores/appStorage';
import { fetchUserData, normalizeServerTable } from '../services/HydrationService';
import { ConfidenceProgress, AnkiProgress, StudyProgress } from '../types';

export const useDataHydration = () => {
    const { session, isGuest, loading, setLoading, setStats, setSettings } = useUserStore();
    const { showToast } = useUIStore();
    const { setInitialData: setTableData } = useTableStore();
    const { setNotes } = useNoteStore();
    const { setDictationNotes } = useDictationNoteStore();
    const { setContextLinks } = useContextLinkStore();
    const { setInitialData: setSessionData } = useSessionDataStore();
    const { setTags } = useTagStore();

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
                concepts: (data as any).concepts.map((c: any) => ({
                    ...c,
                    parentId: c.parent_id,
                    isFolder: c.is_folder,
                    color: c.color,
                    createdAt: c.created_at,
                    modifiedAt: c.modified_at
                })),
                conceptLevels: (data as any).conceptLevels.map((l: any) => ({
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

    return { isLoading, isSuccess, isError, data };
};
