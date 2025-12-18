


export enum Screen {
  Home,
  Tables,
  Library, // Deprecated in favor of Community, kept for legacy ref safety
  Community, // New Social Hub
  Vmind,
  Rewards,
  Settings,
  TableDetail,
  StudySession,
  Reading,
  Auth,
  Journal,
  Confidence, // Renamed from Flashcards
  ConfidenceSetup, // Renamed from FlashcardProgressSetup
  ConfidenceSession, // Renamed from FlashcardSession
  StudyProgress, // New screen for managing study progresses
  StudySetup,
  TheaterSetup,
  TheaterSession,
  Dictation,
  DictationEditor,
  DictationSession,
  AnkiSetup,
  AnkiSession,
  AnkiProgressSetup,
  AnkiStats,
  Notifications,
  Map, // New screen for Knowledge Graph
  TagManager, // New screen for managing tags
  TimeTracking, // New screen for activity log
  Stats, // New Unified Profile Screen
  ScrambleSetup, // New
  ScrambleSession, // New
}

export type Theme = 'light' | 'dark' | 'pastel';

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline' | 'paused';

export type TagScope = 'global' | 'table' | 'flashcard' | 'anki';

export interface Tag {
  id: string;
  name: string;
  color?: string;
  parentId?: string;
  scope?: TagScope;
}

export interface Column {
  id: string;
  name: string;
}

export enum StudyMode {
  Flashcards = 'Flashcards',
  MultipleChoice = 'Multiple Choice',
  Typing = 'Typing',
  TrueFalse = 'True/False',
  Scrambled = 'Scrambled',
  ClozeTyping = 'Cloze (Typing)',
  ClozeMCQ = 'Cloze (MCQ)',
  Dictation = 'Dictation',
  Stroke = 'Stroke', // New: Stroke Order
}

export interface TypographyDesign {
  color: string;
  fontSize: string;
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right';
  fontWeight: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  overflowBehavior?: 'visible' | 'truncate' | 'scroll';
  maxLines?: number;
  opacity?: number;
}

export interface TextBox {
  id: string;
  text: string;
  typography: TypographyDesign;
}

export interface CardFaceDesign {
  backgroundType: 'solid' | 'gradient' | 'image';
  backgroundValue: string;
  gradientAngle: number;
  typography: Record<string, TypographyDesign>; // Maps columnId to its style
  layout: 'vertical' | 'horizontal';
  textBoxes?: TextBox[];
  elementOrder?: string[];
}

export interface RelationDesign {
  front: CardFaceDesign;
  back: CardFaceDesign;
  designLinked?: boolean;
  isRandom?: boolean; // New field to persist random template preference
}

export interface RelationAudioConfig {
  frontColumnIds: string[]; // IDs of columns on the front face to play
  backColumnIds: string[];  // IDs of columns on the back face to play
}

export enum DisplayTier {
  Primary = 'Primary',
  Secondary = 'Secondary',
  Hidden = 'Hidden',
}

export interface Relation {
  id: string;
  name: string;
  questionColumnIds: string[];
  answerColumnIds: string[];
  
  // --- Logic Layer (v2.6) ---
  answerFormula?: string; // e.g., "{Word} ({Phonetic})"
  targetLabel?: string;   // e.g., "Meaning"
  
  compatibleModes?: StudyMode[];
  design?: RelationDesign;
  isCustom?: boolean;
  tags?: string[];
  audioConfig?: RelationAudioConfig;
  displayTiers?: Record<string, DisplayTier>;
  
  // --- Relation-Driven Q&A Config (v2.6) ---
  promptType?: 'column' | 'custom_text';
  customPromptText?: string;
  interactionType?: StudyMode; // Deprecated in favor of interactionModes
  interactionModes?: StudyMode[]; // New: Support multiple selected modes
  interactionConfig?: Partial<Record<StudyMode, { prefix?: string; suffix?: string }>>; // New: Per-mode config
  speedModeDefault?: boolean;

  scrambleConfig?: { splitCount: number; };
  clozeConfig?: {
    hint: 'wordCount' | 'none';
    contextBefore: number;
    contextAfter: number;
    extraInfoColId?: string; // Optional column ID for extra context (e.g. translation)
  };
  dictationConfig?: {
    dictationNoteId: string;
    startSegmentIndex: number;
    endSegmentIndex: number;
  };
}

export interface AIPrompt {
  id: string;
  name: string;
  sourceColumnIds: string[];
  targetColumnId: string;
  prompt: string;
}

