// NOTE: This is a test skeleton for feedbackService. The repository currently has no test
// runner configured — add vitest or jest to run these tests. The file uses vitest
// syntax as a lightweight default.

import { describe, it, expect, vi } from 'vitest';
import makeFeedbackService from '@/features/feedback/services/feedbackService';

const mockSessionService = {
    ensureSessionId: () => 'session-test-123',
    getSessionId: () => 'session-test-123',
    getItem: () => null,
    setItem: () => { },
    removeItem: () => { },
};

describe('feedbackService', () => {
    it('submits valid feedback via the client and returns success', async () => {
        const mockInsert = vi.fn(async () => ({ success: true, error: null }));

        const svc = makeFeedbackService({ insertAppFeedback: mockInsert, sessionService: mockSessionService as any });

        const result = await svc.submitFeedback('😃');

        expect(mockInsert).toHaveBeenCalledTimes(1);
        expect(result).toHaveProperty('success');
    });

    it('rejects invalid emoji ratings', async () => {
        const mockInsert = vi.fn();
        const svc = makeFeedbackService({ insertAppFeedback: mockInsert, sessionService: mockSessionService as any });

        const result = await svc.submitFeedback('X');

        expect(result.success).toBe(false);
        expect(mockInsert).not.toHaveBeenCalled();
    });
});
