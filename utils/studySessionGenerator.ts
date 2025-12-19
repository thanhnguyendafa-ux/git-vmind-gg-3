


import { Table, Question, VocabRow, StudySettings, StudyMode, Relation, QuestionCard, AnswerSubmission, McqPayload, TrueFalsePayload, TypingPayload, ScramblePayload, FlashcardPayload, StrokePayload } from '../types';
import { getPriorityScore, getRankPoint, getLevel, getSuccessRate, getTotalAttempts } from './priorityScore';
import { evaluateFormula } from './textUtils';

function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}


// --- Question Generation Logic ---

export const createQuestion = (row: VocabRow, relation: Relation, table: Table, allRows: VocabRow[], mode: StudyMode): Question | null => {
    // --- LOGIC UPDATE (v2.6): Formula-Driven Answers ---
    // Prioritize answerFormula, fall back to joining answerColumnIds for backward compatibility
    let actualAnswer = '';
    if (relation.answerFormula) {
        actualAnswer = evaluateFormula(relation.answerFormula, row, table.columns);
    } else {
        actualAnswer = relation.answerColumnIds.map(id => row.cols[id]).filter(Boolean).join(' / ');
    }

    // --- LOGIC UPDATE (v2.6): Visual-Driven Questions ---
    // The question text is now determined by the Front Face design, 
    // but for the Question Object (used for logic/logging), we need a textual representation.
    // We'll use the promptType/customPromptText logic or default to the first question column.
    let questionText = '';

    if (relation.promptType === 'custom_text' && relation.customPromptText) {
        questionText = relation.customPromptText;
    } else {
        // Fallback: Join question columns. In "Puzzle Master", the design defines what's shown, 
        // but we still need a string for the 'questionText' property used in trackers/logs.
        questionText = relation.questionColumnIds.map(id => row.cols[id]).filter(Boolean).join(' / ');
        if (!questionText && relation.design?.front.textBoxes) {
            // If no columns mapped to Q but text boxes exist, use the first text box
            questionText = relation.design.front.textBoxes[0]?.text || 'Card Content';
        }
    }

    // Apply Interaction Config (Prefix/Suffix)
    const config = relation.interactionConfig?.[mode];
    if (config) {
        if (config.prefix) questionText = `${config.prefix} ${questionText}`;
        if (config.suffix) questionText = `${questionText} ${config.suffix}`;
    }

    if (!questionText && mode !== StudyMode.Scrambled) {
        // For scrambled, we might derive question from answer or columns later
        // But generally we need some text.
        // If purely visual design (images), we might just use a placeholder.
        questionText = "Image Question";
    }

    // --- NEW: Answer Label ---
    // Use the configured targetLabel, or fallback to column names
    let answerLabel = '';
    if (relation.targetLabel) {
        answerLabel = `Answer is ${relation.targetLabel} = ???`;
    } else {
        const answerColNames = relation.answerColumnIds.map(id => table.columns.find(c => c.id === id)?.name).filter(Boolean).join(' & ');
        if (answerColNames) {
            answerLabel = `Answer is ${answerColNames} = ???`;
        }
    }

    if (mode === StudyMode.ClozeTyping || mode === StudyMode.ClozeMCQ) {
        // Cloze overrides standard label usually
        const answerColNames = relation.answerColumnIds.map(id => table.columns.find(c => c.id === id)?.name).filter(Boolean).join(' & ');
        answerLabel = `Target : ${answerColNames}`;
    }

    // If Stroke mode, we need a valid character to write
    if (mode === StudyMode.Stroke) {
        // Extract the first CJK character from the answer
        const cjkMatch = actualAnswer.match(/[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/);
        if (!cjkMatch) return null; // No valid character found for stroke mode
    }

    if ((!actualAnswer && ![StudyMode.Scrambled, StudyMode.Flashcards].includes(mode))) {
        return null;
    }

    const baseQuestion: Omit<Question, 'correctAnswer'> = {
        rowId: row.id,
        tableId: table.id,
        relationId: relation.id,
        questionSourceColumnNames: [], // Deprecated practically, can leave empty
        questionText,
        type: mode,
        answerLabel,
    };

    switch (mode) {
        case StudyMode.Flashcards:
            return { ...baseQuestion, correctAnswer: actualAnswer };

        case StudyMode.Typing:
            return { ...baseQuestion, correctAnswer: actualAnswer };

        case StudyMode.Stroke: {
            // For stroke mode, the "correctAnswer" is the character(s) to write.
            // We find the first CJK character.
            const cjkMatch = actualAnswer.match(/[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/);
            if (!cjkMatch) return null; // Should be caught earlier, but safe guard.
            return { ...baseQuestion, correctAnswer: cjkMatch[0] };
        }

        case StudyMode.ClozeTyping:
        case StudyMode.ClozeMCQ: {
            const placeholder = '[...]';

            // 1. Get raw context from the question column (assuming it holds the full sentence with [...])
            // In Reading Mode creation, we injected the placeholder.
            // In Relation Config, we selected the sentence column.

            const rawText = relation.questionColumnIds.map(id => row.cols[id]).filter(Boolean).join(' ');

            // NEW: Fetch Extra Info if configured
            let extraInfo: string | undefined = undefined;
            if (relation.clozeConfig?.extraInfoColId) {
                extraInfo = row.cols[relation.clozeConfig.extraInfoColId];
            }

            // Check if rawText actually has the placeholder. If not, we might need to "create" it dynamically 
            // if we know the answer. But standard Vmind flow stores the pre-clozed text in a column.
            const placeholderIndex = rawText.indexOf(placeholder);

            if (placeholderIndex === -1) {
                // Fallback: If no placeholder found, maybe the answer is present in the text?
                // Simple substitution check.
                if (actualAnswer && rawText.includes(actualAnswer)) {
                    // Dynamically replace for the question text
                    const dynamicQuestion = rawText.replace(actualAnswer, placeholder);
                    const contextBefore = rawText.substring(0, rawText.indexOf(actualAnswer));
                    const contextAfter = rawText.substring(rawText.indexOf(actualAnswer) + actualAnswer.length);

                    let clozeHint: string | undefined = undefined;
                    if (relation.clozeConfig?.hint === 'wordCount') {
                        const wordCount = actualAnswer.split(/\s+/).filter(Boolean).length;
                        clozeHint = `{${wordCount} ${wordCount === 1 ? 'word' : 'words'}}`;
                    }

                    // We return the question with the dynamic text
                    const clozeQuestion: Question = {
                        ...baseQuestion,
                        questionText: dynamicQuestion,
                        correctAnswer: actualAnswer,
                        contextBefore,
                        clozeText: placeholder,
                        contextAfter,
                        clozeHint,
                        extraInfo, // Pass extra info
                    };

                    if (mode === StudyMode.ClozeMCQ) {
                        // Similar distractor logic
                        const distractors = allRows
                            .filter(r => r.id !== row.id)
                            .map(r => relation.answerColumnIds.map(id => r.cols[id]).filter(Boolean).join(' / '))
                            .filter(d => d && d !== actualAnswer);
                        let options = shuffleArray(Array.from(new Set(distractors))).slice(0, 3);
                        options.push(actualAnswer);
                        return { ...clozeQuestion, options: shuffleArray(options) };
                    }
                    return clozeQuestion;
                }
                return null;
            }

            const contextBefore = rawText.substring(0, placeholderIndex);
            const contextAfter = rawText.substring(placeholderIndex + placeholder.length);

            let clozeHint: string | undefined = undefined;
            if (relation.clozeConfig?.hint === 'wordCount') {
                const wordCount = actualAnswer.split(/\s+/).filter(Boolean).length;
                clozeHint = `{${wordCount} ${wordCount === 1 ? 'word' : 'words'}}`;
            }

            const clozeQuestion: Question = {
                ...baseQuestion,
                questionText: rawText,
                correctAnswer: actualAnswer,
                contextBefore,
                clozeText: placeholder,
                contextAfter,
                clozeHint,
                extraInfo, // Pass extra info
            };

            if (mode === StudyMode.ClozeMCQ) {
                // Distractors must come from the same source/formula
                const distractors = allRows
                    .filter(r => r.id !== row.id)
                    .map(r => relation.answerFormula
                        ? evaluateFormula(relation.answerFormula, r, table.columns)
                        : relation.answerColumnIds.map(id => r.cols[id]).filter(Boolean).join(' / ')
                    )
                    .filter(d => d && d !== actualAnswer);

                let options = shuffleArray(Array.from(new Set(distractors))).slice(0, 3);
                options.push(actualAnswer);

                if (options.length < 2) return null;

                return { ...clozeQuestion, options: shuffleArray(options) };
            }

            return clozeQuestion;
        }

        case StudyMode.Scrambled: {
            // FIX: Prioritize resolved Answer Logic (Formula > Answer Columns) as the source text.
            let contentToScramble = actualAnswer;

            // Fallback to question columns if actualAnswer is empty (Legacy behavior support)
            if (!contentToScramble) {
                contentToScramble = relation.questionColumnIds.map(id => row.cols[id]).filter(Boolean).join(' ');
            }

            // Clean up text (trim, normalize spaces)
            contentToScramble = contentToScramble.trim().replace(/\s+/g, ' ');

            if (!contentToScramble) return null;

            const originalSentence = contentToScramble;
            const words = originalSentence.split(' ').filter(Boolean);
            if (words.length <= 1) return null;

            // Use configured split count or default to 4
            const splitCount = relation.scrambleConfig?.splitCount || 4;
            const totalWords = words.length;
            const numChunks = Math.min(splitCount, totalWords); // Cannot have more chunks than words

            if (numChunks <= 1) return null;

            // Balanced Chunking Algorithm
            const baseChunkSize = Math.floor(totalWords / numChunks);
            const remainder = totalWords % numChunks;
            const chunks: string[] = [];
            let wordIndex = 0;

            for (let i = 0; i < numChunks; i++) {
                // Distribute remainder: first 'remainder' chunks get 1 extra word
                const currentChunkSize = baseChunkSize + (i < remainder ? 1 : 0);

                if (currentChunkSize > 0) {
                    const chunkWords = words.slice(wordIndex, wordIndex + currentChunkSize);
                    chunks.push(chunkWords.join(' '));
                    wordIndex += currentChunkSize;
                }
            }

            if (chunks.length <= 1) return null;

            // Final safety check: if resolved text contains "[Missing:", it means resolution failed.
            // We should provide a fallback meaningful text to avoid scrambling curly braces or error tags.
            if (originalSentence.includes('[Missing:')) {
                return {
                    ...baseQuestion,
                    correctAnswer: "Please select a valid column for scramble.",
                    scrambledParts: shuffleArray(["Please", "select", "a", "valid", "column", "for", "scramble."])
                };
            }

            return {
                ...baseQuestion,
                correctAnswer: originalSentence,
                scrambledParts: shuffleArray(chunks)
            };
        }

        case StudyMode.TrueFalse: {
            const isTrueScenario = Math.random() > 0.5;

            if (isTrueScenario) {
                return {
                    ...baseQuestion,
                    proposedAnswer: actualAnswer,
                    proposedCols: row.cols, // Kept for legacy renderers
                    correctAnswer: 'True'
                };
            } else {
                // Generate distractor using formula on other rows
                const validDistractors = allRows.filter(r => {
                    if (r.id === row.id) return false;
                    const distractorAnswer = relation.answerFormula
                        ? evaluateFormula(relation.answerFormula, r, table.columns)
                        : relation.answerColumnIds.map(id => r.cols[id]).filter(Boolean).join(' / ');

                    return distractorAnswer && distractorAnswer.trim().toLowerCase() !== actualAnswer.trim().toLowerCase();
                });

                if (validDistractors.length === 0) {
                    return {
                        ...baseQuestion,
                        proposedAnswer: actualAnswer,
                        proposedCols: row.cols,
                        correctAnswer: 'True'
                    };
                }

                const randomDistractorRow = validDistractors[Math.floor(Math.random() * validDistractors.length)];
                const distractorText = relation.answerFormula
                    ? evaluateFormula(relation.answerFormula, randomDistractorRow, table.columns)
                    : relation.answerColumnIds.map(id => randomDistractorRow.cols[id]).filter(Boolean).join(' / ');

                return {
                    ...baseQuestion,
                    proposedAnswer: distractorText,
                    proposedCols: randomDistractorRow.cols,
                    correctAnswer: 'False'
                };
            }
        }

        case StudyMode.MultipleChoice:
            const distractors = allRows
                .filter(r => r.id !== row.id)
                .map(r => relation.answerFormula
                    ? evaluateFormula(relation.answerFormula, r, table.columns)
                    : relation.answerColumnIds.map(id => r.cols[id]).filter(Boolean).join(' / ')
                )
                .filter(d => d && d !== actualAnswer);

            let options = shuffleArray(Array.from(new Set(distractors))).slice(0, 3);
            options.push(actualAnswer);

            if (options.length < 2) return createQuestion(row, relation, table, allRows, StudyMode.Typing);

            return { ...baseQuestion, correctAnswer: actualAnswer, options: shuffleArray(options) };

        default:
            return null;
    }
};

export const regenerateQuestionForRow = (
    questionToRegen: Question,
    allRowsFromSources: VocabRow[],
    tables: Table[],
    settings: StudySettings
): Question => {
    const tableForThisRow = tables.find(t => t.id === questionToRegen.tableId);
    if (!tableForThisRow) return questionToRegen;

    const row = tableForThisRow.rows.find(r => r.id === questionToRegen.rowId);
    if (!row) return questionToRegen;

    const relation = tableForThisRow.relations.find(r => r.id === questionToRegen.relationId);
    if (!relation) return questionToRegen;

    // LOGIC UPDATE (v2.6.1): Respect interactionModes or legacy interactionType
    let compatibleModes = relation.interactionModes || [];
    if (!compatibleModes.length) {
        if (relation.interactionType) {
            compatibleModes = [relation.interactionType];
        } else {
            compatibleModes = relation.compatibleModes || [];
        }
    }

    const modesToUse = compatibleModes.filter(m => settings.modes.includes(m));
    if (modesToUse.length === 0) return questionToRegen;

    let nextMode: StudyMode;
    if (settings.randomizeModes) {
        nextMode = modesToUse[Math.floor(Math.random() * modesToUse.length)];
    } else {
        nextMode = modesToUse[0];
    }


    const newQuestion = createQuestion(row, relation, tableForThisRow, allRowsFromSources, nextMode);

    return newQuestion || questionToRegen; // Fallback to original if generation fails
};


// --- Main Generator Function ---

export function generateStudySession(tables: Table[], settings: StudySettings): Question[] {
    let candidateRows: VocabRow[] = [];
    let allRowsFromSources: VocabRow[] = [];

    const tablesById = new Map(tables.map(t => [t.id, t]));

    // First, populate allRowsFromSources for context (like MCQ distractors) and for selection pools.
    const allRowsMap = new Map<string, VocabRow>();
    for (const source of settings.sources) {
        const table = tablesById.get(source.tableId);
        if (table) {
            table.rows.forEach(row => {
                if (!allRowsMap.has(row.id)) {
                    allRowsMap.set(row.id, row);
                }
            });
        }
    }
    allRowsFromSources = Array.from(allRowsMap.values());

    let selectedRows: VocabRow[] = [];

    if (settings.wordSelectionMode === 'manual' && settings.manualWordIds) {
        // Manual mode: directly use the selected word IDs.
        selectedRows = settings.manualWordIds.map(id => allRowsMap.get(id)).filter((row): row is VocabRow => !!row);

    } else { // 'auto' mode
        // Step 1: Word Pooling (already done with allRowsFromSources)
        let tempCandidateRows = [...allRowsFromSources];

        // Step 2: Filtering
        tempCandidateRows = tempCandidateRows.filter(row => {
            const table = tables.find(t => t.rows.some(r => r.id === row.id));
            if (!table) return false;

            return table.relations.some(relation => {
                // LOGIC UPDATE (v2.6.1): Check if Relation enforces specific interaction type/modes
                let compatibleModes = relation.interactionModes || [];
                if (!compatibleModes.length) {
                    if (relation.interactionType) {
                        compatibleModes = [relation.interactionType];
                    } else {
                        compatibleModes = relation.compatibleModes || [];
                    }
                }

                const hasCompatibleMode = compatibleModes.some(mode => settings.modes.includes(mode));
                if (!hasCompatibleMode) return false;

                return settings.sources.some(s => s.tableId === table.id && s.relationId === relation.id);
            });
        });

        // Step 3: Sorting
        const { criteriaSorts } = settings;
        if (criteriaSorts && criteriaSorts.length > 0) {
            const maxInQueue = Math.max(1, ...tempCandidateRows.map((r: VocabRow) => r.stats.inQueueCount || 0));

            tempCandidateRows.sort((a: VocabRow, b: VocabRow) => {
                for (const sort of criteriaSorts) {
                    let valA, valB;
                    let comparison = 0;

                    switch (sort.field) {
                        case 'priorityScore':
                            valA = getPriorityScore(a, maxInQueue);
                            valB = getPriorityScore(b, maxInQueue);
                            comparison = valB - valA; // Higher score is higher priority
                            break;
                        case 'rankPoint':
                            valA = getRankPoint(a);
                            valB = getRankPoint(b);
                            comparison = valA - valB;
                            break;
                        case 'level':
                            valA = getLevel(a);
                            valB = getLevel(b);
                            comparison = valA - valB;
                            break;
                        case 'successRate':
                            valA = getSuccessRate(a);
                            valB = getSuccessRate(b);
                            comparison = valA - valB;
                            break;
                        case 'lastPracticeDate':
                            valA = a.stats.lastPracticeDate || 0;
                            valB = b.stats.lastPracticeDate || 0;
                            comparison = valA - valB;
                            break;
                        case 'failed':
                            valA = a.stats.incorrect || 0;
                            valB = b.stats.incorrect || 0;
                            comparison = valB - valA;
                            break;
                        case 'totalAttempts':
                            valA = getTotalAttempts(a);
                            valB = getTotalAttempts(b);
                            comparison = valA - valB;
                            break;
                        case 'inQueueCount':
                            valA = a.stats.inQueueCount || 0;
                            valB = b.stats.inQueueCount || 0;
                            comparison = valA - valB;
                            break;
                        case 'wasQuit':
                            valA = a.stats.wasQuit ? 1 : 0;
                            valB = b.stats.wasQuit ? 1 : 0;
                            comparison = valB - valA;
                            break;
                        case 'random':
                            comparison = Math.random() - 0.5;
                            break;
                    }

                    if (comparison !== 0) {
                        return sort.direction === 'asc' ? comparison : -comparison;
                    }
                }
                return 0;
            });
        }
        candidateRows = tempCandidateRows;
        // Step 4: Final Selection
        selectedRows = candidateRows.slice(0, settings.wordCount);
    }


    const questions: Question[] = [];
    for (const row of selectedRows) {
        const source = settings.sources.find(s => tablesById.get(s.tableId)?.rows.some(r => r.id === row.id));
        if (!source) continue;

        const table = tablesById.get(source.tableId);
        const relation = table?.relations.find(r => r.id === source.relationId);
        if (!table || !relation) continue;

        // LOGIC UPDATE (v2.6.1): Priority to interactionModes
        let compatibleModes = relation.interactionModes || [];
        if (!compatibleModes.length) {
            if (relation.interactionType) {
                compatibleModes = [relation.interactionType];
            } else {
                compatibleModes = relation.compatibleModes || [];
            }
        }

        const modesToUse = compatibleModes.filter(m => settings.modes.includes(m));
        if (modesToUse.length === 0) continue;

        let mode: StudyMode;
        if (settings.randomizeModes && modesToUse.length > 1) {
            mode = modesToUse[Math.floor(Math.random() * modesToUse.length)];
        } else {
            // Cycle through modes deterministically if not random, or if relation enforces a single type
            const questionCountForThisRow = questions.filter(q => q.rowId === row.id).length;
            mode = modesToUse[questionCountForThisRow % modesToUse.length];
        }

        const question = createQuestion(row, relation, table, allRowsFromSources, mode);
        if (question) {
            questions.push(question);
        }
    }

    return shuffleArray(questions);
}

// ==========================================
// Q&A ARCHITECTURE v3.0 UTILS
// ==========================================

export const validateAnswer = (card: QuestionCard, userAnswer: any): boolean => {
    if (!card.payload) return false;

    switch (card.type) {
        case 'mcq': {
            const payload = card.payload as McqPayload;
            const userSelection = userAnswer as string;
            return (payload.correctAnswers || []).includes(userSelection);
        }

        case 'truefalse': {
            const payload = card.payload as TrueFalsePayload;
            return payload.isStatementCorrect === (userAnswer as boolean);
        }

        case 'typing': {
            const payload = card.payload as TypingPayload;
            const input = (userAnswer as string).trim();

            if (payload.caseSensitive) {
                return (payload.acceptableAnswers || []).includes(input);
            } else {
                const lowerInput = input.toLowerCase();
                return (payload.acceptableAnswers || []).some(a => a.toLowerCase() === lowerInput);
            }
        }

        case 'scramble': {
            const payload = card.payload as ScramblePayload;
            const reconstructed = Array.isArray(userAnswer) ? userAnswer.join(' ') : userAnswer;
            const normalize = (s: string) => s.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").replace(/\s{2,}/g, " ").trim();
            return normalize(reconstructed) === normalize(payload.originalSentence);
        }

        case 'flashcard': {
            // Flashcard validation logic:
            // If `userAnswer` is boolean true, we consider it "Marked as Correct" (Legacy pass).
            // For self-rating (Again/Hard/Good/Easy), it's always "correct" in terms of passing the card, 
            // but the session logic handles the scheduling.
            return userAnswer === true || userAnswer === 'correct';
        }

        case 'stroke': {
            // Stroke completion logic is binary. 
            // If onAnswer is called with true, the user finished the character.
            return userAnswer === true;
        }

        default:
            return false;
    }
};

/**
 * Adapter to convert legacy Question objects to v3 QuestionCard structure.
 */
export const convertQuestionToCard = (oldQuestion: Question): QuestionCard => {
    // FIX: Generate a stable ID based on the question properties to prevent
    // unnecessary re-renders in React when the parent component updates.
    // We use rowId and type as the seed, making it deterministic for the same question state.
    const id = `card-${oldQuestion.rowId}-${oldQuestion.type}`;

    // Common Content
    const content = {
        promptText: oldQuestion.questionText,
        answerLabel: oldQuestion.answerLabel, // Map new field
        // Image/Audio would be extracted from row if available in Question object, 
        // but currently Question object simplifies this. Future enhancement.
    };

    let type: any = 'typing';
    let payload: any = {};

    switch (oldQuestion.type) {
        case StudyMode.MultipleChoice:
        case StudyMode.ClozeMCQ:
            type = 'mcq';
            payload = {
                options: oldQuestion.options || [],
                correctAnswers: [oldQuestion.correctAnswer]
            } as McqPayload;
            break;

        case StudyMode.TrueFalse:
            type = 'truefalse';

            let answerColName = '';
            if (oldQuestion.answerLabel) {
                answerColName = oldQuestion.answerLabel
                    .replace('Answer is', '')
                    .split('=')[0]
                    .trim();
            }

            const statement = answerColName
                ? `Is the answer [${answerColName}] is "${oldQuestion.proposedAnswer}"`
                : `Is the answer "${oldQuestion.proposedAnswer}"?`;

            payload = {
                displayStatement: statement,
                isStatementCorrect: oldQuestion.correctAnswer === 'True',
                correctValue: oldQuestion.correctAnswer
            } as TrueFalsePayload;
            break;

        case StudyMode.Scrambled:
            type = 'scramble';
            payload = {
                segments: oldQuestion.scrambledParts || [],
                originalSentence: oldQuestion.correctAnswer
            } as ScramblePayload;
            break;

        case StudyMode.Flashcards:
            type = 'flashcard';
            payload = {
                answerText: oldQuestion.correctAnswer,
            } as FlashcardPayload;
            break;

        case StudyMode.Stroke:
            type = 'stroke';
            payload = {
                character: oldQuestion.correctAnswer, // For stroke mode, correct answer is the char
                meaning: oldQuestion.questionText,
                showGuide: false, // Default to challenge mode
            } as StrokePayload;
            break;

        case StudyMode.Typing:
        case StudyMode.ClozeTyping:
        case StudyMode.Dictation: // Treat dictation as typing for now
        default:
            type = 'typing';
            payload = {
                acceptableAnswers: [oldQuestion.correctAnswer],
                caseSensitive: false,
                hint: oldQuestion.clozeHint
            } as TypingPayload;
            break;
    }

    return {
        id,
        rowId: oldQuestion.rowId,
        type,
        content,
        payload
    };
};