export enum FlashcardStatus {
  New = 'New',
  Again = 'Again',
  Hard = 'Hard',
  Good = 'Good',
  Easy = 'Easy',
  Perfect = 'Perfect',
  Superb = 'Superb',
}

export interface VocabRow {
  id: string;
  rowIdNum?: number; // System-managed auto-increment ID
  cols: Record<string, string>; // Maps columnId to value
  stats: {
    correct: number;
    incorrect: number;
    lastStudied: number | null;
    // New fields for Flashcard Mode
    flashcardStatus: FlashcardStatus;
    flashcardEncounters: number;
    isFlashcardReviewed: boolean;
    lastPracticeDate: number | null;
    wasQuit?: boolean; // For QuitQueue logic
    scrambleEncounters?: number;
    scrambleRatings?: Partial<Record<FlashcardStatus, number>>;
    theaterEncounters?: number;
    // This is a placeholder for a more complex stat. For now, it's just a count.
    inQueueCount?: number;

    // Anki SRS Stats
    ankiRepetitions?: number;
    ankiEaseFactor?: number;
    ankiInterval?: number; // in days
    ankiDueDate?: number | null; // timestamp

    // Global Confidence Metric
    confiViewed?: number;
  };
  tagIds?: string[];
  /** @deprecated Use top-level contextLinks store instead */
  contextLinks?: {
    type: 'reading' | 'dictation';
    noteId: string;
    snippet?: string; // For reading text snippet
    timestamp?: number; // For dictation start time
  }[];
  /** @deprecated Use tagIds instead. Kept for backward compatibility during migration. */
  tags?: string[];
}

export interface AnkiConfig {
  newCardsPerDay: number;
  learningSteps: string; // e.g., "1 10" for 1m, 10m
  graduatingInterval: number; // in days
  easyInterval: number; // in days
  maxReviewsPerDay: number;
  easyBonus: number; // percentage, e.g., 1.3 for 130%
  intervalModifier: number; // percentage, e.g., 1.0 for 100%
  lapseSteps: string; // e.g., "10" for 10m
  newIntervalPercent: number; // percentage, e.g., 0 for 0%
}

export interface Table {
  id:string;
  name: string;
  shortCode?: string; // NEW v2.7: Namespaced ID (e.g. "VOC")
  columns: Column[];
  rows: VocabRow[];
  rowCount?: number;
  relations: Relation[];
  imageConfig?: { imageColumnId: string; sourceColumnId: string; } | null;
  /** @deprecated Use columnAudioConfig and Relation.audioConfig instead */
  audioConfig?: { sourceColumnId: string; language?: string; } | null;
  columnAudioConfig?: Record<string, { language: string; }>;
  // NEW: Dynamic Search Link Templates
  columnUrlTemplates?: Record<string, string>;
  aiPrompts?: AIPrompt[];
  description?: string;
  tagIds?: string[];
  /** @deprecated Use tagIds instead */
  tags?: string[];
  isPublic?: boolean;
  createdAt?: number;
  modifiedAt?: number;
  ankiConfig?: AnkiConfig;
  // NEW: Persistent View Settings
  viewConfig?: {
    isTextWrapEnabled?: boolean;
    isBandedRows?: boolean;
    rowHeight?: 'short' | 'medium' | 'tall';
    visibleColumns?: string[];
    columnOrder?: string[];
    frozenColumnCount?: number;
  };
}

export interface Folder {
  id: string;
  name: string;
  tableIds: string[];
  noteIds?: string[]; // New: Folders can now contain reading notes
  color?: string; // New field for folder customization
  createdAt: number;
}

export type BadgeType = 'time';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: BadgeType;
  value: number; // XP amount or seconds of study time
}

export interface SessionEntry {
  timestamp: number;
  duration: number;
  mode: string;
  droplets: number;
  count?: number; // Number of interactions/cards reviewed in this session
}

export interface UserStats {
  xp: number;
  level: number;
  studyStreak: number;
  lastSessionDate: string | null;
  activity: { [date: string]: number | { total: number; entries: SessionEntry[] } };
  totalStudyTime: number;
  unlockedBadges: string[];
  lastLogin?: string | null;
}

export interface Bookmark {
  id: string;
  noteId: string;
  startIndex: number; // Character index in the content
  textPreview: string; // Short snippet
  createdAt: number;
}

export interface Note {
  id: string;
  title: string;
  content?: string;
  tagIds?: string[]; // New: Notes can now be tagged
  bookmarks?: Bookmark[]; // New: Reading mode bookmarks
  createdAt: number;
  // NEW: Reading Progress Persistence
  progress?: {
    scrollTop: number;    // Exact pixel position
    percent: number;      // 0-100
    lastReadAt: number;   // Timestamp
  };
}

