import * as React from 'react';
import { Table, AnkiConfig } from '../../../types';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { useUIStore } from '../../../stores/useUIStore';

interface AnkiSettingsTabProps {
    table: Table;
    onUpdateTable: (updatedTable: Partial<Table>) => void;
}

const DEFAULT_ANKI_CONFIG: AnkiConfig = {
    newCardsPerDay: 20,
    learningSteps: "1 10",
    graduatingInterval: 1,
    easyInterval: 4,
    maxReviewsPerDay: 200,
    easyBonus: 1.3,
    intervalModifier: 1.0,
    lapseSteps: "10",
    newIntervalPercent: 0,
};

const AnkiSettingsTab: React.FC<AnkiSettingsTabProps> = ({ table, onUpdateTable }) => {
    const { showToast } = useUIStore();
    const [config, setConfig] = React.useState<AnkiConfig>(() => ({
        ...DEFAULT_ANKI_CONFIG,
        ...(table.ankiConfig || {}),
    }));

    const handleChange = (field: keyof AnkiConfig, value: string | number) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        onUpdateTable({ ankiConfig: config });
        showToast("Anki settings saved.", "success");
    };
    
    const isDirty = JSON.stringify(config) !== JSON.stringify({ ...DEFAULT_ANKI_CONFIG, ...(table.ankiConfig || {}) });

    const SettingInput = ({ label, description, field, type = 'number', step = 1 }: { label: string, description: string, field: keyof AnkiConfig, type?: string, step?: number }) => (
        <div>
            <label htmlFor={field} className="block text-sm font-medium text-text-main dark:text-secondary-200">{label}</label>
            <p className="text-xs text-text-subtle mb-1">{description}</p>
            <Input
                id={field}
                type={type}
                value={config[field]}
                step={step}
                onChange={(e) => handleChange(field, type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
            />
        </div>
    );

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>New Cards</CardTitle>
                    <CardDescription>Settings for cards you are seeing for the first time.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SettingInput label="New cards/day" description="Maximum number of new cards to introduce in a day." field="newCardsPerDay" />
                    <SettingInput label="Learning steps (minutes)" description="Intervals for new cards. Use spaces to separate." field="learningSteps" type="text" />
                    <SettingInput label="Graduating interval (days)" description="Interval for a new card answered 'Good'." field="graduatingInterval" />
                    <SettingInput label="Easy interval (days)" description="Interval for a new card answered 'Easy'." field="easyInterval" />
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Reviews</CardTitle>
                    <CardDescription>Settings for cards you have already learned.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SettingInput label="Maximum reviews/day" description="Maximum number of review cards to show." field="maxReviewsPerDay" />
                    <SettingInput label="Easy bonus" description="An extra multiplier for the 'Easy' button (e.g., 1.3 for 130%)." field="easyBonus" step={0.05}/>
                    <SettingInput label="Interval modifier" description="Multiplier applied to all calculated intervals." field="intervalModifier" step={0.05}/>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Lapses</CardTitle>
                    <CardDescription>Settings for when you forget a review card.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <SettingInput label="Relearning steps (minutes)" description="Intervals for a forgotten card." field="lapseSteps" type="text" />
                     <SettingInput label="New interval" description="Percentage of the previous interval to use (e.g., 0 for 0%)." field="newIntervalPercent" step={0.01}/>
                </CardContent>
            </Card>
            
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={!isDirty}>Save Settings</Button>
            </div>
        </div>
    );
};

export default AnkiSettingsTab;