
import * as React from 'react';
import Icon from '../../components/ui/Icon';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { continueChat, generateContextualSuggestions } from '../../services/geminiService';
import { useUIStore } from '../../stores/useUIStore';
import { useNoteStore } from '../../stores/useNoteStore';
import { Screen } from '../../types';
import { useTableStore } from '../../stores/useTableStore';
import { useSessionStore } from '../../stores/useSessionStore';

interface VmindChatModalProps {
  onClose: () => void;
}

type Message = {
  role: 'user' | 'model';
  parts: { text: string }[];
};

const VmindChatModal: React.FC<VmindChatModalProps> = ({ onClose }) => {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = React.useState(false);

  const { showToast, setIsApiKeyModalOpen } = useUIStore();
  const { handleSaveToJournal } = useNoteStore();
  const [savedMessageIndices, setSavedMessageIndices] = React.useState<Set<number>>(new Set());
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(scrollToBottom, [messages, suggestions]);

  React.useEffect(() => {
    const fetchSuggestions = async () => {
        if (messages.length > 0) return;

        setIsSuggesting(true);
        try {
            const { currentScreen } = useUIStore.getState();
            const { tables } = useTableStore.getState();
            const { activeTableId } = useSessionStore.getState();
            
            const screenName = Screen[currentScreen];
            let additionalContext = '';
            
            if (screenName === 'TableDetail' && activeTableId) {
                const tableName = tables.find(t => t.id === activeTableId)?.name;
                if (tableName) {
                    additionalContext = `They are viewing the table named '${tableName}'.`;
                }
            }

            const result = await generateContextualSuggestions(screenName, additionalContext);
            setSuggestions(result);
        } catch (error: any) {
             if (error.message === "API_KEY_MISSING") {
                setIsApiKeyModalOpen(true);
                onClose();
            } else {
                console.error("Failed to fetch suggestions:", error);
            }
        } finally {
            setIsSuggesting(false);
        }
    };
    fetchSuggestions();
  }, []); // Run only once on mount

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || isLoading) return;

    const userMessage: Message = { role: 'user', parts: [{ text: textToSend }] };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setSuggestions([]); // Clear suggestions once a message is sent
    setIsLoading(true);

    try {
      const responseText = await continueChat(newMessages);
      const modelMessage: Message = { role: 'model', parts: [{ text: responseText }] };
      setMessages([...newMessages, modelMessage]);
    } catch (error: any) {
      if (error.message === "API_KEY_MISSING") {
        setIsApiKeyModalOpen(true);
        onClose();
      } else {
        showToast("An AI error occurred. Please try again.", "error");
        setMessages(messages); // Revert messages on error
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-5 z-40 w-full max-w-sm h-[70vh] max-h-[550px] bg-surface dark:bg-secondary-800 rounded-xl shadow-2xl flex flex-col border border-secondary-200 dark:border-secondary-700 animate-slideInUp">
        <header className="flex justify-between items-center p-4 border-b border-secondary-200 dark:border-secondary-700 flex-shrink-0">
            <h2 className="text-lg font-bold text-text-main dark:text-secondary-100 flex items-center gap-2">
                <Icon name="chat" className="w-6 h-6 text-primary-500"/>
                Vmind Chatbot
            </h2>
            <button onClick={onClose} className="text-secondary-400 hover:text-text-main dark:hover:text-secondary-100 transition-colors p-1 rounded-full hover:bg-secondary-200 dark:hover:bg-secondary-700">
                <Icon name="x" className="w-5 h-5" />
            </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !isSuggesting && suggestions.length === 0 && (
            <div className="text-center text-sm text-text-subtle p-4">
              Ask me anything about vocabulary, grammar, or learning tips!
            </div>
          )}
          {messages.map((msg, index) => {
            const isSaved = savedMessageIndices.has(index);

            const handleAddToJournal = () => {
              handleSaveToJournal('Vmind Chatbot', msg.parts[0].text);
              setSavedMessageIndices(prev => new Set(prev).add(index));
            };
            
            return (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="group relative flex items-end gap-2">
                  <div className={`p-3 rounded-lg max-w-xs ${msg.role === 'user' ? 'bg-primary-500 text-white' : 'bg-secondary-200 dark:bg-secondary-700'}`}>
                    <p className="whitespace-pre-wrap">{msg.parts[0].text}</p>
                  </div>
                  {msg.role === 'model' && (
                    <button
                      onClick={handleAddToJournal}
                      disabled={isSaved}
                      title={isSaved ? "Saved to Journal" : "Add to Journal"}
                      className={`p-1.5 rounded-full text-text-subtle transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-100 ${isSaved ? 'text-primary-500' : 'hover:bg-secondary-300 dark:hover:bg-secondary-600'}`}
                    >
                      <Icon name={isSaved ? 'check' : 'book'} className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {messages.length === 0 && isSuggesting && (
             <div className="flex justify-start">
               <div className="p-3 rounded-lg bg-secondary-200 dark:bg-secondary-700">
                    <Icon name="spinner" className="w-5 h-5 animate-spin" />
                </div>
            </div>
          )}
          
          {messages.length === 0 && !isSuggesting && suggestions.length > 0 && (
            <div className="space-y-2 animate-fadeIn">
                <p className="text-sm text-text-subtle">Here are a few things you can do:</p>
                {suggestions.map((s, i) => (
                    <button key={i} onClick={() => handleSend(s)} className="w-full text-left p-3 rounded-lg bg-secondary-100 dark:bg-secondary-700/50 hover:bg-secondary-200 dark:hover:bg-secondary-700 text-sm font-medium">
                        {s}
                    </button>
                ))}
            </div>
          )}

          {isLoading && (
            <div className="flex justify-start">
               <div className="p-3 rounded-lg bg-secondary-200 dark:bg-secondary-700">
                    <Icon name="spinner" className="w-5 h-5 animate-spin" />
                </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-4 border-t border-secondary-200 dark:border-secondary-700 flex items-center gap-2">
          <Input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask Vmind..."
            className="flex-1"
            disabled={isLoading}
            autoFocus
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? <Icon name="spinner" className="w-5 h-5 animate-spin"/> : <Icon name="arrowRight" className="w-5 h-5" />}
          </Button>
        </form>
    </div>
  );
};

export default VmindChatModal;
