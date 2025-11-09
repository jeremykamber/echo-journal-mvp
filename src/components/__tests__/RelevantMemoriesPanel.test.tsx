import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RelevantMemoriesPanel from '@/components/RelevantMemoriesPanel';

function renderWithQuery(ui: React.ReactElement) {
    const queryClient = new QueryClient();
    return render(React.createElement(QueryClientProvider as any, { client: queryClient }, ui));
}

describe('RelevantMemoriesPanel', () => {
    it('renders found memories from service', async () => {
        const mockService = { getRelevantMemories: vi.fn(async () => ({ results: [{ id: 'r1', memory: 'a relevant memory' }] })) } as any;

        renderWithQuery(<RelevantMemoriesPanel contextText="find me" userId="u1" service={mockService} />);

        await waitFor(() => expect(mockService.getRelevantMemories).toHaveBeenCalledWith('find me', 'u1', 5));

        expect(await screen.findByText(/a relevant memory/)).toBeTruthy();
    });
});
