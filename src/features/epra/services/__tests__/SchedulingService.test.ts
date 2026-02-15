import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SchedulingService } from '../SchedulingService';
import { ICronClient, IEventRepository } from '../../domain/interfaces';
import { ScheduledReflectionEvent } from '../../domain/types';

describe('SchedulingService', () => {
  let schedulingService: SchedulingService;
  let mockCronClient: ICronClient;
  let mockEventRepository: IEventRepository;

  beforeEach(() => {
    mockCronClient = {
      scheduleJob: vi.fn().mockResolvedValue(undefined),
      cancelJob: vi.fn().mockResolvedValue(undefined),
    };

    mockEventRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findPendingByUser: vi.fn(),
      updateStatus: vi.fn(),
    };

    schedulingService = new SchedulingService(mockEventRepository, mockCronClient);
  });

  it('should throw an error if scheduled_for is in the past', async () => {
    const pastDate = new Date(Date.now() - 10000).toISOString();
    const eventData: any = {
      user_id: 'user-1',
      scheduled_for: pastDate,
      ai_prompt: 'Test prompt',
      reason: 'Test reason',
      source_journal_entry_id: 'entry-1',
      related_journal_ids: [],
      related_chat_snippet_ids: [],
      status: 'PENDING'
    };

    await expect(schedulingService.schedule(eventData)).rejects.toThrow('Cannot schedule a reflection in the past');
  });

  it('should successfully create event in DB and schedule cron job', async () => {
    const futureDate = new Date(Date.now() + 100000).toISOString();
    const eventData: any = {
      user_id: 'user-1',
      scheduled_for: futureDate,
      ai_prompt: 'Test prompt',
      reason: 'Test reason',
      source_journal_entry_id: 'entry-1',
      related_journal_ids: [],
      related_chat_snippet_ids: [],
      status: 'PENDING'
    };

    const savedEvent: ScheduledReflectionEvent = {
      ...eventData,
      id: 'event-1',
      created_at: new Date().toISOString()
    };

    vi.mocked(mockEventRepository.create).mockResolvedValue(savedEvent);

    const result = await schedulingService.schedule(eventData);

    expect(mockEventRepository.create).toHaveBeenCalledWith(eventData);
    expect(mockCronClient.scheduleJob).toHaveBeenCalledWith('event-1', expect.any(Date));
    expect(result).toEqual(savedEvent);
  });
});
