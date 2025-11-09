import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useServices } from '@/providers/ServiceProvider';
import type { MemoryService } from '@/features/memory/services/memoryService';

export function useMemoryAssistant({ service }: { service?: MemoryService } = {}) {
    const memoryService: MemoryService = service ? service : useServices().memoryService;

    const saveMutation = useMutation<{ success: boolean; id?: string; error?: Error | null }, Error, { text: string; userId?: string; source?: string; metadata?: any }>({
        mutationFn: (vars: { text: string; userId?: string; source?: string; metadata?: any }) =>
            memoryService.saveMemory({ text: vars.text, userId: vars.userId, source: vars.source, metadata: vars.metadata }),
    });

    const saveMemory = useCallback(
        async (text: string, opts: { userId?: string; source?: string; metadata?: any } = {}) => {
            try {
                const res = await saveMutation.mutateAsync({ text, userId: opts.userId, source: opts.source, metadata: opts.metadata });
                return res;
            } catch (err) {
                return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
            }
        },
        [saveMutation]
    );

    const fetchRelevant = useCallback(
        async (contextText: string, userId?: string, n = 5) => {
            try {
                const res = await memoryService.getRelevantMemories(contextText, userId, n);
                return res;
            } catch (err) {
                return { results: [], error: err instanceof Error ? err : new Error(String(err)) };
            }
        },
        [memoryService]
    );

    return {
        saveMemory,
        fetchRelevant,
        isSaving: (saveMutation as any).isLoading as boolean,
        saveError: saveMutation.error as Error | null,
    } as const;
}

export default useMemoryAssistant;
