import { StateStorage } from 'zustand/middleware';
// FIX: Renamed FlashcardProgress to ConfidenceProgress.
import { AppState, Table, FlashcardStatus, Relation, VocabRow, UserStats, Folder, Note, DictationNote, StudyMode, Column, RelationDesign, ConfidenceProgress, StudyProgress, AnkiProgress, AnkiConfig, RelationAudioConfig, ContextLink, TranscriptEntry, AppSettings, Tag } from '../types';
import { useUserStore } from './useUserStore';
import { useTableStore } from './useTableStore';
import { useNoteStore } from './useNoteStore';
import { useDictationNoteStore } from './useDictationNoteStore';
import { useSessionDataStore } from './useSessionDataStore';
import { useContextLinkStore } from './useContextLinkStore';
import { useTagStore } from './useTagStore';


// --- NEW: DEFAULT TAG UNIVERSE (Phase 1) ---
const learningTag = { id: 'tag-learning', name: 'learning', scope: 'global' as const };
const srsTag = { id: 'tag-srs', name: 'srs', parentId: 'tag-learning', scope: 'global' as const };
const activeRecallTag = { id: 'tag-active-recall', name: 'active-recall', parentId: 'tag-learning', scope: 'global' as const };
const techTag = { id: 'tag-tech', name: 'tech', scope: 'global' as const, color: 'linear-gradient(135deg, #f09819 0%, #edde5d 100%)' };
const vmindTag = { id: 'tag-vmind', name: 'vmind', scope: 'global' as const };
const sampleTag = { id: 'tag-sample', name: 'sample', scope: 'global' as const };
const idiomsTag = { id: 'tag-idioms-table', name: 'english-idioms', scope: 'table' as const };
const techTermsFcTag = { id: 'tag-fc-tech', name: 'tech-terms', scope: 'flashcard' as const };
const srsConceptsAnkiTag = { id: 'tag-anki-concepts', name: 'srs-concepts', scope: 'anki' as const };

const DEFAULT_TAGS: Tag[] = [
    learningTag, srsTag, activeRecallTag, techTag, vmindTag, sampleTag, idiomsTag, techTermsFcTag, srsConceptsAnkiTag
];


// --- DEFAULT STATE ---
// (Keeping existing default data structure...)
const showcaseReadingNote: Note = {
    id: 'showcase-note-reading-1',
    title: 'The Art of Spaced Repetition',
    content: 'Spaced Repetition is a powerful learning technique based on the "forgetting curve". Instead of cramming, you review information at increasing intervals. For example, after learning a new word, you might review it in 1 day, then 3 days, then a week, and so on. This method leverages how our brains work, strengthening memories over time. A good algorithm is key to scheduling these reviews efficiently, making it a cornerstone of effective study apps.',
    createdAt: Date.now() - 86400000 * 2,
};

const showcaseDictationNote: DictationNote = {
    id: 'showcase-note-dictation-1',
    title: 'Tech in 100 Seconds: The C Compiler',
    youtubeUrl: 'https://www.youtube.com/watch?v=whyV_d_j4_g',
    transcript: [
        { text: "A compiler is a special program that translates source code from a high-level language to a lower level language.", start: 3, duration: 6 },
        { text: "It's different from an interpreter which executes code line-by-line.", start: 10, duration: 4 },
        { text: "The compiler will first parse the code to check for syntax errors.", start: 15, duration: 4 },
    ],
    practiceHistory: [],
};

const showcaseWordCol: Column = { id: 'showcase-col-word', name: 'Word' };
const showcasePosCol: Column = { id: 'showcase-col-pos', name: 'Part of Speech' };
const showcaseDefCol: Column = { id: 'showcase-col-def', name: 'Definition' };
const showcaseSentenceCol: Column = { id: 'showcase-col-sentence', name: 'Example Sentence' };
const showcaseTagCol: Column = { id: 'showcase-col-tag', name: 'Tags' };

