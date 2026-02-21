import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentOrchestrator } from '../AgentOrchestrator';
import { IEventRepository, ILLMClient } from '../../domain/interfaces';
import { SchedulingService } from '../../services/SchedulingService';

describe('AgentOrchestrator', () => {
  let orchestrator: AgentOrchestrator;
  let mockEventRepo: IEventRepository;
  let mockLLM: ILLMClient;
  let mockSchedulingService: SchedulingService;

  beforeEach(() => {
    mockEventRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findPendingByUser: vi.fn().mockResolvedValue([]),
      updateStatus: vi.fn(),
    };
    mockLLM = {
      generateCompletion: vi.fn(),
      summarize: vi.fn(),
    };
    // Mock SchedulingService
    mockSchedulingService = {
      schedule: vi.fn(),
    } as any;

    orchestrator = new AgentOrchestrator(mockEventRepo, mockLLM, mockSchedulingService);
  });

  it('should parse LLM JSON and call SchedulingService for each new event', async () => {
    const mockJson = JSON.stringify([
      {
        scheduled_for: new Date(Date.now() + 86400000).toISOString(),
        ai_prompt: 'Follow up on stress',
        reason: 'User mentioned high stress level today'
      }
    ]);
    vi.mocked(mockLLM.generateCompletion).mockResolvedValue(mockJson);

    await orchestrator.orchestrate('user-1', 'entry-1', 'Today was stressful');

    expect(mockLLM.generateCompletion).toHaveBeenCalled();
    expect(mockSchedulingService.schedule).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      ai_prompt: 'Follow up on stress',
      source_journal_entry_id: 'entry-1'
    }));
  });

  it('should include pending events in the prompt to prevent duplicates', async () => {
    const pendingEvent = { id: 'evt-existing', ai_prompt: 'Existing follow up', reason: 'previous stress' };
    vi.mocked(mockEventRepo.findPendingByUser).mockResolvedValue([pendingEvent as any]);
    vi.mocked(mockLLM.generateCompletion).mockResolvedValue('[]'); // No new events

    await orchestrator.orchestrate('user-1', 'entry-1', 'context');

    const promptArg = vi.mocked(mockLLM.generateCompletion).mock.calls[0][0];
    expect(promptArg).toContain('Existing follow up');
  });
});