// --- New: Context Link Type ---
export interface ContextLink {
  id: string;
  rowId: string; // Foreign key to VocabRow
  sourceType: 'reading' | 'dictation';
  sourceId: string; // ID of the Note or DictationNote
  metadata: {
    snippet?: string;
    selection?: string;
    timestamp?: number;
    selectionStartIndex?: number;
  };
  createdAt: number;
}


// --- New: Dictation Types ---
export interface TranscriptEntry {
  text: string;
  start: number;
  duration: number;
}

export interface DictationPracticeRecord {
  timestamp: number;
  accuracy: number; // 0-1
  durationSeconds: number;
}

export interface DictationNote {
  id: string;
  title: string;
  youtubeUrl: string;
  transcript?: TranscriptEntry[];
  practiceHistory: DictationPracticeRecord[];
  isStarred?: boolean; // New field: Indicates if the transcript is verified/complete
}

export interface DictationSessionData {
    note: DictationNote;
    startTime: number;
}


export interface AppSettings {
  folderOrder?: string[];
  tagColors?: Record<string, string>;
  searchShortcut?: string;
  musicShortcut?: string; // New global shortcut for music toggle
  reminderSettings?: {
    enabled: boolean;
    time: string; // "HH:MM"
  };
  theme?: Theme;
  // NEW: Reader Configuration
  readingConfig?: {
    fontFamily: string;
    fontSize: number;
    theme: 'paper' | 'clean' | 'night' | 'default';
    dictionaryUrlTemplate?: string;
  };
}

// --- New: Music Configuration ---
export type RepeatMode = 'none' | 'one' | 'all';

export interface CustomTrack {
  id: string;
  name: string;
  icon: string;
  url: string;
  isCustom?: boolean;
}

export interface MusicConfig {
  volume: number;
  repeatMode: RepeatMode;
  isShuffled: boolean;
  customTracks: CustomTrack[];
}

export interface FlashcardIntervalConfig {
  [FlashcardStatus.Again]: number;
  [FlashcardStatus.Hard]: number;
  [FlashcardStatus.Good]: number;
  [FlashcardStatus.Easy]: number;
  [FlashcardStatus.Perfect]: number;
  [FlashcardStatus.Superb]: number;
}

// FIX: Renamed from FlashcardProgress to ConfidenceProgress.
export interface ConfidenceProgress {
  id: string;
  name: string;
  tableIds: string[];
  relationIds: string[];
  tagIds?: string[];
  /** @deprecated Use tagIds instead */
  tags?: string[];
  createdAt: number;
  
  // Session state
  queue: string[]; // array of row IDs
  currentIndex: number;
  // Persistent status map for visualizing progress (rowId -> status)
  cardStates?: Record<string, FlashcardStatus>; 

  intervalConfig?: FlashcardIntervalConfig;
  newWordCount?: number;
}

// --- New: Notification System ---
export enum NotificationType {
  Reminder = 'reminder',
  Badge = 'badge',
  System = 'system',
}

export interface VmindNotification {
  id: string; // Unique ID, can be idempotent (e.g., 'anki-due-deck1-2024-08-15')
  type: NotificationType;
  icon: string;
  title: string;
  message: string;
  createdAt: number;
  isRead: boolean;
  action?: {
    label: string;
    screen: Screen;
    payload?: any; // e.g., { progressId: '...' } to start a session
  };
}


export interface AppState {
    tables: Table[];
    folders: Folder[];
    stats: UserStats;
    notes: Note[];
    dictationNotes: DictationNote[];
    contextLinks: ContextLink[]; // New top-level state
    settings: AppSettings;
    // FIX: Renamed from flashcardProgresses to confidenceProgresses.
    confidenceProgresses?: ConfidenceProgress[];
    studyProgresses?: StudyProgress[];
    ankiProgresses?: AnkiProgress[];
    notifications?: VmindNotification[];
    tags?: Tag[]; // New global tags
}

export interface Question {
  rowId: string;
  tableId: string;
  relationId: string;
  questionSourceColumnNames: string[];
  questionText: string;
  proposedAnswer?: string; // For True/False
  proposedCols?: Record<string, string>; // For True/False: Column data of the proposed answer (from target or distractor)
  correctAnswer: string;
  type: StudyMode;
  options?: string[];
  scrambledParts?: string[];
  // Cloze fields
  contextBefore?: string;
  clozeText?: string;
  contextAfter?: string;
  clozeHint?: string;
  // New: Context label for answer source
  answerLabel?: string;
  // New: Extra info for context (e.g. translation)
  extraInfo?: string;
}