const showcaseRows: VocabRow[] = [
    { id: 'showcase-row-1', cols: { 'showcase-col-word': 'Algorithm', 'showcase-col-pos': 'noun', 'showcase-col-def': 'A process or set of rules to be followed in calculations or other problem-solving operations.', 'showcase-col-sentence': 'The developer designed an efficient algorithm to sort the data.', [showcaseTagCol.id]: 'tech, learning' }, tagIds: ['tag-tech', 'tag-learning'], stats: { correct: 1, incorrect: 10, lastStudied: Date.now() - 86400000 * 30, wasQuit: true, flashcardStatus: FlashcardStatus.Again, flashcardEncounters: 11, isFlashcardReviewed: true, lastPracticeDate: Date.now() - 86400000 * 30 } },
    { id: 'showcase-row-2', cols: { 'showcase-col-word': 'Ephemeral', 'showcase-col-pos': 'adjective', 'showcase-col-def': 'Lasting for a very short time.', 'showcase-col-sentence': 'The beauty of the cherry blossoms is ephemeral, lasting only a week.', [showcaseTagCol.id]: 'general' }, tagIds: [], stats: { correct: 10, incorrect: 1, lastStudied: Date.now() - 86400000 * 1, flashcardStatus: FlashcardStatus.Easy, flashcardEncounters: 11, isFlashcardReviewed: true, lastPracticeDate: Date.now() - 86400000 * 1 } },
    { id: 'showcase-row-3', cols: { 'showcase-col-word': 'Compiler', 'showcase-col-pos': 'noun', 'showcase-col-def': 'A program that converts instructions into a machine-code or lower-level form so that they can be read and executed by a computer.', 'showcase-col-sentence': 'The C++ code must be run through a compiler before it can be executed.', [showcaseTagCol.id]: 'tech' }, tagIds: ['tag-tech'], stats: { correct: 5, incorrect: 5, lastStudied: Date.now() - 86400000 * 7, flashcardStatus: FlashcardStatus.Good, flashcardEncounters: 10, isFlashcardReviewed: true, lastPracticeDate: Date.now() - 86400000 * 7 } },
    { id: 'showcase-row-4', cols: { 'showcase-col-word': 'Spaced Repetition', 'showcase-col-pos': 'noun', 'showcase-col-def': 'A learning technique that involves reviewing information at increasing intervals over time.', 'showcase-col-sentence': 'Vmind uses spaced repetition to help you remember vocabulary long-term.', [showcaseTagCol.id]: 'learning' }, tagIds: ['tag-learning'], stats: { correct: 2, incorrect: 1, lastStudied: Date.now() - 86400000 * 25, flashcardStatus: FlashcardStatus.Hard, flashcardEncounters: 3, isFlashcardReviewed: true, lastPracticeDate: Date.now() - 86400000 * 25 } },
    { id: 'showcase-row-5', cols: { 'showcase-col-word': 'API', 'showcase-col-pos': 'noun', 'showcase-col-def': 'Application Programming Interface; a set of functions and procedures for building software.', 'showcase-col-sentence': 'We used the Google Maps API to display locations on our website.', [showcaseTagCol.id]: 'tech' }, tagIds: ['tag-tech'], stats: { correct: 8, incorrect: 2, lastStudied: Date.now() - 86400000 * 4, flashcardStatus: FlashcardStatus.Good, flashcardEncounters: 10, isFlashcardReviewed: true, lastPracticeDate: Date.now() - 86400000 * 4 } },
    { id: 'showcase-row-6', cols: { 'showcase-col-word': 'Framework', 'showcase-col-pos': 'noun', 'showcase-col-def': 'A reusable set of libraries or classes for a software system.', 'showcase-col-sentence': 'React is a popular JavaScript framework for building user interfaces.', [showcaseTagCol.id]: 'tech' }, tagIds: ['tag-tech'], stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } },
];

