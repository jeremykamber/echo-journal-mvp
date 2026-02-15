import { LocalRepository } from './LocalRepository';
import { SupabaseRepository } from './SupabaseRepository';
import { useSettingsStore } from '@/store/settingsStore';
import type { IDataRepository } from './types';

const localRepo = new LocalRepository();
const supabaseRepo = new SupabaseRepository();

/**
 * Returns the active data repository based on user settings.
 */
export const getRepository = (): IDataRepository => {
  // Access settings directly from the store state
  // Note: This works even outside of React components/hooks
  const settings = useSettingsStore.getState();
  const provider = settings.storageProvider;

  if (provider === 'local') {
    return localRepo;
  }

  // Default to Supabase
  return supabaseRepo;
};
