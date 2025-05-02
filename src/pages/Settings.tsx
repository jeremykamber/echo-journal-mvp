import React from 'react';
import { useSettingsStore, AppSettings } from '@/store/settingsStore'; // Import AppSettings
import { trackSettingsChange } from '@/services/analyticsService';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import AppHeader from '@/components/AppHeader';

const SettingsScreen: React.FC = () => {
    const settings = useSettingsStore();
    const setSetting = useSettingsStore((s) => s.setSetting);

    const handleSettingChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
        setSetting(key, value);
        // Ensure the key is treated as a string for analytics
        trackSettingsChange(String(key)); // Track setting change
    };

    React.useEffect(() => {
        const root = document.documentElement;
        if (settings.theme === 'dark') {
            root.classList.add('dark');
            root.classList.remove('light');
        } else if (settings.theme === 'light') {
            root.classList.remove('dark');
            root.classList.add('light');
        } else {
            // System: remove both, let OS decide
            root.classList.remove('dark');
            root.classList.remove('light');
        }
    }, [settings.theme]);

    return (
        <div>
            <AppHeader center={<span className="text-2xl font-bold">Settings</span>}
            />
            <div className="max-w-xl mx-auto p-8">
                <div className="space-y-6">
                    <div>
                        <Label htmlFor="reflectionSimilarityThreshold" className="mb-1">Reflection Similarity Threshold</Label>
                        <Input
                            id="reflectionSimilarityThreshold"
                            type="number"
                            min={0.7}
                            max={0.99}
                            step={0.01}
                            value={settings.reflectionSimilarityThreshold}
                            onChange={e => handleSettingChange('reflectionSimilarityThreshold', parseFloat(e.target.value))}
                        />
                    </div>
                    <div>
                        <Label htmlFor="reflectionMinLength">Reflection Min Length</Label>
                        <Input
                            id="reflectionMinLength"
                            type="number"
                            min={10}
                            max={200}
                            step={5}
                            value={settings.reflectionMinLength}
                            onChange={e => handleSettingChange('reflectionMinLength', parseInt(e.target.value, 10))}
                        />
                    </div>
                    <div>
                        <Label htmlFor="theme">Theme</Label>
                        <Select
                            value={settings.theme}
                            onValueChange={(value: AppSettings['theme']) => handleSettingChange('theme', value)}
                        >
                            <SelectTrigger id="theme">
                                <SelectValue placeholder="Select theme" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="system">System</SelectItem>
                                <SelectItem value="light">Light</SelectItem>
                                <SelectItem value="dark">Dark</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="showReflectionLabels"
                            checked={settings.showReflectionLabels}
                            onCheckedChange={(checked) => handleSettingChange('showReflectionLabels', !!checked)}
                        />
                        <Label htmlFor="showReflectionLabels">Show Reflection Labels</Label>
                    </div>
                </div>
            </div>
        </div>


    );
};

export default SettingsScreen;
