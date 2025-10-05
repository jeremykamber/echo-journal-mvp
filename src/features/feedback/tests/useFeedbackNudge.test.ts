// Hook tests are skeletons and use manual mocks because the repo does not
// yet include a test runner or React Testing Library setup.

import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import useFeedbackNudge from '@/features/feedback/hooks/useFeedbackNudge';

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient();
  return render(React.createElement(QueryClientProvider as any, { client: queryClient }, ui));
}

describe('useFeedbackNudge', () => {
  it('returns needsFollowUp for negative emoji', async () => {
    const mockService = { submitFeedback: vi.fn() } as any;
    let hookResult: any = null;

    function TestComponent() {
      hookResult = useFeedbackNudge({ service: mockService });
      return null;
    }

    renderWithQuery(React.createElement(TestComponent as any));

    let res: any;
    await act(async () => {
      res = await hookResult.submitEmoji('😞');
    });

    expect(res).toHaveProperty('needsFollowUp', true);
  });

  it('submits emoji for positive ratings', async () => {
    const mockService = { submitFeedback: vi.fn(async () => ({ success: true, error: null })) } as any;
    let hookResult: any = null;

    function TestComponent() {
      hookResult = useFeedbackNudge({ service: mockService });
      return null;
    }

    renderWithQuery(React.createElement(TestComponent as any));

    let res: any;
    await act(async () => {
      res = await hookResult.submitEmoji('😃');
    });

    expect(mockService.submitFeedback).toHaveBeenCalledWith('😃', undefined);
    expect(res).toHaveProperty('result');
  });
});
