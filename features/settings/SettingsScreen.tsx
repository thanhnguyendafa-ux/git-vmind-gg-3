
import React from 'react';
import Icon from '../../components/ui/Icon';
import { useUserStore } from '../../stores/useUserStore';
import { useUIStore } from '../../stores/useUIStore';
import { useTableStore } from '../../stores/useTableStore';
import { AppSettings, Screen } from '../../types';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import ImportModal from '../tables/components/ImportModal';
import ExportModal from '../tables/components/ExportModal';
import { useApiKeyStore } from '../../stores/useApiKeyStore';
import { requestNotificationPermission } from '../../utils/notificationService';
import { NeedsAttentionList } from '../../components/ui/NeedsAttentionList';
import { VmindSyncEngine } from '../../services/VmindSyncEngine';

const SettingsScreen: React.FC = () => {
  const { handleLogout, isGuest, settings, setSettings } = useUserStore();
  const { toggleTheme, theme, showToast, syncQueue, pullData, isPulling, setCurrentScreen } = useUIStore();
  const { apiKey, setApiKey } = useApiKeyStore();
  const { tables, loadingTableIds, fetchTablePayload } = useTableStore();
  
  const [localApiKey, setLocalApiKey] = React.useState(apiKey || '');
  const [isEditingApiKey, setIsEditingApiKey] = React.useState(!apiKey);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [localSettings, setLocalSettings] = React.useState(settings);
  const isSettingsDirty = JSON.stringify(localSettings) !== JSON.stringify(settings);

  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = React.useState(false);

  React.useEffect(() => {
    if (isEditingApiKey) {
      inputRef.current?.focus();
    }
  }, [isEditingApiKey]);

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setLocalSettings(prev => ({ ...prev, ...newSettings }));
  };
  
  const handleSaveSettings = () => {
    setSettings(localSettings);
    showToast("Settings saved.", "success");
  };

  const handleReminderToggle = async (enabled: boolean) => {
      if (enabled) {
          const permission = await requestNotificationPermission();
          if (permission !== 'granted') {
              showToast("Notification permission denied.", "info");
              return; // Don't enable if permission is not granted
          }
      }
      handleUpdateSettings({ reminderSettings: { ...(localSettings.reminderSettings || { time: '19:00' }), enabled } });
  };
  
  const handleSaveKey = () => {
    const trimmedKey = localApiKey.trim();
    setApiKey(trimmedKey);
    showToast(trimmedKey ? "API Key saved successfully." : "API Key removed.", "success");
    setIsEditingApiKey(false);
  };

  const handleEditClick = () => {
    setLocalApiKey(apiKey || '');
    setIsEditingApiKey(true);
  };

  const handleCancelEdit = () => {
    setLocalApiKey(apiKey || '');
    setIsEditingApiKey(false);
  };
  
  const handleForceDownload = (tableId: string) => {
      fetchTablePayload(tableId);
      showToast("Downloading content...", "info");
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

  return (
    <div className="p-4 sm:p-6 mx-auto animate-fadeIn">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-text-main dark:text-white">Settings</h1>
         {isSettingsDirty && (
            <Button onClick={handleSaveSettings}>Save Changes</Button>
        )}
      </div>
      
      <div className="space-y-6">
        
        {/* --- Sync Status Section --- */}
        {!isGuest && syncQueue.length > 0 && (
            <Card className="border-warning-200 dark:border-warning-800 bg-warning-50 dark:bg-warning-900/10">
                <CardHeader className="p-4">
                    <CardTitle className="text-lg flex items-center gap-2 text-warning-700 dark:text-warning-400">
                        <Icon name="cloud-rain" className="w-5 h-5" />
                        Sync Queue
                    </CardTitle>
                    <CardDescription>Some changes are waiting to be synced.</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <NeedsAttentionList />
                </CardContent>
            </Card>
        )}

        <Card>
            <CardHeader className="p-4">
                <CardTitle className="text-lg">Account</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                {isGuest ? (
                    <p className="text-sm text-text-subtle">You are currently using Vmind as a guest. Sign up to sync your data across devices.</p>
                ) : (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-text-subtle">You are logged in.</p>
                        <Button variant="destructive" size="md" onClick={handleLogout}>
                            Log Out
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
        
        {/* --- Data Health & Storage (Updated v2.6) --- */}
        {!isGuest && (
            <Card>
                <CardHeader className="p-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-lg">Data Health & Storage</CardTitle>
                            <CardDescription>Monitor synchronization status and offline availability.</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleRefetchMetadata} disabled={isPulling}>
                            <Icon name="arrow-down-tray" className={`w-4 h-4 mr-2 ${isPulling ? 'animate-spin' : ''}`} />
                            Re-fetch Metadata
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-4">
                    
                    {/* Network & Queue Status */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary-100 dark:bg-secondary-800/50 text-sm">
                         <div className={`w-3 h-3 rounded-full ${syncQueue.length > 0 ? 'bg-warning-500' : 'bg-success-500'}`}></div>
                         <span className="text-text-main dark:text-secondary-200 font-medium">
                             {syncQueue.length > 0 
                                ? `${syncQueue.length} items waiting to sync.` 
                                : "System synced. Ready for offline use."}
                         </span>
                    </div>

                    {/* Payload Matrix */}
                    <div className="border border-secondary-200 dark:border-secondary-700 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-secondary-50 dark:bg-secondary-900/50 text-text-subtle">
                                <tr>
                                    <th className="p-3 text-left font-semibold">Table Name</th>
                                    <th className="p-3 text-right font-semibold">Server</th>
                                    <th className="p-3 text-right font-semibold">Local</th>
                                    <th className="p-3 text-center font-semibold">Status</th>
                                    <th className="p-3 text-right font-semibold">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700">
                                {tables.map(t => {
                                    const isLoading = loadingTableIds.has(t.id);
                                    const serverRows = t.rowCount || 0;
                                    const localRows = t.rows.length;
                                    const isSynced = localRows >= serverRows && serverRows > 0;
                                    const isPending = localRows < serverRows && !isLoading;
                                    
                                    return (
                                        <tr key={t.id} className="hover:bg-secondary-50 dark:hover:bg-secondary-800/30 transition-colors">
                                            <td className="p-3 font-medium text-text-main dark:text-secondary-100 truncate max-w-[150px]" title={t.name}>
                                                {t.name}
                                            </td>
                                            <td className="p-3 text-right text-text-subtle">{serverRows}</td>
                                            <td className="p-3 text-right text-text-subtle">{localRows}</td>
                                            <td className="p-3 text-center">
                                                {isLoading ? (
                                                    <Icon name="spinner" className="w-5 h-5 text-warning-500 animate-spin mx-auto" />
                                                ) : isSynced ? (
                                                    <Icon name="check-circle" className="w-5 h-5 text-success-500 mx-auto" variant="filled" />
                                                ) : isPending ? (
                                                    <Icon name="error-circle" className="w-5 h-5 text-warning-500 mx-auto" />
                                                ) : (
                                                     <span className="text-xs text-text-subtle">-</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-right">
                                                {(isPending || isLoading) && (
                                                    <button 
                                                        onClick={() => handleForceDownload(t.id)} 
                                                        disabled={isLoading}
                                                        className="text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 disabled:opacity-50"
                                                    >
                                                        {isLoading ? 'Downloading...' : 'Force Load'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {tables.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-4 text-center text-text-subtle">No tables found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        )}

        <Card>
            <CardHeader className="p-4">
                <CardTitle className="text-lg">AI Features</CardTitle>
                <CardDescription>Provide your Google AI API key to enable content generation.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
                 <div className="flex items-center gap-2">
                    {isEditingApiKey ? (
                        <>
                            <Input
                                ref={inputRef}
                                type="password"
                                value={localApiKey}
                                onChange={(e) => setLocalApiKey(e.target.value)}
                                placeholder="Enter your Google AI API key..."
                                className="flex-1"
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
                            />
                            <Button variant="secondary" onClick={handleCancelEdit}>
                                Cancel
                            </Button>
                            <Button onClick={handleSaveKey}>
                                Save
                            </Button>
                        </>
                    ) : (
                         <>
                            <Input
                                type="text"
                                value="********************"
                                readOnly
                                disabled
                                className="flex-1 font-mono"
                            />
                            <Button variant="secondary" onClick={handleEditClick}>
                                Edit
                            </Button>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader className="p-4">
                <CardTitle className="text-lg">Appearance</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-text-subtle">Theme</p>
                    <button onClick={toggleTheme} className="flex items-center gap-2 bg-secondary-200 dark:bg-secondary-700 px-3 py-1.5 rounded-full font-semibold text-sm">
                        <Icon name={theme === 'dark' ? 'moon' : 'sun'} className="w-5 h-5" />
                        <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
                    </button>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader className="p-4">
                <CardTitle className="text-lg">Data & Content</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => setIsImportModalOpen(true)}>
                        <Icon name="arrow-down-tray" className="w-4 h-4 mr-2"/>
                        Import
                    </Button>
                    <Button variant="secondary" onClick={() => setIsExportModalOpen(true)}>
                        <Icon name="arrow-up-tray" className="w-4 h-4 mr-2"/>
                        Export
                    </Button>
                     <Button variant="secondary" onClick={() => setCurrentScreen(Screen.TagManager)}>
                        <Icon name="tag" className="w-4 h-4 mr-2"/>
                        Manage Tags
                    </Button>
                </div>
            </CardContent>
        </Card>

      </div>
      
      <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
      <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
    </div>
  );
};

export default SettingsScreen;