const showcaseRel1: Relation = { id: 'showcase-rel-1', name: 'Word -> Definition', questionColumnIds: [showcaseWordCol.id], answerColumnIds: [showcaseDefCol.id], compatibleModes: [StudyMode.Flashcards, StudyMode.Typing, StudyMode.MultipleChoice], tags: ['StudySession', 'Flashcard'] };
const showcaseRel2: Relation = { id: 'showcase-rel-2', name: 'Definition -> Word', questionColumnIds: [showcaseDefCol.id], answerColumnIds: [showcaseWordCol.id], compatibleModes: [StudyMode.Flashcards, StudyMode.Typing, StudyMode.MultipleChoice], tags: ['StudySession', 'Flashcard'] };
const showcaseRel3: Relation = { id: 'showcase-rel-3', name: 'Sentence Scramble', questionColumnIds: [showcaseSentenceCol.id], answerColumnIds: [], compatibleModes: [StudyMode.Scrambled], tags: ['Scramble'] };
const showcaseRel4: Relation = { id: 'showcase-rel-4', name: 'Full Context Review', questionColumnIds: [showcaseWordCol.id, showcasePosCol.id], answerColumnIds: [showcaseDefCol.id, showcaseSentenceCol.id], compatibleModes: [StudyMode.Flashcards], tags: ['Flashcard', 'Theater'] };
const showcaseRelDictation: Relation = {
    id: 'showcase-rel-dictation-1',
    name: "Listen: Compiler Definition",
    questionColumnIds: [],
    answerColumnIds: [],
    compatibleModes: [StudyMode.Dictation],
    dictationConfig: {
        dictationNoteId: 'showcase-note-dictation-1',
        startSegmentIndex: 0,
        endSegmentIndex: 2,
    },
};

const defaultFeatureShowcaseTable: Table = {
    id: 'default-feature-showcase',
    name: 'Vmind Feature Showcase',
    shortCode: 'VMI',
    columns: [showcaseWordCol, showcasePosCol, showcaseDefCol, showcaseSentenceCol, showcaseTagCol],
    rows: showcaseRows,
    rowCount: showcaseRows.length,
    relations: [showcaseRel1, showcaseRel2, showcaseRel3, showcaseRel4, showcaseRelDictation],
    tagIds: ['tag-sample', 'tag-vmind'],
    createdAt: Date.now() - 86400000 * 7,
    modifiedAt: Date.now() - 86400000 * 1,
};

