import React from 'react';
import Icon from '../../components/ui/Icon';
import { useUIStore } from '../../stores/useUIStore';
import { Screen } from '../../types';
import DictationIcon from '../../components/ui/DictationIcon';
import StudyByQueueIcon from '../../components/ui/StudyByQueueIcon';
import AnkiSrsIcon from '../../components/ui/AnkiSrsIcon';

const VmindScreen: React.FC = () => {
  const { setCurrentScreen } = useUIStore();

  const studyModesGroup: {
    name: string;
    icon: string | React.FC<{ className?: string }>;
    colorClasses: { bg: string; text: string };
    description: string;
    enabled: boolean;
    action: () => void;
  }[] = [
    { name: 'Queue', icon: StudyByQueueIcon, colorClasses: { bg: 'bg-primary-100 dark:bg-primary-900/50', text: 'text-primary-600 dark:text-primary-400' }, description: '', enabled: true, action: () => setCurrentScreen(Screen.StudyProgress) },
    { name: 'Confidence', icon: 'flashcards', colorClasses: { bg: 'bg-warning-100 dark:bg-warning-900/50', text: 'text-warning-600 dark:text-warning-400' }, description: '', enabled: true, action: () => setCurrentScreen(Screen.Confidence) },
    { name: 'Anki SRS', icon: AnkiSrsIcon, colorClasses: { bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-600 dark:text-blue-400' }, description: '', enabled: true, action: () => setCurrentScreen(Screen.AnkiSetup) },
    { name: 'Theater', icon: 'film', colorClasses: { bg: 'bg-secondary-100 dark:bg-secondary-700', text: 'text-secondary-600 dark:text-secondary-400' }, description: '', enabled: true, action: () => setCurrentScreen(Screen.TheaterSetup) },
  ];

  const otherModesGroup: {
    name: string;
    icon: string | React.FC<{ className?: string }>;
    colorClasses: { bg: string; text: string };
    description: string;
    enabled: boolean;
    action: () => void;
  }[] = [
    { name: 'Reading Space', icon: 'book', colorClasses: { bg: 'bg-info-100 dark:bg-info-900/50', text: 'text-info-600 dark:text-info-400' }, description: '', enabled: true, action: () => setCurrentScreen(Screen.Reading) },
    { name: 'Dictation', icon: DictationIcon, colorClasses: { bg: 'bg-error-100 dark:bg-error-900/50', text: 'text-error-600 dark:text-error-400' }, description: '', enabled: true, action: () => setCurrentScreen(Screen.Dictation) },
    { name: 'Journal', icon: 'pencil', colorClasses: { bg: 'bg-purple-100 dark:bg-purple-900/50', text: 'text-purple-600 dark:text-purple-400' }, description: '', enabled: true, action: () => setCurrentScreen(Screen.Journal) },
  ];

  const renderModeCard = (mode: typeof studyModesGroup[0]) => {
    const IconComponent = mode.icon;
    return (
        <div
            key={mode.name}
            onClick={mode.enabled ? mode.action : undefined}
            className={`
            break-inside-avoid
            ${mode.colorClasses.bg} shadow-md
            rounded-xl p-4 flex flex-row items-center text-left
            group transition-all
            ${mode.enabled 
                ? 'hover:shadow-xl hover:-translate-y-0.5 cursor-pointer hover:ring-2 hover:ring-primary-500/30' 
                : 'opacity-50 cursor-not-allowed'}
            `}
        >
            <div className={`
            p-2 rounded-lg flex items-center justify-center mr-4
            transition-colors
            ${mode.enabled 
                ? `bg-white/50 dark:bg-black/20 ${mode.colorClasses.text}` 
                : 'bg-secondary-100 dark:bg-secondary-700 text-text-subtle'}
            `}>
            {typeof IconComponent === 'string' ? (
                <Icon name={IconComponent} className="w-6 h-6" />
            ) : (
                <IconComponent className="w-6 h-6" />
            )}
            </div>
            <h3 className="font-bold text-lg text-text-main dark:text-secondary-100">{mode.name}</h3>
            {mode.description && <p className="text-xs text-text-subtle flex-grow">{mode.description}</p>}
            {!mode.enabled && (
                <span className="ml-auto text-xs font-semibold text-secondary-400 dark:text-secondary-500">Coming Soon</span>
            )}
        </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 mx-auto animate-fadeIn max-w-6xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-text-main dark:text-secondary-100">Learning Center</h1>
        <p className="text-sm text-text-subtle">Choose your learning activity</p>
      </header>
      
      <main className="space-y-8">
        <section>
            <h2 className="text-xl font-bold text-text-main dark:text-secondary-100 mb-4">Study mode</h2>
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
                {studyModesGroup.map(renderModeCard)}
            </div>
        </section>

        <section>
            <h2 className="text-xl font-bold text-text-main dark:text-secondary-100 mb-4">Others</h2>
             <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
                {otherModesGroup.map(renderModeCard)}
            </div>
        </section>
      </main>
    </div>
  );
};

export default VmindScreen;