import * as React from 'react';
import { Note, Screen } from '../../types';
import Icon from '../../components/ui/Icon';
import { useDebounce } from '../../hooks/useDebounce';
import { useNoteStore } from '../../stores/useNoteStore';
import { useUIStore } from '../../stores/useUIStore';

interface JournalEntryProps {
  note: Note;
  onUpdateNote: (note: Note) => void;
  isInitiallyExpanded: boolean;
}

const JournalEntry: React.FC<JournalEntryProps> = ({ note, onUpdateNote, isInitiallyExpanded }) => {
  const [isExpanded, setIsExpanded] = React.useState(isInitiallyExpanded);
  const [content, setContent] = React.useState(note.content);
  const debouncedContent = useDebounce(content, 500);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => { if (debouncedContent !== note.content) { onUpdateNote({ ...note, content: debouncedContent }); } }, [debouncedContent, note, onUpdateNote]);
  React.useEffect(() => { setContent(note.content); }, [note.content]);
  React.useEffect(() => { if (isExpanded && textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; } }, [isExpanded, content]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => { setContent(e.target.value); if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = `${e.target.scrollHeight}px`; } };
  const handleExport = () => { const blob = new Blob([note.content ?? ''], { type: 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${note.title}.txt`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); };
  const handlePrint = () => { const printWindow = window.open('', '_blank'); if (printWindow) { printWindow.document.write(`<html><head><title>${note.title}</title></head><body style="font-family: sans-serif; white-space: pre-wrap;"><h1>${note.title}</h1><hr /><p>${note.content?.replace(/\n/g, '<br>')}</p><script>window.onload = function() { window.print(); window.close(); }</script></body></html>`); printWindow.document.close(); } };

  // Updated date parsing for "[yy-mm-dd Journal]" format
  const dateString = note.title.replace('[', '').replace(' Journal]', '');
  const [year, month, day] = dateString.split('-');
  const date = new Date(parseInt(`20${year}`), parseInt(month) - 1, parseInt(day));
  const formattedDate = isNaN(date.getTime()) ? dateString : date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="bg-surface dark:bg-secondary-800 border border-secondary-200/80 dark:border-secondary-700/50 rounded-xl shadow-md transition-all duration-300">
      <button onClick={() => setIsExpanded(!isExpanded)} className="w-full flex justify-between items-center p-4 text-left" aria-expanded={isExpanded}>
        <h3 className="font-bold text-lg text-text-main dark:text-secondary-100">{formattedDate}</h3>
        <Icon name="chevron-down" className={`w-6 h-6 text-secondary-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>
      {isExpanded && (
        <div className="p-4 border-t border-secondary-200 dark:border-secondary-700 animate-fadeIn">
          <textarea ref={textareaRef} value={content} onChange={handleContentChange} className="w-full bg-secondary-100/50 dark:bg-secondary-900/50 rounded-md p-3 text-secondary-600 dark:text-secondary-300 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none overflow-hidden" placeholder="Start writing..." />
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-sm transition-colors bg-surface dark:bg-secondary-800 border-secondary-300 dark:border-secondary-600 text-secondary-600 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700"><Icon name="printer" className="w-4 h-4" /> Print</button>
            <button onClick={handleExport} className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-sm transition-colors bg-surface dark:bg-secondary-800 border-secondary-300 dark:border-secondary-600 text-secondary-600 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700"><Icon name="arrow-down-tray" className="w-4 h-4" /> Export</button>
          </div>
        </div>
      )}
    </div>
  );
};

const JournalScreen: React.FC = () => {
  const { notes, updateNote } = useNoteStore();
  const { setCurrentScreen } = useUIStore();
  
  const journalEntries = React.useMemo(() => {
    return notes
      .filter(n => n.title.startsWith('[') && n.title.endsWith(' Journal]') && /\[\d{2}-\d{2}-\d{2} Journal\]/.test(n.title))
      .sort((a, b) => {
        // Sort by date string directly for reverse chronological order
        const dateStrA = a.title.substring(1, 9); // yy-mm-dd
        const dateStrB = b.title.substring(1, 9); // yy-mm-dd
        return dateStrB.localeCompare(dateStrA);
      });
  }, [notes]);

  return (
    <div className="p-4 sm:p-6 mx-auto animate-fadeIn">
      <header className="flex items-center gap-3 mb-6">
        <button onClick={() => setCurrentScreen(Screen.Vmind)} className="p-2 rounded-full hover:bg-secondary-200 dark:hover:bg-secondary-700 text-text-subtle">
          <Icon name="arrowLeft" className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-main dark:text-secondary-100">Study Journal</h1>
          <p className="text-sm text-text-subtle">A log of your learning journey.</p>
        </div>
      </header>
      
      <main className="space-y-4">
        {journalEntries.length > 0 ? (
          journalEntries.map((note, index) => (
            <JournalEntry key={note.id} note={note} onUpdateNote={updateNote} isInitiallyExpanded={index === 0} />
          ))
        ) : (
          <div className="text-center py-16">
            <Icon name="pencil" className="w-16 h-16 text-secondary-300 dark:text-secondary-700 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-secondary-700 dark:text-secondary-300">Your Journal is Empty</h2>
            <p className="text-text-subtle mt-2">Entries are automatically added when you save items from study sessions.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default JournalScreen;
