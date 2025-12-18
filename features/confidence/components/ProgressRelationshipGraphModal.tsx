
import React from 'react';
import Modal from '../../../components/ui/Modal';
import { ConfidenceProgress } from '../../../types';
import { useTableStore } from '../../../stores/useTableStore';
import ForceGraph from '../../map/components/ForceGraph';
import { useUIStore } from '../../../stores/useUIStore';
import { getTagSolidColor } from '../../../utils/colorUtils';
import { GraphNode, GraphLink } from '../../map/hooks/useGraphData';

interface ProgressRelationshipGraphModalProps {
    progress: ConfidenceProgress;
    onClose: () => void;
}

const ProgressRelationshipGraphModal: React.FC<ProgressRelationshipGraphModalProps> = ({ progress, onClose }) => {
    const { tables } = useTableStore();
    const { theme } = useUIStore();

    const { nodes, links } = React.useMemo(() => {
        const nodes: GraphNode[] = [];
        const links: GraphLink[] = [];
        
        // 1. Add the Progress Node (Center)
        nodes.push({
            id: progress.id,
            type: 'confidence',
            label: progress.name,
            color: '#f59e0b', // amber-500
            radius: 30,
            data: progress
        });

        // 2. Add Table Nodes
        progress.tableIds.forEach(tableId => {
            const table = tables.find(t => t.id === tableId);
            if (table) {
                const primaryTagId = table.tagIds && table.tagIds.length > 0 ? table.tagIds[0] : '';
                const color = primaryTagId ? getTagSolidColor(primaryTagId, theme, {}) : (theme === 'dark' ? '#475569' : '#cbd5e1');
                
                nodes.push({
                    id: table.id,
                    type: 'table',
                    label: table.name,
                    color: color,
                    radius: 20,
                    data: table
                });

                links.push({
                    source: progress.id,
                    target: table.id,
                    value: 1,
                    type: 'main'
                });
            }
        });
        
        // 3. Add Relations as leaf nodes? Or just visualize tables is enough?
        // Let's stick to Tables for clarity as per user request for "Relationships".

        return { nodes, links };
    }, [progress, tables, theme]);

    return (
        <Modal isOpen={true} onClose={onClose} title="Set Relationships" containerClassName="w-full max-w-4xl h-[80vh]">
            <div className="w-full h-full bg-background dark:bg-secondary-900 rounded-b-lg overflow-hidden">
                <ForceGraph 
                    nodes={nodes} 
                    links={links} 
                    onNodeClick={() => {}} // No action needed in this view
                />
            </div>
        </Modal>
    );
};

export default ProgressRelationshipGraphModal;
