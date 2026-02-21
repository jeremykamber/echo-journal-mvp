import { IContextRetrievalService, IVectorStore, ILLMClient } from '../domain/interfaces';
import { UUID } from '../domain/types';

export class ContextRetrievalService implements IContextRetrievalService {
  private readonly CONTEXT_LIMIT = 4000; // Character limit as a simple proxy for tokens in MVP

  constructor(
    private vectorStore: IVectorStore,
    private llmClient: ILLMClient
  ) { }

  /**
   * Fetches context related to the journal entry (Dual RAG)
   * and summarizes if too large.
   */
  async getCombinedContext(
    journalId: UUID,
    _relatedJournalIds: UUID[], // Placeholder for potential direct ID usage
    _relatedChatIds: UUID[]      // Placeholder for potential direct ID usage
  ): Promise<string> {
    // 1. Fetch related journals (Max 5)
    // In a real impl, we'd use the provided IDs or let VectorStore find them.
    // Spec says: "5 documents from related journal entry, 5 documents from related chat"
    const journalEntries = await this.vectorStore.fetchRelated(journalId, 5, 'JOURNAL');

    // 2. Fetch related chat snippets (Max 5)
    const chatSnippets = await this.vectorStore.fetchRelated(journalId, 5, 'CHAT');

    // 3. Combine context
    let combinedContext = [
      "--- RELATED JOURNALS ---",
      ...journalEntries,
      "--- RELATED CHATS ---",
      ...chatSnippets
    ].join('\n\n');

    // 4. Summarize if necessary
    if (combinedContext.length > this.CONTEXT_LIMIT) {
      combinedContext = await this.llmClient.summarize(combinedContext);
    }

    return combinedContext;
  }
}
