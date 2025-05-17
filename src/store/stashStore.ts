import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'

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
            },
            removeFromStash: (stashItemId) => {
                set((state) => ({
                    items: state.items.filter((i) => i.stashItemId !== stashItemId),
                }))
            },
            isStashed: (sourceId) => {
                return get().items.some((i) => i.sourceId === sourceId)
            },
        }),
        {
            name: 'echo-stash',
        }
    )
)
