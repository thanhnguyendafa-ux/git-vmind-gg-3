
import React from 'react';
import Icon from '../../components/ui/Icon';
import { useUIStore } from '../../stores/useUIStore';
import { Screen } from '../../types';
import DictationIcon from '../../components/ui/DictationIcon';
import StudyByQueueIcon from '../../components/ui/StudyByQueueIcon';
import AnkiSrsIcon from '../../components/ui/AnkiSrsIcon';
import ConfidenceIcon from '../../components/ui/ConfidenceIcon';
import TheaterIcon from '../../components/ui/TheaterIcon';
import JournalIcon from '../../components/ui/JournalIcon';
import ReadingSpaceIcon from '../../components/ui/ReadingSpaceIcon';
import AuroraBackground from '../../components/ui/AuroraBackground';

// Jewel-like color mappings for the "Ethereal" theme
const colorVariants: Record<string, {
    gradient: string;
    shadow: string;
    ring: string;
}> = {
    primary: { // Queue
        gradient: 'from-primary-400 to-emerald-600',
        shadow: 'shadow-primary-500/30',
        ring: 'group-hover:ring-primary-400/50'
    },
    warning: { // Confidence
        gradient: 'from-amber-400 to-orange-500',
        shadow: 'shadow-amber-500/30',
        ring: 'group-hover:ring-amber-400/50'
    },
    blue: { // Anki
        gradient: 'from-blue-400 to-indigo-600',
        shadow: 'shadow-blue-500/30',
        ring: 'group-hover:ring-blue-400/50'
    },
    secondary: { // Theater
        gradient: 'from-slate-400 to-slate-600',
        shadow: 'shadow-slate-500/30',
        ring: 'group-hover:ring-slate-400/50'
    },
    info: { // Reading
        gradient: 'from-cyan-400 to-blue-500',
        shadow: 'shadow-cyan-500/30',
        ring: 'group-hover:ring-cyan-400/50'
    },
    error: { // Dictation
        gradient: 'from-rose-400 to-red-600',
        shadow: 'shadow-rose-500/30',
        ring: 'group-hover:ring-rose-400/50'
    },
    purple: { // Journal
        gradient: 'from-purple-400 to-fuchsia-600',
        shadow: 'shadow-purple-500/30',
        ring: 'group-hover:ring-purple-400/50'
    }
};

