import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AppSettings {
    reflectionSimilarityThreshold: number;
    reflectionMinLength: number;
    theme: 'system' | 'light' | 'dark';
    showReflectionLabels: boolean;
    autoReflect: boolean;
    completedTours: string[];
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
    completedTours: [],
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
                completedTours: state.completedTours,
            }),
        }
    )
);
