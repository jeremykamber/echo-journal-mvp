import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { robustStorage } from '@/lib/robustStorage'
import { v4 as uuidv4 } from 'uuid'
import { getRepository } from '@/services/storage/RepositoryFactory'

export type StashSourceType = 'journal' | 'conversation'

export interface StashItem {
    stashItemId: string
    userId: string
    reflectionText: string
    sourceType: StashSourceType
    sourceId: string
    sourceTitleOrDate: string
    createdAt: string // ISO string
    stashedAt: string // ISO string
}

interface StashStore {
    items: StashItem[]
    addToStash: (item: Omit<StashItem, 'stashItemId' | 'stashedAt'>) => void
    removeFromStash: (stashItemId: string) => void
    isStashed: (sourceId: string) => boolean
    syncFromStorage: () => Promise<void>
}

export const useStashStore = create<StashStore>()(
    persist(
        (set, get) => ({
            items: [],
            addToStash: (item) => {
                set((state) => ({
                    items: [
                        ...state.items,
                        {
                            ...item,
                            stashItemId: uuidv4(),
                            stashedAt: new Date().toISOString(),
                        },
                    ],
                }))
                // Persist via Repository
                void getRepository().addToStash(item)
            },
            removeFromStash: (stashItemId) => {
                set((state) => ({
                    items: state.items.filter((i) => i.stashItemId !== stashItemId),
                }))
                void getRepository().removeFromStash(stashItemId)
            },
            isStashed: (sourceId) => {
                return get().items.some((i) => i.sourceId === sourceId)
            },
            syncFromStorage: async () => {
                const repo = getRepository();
                const items = await repo.getStash();
                set({ items });
            }
        }),
        {
            name: 'echo-stash',
            storage: createJSONStorage(() => robustStorage),
        }
    )
)