const VmindScreen: React.FC = () => {
  const { attemptNavigation, theme } = useUIStore();
  const isDark = theme === 'dark';

  const studyModesGroup = [
    { 
        name: 'Queue', 
        icon: StudyByQueueIcon, 
        color: 'primary', 
        description: 'Review your vocabulary in a standard queue.', 
        enabled: true, 
        action: () => attemptNavigation(Screen.StudyProgress) 
    },
    { 
        name: 'Confidence', 
        icon: ConfidenceIcon, 
        color: 'warning', 
        description: 'Spaced repetition mastery loop.', 
        enabled: true, 
        action: () => attemptNavigation(Screen.Confidence) 
    },
    { 
        name: 'Anki SRS', 
        icon: AnkiSrsIcon, 
        color: 'blue', 
        description: 'Long-term retention decks.', 
        enabled: true, 
        action: () => attemptNavigation(Screen.AnkiSetup) 
    },
    { 
        name: 'Theater', 
        icon: TheaterIcon, 
        color: 'secondary', 
        description: 'Passive hands-free playback mode.', 
        enabled: true, 
        action: () => attemptNavigation(Screen.TheaterSetup) 
    },
  ];

  const otherModesGroup = [
    { 
        name: 'Reading Space', 
        icon: ReadingSpaceIcon, 
        color: 'info', 
        description: 'Learn words in context.', 
        enabled: true, 
        action: () => attemptNavigation(Screen.Reading) 
    },
    { 
        name: 'Dictation', 
        icon: DictationIcon, 
        color: 'error', 
        description: 'Listening and typing practice.', 
        enabled: true, 
        action: () => attemptNavigation(Screen.Dictation) 
    },
    { 
        name: 'Journal', 
        icon: JournalIcon, 
        color: 'purple', 
        description: 'Study logs and free-form notes.', 
        enabled: true, 
        action: () => attemptNavigation(Screen.Journal) 
    },
  ];

  const renderModeCard = (mode: any, index: number, totalPrevious: number = 0) => {
    const IconComponent = mode.icon;
    const colorKey = mode.color;
    const styles = colorVariants[colorKey] || colorVariants.secondary; 
    
    // Delay calculation for staggered entrance
    const delay = (totalPrevious + index) * 50; 

    // Glassmorphism classes updated for responsive grid
    const cardBaseClasses = `
        group relative flex flex-col items-center sm:items-start text-center sm:text-left 
        p-4 sm:p-6 h-full w-full
        rounded-3xl transition-all duration-300
        bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/60 dark:border-white/10
        shadow-xl shadow-emerald-100/20 dark:shadow-none
        hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-100/40 dark:hover:bg-white/10
        active:scale-95
        animate-slideInUp aspect-square sm:aspect-auto justify-center sm:justify-start
    `;

    const iconBoxClasses = `
        w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center mb-2 sm:mb-4
        bg-gradient-to-br ${styles.gradient} text-white
        shadow-lg ${styles.shadow}
        transform transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3
    `;

    return (
        <button
            key={mode.name}
            onClick={mode.action}
            disabled={!mode.enabled}
            className={cardBaseClasses}
            style={{ animationDelay: `${delay}ms`, animationFillMode: 'backwards' }}
        >
            {/* Inner Highlights for Glass Effect */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/40 to-transparent opacity-50 pointer-events-none" />
            
            {/* Icon Jewel */}
            <div className={`relative z-10 ${iconBoxClasses}`}>
                {typeof IconComponent === 'string' ? (
                    <Icon name={IconComponent} className="w-5 h-5 sm:w-6 sm:h-6" variant="filled" />
                ) : (
                    <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
                )}
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center sm:items-start w-full">
                <h3 className={`font-serif font-bold text-sm sm:text-lg mb-1 truncate w-full ${mode.enabled ? 'text-text-main dark:text-white' : 'text-text-subtle'}`}>
                    {mode.name}
                </h3>
                {mode.description && (
                    <p className="hidden sm:block text-sm text-text-subtle leading-relaxed opacity-90 dark:opacity-70 text-left">
                        {mode.description}
                    </p>
                )}
            </div>

            {/* Coming Soon Badge */}
            {!mode.enabled && (
                <div className="absolute top-2 right-2 sm:top-4 sm:right-4 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full bg-secondary-200/50 dark:bg-white/10 backdrop-blur-md border border-white/20">
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-text-subtle">Soon</span>
                </div>
            )}
        </button>
    );
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* 0. The Atmosphere (Background Layer) */}
      <AuroraBackground />

      {/* 1. Content Layer */}
      <div className="relative z-10 h-full w-full overflow-y-auto p-4 sm:p-6 custom-scrollbar">
        <header className="mb-6 sm:mb-10 mt-2 animate-fadeIn">
            <h1 className="text-2xl sm:text-4xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-emerald-600 dark:from-primary-400 dark:to-emerald-400 mb-1 sm:mb-2">
                Learning Center
            </h1>
            <p className="text-text-subtle text-sm sm:text-base max-w-lg">
                Choose your path. From active recall to passive immersion, cultivate your mind your way.
            </p>
        </header>
        
        <main className="space-y-8 sm:space-y-12 pb-20">
            <section>
                <div className="flex items-center gap-2 mb-4 sm:mb-6 animate-fadeIn" style={{ animationDelay: '100ms' }}>
                    <div className="p-1.5 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                        <Icon name="brain" className="w-4 h-4 sm:w-5 sm:h-5" variant="filled" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-text-main dark:text-secondary-100">
                        Study Modes
                    </h2>
                </div>
                {/* Responsive Jewel Grid: 2 cols on mobile, 3 on tablet, 4 on desktop */}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                    {studyModesGroup.map((mode, idx) => renderModeCard(mode, idx, 0))}
                </div>
            </section>

            <section>
                <div className="flex items-center gap-2 mb-4 sm:mb-6 animate-fadeIn" style={{ animationDelay: '300ms' }}>
                     <div className="p-1.5 rounded-lg bg-info-100 dark:bg-info-900/30 text-info-600 dark:text-info-400">
                        <Icon name="sparkles" className="w-4 h-4 sm:w-5 sm:h-5" variant="filled" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-text-main dark:text-secondary-100">
                        Tools & Resources
                    </h2>
                </div>
                 <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                    {otherModesGroup.map((mode, idx) => renderModeCard(mode, idx, studyModesGroup.length))}
                </div>
            </section>
        </main>
      </div>
    </div>
  );
};

export default VmindScreen;
