
export type ReadingThemeMode = 'paper' | 'clean' | 'night' | 'default';

export interface ReadingTheme {
  id: ReadingThemeMode;
  name: string;
  background: string;
  text: string;
  textSubtle: string;
  selection: string;
  uiBorder: string; // For UI elements inside the reader
}

export const READING_THEMES: Record<ReadingThemeMode, ReadingTheme> = {
  default: {
    id: 'default',
    name: 'System',
    background: '', // Handled by Tailwind
    text: '',
    textSubtle: '',
    selection: '',
    uiBorder: '',
  },
  paper: {
    id: 'paper',
    name: 'Sepia',
    background: '#FAF4E8',
    text: '#4A3C31',
    textSubtle: '#8C7B68',
    selection: '#E6D5B8',
    uiBorder: '#E6D5B8',
  },
  clean: {
    id: 'clean',
    name: 'Soft Gray',
    background: '#F2F2F7',
    text: '#333333',
    textSubtle: '#8E8E93',
    selection: '#D1D1D6',
    uiBorder: '#D1D1D6',
  },
  night: {
    id: 'night',
    name: 'Midnight',
    background: '#1C1C1E',
    text: '#D1D1D6',
    textSubtle: '#636366',
    selection: '#3A3A3C',
    uiBorder: '#2C2C2E',
  },
};
