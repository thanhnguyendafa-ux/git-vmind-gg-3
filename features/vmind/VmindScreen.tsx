
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

// Define explicit color mappings to ensure Tailwind JIT picks them up correctly.
// This prevents visual instability where styles might be missing due to dynamic interpolation.
const colorVariants: Record<string, {
    cardBg: string;
    cardBorder: string;
    cardHoverBorder: string;
    iconBoxBg: string;
    iconColor: string;
}> = {
    primary: {
        cardBg: 'bg-primary-50',
        cardBorder: 'border-primary-200',
        cardHoverBorder: 'hover:border-primary-500',
        iconBoxBg: 'dark:bg-primary-900/20',
        iconColor: 'text-primary-600 dark:text-primary-400'
    },
    warning: {
        cardBg: 'bg-warning-50',
        cardBorder: 'border-warning-200',
        cardHoverBorder: 'hover:border-warning-500',
        iconBoxBg: 'dark:bg-warning-900/20',
        iconColor: 'text-warning-600 dark:text-warning-400'
    },
    blue: {
        cardBg: 'bg-blue-50',
        cardBorder: 'border-blue-200',
        cardHoverBorder: 'hover:border-blue-500',
        iconBoxBg: 'dark:bg-blue-900/20',
        iconColor: 'text-blue-600 dark:text-blue-400'
    },
    secondary: {
        cardBg: 'bg-secondary-50',
        cardBorder: 'border-secondary-200',
        cardHoverBorder: 'hover:border-secondary-500',
        iconBoxBg: 'dark:bg-secondary-900/20',
        iconColor: 'text-secondary-600 dark:text-secondary-400'
    },
    info: {
        cardBg: 'bg-info-50',
        cardBorder: 'border-info-200',
        cardHoverBorder: 'hover:border-info-500',
        iconBoxBg: 'dark:bg-info-900/20',
        iconColor: 'text-info-600 dark:text-info-400'
    },
    error: {
        cardBg: 'bg-error-50',
        cardBorder: 'border-error-200',
        cardHoverBorder: 'hover:border-error-500',
        iconBoxBg: 'dark:bg-error-900/20',
        iconColor: 'text-error-600 dark:text-error-400'
    },
    purple: {
        cardBg: 'bg-purple-50',
        cardBorder: 'border-purple-200',
        cardHoverBorder: 'hover:border-purple-500',
        iconBoxBg: 'dark:bg-purple-900/20',
        iconColor: 'text-purple-600 dark:text-purple-400'
    }
};

