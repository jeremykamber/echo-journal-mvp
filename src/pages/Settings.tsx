import React from 'react';
import { useSettingsStore, AppSettings } from '@/store/settingsStore'; // Import AppSettings
import ExportEntriesButton from '@/components/ExportEntriesButton'; // Import the new component
import { trackSettingsChange } from '@/services/analyticsService';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"; // Added import for Select components
import AppHeader from '@/components/AppHeader';

const SettingsScreen: React.FC = () => {
    const settings = useSettingsStore();
    const setSetting = useSettingsStore((s) => s.setSetting);

    const handleSettingChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
        setSetting(key, value);
        // Ensure the key is treated as a string for analytics
        trackSettingsChange(String(key)); // Track setting change
    };

    const toggle = (key: keyof AppSettings) => (e: React.ChangeEvent<HTMLInputElement>) => setSetting(key, e.target.checked as any);

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
        <>
            <AppHeader center={<span className="text-2xl font-bold">Settings</span>} />
            <div className="max-w-xl mx-auto p-8">
                <div className="space-y-8"> {/* Increased spacing between sections */}
                    <div className="space-y-2"> {/* Added spacing within each section */}
                        <Label htmlFor="reflectionSimilarityThreshold" className="mb-1">
                            Reflection Similarity Threshold
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Adjust the threshold for how similar reflections need to be to be considered related. Higher = stricter.
                        </p>
                        <Input
                            id="reflectionSimilarityThreshold"
                            type="number"
                            min={0.7}
                            max={0.99}
                            step={0.01}
                            value={settings.reflectionSimilarityThreshold}
                            onChange={(e) => handleSettingChange('reflectionSimilarityThreshold', parseFloat(e.target.value))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="reflectionMinLength">Reflection Min Length</Label>
                        <p className="text-sm text-muted-foreground">
                            Set the minimum journal entry length (in characters) for realtime reflections. Shorter entries may yield less insight.
                        </p>
                        <Input
                            id="reflectionMinLength"
                            type="number"
                            min={10}
                            max={200}
                            step={5}
                            value={settings.reflectionMinLength}
                            onChange={(e) => handleSettingChange('reflectionMinLength', parseInt(e.target.value, 10))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="theme">Theme</Label>
                        <p className="text-sm text-muted-foreground">
                            Choose the app's theme: system default, light, or dark mode.
                        </p>
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
                    <div className="flex items-start space-x-4"> {/* Added spacing between checkbox and label */}
                        <Checkbox
                            id="showReflectionLabels"
                            checked={settings.showReflectionLabels}
                            onCheckedChange={(checked) => handleSettingChange('showReflectionLabels', !!checked)}
                        />
                        <div className="space-y-1">
                            <Label htmlFor="showReflectionLabels">Show Reflection Labels</Label>
                            <p className="text-sm text-muted-foreground">
                                Toggle whether labels are displayed for reflections.
                            </p>
                        </div>
                    </div>

                    {/* Export Entries Section */}
                    <div className="space-y-4 pt-6 border-t border-border">
                        <ExportEntriesButton />
                    </div>
                    {/* Auto-reflect Toggle Section */}
                    <div className="mt-6 space-y-3">
                        <label className="flex items-center gap-2">
                            <input type="checkbox" checked={settings.autoReflect} onChange={(e) => setSetting('autoReflect', e.target.checked)} />
                            <span className="ml-2">Auto reflect on entries</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input type="checkbox" checked={(settings as any).enableMemories} onChange={toggle('enableMemories' as any)} />
                            <span className="ml-2">Enable Memories (local & sync)</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input type="checkbox" checked={(settings as any).showNudges} onChange={toggle('showNudges' as any)} />
                            <span className="ml-2">Show contextual nudges</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input type="checkbox" checked={(settings as any).enableWhisper} onChange={toggle('enableWhisper' as any)} />
                            <span className="ml-2">Enable audio capture (Whisper)</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input type="checkbox" checked={(settings as any).enableSharing} onChange={toggle('enableSharing' as any)} />
                            <span className="ml-2">Enable anonymized sharing</span>
                        </label>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SettingsScreen;