const idiomCol: Column = { id: 'idiom-col-1', name: 'Idiom' };
const meaningCol: Column = { id: 'idiom-col-2', name: 'Meaning' };
const exampleCol: Column = { id: 'idiom-col-3', name: 'Example' };
const idiomRows: VocabRow[] = [
    { id: 'idiom-row-1', cols: { [idiomCol.id]: 'Bite the bullet', [meaningCol.id]: 'To endure a difficult or unpleasant situation with courage.', [exampleCol.id]: 'He had to bite the bullet and work overtime to meet the deadline.' }, stats: { correct: 2, incorrect: 1, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } },
    { id: 'idiom-row-2', cols: { [idiomCol.id]: 'Break a leg', [meaningCol.id]: 'A way to wish someone good luck, especially before a performance.', [exampleCol.id]: '"Break a leg!" the director shouted to the actors before the play began.' }, stats: { correct: 3, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } },
    { id: 'idiom-row-3', cols: { [idiomCol.id]: 'Spill the beans', [meaningCol.id]: 'To reveal a secret.', [exampleCol.id]: 'We were planning a surprise party, but someone spilled the beans.' }, stats: { correct: 1, incorrect: 1, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } },
    { id: 'idiom-row-4', cols: { [idiomCol.id]: 'Once in a blue moon', [meaningCol.id]: 'Something that happens very rarely.', [exampleCol.id]: 'I only see my cousins from Australia once in a blue moon.' }, stats: { correct: 4, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } },
];
const idiomRelation: Relation = {
    id: 'idiom-rel-1',
    name: 'Idiom Card',
    questionColumnIds: [idiomCol.id],
    answerColumnIds: [meaningCol.id, exampleCol.id],
    tags: ['Theater', 'StudySession', 'Flashcard'],
    design: {
        designLinked: false,
        front: {
            backgroundType: 'gradient', backgroundValue: '#2d3748,#1a202c', gradientAngle: 145,
            layout: 'vertical',
            typography: { [idiomCol.id]: { color: '#fcd34d', fontSize: '1.75rem', fontFamily: 'Lora, serif', textAlign: 'center', fontWeight: 'bold' as const } },
            textBoxes: [{ id: 'txt-idiom-q', text: "What does this mean?", typography: { color: '#94a3b8', fontSize: '0.875rem', fontFamily: 'Inter, sans-serif', textAlign: 'center', fontWeight: 'normal' } }],
            elementOrder: [idiomCol.id, 'txt-idiom-q'],
        },
        back: {
            backgroundType: 'solid', backgroundValue: '#1e293b', gradientAngle: 135,
            layout: 'vertical',
            typography: {
                [meaningCol.id]: { color: '#e2e8f0', fontSize: '1.125rem', fontFamily: 'Lora, serif', textAlign: 'left', fontWeight: 'normal' },
                [exampleCol.id]: { color: '#e2e8f0', fontSize: '1.0rem', fontFamily: 'Lora, serif', textAlign: 'left', fontWeight: 'normal' },
            },
            textBoxes: [
                { id: 'txt-idiom-a1', text: "Meaning:", typography: { color: '#94a3b8', fontSize: '0.75rem', fontFamily: 'Inter, sans-serif', textAlign: 'left', fontWeight: 'bold' as const } },
                { id: 'txt-idiom-a2', text: "Example:", typography: { color: '#94a3b8', fontSize: '0.75rem', fontFamily: 'Inter, sans-serif', textAlign: 'left', fontWeight: 'bold' as const } }
            ],
            elementOrder: ['txt-idiom-a1', meaningCol.id, 'txt-idiom-a2', exampleCol.id],
        }
    }
};
const cinematicIdiomsTable: Table = {
    id: 'default-cinematic-idioms',
    name: 'Sample: Cinematic English Idioms',
    shortCode: 'ENG',
    description: 'A collection of common English idioms with a cinematic design, perfect for showcasing Theater Mode.',
    columns: [idiomCol, meaningCol, exampleCol],
    rows: idiomRows,
    rowCount: idiomRows.length,
    relations: [idiomRelation],
    tagIds: ['tag-sample', 'tag-idioms-table'],
    createdAt: Date.now(),
    modifiedAt: Date.now(),
};

const showcaseContextLinks: ContextLink[] = [
    {
        id: 'showcase-link-1',
        rowId: 'showcase-row-4',
        sourceType: 'reading',
        sourceId: showcaseReadingNote.id,
        metadata: {
            snippet: '...is a powerful learning technique based on the "forgetting curve". Instead of cramming, you review information at increasing intervals...',
            selection: 'Spaced Repetition'
        },
        createdAt: Date.now(),
    },
    {
        id: 'showcase-link-2',
        rowId: 'showcase-row-3',
        sourceType: 'dictation',
        sourceId: showcaseDictationNote.id,
        metadata: {
            timestamp: 3,
            selection: 'compiler'
        },
        createdAt: Date.now(),
    }
];

