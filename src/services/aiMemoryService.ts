import { Memory } from 'mem0ai/oss';
const memoryProvider = new Memory();

export const aiMemoryService = {
  async addMemory(memory: string, category: string) {
    await memoryProvider.add(memory, { userId: 'user', metadata: { category: category } });
  },

  async searchMemories(query: string) {
    const search = await memoryProvider.search(query, { userId: 'user' });
    return search.results;
  },

  async getAllMemories() {
    const filters = {
      "AND": [
        {
          "user_id": "alex"
        }
      ]
    };

    return memoryProvider.getAll({ version: "v2", filters, page: 1, page_size: 50 })
      .then(memories => console.log(memories))
      .catch(error => console.error(error));
  }
};
