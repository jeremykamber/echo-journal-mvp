import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutorAgent } from '../ExecutorAgent';
import { IEventRepository, ILLMClient, IContextRetrievalService } from '../../domain/interfaces';

describe('ExecutorAgent', () => {
  let executor: ExecutorAgent;
  let mockEventRepo: IEventRepository;
  let mockLLM: ILLMClient;
  let mockContextService: IContextRetrievalService;

  beforeEach(() => {
    mockEventRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findPendingByUser: vi.fn(),
      updateStatus: vi.fn(),
    };
    mockLLM = {
      generateCompletion: vi.fn().mockResolvedValue('Hello from future Echo'),
      summarize: vi.fn(),
    };
    mockContextService = {
      getCombinedContext: vi.fn().mockResolvedValue('Past context'),
    };

    executor = new ExecutorAgent(mockEventRepo, mockLLM, mockContextService);
  });

  it('should fetch context, call LLM, and update event status to EXECUTED', async () => {
    const mockEvent = {
      id: 'evt-1',
      user_id: 'user-1',
      ai_prompt: 'Check in on project X',
      source_journal_entry_id: 'entry-1',
      related_journal_ids: [],
      related_chat_snippet_ids: [],
      status: 'PENDING'
    };
    vi.mocked(mockEventRepo.findById).mockResolvedValue(mockEvent as any);

    const message = await executor.execute('evt-1');

    expect(mockContextService.getCombinedContext).toHaveBeenCalled();
    expect(mockLLM.generateCompletion).toHaveBeenCalledWith(
      expect.stringContaining('Check in on project X'),
      expect.any(String),
      'FAST'
    );
    const userArg = vi.mocked(mockLLM.generateCompletion).mock.calls[0][0];
    expect(userArg).toContain('Past context');
    expect(mockEventRepo.updateStatus).toHaveBeenCalledWith('evt-1', 'EXECUTED');
    expect(message).toBe('Hello from future Echo');
  });

  it('should throw error if event not found', async () => {
    vi.mocked(mockEventRepo.findById).mockResolvedValue(null);
    await expect(executor.execute('none')).rejects.toThrow('Event not found');
  });
});