const sortTestWordCol: Column = { id: 'sort-col-word', name: 'Word' };
const sortTestDescCol: Column = { id: 'sort-col-desc', name: 'Purpose / Description' };
const sortTestRows: VocabRow[] = [
    { id: 'sort-row-weak', cols: { 'sort-col-word': 'Weakest Word', 'sort-col-desc': 'This word has the lowest Success Rate (9%). It should be picked first by the "Weakest Links" preset.' }, stats: { correct: 1, incorrect: 10, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: Date.now() - 86400000 * 5 } },
    { id: 'sort-row-old', cols: { 'sort-col-word': 'Oldest Word', 'sort-col-desc': 'This word was practiced the longest time ago (60 days). It should be picked first by the "Spaced Repetition" preset.' }, stats: { correct: 5, incorrect: 5, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: Date.now() - 86400000 * 60 } },
    { id: 'sort-row-new', cols: { 'sort-col-word': 'New Word', 'sort-col-desc': 'This word has zero attempts. It should be picked first by the "New Words First" preset.' }, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } },
    { id: 'sort-row-quit', cols: { 'sort-col-word': 'Quit Word', 'sort-col-desc': 'This word was in a session that was quit. It has a high Priority Score.' }, stats: { correct: 3, incorrect: 3, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: Date.now() - 86400000 * 3, wasQuit: true } },
    { id: 'sort-row-mastered', cols: { 'sort-col-word': 'Mastered Word', 'sort-col-desc': 'This word has a high Level (5) and high Success Rate. It is low priority for most presets.' }, stats: { correct: 20, incorrect: 1, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: Date.now() - 86400000 * 1 } },
    { id: 'sort-row-highlevel-weak', cols: { 'sort-col-word': 'High-Level Word', 'sort-col-desc': 'This word is almost mastered (Level 4) but still has a relatively low Success Rate. It should be picked first by the "Final Polish" preset.' }, stats: { correct: 10, incorrect: 3, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: Date.now() - 86400000 * 2 } },
    { id: 'sort-row-priority', cols: { 'sort-col-word': 'Top Priority Word', 'sort-col-desc': 'This word combines multiple negative factors (old, quit, high failure rate) to get the highest Priority Score. It should be picked first by the "Vmind\'s Choice" preset.' }, stats: { correct: 2, incorrect: 8, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: Date.now() - 86400000 * 45, wasQuit: true } },
];
const sortTestRel: Relation = { id: 'sort-rel-1', name: 'Word -> Purpose', questionColumnIds: [sortTestWordCol.id], answerColumnIds: [sortTestDescCol.id], tags: ['StudySession'] };
const defaultSortTestTable: Table = { id: 'default-sort-filter-test', name: 'Vmind Sort & Filter Test', shortCode: 'SFT', description: 'A sample table designed to help you test and understand Vmind\'s sorting and filtering capabilities in the Study Session setup.', columns: [sortTestWordCol, sortTestDescCol], rows: sortTestRows, rowCount: sortTestRows.length, relations: [sortTestRel], tagIds: ['tag-sample', 'tag-vmind'], createdAt: Date.now(), modifiedAt: Date.now() };

const srsTermCol: Column = { id: 'srs-col-term', name: 'Term' };
const srsExplainCol: Column = { id: 'srs-col-explain', name: 'Explanation' };
const srsTagCol: Column = { id: 'srs-col-tag', name: 'Tags' };
const srsRel: Relation = { id: 'srs-rel-1', name: 'Term -> Explanation', questionColumnIds: [srsTermCol.id], answerColumnIds: [srsExplainCol.id], tags: ['Anki'] };
const T_ZERO = new Date('2024-01-01T00:00:00.000Z').getTime();
const defaultAnkiSampleTable: Table = {
    id: 'default-anki-sample', name: 'Sample: Learn About SRS', shortCode: 'SRS', columns: [srsTermCol, srsExplainCol, srsTagCol], rows: [
        { id: 'srs-row-1', cols: { [srsTermCol.id]: 'Spaced Repetition', [srsExplainCol.id]: 'A learning technique that involves reviewing information at increasing intervals over time to improve long-term retention.', [srsTagCol.id]: 'core' }, tagIds: [], stats: { correct: 5, incorrect: 1, lastStudied: null, flashcardStatus: FlashcardStatus.Good, flashcardEncounters: 6, isFlashcardReviewed: true, lastPracticeDate: null, ankiRepetitions: 3, ankiEaseFactor: 2.5, ankiInterval: 5, ankiDueDate: T_ZERO - 86400000 * 2 } },
        { id: 'srs-row-2', cols: { [srsTermCol.id]: 'Active Recall', [srsExplainCol.id]: 'The act of actively stimulating memory for a piece of information, like answering a question, rather than passively reading it.', [srsTagCol.id]: 'core' }, tagIds: [], stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } },
        { id: 'srs-row-3', cols: { [srsTermCol.id]: 'Forgetting Curve', [srsExplainCol.id]: 'A concept that shows how learned information is lost over time when there is no attempt to retain it. SRS helps to combat this.', [srsTagCol.id]: 'theory' }, tagIds: [], stats: { correct: 2, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null, ankiRepetitions: 1, ankiEaseFactor: 2.6, ankiInterval: 1, ankiDueDate: T_ZERO - 86400000 } },
        { id: 'srs-row-4', cols: { [srsTermCol.id]: 'Hermann Ebbinghaus', [srsExplainCol.id]: 'A German psychologist who pioneered the experimental study of memory, and is known for his discovery of the forgetting curve and the spacing effect.', [srsTagCol.id]: 'history, theory' }, tagIds: [], stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } },
        { id: 'srs-row-5', cols: { [srsTermCol.id]: 'Leitner System', [srsExplainCol.id]: 'A widely used method of implementing spaced repetition using flashcards, proposed by Sebastian Leitner in the 1970s.', [srsTagCol.id]: 'history, method' }, tagIds: [], stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } },
    ], rowCount: 5, relations: [srsRel], tagIds: ['tag-sample', 'tag-learning'], createdAt: Date.now(), modifiedAt: Date.now(),
};

