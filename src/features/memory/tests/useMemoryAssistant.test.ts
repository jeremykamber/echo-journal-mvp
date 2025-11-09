import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import useMemoryAssistant from '@/features/memory/hooks/useMemoryAssistant';

function renderWithQuery(ui: React.ReactElement) {
    const queryClient = new QueryClient();
    return render(React.createElement(QueryClientProvider as any, { client: queryClient }, ui));
}

describe('useMemoryAssistant', () => {
    it('saveMemory calls memoryService.saveMemory and returns result', async () => {
        const mockService = { saveMemory: vi.fn(async () => ({ success: true, id: 'mem-1' })) } as any;
        let hookResult: any = null;

        function TestComponent() {
            hookResult = useMemoryAssistant({ service: mockService });
            return null;
        }

        renderWithQuery(React.createElement(TestComponent as any));

        let res: any;
        await act(async () => {
            res = await hookResult.saveMemory('a remembered thought', { userId: 'u1' });
        });

        expect(mockService.saveMemory).toHaveBeenCalledWith({ text: 'a remembered thought', userId: 'u1', source: undefined, metadata: undefined });
        expect(res).toHaveProperty('success', true);
    });

    it('fetchRelevant delegates to memoryService.getRelevantMemories', async () => {
        const mockService = { getRelevantMemories: vi.fn(async () => ({ results: [{ id: 'm1', memory: 'contextual' }] })) } as any;
        let hookResult: any = null;

        function TestComponent() {
            hookResult = useMemoryAssistant({ service: mockService });
            return null;
        }

        renderWithQuery(React.createElement(TestComponent as any));

        let fetched: any;
        await act(async () => {
            fetched = await hookResult.fetchRelevant('some context', 'u1', 3);
        });

        expect(mockService.getRelevantMemories).toHaveBeenCalledWith('some context', 'u1', 3);
        expect(fetched.results.length).toBeGreaterThanOrEqual(1);
    });
});
