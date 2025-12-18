
import * as React from 'react';
import { useShallow } from 'zustand/react/shallow';
import Modal from '../../../components/ui/Modal';
import Icon from '../../../components/ui/Icon';
import { useGardenStore, TREE_STAGE_DEFINITIONS, GARDEN_TIER_DEFINITIONS } from '../../../stores/useGardenStore';
import GardenMilestoneCard from './GardenMilestoneCard';
import { IconSeed, IconSprout, IconTree, IconForest, IconWater, IconSanctuary, IconBarren } from './GardenIcons';

interface GardenGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GuideSection: React.FC<{
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}> = ({ icon, title, children }) => (
  <div className="flex items-start gap-4 p-3 rounded-lg bg-secondary-50 dark:bg-secondary-800/30 border border-secondary-100 dark:border-secondary-700/50">
    <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
      {icon}
    </div>
    <div>
      <h4 className="font-bold text-text-main dark:text-secondary-100 text-sm">{title}</h4>
      <p className="text-xs text-text-subtle mt-1 leading-relaxed">{children}</p>
    </div>
  </div>
);

const GardenGuideModal: React.FC<GardenGuideModalProps> = ({ isOpen, onClose }) => {
  const totalDrops = useGardenStore(useShallow(state => state.totalDrops));

  const getTierIcon = (tier: string) => {
      const commonClass = "w-full h-full drop-shadow-md";
      switch(tier) {
          case 'Barren': return <IconBarren className={commonClass} />;
          case 'Spring': return <IconWater className={commonClass} />;
          case 'Forest': return <IconTree className={commonClass} />;
          case 'Ecosystem': return <IconForest className={commonClass} />;
          case 'Sanctuary': return <IconSanctuary className={commonClass} />;
          default: return <IconBarren className={commonClass} />;
      }
  };
  
  const getStageIcon = (stage: string) => {
      const commonClass = "w-full h-full drop-shadow-sm";
      if (['Seed', 'Germination'].includes(stage)) return <IconSeed className={commonClass} />;
      if (['Sprout', 'Seedling'].includes(stage)) return <IconSprout className={commonClass} />;
      if (['Sapling', 'YoungTree', 'Tree', 'Mature', 'Ancient'].includes(stage)) return <IconTree className={commonClass} />;
      return <IconSanctuary className={commonClass} />; // Eternal
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Restoration Field Guide"
      containerClassName="max-w-4xl w-full max-h-[85vh]"
    >
      <div className="p-6 space-y-8 overflow-y-auto">
        {/* Mechanics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GuideSection icon={<IconWater className="w-10 h-10" />} title="Gather Droplets">
                Knowledge is water. Every minute you spend studying condenses into <strong>Droplets</strong>. These are the life-force required to heal this land.
            </GuideSection>
            <GuideSection icon={<IconTree className="w-10 h-10" />} title="The Spirit Tree">
                At the center stands the Spirit Tree. It evolves from a humble <strong>Seed</strong> into a majestic <strong>Eternal</strong> guardian as you accumulate knowledge.
            </GuideSection>
            <GuideSection icon={<IconBarren className="w-10 h-10" />} title="The Slumber">
                Consistency keeps the magic alive. If you miss a day, the garden enters <strong>Dormancy</strong>. Colors fade and animals hide until you return.
            </GuideSection>
        </div>

        {/* Milestones Visualized */}
        <div>
             <h4 className="font-bold text-text-main dark:text-secondary-100 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider border-b border-secondary-200 dark:border-secondary-700 pb-2">
                <Icon name="trophy" className="w-4 h-4 text-yellow-500" />
                Ecosystem Evolution
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {GARDEN_TIER_DEFINITIONS.map(def => (
                    <GardenMilestoneCard
                        key={def.tier}
                        title={def.label}
                        threshold={def.threshold}
                        currentDrops={totalDrops}
                        icon={getTierIcon(def.tier)}
                        isReached={totalDrops >= def.threshold}
                    />
                ))}
            </div>
        </div>

        <div>
             <h4 className="font-bold text-text-main dark:text-secondary-100 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider border-b border-secondary-200 dark:border-secondary-700 pb-2">
                <Icon name="tree" className="w-4 h-4 text-emerald-500" />
                Tree Growth Stages
            </h4>
             {/* Using a scrolling container for the longer list of tree stages */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {TREE_STAGE_DEFINITIONS.map(def => (
                    <GardenMilestoneCard
                        key={def.stage}
                        title={def.label}
                        threshold={def.threshold}
                        currentDrops={totalDrops}
                        icon={getStageIcon(def.stage)}
                        isReached={totalDrops >= def.threshold}
                    />
                ))}
            </div>
        </div>

        {/* Tips */}
        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-100 dark:border-amber-900/30">
            <h4 className="font-bold text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2 text-sm">
                <Icon name="star" className="w-4 h-4" variant="filled" />
                Secrets of the Soil
            </h4>
            <ul className="space-y-1 list-disc list-inside text-xs text-amber-700 dark:text-amber-300/80">
              <li>Reaching the <strong>Ecosystem</strong> tier invites wildlife like butterflies and bluebirds back to the garden.</li>
              <li>Maintaining a <strong>7-day streak</strong> grants your tree a golden aura of mastery.</li>
            </ul>
        </div>
      </div>
    </Modal>
  );
};

export default GardenGuideModal;
