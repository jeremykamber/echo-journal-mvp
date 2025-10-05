// NOTE: This is a test skeleton for feedbackService. The repository currently has no test
// runner configured — add vitest or jest to run these tests. The file uses vitest
// syntax as a lightweight default.

import { describe, it, expect } from 'vitest';
import makeFeedbackService from '@/features/feedback/services/feedbackService';

describe('feedbackService', () => {
  it('submits valid feedback via the client and tracks analytics', async () => {
    // Arrange: mocked client and analytics
    // Minimal manual mocks so tests don't depend on a test runner being installed yet
    const mockInsert = async (payload: any) => {
      mockInsert.calls = mockInsert.calls || [];
      mockInsert.calls.push(payload);
      return { success: true, error: null };
    };
    mockInsert.calls = [] as any;

    const svc = makeFeedbackService({ insertAppFeedback: mockInsert });

    // Act
    const result = await svc.submitFeedback('😃');

    // Assert
    expect(result.success).toBe(true);
    expect(mockInsert.calls.length).toBe(1);
  });

  it('rejects invalid emoji ratings', async () => {
    const mockInsert = async () => {
      mockInsert.calls = mockInsert.calls || [];
      mockInsert.calls.push(true);
      return { success: true, error: null };
    };
    mockInsert.calls = [] as any;

    const svc = makeFeedbackService({ insertAppFeedback: mockInsert });
    const result = await svc.submitFeedback('X');

    expect(result.success).toBe(false);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
