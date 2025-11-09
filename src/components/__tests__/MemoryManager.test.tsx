import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ServiceProvider } from '@/providers/ServiceProvider';
import MemoryManager from '@/components/MemoryManager';

function renderWithProviders(ui: React.ReactElement) {
    const queryClient = new QueryClient();
    return render(
        <QueryClientProvider client={queryClient}>
            <ServiceProvider>{ui}</ServiceProvider>
        </QueryClientProvider>
    );
}

describe('MemoryManager', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('renders and shows no memories when none present', async () => {
        renderWithProviders(<MemoryManager />);
        await waitFor(() => expect(screen.getByText(/No memories found/)).toBeTruthy());
    });
});
