
/**
 * This file serves as a central point for analytics functions across the application.
 * It re-exports all functions from the analytics service for easier imports.
 */
import {
    trackEvent,
    trackNewConversation,
    trackSendMessage,
    trackCreateEntry,
    trackImportDocument,
    trackDeleteEntry,
    trackDeleteConversation,
    trackSettingsChange,
    trackStartReflection,
    trackCompletedReflection,
    trackGaveFeedback,
    trackEmailSubmitted
} from '@/services/analyticsService';

export {
    trackEvent,
    trackNewConversation,
    trackSendMessage,
    trackCreateEntry,
    trackImportDocument,
    trackDeleteEntry,
    trackDeleteConversation,
    trackSettingsChange,
    trackStartReflection,
    trackCompletedReflection,
    trackGaveFeedback,
    trackEmailSubmitted
};

/**
 * Initialize any analytics providers here
 */
export const initializeAnalytics = () => {
    // Any initialization code can go here if needed in the future
    // This provides a single point to initialize all analytics services
};