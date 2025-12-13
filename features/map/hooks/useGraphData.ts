
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useTableStore } from '../../../stores/useTableStore';
import { useSessionDataStore } from '../../../stores/useSessionDataStore';
import { useNoteStore } from '../../../stores/useNoteStore';
import { useDictationNoteStore } from '../../../stores/useDictationNoteStore';
import { useContextLinkStore } from '../../../stores/useContextLinkStore';
// FIX: Renamed FlashcardProgress to ConfidenceProgress.
import { Table, ConfidenceProgress, AnkiProgress, StudyProgress, Note, DictationNote } from '../../../types';
import { getTagSolidColor } from '../../../utils/colorUtils';
import { useUIStore } from '../../../stores/useUIStore';

// FIX: Renamed 'flashcard' to 'confidence'.
export type NodeType = 'table' | 'anki' | 'confidence' | 'queue' | 'note' | 'dictation';

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  color: string;
  radius: number;
  data: Table | ConfidenceProgress | AnkiProgress | StudyProgress | Note | DictationNote;
  opacity?: number;
  // D3 Simulation Properties
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  value: number;
  type: 'main' | 'leaf';
  opacity?: number;
}

interface GraphDataParams {
    activeFilters: Set<NodeType>;
    searchQuery: string;
    hideOrphans: boolean;
    mainLinksOnly: boolean;
}

const getNodeId = (node: unknown): string => {
    if (typeof node === 'string') {
        return node;
    }
    // D3 simulation can add extra properties, but the 'id' will still be there.
    if (node && typeof node === 'object' && 'id' in node && typeof (node as any).id === 'string') {
        return (node as { id: string }).id;
    }
    return '';
};

const getLatestTimestamp = (items: any[], timestampKey: 'createdAt' | 'modifiedAt' = 'createdAt'): number => {
    if (!items || items.length === 0) return 0;
    return items.reduce((max, item) => Math.max(max, item[timestampKey] || 0), 0);
};


