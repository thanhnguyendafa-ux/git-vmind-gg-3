import { StudyMode } from '../../../types';

export const studyModeIcons: { [key in StudyMode]: string } = {
    [StudyMode.Flashcards]: 'flashcards',
    [StudyMode.MultipleChoice]: 'list-bullet',
    [StudyMode.Typing]: 'keyboard',
    [StudyMode.TrueFalse]: 'check',
    [StudyMode.Scrambled]: 'arrows-right-left',
    [StudyMode.ClozeTyping]: 'keyboard',
    [StudyMode.ClozeMCQ]: 'list-bullet',
    [StudyMode.Dictation]: 'headphones',
    [StudyMode.Stroke]: 'brush', // New
};