const VmindScreen: React.FC = () => {
  // KẾ HOẠCH FULL-WIDTH: ĐÃ HOÀN THÀNH
  // 1. Container: Đã loại bỏ `max-w-6xl` và `mx-auto` khỏi container chính để giao diện trải rộng toàn màn hình.
  //    (Context: This fulfills step 3 of the full-width plan for the container.)
  // 2. Bố cục Lưới: Grid đã được cập nhật để thêm các cột trên màn hình rất lớn.
  //    Sử dụng `sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5`.
  //    Điều này giúp các thẻ (Card) giữ được kích thước hợp lý và tận dụng không gian hiệu quả.
  //    (Context: This fulfills the grid layout adjustment in step 3.)
  const { attemptNavigation } = useUIStore();

  const studyModesGroup = [
    { 
        name: 'Queue', 
        icon: StudyByQueueIcon, 
        color: 'primary', 
        description: 'Review your vocabulary', 
        enabled: true, 
        action: () => attemptNavigation(Screen.StudyProgress) 
    },
    { 
        name: 'Confidence', 
        icon: ConfidenceIcon, 
        color: 'warning', 
        description: 'Spaced repetition mastery', 
        enabled: true, 
        action: () => attemptNavigation(Screen.Confidence) 
    },
    { 
        name: 'Anki SRS', 
        icon: AnkiSrsIcon, 
        color: 'blue', // Using Blue for Anki brand identity
        description: 'Classic flashcard decks', 
        enabled: true, 
        action: () => attemptNavigation(Screen.AnkiSetup) 
    },
    { 
        name: 'Theater', 
        icon: TheaterIcon, 
        color: 'secondary', 
        description: 'Passive playback mode', 
        enabled: true, 
        action: () => attemptNavigation(Screen.TheaterSetup) 
    },
  ];

  const otherModesGroup = [
    { 
        name: 'Reading Space', 
        icon: ReadingSpaceIcon, 
        color: 'info', 
        description: 'Contextual learning', 
        enabled: true, 
        action: () => attemptNavigation(Screen.Reading) 
    },
    { 
        name: 'Dictation', 
        icon: DictationIcon, 
        color: 'error', 
        description: 'Listening practice', 
        enabled: true, 
        action: () => attemptNavigation(Screen.Dictation) 
    },
    { 
        name: 'Journal', 
        icon: JournalIcon, 
        color: 'purple', 
        description: 'Study logs & notes', 
        enabled: true, 
        action: () => attemptNavigation(Screen.Journal) 
    },
  ];

  const renderModeCard = (mode: any) => {
    const IconComponent = mode.icon;
    const colorKey = mode.color;
    const styles = colorVariants[colorKey] || colorVariants.secondary; // Fallback
    
    // Base layout classes
    const baseClasses = "relative w-full h-full rounded-xl p-4 flex flex-row items-center text-left transition-all duration-200 group outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-secondary-900";

    // Interaction & State classes
    const stateClasses = mode.enabled
        ? `cursor-pointer hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] active:shadow-none`
        : `opacity-50 cursor-not-allowed`;

    // Theme Colors (Constructed from static map)
    const colorClasses = mode.enabled
        ? `${styles.cardBg} dark:bg-secondary-800 border ${styles.cardBorder} dark:border-secondary-700 ${styles.cardHoverBorder} dark:hover:border-secondary-500`
        : `bg-secondary-100 dark:bg-secondary-800 border border-transparent dark:border-secondary-700`;


    const iconBoxClasses = mode.enabled
        ? `bg-white ${styles.iconBoxBg} ${styles.iconColor} shadow-sm group-hover:scale-110 group-active:scale-100`
        : `bg-secondary-200 dark:bg-secondary-700 text-text-subtle`;

    return (
        <button
            key={mode.name}
            onClick={mode.action}
            disabled={!mode.enabled}
            className={`${baseClasses} ${stateClasses} ${colorClasses}`}
        >
            <div className={`
                p-3 rounded-lg flex items-center justify-center mr-4 flex-shrink-0
                transition-transform duration-200
                ${iconBoxClasses}
            `}
            aria-hidden="true"
            >
            {typeof IconComponent === 'string' ? (
                <Icon name={IconComponent} className="w-6 h-6" />
            ) : (
                <IconComponent className="w-6 h-6" />
            )}
            </div>
            <div className="flex-1 min-w-0">
                {/* HIERARCHY: Feature Name - font-bold text-base */}
                <span className={`block font-bold text-base truncate ${mode.enabled ? 'text-text-main dark:text-secondary-100' : 'text-text-subtle'}`}>
                    {mode.name}
                </span>
                {mode.description && (
                    /* HIERARCHY: Description - text-xs text-text-subtle */
                    <p className="text-xs text-text-subtle truncate opacity-90 dark:opacity-70 mt-0.5">
                        {mode.description}
                    </p>
                )}
            </div>
            {!mode.enabled && (
                <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-secondary-400 dark:text-secondary-500 border border-secondary-300 dark:border-secondary-600 px-1.5 py-0.5 rounded">Soon</span>
            )}
        </button>
    );
  };

  return (
    <div className="p-4 sm:p-6 w-full animate-fadeIn h-full overflow-y-auto">
      <header className="mb-8">
        {/* HIERARCHY: Screen Title - H1 text-3xl */}
        <h1 className="text-3xl font-bold text-text-main dark:text-secondary-100">Learning Center</h1>
        <p className="text-sm text-text-subtle mt-1">Choose your learning activity</p>
      </header>
      
      <main className="space-y-10">
        <section>
            {/* HIERARCHY: Group Title - H2 text-xl */}
            <h2 className="text-xl font-bold text-text-main dark:text-secondary-100 mb-4 flex items-center gap-2">
                <Icon name="brain" className="w-5 h-5 text-primary-500" />
                Study Modes
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {studyModesGroup.map(renderModeCard)}
            </div>
        </section>

        <section>
            {/* HIERARCHY: Group Title - H2 text-xl */}
            <h2 className="text-xl font-bold text-text-main dark:text-secondary-100 mb-4 flex items-center gap-2">
                <Icon name="sparkles" className="w-5 h-5 text-info-500" />
                Tools & Resources
            </h2>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {otherModesGroup.map(renderModeCard)}
            </div>
        </section>
      </main>
    </div>
  );
};

export default VmindScreen;
