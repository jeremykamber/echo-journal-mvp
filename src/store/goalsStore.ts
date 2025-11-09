import { create } from 'zustand';

export type Goal = {
    id: string;
    title: string;
    description?: string;
    createdAt: string;
    completed?: boolean;
};

type GoalsState = {
    goals: Goal[];
    addGoal: (g: Omit<Goal, 'id' | 'createdAt'>) => string;
    completeGoal: (id: string) => void;
    removeGoal: (id: string) => void;
};

export const useGoalsStore = create<GoalsState>((set) => ({
    goals: [],
    addGoal: (g) => {
        const id = `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const newGoal: Goal = { id, title: g.title, description: g.description, createdAt: new Date().toISOString(), completed: false };
        set((s) => ({ goals: [...s.goals, newGoal] }));
        return id;
    },
    completeGoal: (id) => set((s) => ({ goals: s.goals.map(g => g.id === id ? { ...g, completed: true } : g) })),
    removeGoal: (id) => set((s) => ({ goals: s.goals.filter(g => g.id !== id) })),
}));

export default useGoalsStore;
