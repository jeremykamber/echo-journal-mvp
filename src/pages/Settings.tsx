import React from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SettingsScreen: React.FC = () => {
    const settings = useSettingsStore();
    const setSetting = useSettingsStore((s) => s.setSetting);

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
        <div className="max-w-xl mx-auto p-8">
            <h1 className="text-3xl font-bold mb-6">Settings</h1>
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
                        onChange={e => setSetting('reflectionSimilarityThreshold', parseFloat(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Controls how different new content must be to trigger a new reflection (lower = more tolerant).</p>
                </div>
                <div>
                    <Label htmlFor="reflectionMinLength" className="mb-1">Reflection Minimum Length</Label>
                    <Input
                        id="reflectionMinLength"
                        type="number"
                        min={10}
                        max={200}
                        step={1}
                        value={settings.reflectionMinLength}
                        onChange={e => setSetting('reflectionMinLength', parseInt(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Minimum number of characters for new content to trigger a reflection.</p>
                </div>
                <div>
                    <Label htmlFor="theme" className="mb-1">Theme</Label>
                    <Select
                        value={settings.theme}
                        onValueChange={(value) => setSetting('theme', value as 'system' | 'light' | 'dark')}
                    >
                        <SelectTrigger className="w-full" id="theme">
                            <SelectValue placeholder="Select theme" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="system">System</SelectItem>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2">
                    <Checkbox
                        id="showReflectionLabels"
                        checked={settings.showReflectionLabels}
                        onCheckedChange={(checked: boolean | "indeterminate") => setSetting('showReflectionLabels', Boolean(checked))}
                    />
                    <Label htmlFor="showReflectionLabels">Show Reflection Labels in Chat</Label>
                </div>
            </div>
        </div>
    );
};

export default SettingsScreen;
