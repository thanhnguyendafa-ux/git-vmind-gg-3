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

    const handleActivate = () => {
        const trimmedKey = localApiKey.trim();
        if (trimmedKey) {
            setIsSaving(true);
            setApiKey(trimmedKey);
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

    if (!isApiKeyModalOpen) {
        return null;
    }

    return (
        <Modal isOpen={isApiKeyModalOpen} onClose={() => setIsApiKeyModalOpen(false)} title="API Key Required">
            <div className="p-6">
                 <div className="text-center mb-4">
                    <Icon name="sparkles" className="w-12 h-12 text-warning-400 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-text-main">Enable AI Features</h3>
                    <p className="text-text-subtle text-sm mt-1">
                        Provide your Google AI API key to unlock generation features. You can get one from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary-500 underline">Google AI Studio</a>.
                    </p>
                </div>
                <div className="space-y-4">
                     <div>
                        <label htmlFor="api-key-input" className="sr-only">API Key</label>
                        <Input
                            id="api-key-input"
                            type="password"
                            value={localApiKey}
                            onChange={(e) => setLocalApiKey(e.target.value)}
                            placeholder="Paste your API key here..."
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
                        />
                    </div>
                    <Button onClick={handleActivate} disabled={isSaving} className="w-full">
                        {isSaving ? 'Activating...' : 'Activate AI Features'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default ApiKeyModal;