export interface StudySessionData {
  questions: Question[];
  startTime: number;
  settings: StudySettings;
  progressId?: string; // Link to the saved progress for state updates
  startIndex?: number; // For resuming sessions
}

export enum SessionItemState {
  Unseen = 'unseen',
  Fail = 'fail',
  Pass1 = 'pass1',
  Pass2 = 'pass2',
}

export interface SessionWordResult {
  rowId: string;
  isCorrect: boolean;
  timestamp: number;
  hintUsed?: boolean;
}

// FIX: Renamed from FlashcardSession to ConfidenceSession.
export interface ConfidenceSession {
  progressId: string; // The ID of the ConfidenceProgress being worked on
  tableIds: string[];
  relationIds: string[];
  queue: string[]; // array of row IDs
  currentIndex: number;
  cardStates: Record<string, FlashcardStatus>; // Active session state map
  sessionEncounters: number;
  startTime: number;
  history: { rowId: string; status: FlashcardStatus; timestamp: number }[];
  intervalConfig?: FlashcardIntervalConfig;
}


// --- New: Advanced Study Settings ---
export type StudySource = {
    tableId: string;
    relationId: string;
};

export type TableModeComposition = {
    strategy: 'balanced' | 'percentage';
    percentages: { [tableId: string]: number };
};

export type CriteriaSortField = 
    | 'priorityScore'
    | 'rankPoint'
    | 'level'
    | 'successRate'
    | 'lastPracticeDate'
    | 'failed'
    | 'totalAttempts'
    | 'inQueueCount'
    | 'wasQuit'
    | 'random';


export type CriteriaSort = {
    field: CriteriaSortField;
    direction: 'asc' | 'desc';
};

export interface StudySettings {
    sources: StudySource[];
    modes: StudyMode[];
    randomizeModes?: boolean;

    // Word selection
    wordSelectionMode: 'auto' | 'manual';
    wordCount?: number; // Used in 'auto' mode
    manualWordIds?: string[]; // Used in 'manual' mode
    
    // Criteria Mode specific
    criteriaSorts?: CriteriaSort[];
}

// --- New: Study Progress ---
export interface StudyProgress {
  id: string;
  name: string;
  createdAt: number;
  settings: StudySettings;
  
  // Session state for resuming
  queue: Question[]; 
  currentIndex: number;
}

// --- Gallery View Filter Types ---
export type FilterCondition = 'contains' | 'does-not-contain' | 'is' | 'is-not' | 'is-empty' | 'is-not-empty';

export interface Filter {
  id: string;
  columnId: string;
  condition: FilterCondition;
  value: string;
}

// --- Gallery View Sort Types ---
export type SortDirection = 'asc' | 'desc';

export interface Sort {
  id: string;
  key: string; // columnId or stat identifier like 'stat:successRate'
  direction: SortDirection;
}


// --- New: Theater Mode Types ---
export interface TheaterSessionSettings {
    sources: StudySource[];
    partDelay: number; // in milliseconds
    cardInterval: number; // in milliseconds
    sessionDuration: number; // in minutes, 0 for unlimited
}

export interface TheaterSessionData {
    settings: TheaterSessionSettings;
    queue: string[]; // array of rowIds
    startTime: number;
    history: { rowId: string; timestamp: number }[];
}

// --- Scramble Mode Types ---
export interface ScrambleSessionSettings {
    sources: StudySource[];
    splitCount: number;
    interactionMode: 'click' | 'typing';
}

export interface ScrambleSessionData {
    settings: ScrambleSessionSettings;
    queue: { rowId: string, scrambledParts: string[], originalSentence: string }[];
    currentIndex: number;
    history: { rowId: string; status: FlashcardStatus; timestamp: number }[];
    startTime: number;
}

// --- New: Anki SRS Types ---
export interface AnkiProgress {
  id: string;
  name: string;
  tableIds: string[];
  relationIds: string[];
  tagIds?: string[];
  /** @deprecated Use tagIds instead */
  tags?: string[];
  ankiConfig: AnkiConfig;
  createdAt: number;
}

export interface AnkiCard {
  rowId: string;
  tableId: string;
  relationId: string;
  isNew: boolean;
}

export interface AnkiSessionData {
  progressId: string;
  reviewQueue: AnkiCard[];
  newQueue: AnkiCard[];
  learningQueue: AnkiCard[]; // For cards rated "Again"
  currentCard: AnkiCard | null;
  startTime: number;
  history: { rowId: string; quality: number; timestamp: number, newStats: VocabRow['stats'] }[];
  config: AnkiConfig;
}

