
import * as React from 'react';
import Modal from '../../../components/ui/Modal';
import RestorationGarden from './RestorationGarden';
import { GARDEN_ASSETS_CONFIG } from '../logic/gardenDirector';
import { TREE_STAGE_DEFINITIONS, GARDEN_TIER_DEFINITIONS } from '../../../stores/useGardenStore';
import { Button } from '../../../components/ui/Button';
import Icon from '../../../components/ui/Icon';
import { useUIStore } from '../../../stores/useUIStore';
import { Screen } from '../../../types';

interface GardenPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentDrops: number;
}

interface Milestone {
    threshold: number;
    description: string;
    type: 'Asset' | 'Stage' | 'Tier';
}

const GardenPreviewModal: React.FC<GardenPreviewModalProps> = ({ isOpen, onClose, currentDrops }) => {
    const { setCurrentScreen } = useUIStore();
    
    const nextMilestone = React.useMemo<Milestone | null>(() => {
        // Collect all potential milestones
        const milestones: Milestone[] = [];

        // Assets
        GARDEN_ASSETS_CONFIG.forEach(asset => {
            milestones.push({ threshold: asset.threshold, description: asset.id.replace(/_/g, ' '), type: 'Asset' });
        });

        // Stages
        TREE_STAGE_DEFINITIONS.forEach(stage => {
            milestones.push({ threshold: stage.threshold, description: `${stage.label} Tree`, type: 'Stage' });
        });

        // Tiers
        GARDEN_TIER_DEFINITIONS.forEach(tier => {
            milestones.push({ threshold: tier.threshold, description: tier.label, type: 'Tier' });
        });

        // Sort by threshold
        milestones.sort((a, b) => a.threshold - b.threshold);

        // Find the first one strictly greater than current
        return milestones.find(m => m.threshold > currentDrops) || null;
    }, [currentDrops]);

    const handleStudy = () => {
        onClose();
        setCurrentScreen(Screen.StudySetup);
    };

    if (!nextMilestone) return null;

    const dropsNeeded = nextMilestone.threshold - currentDrops;

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Garden Dream" 
            containerClassName="w-full max-w-4xl"
        >
            <div className="p-0 overflow-hidden flex flex-col">
                <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-1">
                     <div className="bg-surface dark:bg-secondary-900 rounded-t-lg p-4 text-center">
                        <p className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-pink-600 dark:from-indigo-400 dark:to-pink-400 uppercase tracking-widest mb-1">
                            Future Vision
                        </p>
                        <h3 className="text-lg font-bold text-text-main dark:text-white capitalize">
                            Next Unlocks: {nextMilestone.description}
                        </h3>
                     </div>
                </div>

                <div className="relative w-full h-64 sm:h-80 md:h-96">
                    <RestorationGarden 
                        isAwake={true} 
                        overrideDrops={nextMilestone.threshold} 
                        className="h-full w-full rounded-none border-x-0"
                    />
                    
                    {/* Floating Annotation */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg border border-white/20 animate-bounce-gentle flex items-center gap-2 pointer-events-none">
                        <Icon name="sparkles" className="w-4 h-4 text-yellow-400" variant="filled" />
                         <span>{dropsNeeded.toLocaleString()} Drops Needed</span>
                    </div>
                </div>
                
                <div className="p-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-secondary-50 dark:bg-secondary-800/30">
                    <p className="text-sm text-text-subtle text-center sm:text-left">
                        Study now to turn this dream into reality.
                    </p>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <Button variant="secondary" onClick={onClose} className="flex-1 sm:flex-none">Close</Button>
                        <Button onClick={handleStudy} className="flex-1 sm:flex-none shadow-lg shadow-primary-500/20">
                            Start Studying
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default GardenPreviewModal;
