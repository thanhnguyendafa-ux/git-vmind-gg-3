import * as React from 'react';
import Modal from './Modal';
import Icon from './Icon';
import { Button } from './Button';
import { Input } from './Input';
import { useUIStore } from '../../stores/useUIStore';
import { useApiKeyStore } from '../../stores/useApiKeyStore';

const ApiKeyModal: React.FC = () => {
    const { isApiKeyModalOpen, setIsApiKeyModalOpen, showToast } = useUIStore();
    const { setApiKey } = useApiKeyStore();
    const [localApiKey, setLocalApiKey] = React.useState('');
    const [isSaving, setIsSaving] = React.useState(false);

    if (!isApiKeyModalOpen) {
        return null;
    }
    
    const handleActivate = () => {
        const trimmedKey = localApiKey.trim();
        if (trimmedKey) {
            setIsSaving(true);
            setApiKey(trimmedKey);
            // Give a small delay for the state to update before closing,
            // so any subsequent AI call might succeed.
            setTimeout(() => {
                setIsApiKeyModalOpen(false);
                showToast("API Key activated. Please try your action again.", "success");
                setIsSaving(false);
                setLocalApiKey('');
            }, 500);
        } else {
            showToast("Please enter a valid API key.", "error");
        }
    };

    return (
        <Modal isOpen={true} onClose={() => setIsApiKeyModalOpen(false)} title="API Key Required">
            <div className="p-6 text-center">
                <Icon name="sparkles" className="w-16 h-16 text-warning-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-text-main dark:text-secondary-100">AI Features Locked</h3>
                <p className="text-text-subtle mb-4">
                    To use this feature, please provide your Google AI API key. You can get one for free from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary-500 underline">Google AI Studio</a>.
                </p>
                <div className="flex items-center gap-2">
                    <Input
                        type="password"
                        value={localApiKey}
                        onChange={(e) => setLocalApiKey(e.target.value)}
                        placeholder="Paste your API key here..."
                        className="flex-1"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
                    />
                </div>
                <Button onClick={handleActivate} disabled={isSaving} className="mt-4 w-full">
                    {isSaving ? <><Icon name="spinner" className="w-5 h-5 animate-spin mr-2"/> Activating...</> : 'Activate AI Features'}
                </Button>
            </div>
        </Modal>
    );
};

export default ApiKeyModal;