export const useGraphData = ({ activeFilters, searchQuery, hideOrphans, mainLinksOnly }: GraphDataParams) => {
  const tables = useTableStore(useShallow(state => state.tables));
  const { confidenceProgresses, ankiProgresses, studyProgresses } = useSessionDataStore(useShallow(state => ({
      confidenceProgresses: state.confidenceProgresses,
      ankiProgresses: state.ankiProgresses,
      studyProgresses: state.studyProgresses
  })));
  const notes = useNoteStore(useShallow(state => state.notes));
  const dictationNotes = useDictationNoteStore(useShallow(state => state.dictationNotes));
  const contextLinks = useContextLinkStore(useShallow(state => state.contextLinks));
  
  const theme = useUIStore(useShallow(state => state.theme));
  
  // --- Create Data Signatures for Memoization ---
  const signatures = {
      tables: `tables-${(tables || []).length}-${getLatestTimestamp(tables || [], 'modifiedAt')}`,
      anki: `anki-${(ankiProgresses || []).length}-${getLatestTimestamp(ankiProgresses || [])}`,
      // FIX: Renamed from flashcard to confidence.
      confidence: `confidence-${(confidenceProgresses || []).length}-${getLatestTimestamp(confidenceProgresses || [])}`,
      queue: `queue-${(studyProgresses || []).length}-${getLatestTimestamp(studyProgresses || [])}`,
      notes: `notes-${(notes || []).length}-${getLatestTimestamp(notes || [])}`,
      dictations: `dictations-${(dictationNotes || []).length}-${getLatestTimestamp((dictationNotes || []).map(d => ({ createdAt: d.practiceHistory?.[0]?.timestamp || 0 })))}`,
      contextLinks: `contextLinks-${(contextLinks || []).length}-${getLatestTimestamp(contextLinks || [])}`,
  };

  return useMemo(() => {
    let allNodes: GraphNode[] = [];
    let allLinks: GraphLink[] = [];

    // --- 1. Generate all possible nodes and links ---
    (tables || []).forEach(table => {
        const primaryTagId = table.tagIds && table.tagIds.length > 0 ? table.tagIds[0] : '';
        const color = primaryTagId ? getTagSolidColor(primaryTagId, theme, {}) : (theme === 'dark' ? '#475569' : '#cbd5e1');
        allNodes.push({ id: table.id, type: 'table', label: table.name, color: color, radius: 25, data: table });
    });

    (ankiProgresses || []).forEach(progress => {
        allNodes.push({ id: progress.id, type: 'anki', label: progress.name, color: '#0ea5e9', radius: 20, data: progress });
        progress.tableIds.forEach(tableId => {
            allLinks.push({ source: progress.id, target: tableId, value: 1, type: 'main' });
        });
    });

    // FIX: Renamed from flashcardProgresses to confidenceProgresses and type to 'confidence'.
    (confidenceProgresses || []).forEach(progress => {
        allNodes.push({ id: progress.id, type: 'confidence', label: progress.name, color: '#f59e0b', radius: 20, data: progress });
        progress.tableIds.forEach(tableId => {
            allLinks.push({ source: progress.id, target: tableId, value: 1, type: 'main' });
        });
    });

    (studyProgresses || []).forEach(progress => {
        allNodes.push({ id: progress.id, type: 'queue', label: progress.name, color: '#22c55e', radius: 18, data: progress });
        const tableIds = new Set(progress.settings.sources.map(s => s.tableId));
        tableIds.forEach(tableId => {
            allLinks.push({ source: progress.id, target: tableId as string, value: 1, type: 'main' });
        });
    });
    
    (notes || []).forEach(note => {
        allNodes.push({ id: note.id, type: 'note', label: note.title, color: theme === 'dark' ? '#475569' : '#94a3b8', radius: 15, data: note });
    });

    (dictationNotes || []).forEach(note => {
        allNodes.push({ id: note.id, type: 'dictation', label: note.title, color: '#ef4444', radius: 15, data: note });
    });
    
    (contextLinks || []).forEach(link => {
        const table = tables.find(t => t.rows.some(r => r.id === link.rowId));
        if (table) {
            allLinks.push({ source: link.sourceId as string, target: table.id as string, value: 0.5, type: 'leaf' });
        }
    });

    // --- 2. Filter nodes based on UI controls ---
    let filteredNodes = allNodes.filter(node => activeFilters.has(node.type));
    let nodeIds = new Set(filteredNodes.map(n => n.id));

    if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        const matchingIds = new Set<string>();
        
        filteredNodes.forEach(node => {
            if (node.label.toLowerCase().includes(lowerQuery)) {
                matchingIds.add(node.id);
                // Also add its direct neighbors to provide context
                allLinks.forEach(link => {
                    const sourceId = getNodeId(link.source);
                    const targetId = getNodeId(link.target);
                    if (sourceId === node.id && nodeIds.has(targetId)) matchingIds.add(targetId);
                    if (targetId === node.id && nodeIds.has(sourceId)) matchingIds.add(sourceId);
                });
            }
        });

        filteredNodes.forEach(node => {
            node.opacity = matchingIds.has(node.id) ? 1.0 : 0.1;
        });
    } else {
        filteredNodes.forEach(node => { node.opacity = 1.0; });
    }
    
    let filteredLinks = allLinks.filter(link => {
        const sourceId = getNodeId(link.source);
        const targetId = getNodeId(link.target);
        return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });

    if (mainLinksOnly) {
        filteredLinks = filteredLinks.filter(link => link.type === 'main');
    }
    
    if (hideOrphans) {
        const linkedNodeIds = new Set<string>();
        filteredLinks.forEach(link => {
            linkedNodeIds.add(getNodeId(link.source));
            linkedNodeIds.add(getNodeId(link.target));
        });
        filteredNodes = filteredNodes.filter(node => linkedNodeIds.has(node.id));
    }
    
    if (searchQuery) {
        filteredLinks.forEach(link => {
            const sourceOpacity = filteredNodes.find(n => n.id === getNodeId(link.source))?.opacity ?? 0;
            const targetOpacity = filteredNodes.find(n => n.id === getNodeId(link.target))?.opacity ?? 0;
            link.opacity = Math.min(sourceOpacity, targetOpacity);
        });
    } else {
        filteredLinks.forEach(link => { link.opacity = 1.0; });
    }

    return { nodes: filteredNodes, links: filteredLinks };
  // Using stable signatures to control memoization
  }, [
    signatures.tables, signatures.anki, signatures.confidence, signatures.queue, signatures.notes, signatures.dictations, signatures.contextLinks,
    activeFilters, searchQuery, hideOrphans, mainLinksOnly, theme
  ]);
};