const clozeQCol: Column = { id: 'cloze-q-col', name: 'Cloze Question' };
const clozeACol: Column = { id: 'cloze-a-col', name: 'Cloze Answer' };
const defaultClozeSampleTable: Table = {
    id: 'default-cloze-sample',
    name: "Sample: Computer Science (Cloze)",
    shortCode: 'CLZ',
    columns: [clozeQCol, clozeACol],
    rows: [
        { id: 'cloze-row-1', cols: { [clozeQCol.id]: 'A [...] is a set of rules for problem-solving.', [clozeACol.id]: 'algorithm' }, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } },
        { id: 'cloze-row-2', cols: { [clozeQCol.id]: 'React is a popular JavaScript [...] for UIs.', [clozeACol.id]: 'framework' }, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } },
    ],
    relations: [{
        id: 'cloze-rel-1',
        name: 'Cloze Deletion',
        questionColumnIds: [clozeQCol.id],
        answerColumnIds: [clozeACol.id],
        compatibleModes: [StudyMode.ClozeTyping],
        tags: ['StudySession'],
        clozeConfig: { hint: 'wordCount', contextBefore: 0, contextAfter: 0 }
    }],
    tagIds: ['tag-sample', 'tag-tech'],
    createdAt: Date.now(),
    modifiedAt: Date.now(),
};

const techRowIds = showcaseRows.filter(r => r.cols[showcaseTagCol.id]?.includes('tech')).map(r => r.id);
// FIX: Renamed from FlashcardProgress to ConfidenceProgress.
const defaultProgress1: ConfidenceProgress = { id: 'default-progress-1', name: 'Sample: All Showcase Cards', tableIds: ['default-feature-showcase'], relationIds: ['showcase-rel-1', 'showcase-rel-2'], tags: ['FC+Vmind_Feature_Showcase'], createdAt: Date.now() - 100000, queue: showcaseRows.map(r => r.id), currentIndex: 5 };
// FIX: Renamed from FlashcardProgress to ConfidenceProgress.
const defaultProgress2: ConfidenceProgress = { id: 'default-progress-2', name: 'Sample: Tech Terms', tableIds: ['default-feature-showcase'], relationIds: ['showcase-rel-1'], tagIds: ['tag-fc-tech'], createdAt: Date.now(), queue: techRowIds, currentIndex: 2, tags: [] };

const DEFAULT_ANKI_CONFIG: AnkiConfig = { newCardsPerDay: 20, learningSteps: "1 10", graduatingInterval: 1, easyInterval: 4, maxReviewsPerDay: 200, easyBonus: 1.3, intervalModifier: 1.0, lapseSteps: "10", newIntervalPercent: 0 };
const defaultAnkiProgress: AnkiProgress = { id: 'default-anki-progress-1', name: 'Sample: All SRS Concepts', tableIds: [defaultAnkiSampleTable.id], relationIds: [srsRel.id], tags: [], ankiConfig: DEFAULT_ANKI_CONFIG, createdAt: Date.now() };
const defaultAnkiProgressHistory: AnkiProgress = { id: 'default-anki-progress-2', name: 'Sample: SRS History Only', tableIds: [defaultAnkiSampleTable.id], relationIds: [srsRel.id], tagIds: ['tag-anki-concepts'], ankiConfig: DEFAULT_ANKI_CONFIG, createdAt: Date.now(), tags: [] };

