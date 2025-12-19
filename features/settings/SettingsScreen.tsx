
import React from 'react';
import Icon from '../../components/ui/Icon';
import { useUserStore } from '../../stores/useUserStore';
import { useUIStore } from '../../stores/useUIStore';
import { useTableStore } from '../../stores/useTableStore';
import { AppSettings, Screen, Theme } from '../../types';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import ImportModal from '../tables/components/ImportModal';
import ExportModal from '../tables/components/ExportModal';
import { useApiKeyStore } from '../../stores/useApiKeyStore';
import { requestNotificationPermission } from '../../utils/notificationService';
import { NeedsAttentionList } from '../../components/ui/NeedsAttentionList';
import { VmindSyncEngine } from '../../services/VmindSyncEngine';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import AuroraBackground from '../../components/ui/AuroraBackground';

const SettingsScreen: React.FC = () => {
    const { handleLogout, isGuest, settings, setSettings, session } = useUserStore();
    const {
        setTheme,
        theme,
        showToast,
        syncQueue,
        pullData,
        isPulling,
        attemptNavigation,
        triggerGlobalAction,
        backgroundSettings,
        setBackgroundSettings
    } = useUIStore();
    const { apiKey, setApiKey } = useApiKeyStore();
    const { tables, loadingTableIds, fetchTablePayload } = useTableStore();

    const [localApiKey, setLocalApiKey] = React.useState(apiKey || '');
    const [isEditingApiKey, setIsEditingApiKey] = React.useState(!apiKey);

    // Settings State
    const [localSettings, setLocalSettings] = React.useState<AppSettings>(settings);
    const isSettingsDirty = JSON.stringify(localSettings) !== JSON.stringify(settings);

    // Modals
    const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = React.useState(false);
    const [isResetConfirmOpen, setIsResetConfirmOpen] = React.useState(false);

    // Background State (Local for input)
    const [bgUrl, setBgUrl] = React.useState(backgroundSettings.url);

    // Handle saving general settings
    const handleUpdateLocalSetting = (key: keyof AppSettings, value: any) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSaveSettings = () => {
        setSettings(localSettings);
        showToast("Settings saved.", "success");
    };

    // --- Reminders ---
    const handleReminderToggle = async () => {
        const currentEnabled = localSettings.reminderSettings?.enabled || false;
        const newEnabled = !currentEnabled;

        if (newEnabled) {
            const permission = await requestNotificationPermission();
            if (permission !== 'granted') {
                showToast("Notification permission denied. Please enable in browser settings.", "error");
                return;
            }
        }

        const newSettings = {
            ...localSettings,
            reminderSettings: {
                ...(localSettings.reminderSettings || { time: '19:00' }),
                enabled: newEnabled
            }
        };

        setLocalSettings(newSettings);
        setSettings(newSettings); // Auto-save for this toggle
        showToast(newEnabled ? "Daily reminders enabled." : "Daily reminders disabled.", "info");
    };

    const handleReminderTimeChange = (time: string) => {
        handleUpdateLocalSetting('reminderSettings', {
            ...(localSettings.reminderSettings || { enabled: false }),
            time
        });
    };

    // --- API Key ---
    const handleSaveKey = () => {
        const trimmedKey = localApiKey.trim();
        setApiKey(trimmedKey);
        showToast(trimmedKey ? "API Key saved successfully." : "API Key removed.", "success");
        setIsEditingApiKey(false);
    };

    // --- Data & Sync ---
    const handleForceDownload = (tableId: string) => {
        fetchTablePayload(tableId, true); // Force refresh
        showToast("Syncing content from server...", "info");
    };

    const handleRefetchMetadata = async () => {
        if (pullData) {
            try {
                await pullData();
                showToast("Metadata refreshed.", "success");
            } catch (e) {
                showToast("Failed to refresh.", "error");
            }
        }
    };

    const handleResetSyncQueue = async () => {
        await VmindSyncEngine.getInstance().clearQueue();
        setIsResetConfirmOpen(false);
        showToast("Sync queue cleared. Try refreshing data now.", "success");
    };

    // --- Background ---
    const handleBgUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const url = e.target.value;
        setBgUrl(url);
        setBackgroundSettings({ url }); // Live preview
    };

    const handleBgClear = () => {
        setBgUrl('');
        setBackgroundSettings({ url: '' });
    };

    // Guarded Logout
    const handleGuardedLogout = () => {
        triggerGlobalAction(() => handleLogout());
    };

    const ThemeOption = ({ mode, label, icon }: { mode: Theme, label: string, icon: string }) => (
        <button
            onClick={() => setTheme(mode)}
            className={`
              flex-1 flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200
              ${theme === mode
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'border-transparent bg-secondary-100 dark:bg-secondary-800 text-text-subtle hover:bg-secondary-200 dark:hover:bg-secondary-700'
                }
          `}
        >
            <Icon name={icon} className="w-6 h-6 mb-2" />
            <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
        </button>
    );

    return (
        <div className="relative h-full w-full overflow-hidden">
            {/* 1. The Atmosphere */}
            <AuroraBackground />

            {/* 2. The Content Layer */}
            <div className="relative z-10 h-full w-full overflow-y-auto custom-scrollbar">
                <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-8 pb-32">

                    <header className="flex items-center gap-3 mb-2">
                        <button
                            onClick={() => attemptNavigation(Screen.Home)}
                            className="p-2 rounded-full hover:bg-secondary-200 dark:hover:bg-secondary-700 text-text-subtle transition-colors backdrop-blur-sm"
                        >
                            <Icon name="arrowLeft" className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-text-main dark:text-secondary-100">Settings</h1>
                            <p className="text-sm text-text-subtle">Manage your account, preferences, and data.</p>
                        </div>
                    </header>

                    {/* Account Section */}
                    <section className="space-y-3">
                        <h3 className="text-sm font-bold text-text-subtle uppercase tracking-wider ml-1">Account</h3>
                        <Card>
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-text-main dark:text-secondary-100">
                                        {isGuest ? 'Guest Account' : (session?.user?.email || 'Logged In')}
                                    </p>
                                    <p className="text-xs text-text-subtle">
                                        {isGuest ? 'Data is stored locally.' : 'Data is synced to the cloud.'}
                                    </p>
                                </div>
                                {!isGuest ? (
                                    <Button variant="ghost" className="text-error-500 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20" onClick={handleGuardedLogout}>
                                        Log Out
                                    </Button>
                                ) : (
                                    <Button variant="secondary" onClick={() => attemptNavigation(Screen.Auth)}>
                                        Log In / Sign Up
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </section>

                    {/* Sync Queue Widget */}
                    {!isGuest && syncQueue.length > 0 && (
                        <section className="space-y-3">
                            <h3 className="text-sm font-bold text-warning-600 dark:text-warning-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                                <Icon name="cloud-rain" className="w-4 h-4" /> Sync Queue
                            </h3>
                            <Card className="border-warning-200 dark:border-warning-800 bg-warning-50 dark:bg-warning-900/10">
                                <CardContent className="p-4">
                                    <NeedsAttentionList />
                                </CardContent>
                            </Card>
                        </section>
                    )}

                    {/* Appearance Section */}
                    <section className="space-y-3">
                        <h3 className="text-sm font-bold text-text-subtle uppercase tracking-wider ml-1">Appearance</h3>
                        <Card>
                            <CardContent className="p-6 space-y-6">
                                {/* Theme Selector */}
                                <div>
                                    <label className="block text-sm font-medium text-text-main dark:text-secondary-200 mb-3">Theme</label>
                                    <div className="flex gap-3">
                                        <ThemeOption mode="light" label="Light" icon="sun" />
                                        <ThemeOption mode="dark" label="Dark" icon="moon" />
                                        <ThemeOption mode="blue" label="Blue" icon="sparkles" />
                                    </div>
                                </div>

                                {/* Background Customization */}
                                <div className="pt-6 border-t border-secondary-200 dark:border-secondary-700">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="block text-sm font-medium text-text-main dark:text-secondary-200">Wallpaper</label>
                                        {bgUrl && <button onClick={handleBgClear} className="text-xs text-error-500 hover:underline">Remove</button>}
                                    </div>

                                    <div className="space-y-4">
                                        <Input
                                            type="text"
                                            value={bgUrl}
                                            onChange={handleBgUrlChange}
                                            placeholder="https://example.com/image.jpg"
                                            className="text-sm"
                                        />

                                        {bgUrl && (
                                            <div className="rounded-xl overflow-hidden border border-secondary-300 dark:border-secondary-600 relative h-32 w-full group">
                                                <div
                                                    className="absolute inset-0 bg-cover bg-center transition-all duration-300"
                                                    style={{
                                                        backgroundImage: `url(${bgUrl})`,
                                                        filter: `blur(${backgroundSettings.blurIntensity}px)`
                                                    }}
                                                />
                                                <div
                                                    className="absolute inset-0 transition-colors duration-300"
                                                    style={{ backgroundColor: theme === 'dark' ? `rgba(0,0,0,${backgroundSettings.overlayOpacity / 100})` : `rgba(255,255,255,${backgroundSettings.overlayOpacity / 100})` }}
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="bg-black/50 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">Preview</span>
                                                </div>
                                            </div>
                                        )}

                                        {bgUrl && (
                                            <div className="grid grid-cols-2 gap-6">
                                                <div>
                                                    <div className="flex justify-between mb-1">
                                                        <span className="text-xs text-text-subtle">Overlay</span>
                                                        <span className="text-xs font-mono">{backgroundSettings.overlayOpacity}%</span>
                                                    </div>
                                                    <input
                                                        type="range" min="0" max="95"
                                                        value={backgroundSettings.overlayOpacity}
                                                        onChange={(e) => setBackgroundSettings({ overlayOpacity: parseInt(e.target.value) })}
                                                        className="w-full h-1.5 bg-secondary-200 dark:bg-secondary-700 rounded-lg appearance-none cursor-pointer"
                                                    />
                                                </div>
                                                <div>
                                                    <div className="flex justify-between mb-1">
                                                        <span className="text-xs text-text-subtle">Blur</span>
                                                        <span className="text-xs font-mono">{backgroundSettings.blurIntensity}px</span>
                                                    </div>
                                                    <input
                                                        type="range" min="0" max="20"
                                                        value={backgroundSettings.blurIntensity}
                                                        onChange={(e) => setBackgroundSettings({ blurIntensity: parseInt(e.target.value) })}
                                                        className="w-full h-1.5 bg-secondary-200 dark:bg-secondary-700 rounded-lg appearance-none cursor-pointer"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </section>

                    {/* Behavior Section */}
                    <section className="space-y-3">
                        <h3 className="text-sm font-bold text-text-subtle uppercase tracking-wider ml-1">Behavior</h3>
                        <Card>
                            <CardContent className="p-4 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-full">
                                            <Icon name="bell" className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-text-main dark:text-secondary-100">Daily Study Reminder</p>
                                            <p className="text-xs text-text-subtle">Get a notification to keep your streak.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {localSettings.reminderSettings?.enabled && (
                                            <input
                                                type="time"
                                                value={localSettings.reminderSettings.time}
                                                onChange={(e) => handleReminderTimeChange(e.target.value)}
                                                className="bg-secondary-100 dark:bg-secondary-700 border-none rounded px-2 py-1 text-xs font-bold text-text-main dark:text-secondary-100 outline-none focus:ring-1 focus:ring-primary-500"
                                            />
                                        )}
                                        <button
                                            onClick={handleReminderToggle}
                                            className={`w-11 h-6 rounded-full transition-colors duration-200 ease-in-out relative ${localSettings.reminderSettings?.enabled ? 'bg-primary-500' : 'bg-secondary-300 dark:bg-secondary-600'}`}
                                        >
                                            <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ${localSettings.reminderSettings?.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-secondary-200 dark:border-secondary-700">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-secondary-100 dark:bg-secondary-800 rounded-full text-text-subtle">
                                            <Icon name="music-note" className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-text-main dark:text-secondary-100">Music Toggle Shortcut</p>
                                            <p className="text-xs text-text-subtle">Press this key combination to play/pause music globally.</p>
                                        </div>
                                    </div>
                                    <div className="w-32">
                                        <Input
                                            type="text"
                                            value={localSettings.musicShortcut || 'Ctrl+M'}
                                            onChange={(e) => handleUpdateLocalSetting('musicShortcut', e.target.value)}
                                            className="text-center font-mono text-sm h-8"
                                            placeholder="e.g. Ctrl+M"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </section>

                    {/* Intelligence Section */}
                    <section className="space-y-3">
                        <h3 className="text-sm font-bold text-text-subtle uppercase tracking-wider ml-1">Intelligence</h3>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-full">
                                        <Icon name="sparkles" className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-text-main dark:text-secondary-100">Google Gemini API</p>
                                        <p className="text-xs text-text-subtle">Powers sentence generation, explanations, and imagery.</p>
                                    </div>
                                </div>

                                {isEditingApiKey ? (
                                    <div className="flex gap-2">
                                        <Input
                                            type="password"
                                            value={localApiKey}
                                            onChange={e => setLocalApiKey(e.target.value)}
                                            placeholder="Paste API Key..."
                                            className="font-mono text-sm"
                                        />
                                        <Button onClick={handleSaveKey}>Save</Button>
                                    </div>
                                ) : (
                                    <div className="flex justify-between items-center bg-secondary-100 dark:bg-secondary-800 rounded-lg p-3">
                                        <span className="font-mono text-xs text-text-subtle">
                                            {apiKey ? '••••••••••••••••••••' : 'No API Key Configured'}
                                        </span>
                                        <Button size="sm" variant="ghost" onClick={() => setIsEditingApiKey(true)}>Edit</Button>
                                    </div>
                                )}
                                <p className="text-[10px] text-text-subtle mt-2">
                                    Get a key from <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-primary-500 hover:underline">Google AI Studio</a>.
                                </p>
                            </CardContent>
                        </Card>
                    </section>

                    {/* Data Health & Sync */}
                    {!isGuest && (
                        <section className="space-y-3">
                            <div className="flex justify-between items-end">
                                <h3 className="text-sm font-bold text-text-subtle uppercase tracking-wider ml-1">Data Health</h3>
                                <Button variant="ghost" size="sm" onClick={handleRefetchMetadata} disabled={isPulling} className="h-6 text-xs px-2">
                                    {isPulling ? <Icon name="spinner" className="w-3 h-3 animate-spin mr-1" /> : <Icon name="arrow-down-tray" className="w-3 h-3 mr-1" />}
                                    Force Sync
                                </Button>
                            </div>

                            <Card>
                                <CardContent className="p-0 overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-secondary-50 dark:bg-secondary-800/50 text-text-subtle border-b border-secondary-200 dark:border-secondary-700">
                                            <tr>
                                                <th className="p-3 text-left font-semibold">Table</th>
                                                <th className="p-3 text-center font-semibold">Cloud</th>
                                                <th className="p-3 text-center font-semibold">Device</th>
                                                <th className="p-3 text-right font-semibold">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-secondary-100 dark:divide-secondary-800">
                                            {tables.map(t => {
                                                const isLoading = loadingTableIds.has(t.id);
                                                const serverRows = t.rowCount || 0;
                                                const localRows = t.rows.length;
                                                const isSynced = localRows >= serverRows && serverRows > 0;

                                                return (
                                                    <tr key={t.id} className="hover:bg-secondary-50 dark:hover:bg-secondary-800/30 transition-colors">
                                                        <td className="p-3 font-medium text-text-main dark:text-secondary-100 truncate max-w-[140px]">{t.name}</td>
                                                        <td className="p-3 text-center text-text-subtle">{serverRows}</td>
                                                        <td className="p-3 text-center text-text-subtle">{localRows}</td>
                                                        <td className="p-3 text-right flex justify-end">
                                                            {isLoading ? (
                                                                <div className="flex items-center gap-1 text-warning-500">
                                                                    <Icon name="spinner" className="w-4 h-4 animate-spin" />
                                                                    <span className="text-xs hidden sm:inline">Loading</span>
                                                                </div>
                                                            ) : isSynced ? (
                                                                <div className="flex items-center gap-1 text-success-500">
                                                                    <Icon name="check-circle" className="w-4 h-4" />
                                                                    <span className="text-xs hidden sm:inline">Ready</span>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleForceDownload(t.id)}
                                                                    className="flex items-center gap-1 text-primary-500 hover:text-primary-600 transition-colors"
                                                                >
                                                                    <Icon name="arrow-down-tray" className="w-4 h-4" />
                                                                    <span className="text-xs font-bold">Load</span>
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {tables.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="p-6 text-center text-text-subtle italic">No tables found.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </CardContent>
                            </Card>
                        </section>
                    )}

                    {/* Data Management */}
                    <section className="space-y-3">
                        <h3 className="text-sm font-bold text-text-subtle uppercase tracking-wider ml-1">Data Management</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <Button variant="secondary" onClick={() => setIsImportModalOpen(true)} className="h-auto py-3 flex flex-col gap-1 items-center justify-center">
                                <Icon name="arrow-down-tray" className="w-5 h-5 text-primary-500" />
                                <span>Import</span>
                            </Button>
                            <Button variant="secondary" onClick={() => setIsExportModalOpen(true)} className="h-auto py-3 flex flex-col gap-1 items-center justify-center">
                                <Icon name="arrow-up-tray" className="w-5 h-5 text-primary-500" />
                                <span>Export</span>
                            </Button>
                            <Button variant="secondary" onClick={() => attemptNavigation(Screen.TagManager)} className="h-auto py-3 flex flex-col gap-1 items-center justify-center col-span-2">
                                <Icon name="tag" className="w-5 h-5 text-secondary-500" />
                                <span>Tag Manager</span>
                            </Button>
                        </div>

                        {/* Danger Zone */}
                        {!isGuest && (
                            <div className="mt-6 pt-6 border-t border-secondary-200 dark:border-secondary-700">
                                <h3 className="text-sm font-bold text-error-600 dark:text-error-400 uppercase tracking-wider ml-1 mb-3">Danger Zone</h3>
                                <Button
                                    variant="secondary"
                                    onClick={() => setIsResetConfirmOpen(true)}
                                    className="w-full h-auto py-3 flex items-center justify-center gap-2 border-error-200 dark:border-error-900 text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20"
                                >
                                    <Icon name="trash" className="w-4 h-4" />
                                    <span>Reset Sync Queue</span>
                                </Button>
                                <p className="text-xs text-text-subtle mt-2 ml-1">
                                    Use this if syncing gets stuck (e.g., "Push (8)"). It wipes pending changes from this device.
                                </p>
                            </div>
                        )}
                    </section>

                </div>
            </div>

            {/* Floating Save Button */}
            {isSettingsDirty && (
                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-slideInUp">
                    <Button onClick={handleSaveSettings} className="shadow-xl px-8" size="lg">
                        Save Changes
                    </Button>
                </div>
            )}

            {/* Modals */}
            <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
            <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />

            <ConfirmationModal
                isOpen={isResetConfirmOpen}
                onClose={() => setIsResetConfirmOpen(false)}
                onConfirm={handleResetSyncQueue}
                title="Clear Sync Queue?"
                message="This will delete all pending changes on this device that haven't been synced to the server yet. This cannot be undone."
                confirmText="Clear Queue"
                confirmVariant="destructive"
            />
        </div>
    );
};

export default SettingsScreen;
