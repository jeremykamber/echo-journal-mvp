// Test skeleton for supabaseClient. Add a test runner like vitest to execute.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { insertAppFeedback, supabase } from '@/clients/supabaseClient';

describe('supabaseClient.insertAppFeedback', () => {
  let originalFrom: any;

  beforeEach(() => {
    // Save original implementation and replace with a mock that simulates
    // a successful insert. This avoids network calls during unit tests.
    originalFrom = supabase.from;
    supabase.from = vi.fn(() => ({
      insert: vi.fn(async () => ({ error: null })),
      // Minimal chainable methods in case callers chain other methods in the future
      select: vi.fn(() => ({ single: vi.fn(() => ({ error: null })) })),
      eq: vi.fn(() => ({ insert: vi.fn(async () => ({ error: null })) })),
    })) as any;
  });

  afterEach(() => {
    // Restore original implementation
    supabase.from = originalFrom;
  });

  it('returns success when insert succeeds', async () => {
    const res = await insertAppFeedback({ emoji_rating: '😃' });
    expect(res.success).toBe(true);
  });
});
