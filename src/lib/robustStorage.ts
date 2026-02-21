import { StateStorage } from 'zustand/middleware';
import localforage from 'localforage';

/**
 * A Zustand-compatible storage engine that uses localforage (IndexedDB)
 * instead of the default localStorage. This provides better persistence
 * and larger storage limits.
 */
export const robustStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return await localforage.getItem(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await localforage.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await localforage.removeItem(name);
  },
};
