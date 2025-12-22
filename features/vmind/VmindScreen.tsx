
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
        {
            name: 'Concept Links',
            icon: 'hierarchy',
            color: 'purple',
            description: 'Organize vocabulary by concept hierarchies.',
            enabled: true,
            action: () => attemptNavigation(Screen.ConceptLinks)
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
        group relative flex flex-col items-center text-center 
        p-4 sm:p-6 lg:p-5 h-full w-full
        rounded-[2rem] sm:rounded-[2.5rem] transition-all duration-500
        bg-white/70 dark:bg-black/20 backdrop-blur-2xl border border-white/40 dark:border-white/5
        shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-none
        hover:-translate-y-2 hover:shadow-[0_30px_70px_rgba(0,0,0,0.1)] dark:hover:bg-white/5
        active:scale-95
        animate-slideInUp justify-center
        aspect-square lg:aspect-auto lg:h-full lg:min-h-[120px] lg:max-h-[min(180px,25vh)]
    `;

        const iconBoxClasses = `
        w-14 h-14 sm:w-16 sm:h-16 lg:w-[clamp(2.5rem,6vh,4rem)] lg:h-[clamp(2.5rem,6vh,4rem)] 
        rounded-[1.25rem] sm:rounded-[1.75rem] flex items-center justify-center mb-3 sm:mb-4 lg:mb-3
        bg-gradient-to-br ${styles.gradient} text-white
        shadow-2xl ${styles.shadow}
        transform transition-all duration-500 group-hover:scale-110 group-hover:rotate-6
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
                    {/* Glow layer */}
                    <div className={`absolute inset-0 rounded-[1.25rem] sm:rounded-[1.75rem] blur-xl opacity-40 group-hover:opacity-60 transition-opacity bg-gradient-to-br ${styles.gradient}`} />

                    {typeof IconComponent === 'string' ? (
                        <Icon name={IconComponent} className="w-6 h-6 sm:w-8 sm:h-8 lg:w-[clamp(1.25rem,3vh,2rem)] lg:h-[clamp(1.25rem,3vh,2rem)] relative z-10 drop-shadow-lg" variant="filled" />
                    ) : (
                        <IconComponent className="w-6 h-6 sm:w-8 sm:h-8 lg:w-[clamp(1.25rem,3vh,2rem)] lg:h-[clamp(1.25rem,3vh,2rem)] relative z-10 drop-shadow-lg" />
                    )}
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center w-full">
                    <h3 className={`font-serif font-bold text-sm sm:text-base lg:text-lg mb-1 tracking-tight w-full ${mode.enabled ? 'text-text-main dark:text-white' : 'text-text-subtle'}`}>
                        {mode.name}
                    </h3>
                    {mode.description && (
                        <p className="hidden lg:block text-[10px] sm:text-xs text-text-subtle leading-relaxed opacity-80 font-medium line-clamp-2 max-w-[90%]">
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
        <div className="relative h-full w-full overflow-hidden" style={{ maxHeight: 'calc(100vh - 64px)' }}>
            {/* 0. The Atmosphere (Background Layer) */}
            <AuroraBackground />

            {/* 1. Content Layer */}
            <div
                className="relative z-10 h-full w-full overflow-y-auto lg:overflow-hidden p-4 sm:p-6 pb-24 lg:pb-0 lg:flex lg:flex-col custom-scrollbar"
                style={{
                    // @ts-ignore
                    '--vmind-v-space': 'clamp(0.5rem, 3vh, 2.5rem)',
                    '--vmind-card-padding': 'clamp(1rem, 2.5vh, 2rem)'
                }}
            >
                <header className="mb-4 sm:mb-6 lg:mb-[var(--vmind-v-space)] mt-2 animate-fadeIn max-w-4xl mx-auto flex-shrink-0">
                    <h1 className="text-2xl sm:text-4xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-emerald-600 dark:from-primary-400 dark:to-emerald-400 mb-1 sm:mb-2 text-center lg:text-left">
                        Learning Center
                    </h1>
                    <p className="text-text-subtle text-sm sm:text-base max-w-lg text-center lg:text-left mx-auto lg:mx-0">
                        Choose your path. From active recall to passive immersion, cultivate your mind your way.
                    </p>
                </header>

                <main className="max-w-7xl mx-auto w-full flex-1 min-h-0 flex flex-col justify-center">
                    <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 h-full">
                        {/* Left Column: Study Modes */}
                        <section className="flex-1 space-y-3 sm:space-y-4 lg:space-y-[var(--vmind-v-space)] flex flex-col mt-auto mb-auto">
                            <div className="flex items-center gap-2 mb-2 sm:mb-4 animate-fadeIn flex-shrink-0" style={{ animationDelay: '100ms' }}>
                                <div className="p-1.5 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                                    <Icon name="brain" className="w-4 h-4 sm:w-5 sm:h-5" variant="filled" />
                                </div>
                                <h2 className="text-base sm:text-lg lg:text-xl font-bold text-text-main dark:text-secondary-100">
                                    Study Architecture
                                </h2>
                            </div>
                            {/* Responsive Jewel Grid: Restricted height on desktop */}
                            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6 flex-1 min-h-0 items-center">
                                {studyModesGroup.map((mode, idx) => renderModeCard(mode, idx, 0))}
                            </div>
                        </section>

                        {/* Middle Divider (Desktop only) */}
                        <div className="hidden lg:block w-px bg-white/10 self-stretch my-8" />

                        {/* Right Column: Tools & Resources */}
                        <section className="flex-1 space-y-3 sm:space-y-4 lg:space-y-[var(--vmind-v-space)] flex flex-col mt-auto mb-auto">
                            <div className="flex items-center gap-2 mb-2 sm:mb-4 animate-fadeIn flex-shrink-0" style={{ animationDelay: '300ms' }}>
                                <div className="p-1.5 rounded-lg bg-info-100 dark:bg-info-900/30 text-info-600 dark:text-info-400">
                                    <Icon name="sparkles" className="w-4 h-4 sm:w-5 sm:h-5" variant="filled" />
                                </div>
                                <h2 className="text-base sm:text-lg lg:text-xl font-bold text-text-main dark:text-secondary-100">
                                    Knowledge Tools
                                </h2>
                            </div>
                            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6 flex-1 min-h-0 items-center">
                                {otherModesGroup.map((mode, idx) => renderModeCard(mode, idx, studyModesGroup.length))}
                            </div>
                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default VmindScreen;