// --- Sync Engine Types (v2.6) ---

export type SyncActionType = 
  | 'UPSERT_ROW'
  | 'UPSERT_TABLE'
  | 'DELETE_TABLE'
  | 'DELETE_ROWS'
  | 'UPSERT_PROFILE'
  | 'UPSERT_NOTE'
  | 'DELETE_NOTE'
  | 'UPSERT_DICTATION'
  | 'DELETE_DICTATION'
  | 'DELETE_STUDY_SET'
  | 'UPSERT_STUDY_SET'
  | 'UPSERT_FOLDER'
  | 'DELETE_FOLDER'
  | 'UPSERT_COUNTER'
  | 'DELETE_COUNTER'
  | 'UPSERT_MUSIC'
  | 'UPSERT_CONTEXT_LINK'
  | 'DELETE_CONTEXT_LINK'
  | 'UPSERT_BOOKMARK' // New for atomic bookmark upsert
  | 'DELETE_BOOKMARK'; // New for atomic bookmark delete

export interface SyncAction {
  id: string;
  type: SyncActionType;
  payload: any;
  retries: number;
  timestamp: number;
  userId: string;
  status: 'pending' | 'processing' | 'failed';
  lastError?: string;
}

export interface SyncLogEntry {
  id: string;
  actionType: SyncActionType;
  timestamp: number;
  status: 'success' | 'failed';
  details: string;
}

// ==========================================
// Q&A ARCHITECTURE v3.0 (Safe Types)
// ==========================================

export type QuestionType = 'mcq' | 'truefalse' | 'typing' | 'scramble' | 'flashcard' | 'stroke';

export interface McqPayload {
  options: string[];
  correctAnswers: string[];
}

export interface TrueFalsePayload {
  displayStatement: string;
  isStatementCorrect: boolean;
  correctValue: string;
}

export interface TypingPayload {
  acceptableAnswers: string[];
  caseSensitive: boolean;
  hint?: string;
}

export interface ScramblePayload {
  segments: string[];
  originalSentence: string;
}

export interface FlashcardPayload {
  answerText: string;
  // Future: can add more specific flashcard hints or side data
}

export interface StrokePayload {
  character: string;      // Ký tự Hán tự cần vẽ (VD: "学")
  meaning: string;        // Nghĩa hiển thị làm đề bài (VD: "To Learn")
  showGuide: boolean;     // Cấu hình mặc định có hiện nét mờ hướng dẫn không
  strokeColor?: string;   // Màu nét vẽ (theo theme)
  radicalColor?: string;  // Màu bộ thủ (nếu cần highlight)
}

export interface QuestionCard {
  id: string;
  rowId: string;
  type: QuestionType;
  
  content: {
    promptText: string;
    image?: string;
    audio?: string;
    context?: string;
    answerLabel?: string;
  };

  payload: McqPayload | TrueFalsePayload | TypingPayload | ScramblePayload | FlashcardPayload | StrokePayload;
}

export interface AnswerSubmission {
  questionId: string;
  userAnswer: any; 
  timestamp: number;
}

// ==========================================
// Activity Pulse Types (v2.6)
// ==========================================

export type CounterTargetType = 'table' | 'anki' | 'confidence' | 'note' | 'dictation';

export interface Counter {
  id: string;
  targetId: string;
  targetType: CounterTargetType;
  name: string;
  count: number;
  lastInteraction: number;
  thresholdDays?: number;
  isActive: boolean;
}

// ==========================================
// Community Library Types (v3.0)
// ==========================================

export interface LibraryItem {
  id: string;
  author_id: string;
  author_name: string;
  title: string;
  description: string;
  tags: string[];
  payload: any; // Serialized Table data
  stats: {
    downloads: number;
    likes: number;
  };
  created_at: string;
  version: string;
}

// ==========================================
// Community Module Types (v3.1)
// ==========================================

export interface CommunityTopic {
    id: string;
    name: string;
    slug: string;
    icon: string;
    color: string;
}

export interface CommunityPost {
    id: string;
    userId: string;
    userName: string; // Simplified for MVP mock
    title: string;
    content: string;
    topicId: string;
    tableId?: string; // Optional attached table
    tableName?: string; // Snapshot of table name
    likes: number;
    comments: number;
    isPinned: boolean;
    isLiked: boolean; // Current user like status (Optimistic)
    createdAt: number;
}

export interface CommunityComment {
    id: string;
    postId: string;
    userId: string;
    userName: string;
    content: string;
    createdAt: number;
}