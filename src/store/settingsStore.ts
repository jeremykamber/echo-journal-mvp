import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AppSettings {
    reflectionSimilarityThreshold: number;
    reflectionMinLength: number;
    theme: 'system' | 'light' | 'dark';
    showReflectionLabels: boolean;
    autoReflect: boolean;
    enableMemories: boolean;
    showNudges: boolean;
    enableWhisper: boolean;
    enableSharing: boolean;
    completedTours: string[];
    /**
     * AI provider mode: 'cloud' uses OpenAI API, 'local' uses WebLLM.
     */
    aiProvider: 'cloud' | 'local';
    /**
     * Selected local model ID when aiProvider is 'local'.
     * One of the AVAILABLE_MODELS from providerFactory.
     */
    localModelId: string;
}

interface SettingsState extends AppSettings {
    setSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
    markTourCompleted: (tourId: string) => void;
}

const defaultSettings: AppSettings = {
    reflectionSimilarityThreshold: 0.90,
    reflectionMinLength: 30,
    theme: 'system',
    showReflectionLabels: true,
    autoReflect: true,
    enableMemories: true,
    showNudges: true,
    enableWhisper: false,
    enableSharing: false,
    completedTours: [],
    aiProvider: 'cloud',
    localModelId: 'Qwen2-1.5B-Instruct-q4f32_1-MLC',
};

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            ...defaultSettings,
            setSetting: (key, value) => set({ [key]: value }),
            markTourCompleted: (tourId) => set((state) => ({
                completedTours: [...state.completedTours, tourId]
            })),
        }),
        {
            name: 'app-settings',
            partialize: (state) => ({
                reflectionSimilarityThreshold: state.reflectionSimilarityThreshold,
                reflectionMinLength: state.reflectionMinLength,
                theme: state.theme,
                showReflectionLabels: state.showReflectionLabels,
                autoReflect: state.autoReflect,
                enableMemories: state.enableMemories,
                showNudges: state.showNudges,
                enableWhisper: state.enableWhisper,
                enableSharing: state.enableSharing,
                completedTours: state.completedTours,
                aiProvider: state.aiProvider,
                localModelId: state.localModelId,
            }),
        }
    )
);
