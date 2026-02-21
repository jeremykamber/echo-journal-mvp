import localforage from 'localforage';

localforage.config({
  name: 'EchoJournal',
  storeName: 'echo_journal_data',
  description: 'Robust local storage for Echo Journal'
});

export interface StorageService {
  getItem: <T>(key: string) => Promise<T | null>;
  setItem: <T>(key: string, value: T) => Promise<T>;
  removeItem: (key: string) => Promise<void>;
  clear: () => Promise<void>;
  keys: () => Promise<string[]>;
}

export const storageService: StorageService = {
  async getItem<T>(key: string): Promise<T | null> {
    return await localforage.getItem<T>(key);
  },
  async setItem<T>(key: string, value: T): Promise<T> {
    return await localforage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    return await localforage.removeItem(key);
  },
  async clear(): Promise<void> {
    return await localforage.clear();
  },
  async keys(): Promise<string[]> {
    return await localforage.keys();
  }
};

export default storageService;
