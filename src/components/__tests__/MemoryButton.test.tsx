import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, act, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MemoryButton from '@/components/MemoryButton';

function renderWithQuery(ui: React.ReactElement) {
    const queryClient = new QueryClient();
    return render(React.createElement(QueryClientProvider as any, { client: queryClient }, ui));
}

describe('MemoryButton', () => {
    it('calls saveMemory on click and shows Saved state', async () => {
        const mockService = { saveMemory: vi.fn(async () => ({ success: true, id: 'm-1' })) } as any;

        renderWithQuery(<MemoryButton textToSave="remember this" userId="u1" service={mockService} label="Save" />);

        const btn = screen.getByRole('button', { name: /memory-save-button/i });

        await act(async () => {
            btn.click();
        });

        expect(mockService.saveMemory).toHaveBeenCalledWith({ text: 'remember this', userId: 'u1', source: undefined, metadata: undefined });

        // Saved state should be visible
        expect(await screen.findByText(/Saved/)).toBeTruthy();
    });
});
