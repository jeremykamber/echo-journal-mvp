import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContextRetrievalService } from '../ContextRetrievalService';
import { IVectorStore, ILLMClient } from '../../domain/interfaces';

describe('ContextRetrievalService', () => {
  let contextRetrievalService: ContextRetrievalService;
  let mockVectorStore: IVectorStore;
  let mockLLMClient: ILLMClient;

  beforeEach(() => {
    mockVectorStore = {
      fetchRelated: vi.fn(),
    };
    mockLLMClient = {
      generateCompletion: vi.fn(),
      summarize: vi.fn(),
    };
    contextRetrievalService = new ContextRetrievalService(mockVectorStore, mockLLMClient);
  });

  it('should fetch 5 journal entries and 5 chat snippets and combine them', async () => {
    const journalId = 'j-1';
    const relatedJournalIds = ['rj-1', 'rj-2'];
    const relatedChatIds = ['rc-1', 'rc-2'];

    vi.mocked(mockVectorStore.fetchRelated).mockImplementation((id, limit, type) => {
      if (type === 'JOURNAL') return Promise.resolve(['Journal Context 1', 'Journal Context 2']);
      if (type === 'CHAT') return Promise.resolve(['Chat Context 1', 'Chat Context 2']);
      return Promise.resolve([]);
    });

    const context = await contextRetrievalService.getCombinedContext(journalId, relatedJournalIds, relatedChatIds);

    expect(mockVectorStore.fetchRelated).toHaveBeenCalledWith(journalId, 5, 'JOURNAL');
    expect(mockVectorStore.fetchRelated).toHaveBeenCalledWith(journalId, 5, 'CHAT');
    expect(context).toContain('Journal Context 1');
    expect(context).toContain('Chat Context 1');
  });

  it('should summarize context if it exceeds the limit', async () => {
    const longContext = 'a'.repeat(5000); // Exceeds default limit
    vi.mocked(mockVectorStore.fetchRelated).mockResolvedValue([longContext]);
    vi.mocked(mockLLMClient.summarize).mockResolvedValue('Summarized Context');

    const context = await contextRetrievalService.getCombinedContext('j-1', [], []);

    expect(mockLLMClient.summarize).toHaveBeenCalled();
    expect(context).toBe('Summarized Context');
  });

  it('should not summarize context if it is within the limit', async () => {
    const shortContext = 'short';
    vi.mocked(mockVectorStore.fetchRelated).mockResolvedValue([shortContext]);

    const context = await contextRetrievalService.getCombinedContext('j-1', [], []);

    expect(mockLLMClient.summarize).not.toHaveBeenCalled();
    expect(context).toContain(shortContext);
  });
});
