import { IVectorStore } from '../domain/interfaces';
import { similaritySearch } from '@/services/persistentVectorStore';
import { UUID } from '../domain/types';

export class VectorStoreAdapter implements IVectorStore {
  async fetchRelated(id: UUID, limit: number, _type: 'JOURNAL' | 'CHAT'): Promise<string[]> {
    // In this MVP, similaritySearch returns Document[]
    // We'll use the id (or content related to it) to fetch similar things.
    // For now, assume common search logic.
    const results = await similaritySearch('', limit); // Placeholder: search needs a query
    return results.map(doc => doc.pageContent);
  }
}
