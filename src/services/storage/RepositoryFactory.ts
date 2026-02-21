import { LocalRepository } from './LocalRepository';
import { SupabaseRepository } from './SupabaseRepository';
import { useSettingsStore } from '@/store/settingsStore';
import type { IDataRepository } from './types';
import { AuthService } from '../auth/AuthService';
import { JournalService } from '../journal/JournalService';
import { ConversationService } from '../conversation/ConversationService';
import { FeedbackService } from '../feedback/FeedbackService';
import { UserService } from '../user/UserService';

const localRepo = new LocalRepository();

// Create service instances
export const authService = new AuthService();
export const journalService = new JournalService(authService);
export const conversationService = new ConversationService(authService);
export const feedbackService = new FeedbackService(authService);
export const userService = new UserService(authService);

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
