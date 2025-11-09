import React from 'react';
import { useSettingsStore, AppSettings } from '@/store/settingsStore';
import ExportEntriesButton from '@/components/ExportEntriesButton';
import { AIProviderSettings } from '@/components/AIProvider';
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
} from "@/components/ui/select";
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

                    {/* AI Provider Settings Section */}
                    <div className="pt-6 border-t border-border">
                        <AIProviderSettings />
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
                    {/* Feature Toggles Section */}
                    <div className="space-y-4 pt-6 border-t border-border">
                        <h3 className="text-lg font-semibold">Features</h3>
                        
                        <div className="flex items-start space-x-3">
                            <Checkbox
                                id="autoReflect"
                                checked={settings.autoReflect}
                                onCheckedChange={(checked) => handleSettingChange('autoReflect', !!checked)}
                            />
                            <div className="space-y-1">
                                <Label htmlFor="autoReflect">Auto Reflect on Entries</Label>
                                <p className="text-sm text-muted-foreground">
                                    Automatically generate reflections as you write in your journal.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-3">
                            <Checkbox
                                id="enableMemories"
                                checked={(settings as any).enableMemories}
                                onCheckedChange={(checked) => handleSettingChange('enableMemories', !!checked)}
                            />
                            <div className="space-y-1">
                                <Label htmlFor="enableMemories">Enable Memories</Label>
                                <p className="text-sm text-muted-foreground">
                                    Store and sync your memories locally and across devices.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-3">
                            <Checkbox
                                id="showNudges"
                                checked={(settings as any).showNudges}
                                onCheckedChange={(checked) => handleSettingChange('showNudges', !!checked)}
                            />
                            <div className="space-y-1">
                                <Label htmlFor="showNudges">Show Contextual Nudges</Label>
                                <p className="text-sm text-muted-foreground">
                                    Receive helpful prompts and suggestions based on your journal entries.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-3">
                            <Checkbox
                                id="enableWhisper"
                                checked={(settings as any).enableWhisper}
                                onCheckedChange={(checked) => handleSettingChange('enableWhisper', !!checked)}
                            />
                            <div className="space-y-1">
                                <Label htmlFor="enableWhisper">Enable Voice Input (Whisper)</Label>
                                <p className="text-sm text-muted-foreground">
                                    Record and transcribe your voice directly into journal entries using AI.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-3">
                            <Checkbox
                                id="enableSharing"
                                checked={(settings as any).enableSharing}
                                onCheckedChange={(checked) => handleSettingChange('enableSharing', !!checked)}
                            />
                            <div className="space-y-1">
                                <Label htmlFor="enableSharing">Enable Anonymized Sharing</Label>
                                <p className="text-sm text-muted-foreground">
                                    Allow your anonymized entries to be used for improving the service.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SettingsScreen;