const defaultFolder: Folder = {
    id: 'default-folder-1',
    name: 'Vmind Samples',
    tableIds: [defaultFeatureShowcaseTable.id, cinematicIdiomsTable.id, defaultSortTestTable.id, defaultAnkiSampleTable.id, defaultClozeSampleTable.id],
    createdAt: Date.now(),
};

const defaultStats: UserStats = { xp: 0, level: 1, studyStreak: 0, lastSessionDate: null, activity: {}, totalStudyTime: 0, unlockedBadges: [] };
const defaultSettings: AppSettings = { folderOrder: [defaultFolder.id], tagColors: { tech: 'linear-gradient(135deg, #f09819 0%, #edde5d 100%)' }, searchShortcut: 'Ctrl+K', reminderSettings: { enabled: false, time: '19:00' } };

export const defaultState: AppState = {
    tables: [defaultFeatureShowcaseTable, cinematicIdiomsTable, defaultSortTestTable, defaultAnkiSampleTable, defaultClozeSampleTable],
    folders: [defaultFolder],
    stats: defaultStats,
    notes: [showcaseReadingNote],
    dictationNotes: [showcaseDictationNote],
    contextLinks: showcaseContextLinks,
    settings: defaultSettings,
    // FIX: Renamed from flashcardProgresses to confidenceProgresses.
    confidenceProgresses: [defaultProgress1, defaultProgress2],
    studyProgresses: [],
    ankiProgresses: [defaultAnkiProgress, defaultAnkiProgressHistory],
    tags: DEFAULT_TAGS,
};


// --- UTILITY FUNCTIONS ---
const SESSION_STORAGE_KEYS = [ 'vmind-theme', 'vmind-user-data' ];
export function clearSessionDataFromLocalStorage() { SESSION_STORAGE_KEYS.forEach(key => localStorage.removeItem(key)); }


export function resetStores() {
    useTableStore.getState().setInitialData({ tables: defaultState.tables, folders: defaultState.folders });
    useNoteStore.getState().setNotes(defaultState.notes);
    useDictationNoteStore.getState().setDictationNotes(defaultState.dictationNotes);
    useContextLinkStore.getState().setContextLinks(defaultState.contextLinks);
    useSessionDataStore.getState().setInitialData({ 
        // FIX: Renamed from flashcardProgresses to confidenceProgresses.
        confidenceProgresses: defaultState.confidenceProgresses,
        studyProgresses: defaultState.studyProgresses,
        ankiProgresses: defaultState.ankiProgresses,
    });
    useTagStore.getState().setTags(defaultState.tags || []);
}

export function clearAllStores() {
    // This function will reset all stores to their initial, empty state.
    useTableStore.getState().setInitialData({ tables: [], folders: [] });
    useNoteStore.getState().setNotes([]);
    useDictationNoteStore.getState().setDictationNotes([]);
    useContextLinkStore.getState().setContextLinks([]);
    useSessionDataStore.getState().setInitialData({
        confidenceProgresses: [],
        studyProgresses: [],
        ankiProgresses: [],
    });
    useTagStore.getState().setTags([]);
    // userStore is reset by the auth listener itself.
    // Clearing local storage related to guest sessions
    clearSessionDataFromLocalStorage();
}

export const vmindStorage: StateStorage = {
    getItem: (name: string): string | null => {
        // FIX: Get the latest isGuest state on every call, not just once.
        const { isGuest } = useUserStore.getState();
        if (isGuest) {
            return localStorage.getItem(name);
        }
        return null;
    },
    setItem: (name: string, value: string): void => {
        // FIX: Get the latest isGuest state on every call.
        const { isGuest } = useUserStore.getState();
        if (isGuest) {
            localStorage.setItem(name, value);
        }
    },
    removeItem: (name: string): void => {
        // FIX: Get the latest isGuest state on every call.
        const { isGuest } = useUserStore.getState();
        if (isGuest) {
            localStorage.removeItem(name);
        }
    },
};