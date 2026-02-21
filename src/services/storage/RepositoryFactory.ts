import { LocalRepository } from './LocalRepository';
import { SupabaseRepository } from './SupabaseRepository';
import { useSettingsStore } from '@/store/settingsStore';
import type { IDataRepository } from './types';
import { AuthService } from '../auth/AuthService';
import { JournalService } from '../journal/JournalService';
import { ConversationService } from '../conversation/ConversationService';
import { FeedbackService } from '../feedback/FeedbackService';

const localRepo = new LocalRepository();

// Create service instances
const authService = new AuthService();
const journalService = new JournalService(authService);
const conversationService = new ConversationService(authService);
const feedbackService = new FeedbackService(authService);

const supabaseRepo = new SupabaseRepository(
  authService,
  journalService,
  conversationService,
  feedbackService,
);

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
