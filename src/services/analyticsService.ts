import ReactGA from "react-ga4";

const GA_ENABLED = !!import.meta.env.VITE_GA_MEASUREMENT_ID;

/**
 * Tracks a custom event with Google Analytics.
 * Ensures user privacy by not sending content details.
 *
 * @param category - The category of the event (e.g., 'Engagement', 'Journal', 'AI').
 * @param action - The specific action taken (e.g., 'SendMessage', 'CreateEntry', 'ImportDocument').
 * @param label - Optional label for more context (e.g., 'NewConversation', 'ThemeChange'). Avoid PII.
 */
export const trackEvent = (category: string, action: string, label?: string) => {
    if (!GA_ENABLED) {
        // console.log(`Analytics disabled. Event not sent: ${category} - ${action} ${label ? `- ${label}` : ''}`);
        return;
    }

    try {
        ReactGA.event({
            category,
            action,
            label, // Keep labels generic, avoid user content
        });
        // console.log(`GA Event: ${category} - ${action} ${label ? `- ${label}` : ''}`);
    } catch (error) {
        console.error("Error sending GA event:", error);
    }
};

// Example specific event tracking functions (optional but helpful)

export const trackNewConversation = () => {
    trackEvent('AI', 'StartConversation', 'New');
};

export const trackSendMessage = () => {
    trackEvent('AI', 'SendMessage');
};

export const trackCreateEntry = () => {
    trackEvent('Journal', 'CreateEntry');
};

export const trackImportDocument = (fileType: string) => {
    // Only track the type, not the content or filename
    trackEvent('Journal', 'ImportDocument', `FileType: ${fileType}`);
};

export const trackDeleteEntry = () => {
    trackEvent('Journal', 'DeleteEntry');
};

export const trackDeleteConversation = () => {
    trackEvent('AI', 'DeleteConversation');
};

export const trackSettingsChange = (settingName: string) => {
    // Track which setting was changed, but not the value
    trackEvent('Settings', 'ChangeSetting', `Setting: ${settingName}`);
};

/**
 * Track when a reflection process starts
 * @param source - The source of the reflection (e.g., 'Journal', 'Conversation')
 */
export const trackStartReflection = (source: string) => {
    trackEvent('AI', 'start_reflection', `Source: ${source}`);
};

/**
 * Track when a reflection process completes
 * @param source - The source of the reflection (e.g., 'Journal', 'Conversation')
 * @param durationMs - Optional duration in milliseconds
 */
export const trackCompletedReflection = (source: string, durationMs?: number) => {
    trackEvent('AI', 'completed_reflection', `Source: ${source}${durationMs ? `, Duration: ${durationMs}ms` : ''}`);
};

/**
 * Track when a user submits feedback
 * @param feedbackType - Type of feedback (e.g., 'General', 'Bug', 'Feature')
 */
export const trackGaveFeedback = (feedbackType?: string) => {
    trackEvent('Engagement', 'gave_feedback', feedbackType);
};

/**
 * Track when a user gives feedback on a reflection
 * @param feedbackType - Either 'like' or 'dislike'
 * @param source - Where the reaction came from (e.g., 'Journal', 'Conversation')
 * @param reflectionType - The type of reflection ('chat-response' or 'realtime-reflection')
 */
export const trackReflectionReaction = (
    feedbackType: 'like' | 'dislike',
    source: string,
    reflectionType?: 'chat-response' | 'realtime-reflection'
) => {
    trackEvent('AI', 'reflection_reaction',
        `Type: ${feedbackType}, Source: ${source}${reflectionType ? `, ReflectionType: ${reflectionType}` : ''}`
    );
};

/**
 * Track when a user submits their email (e.g., newsletter signup)
 * @param source - Where the email was submitted from (e.g., 'Mailing List', 'Onboarding')
 */
export const trackEmailSubmitted = () => {
    trackEvent('Engagement', 'EmailSubmitted');
};

/**
 * Track app satisfaction feedback with emoji rating
 * 
 * @param emoji The emoji rating selected by the user
 */
export const trackAppSatisfactionFeedback = (emoji: string) => {
    trackEvent('Feedback', 'AppSatisfactionRating', emoji);
};

/**
 * Track additional text feedback submitted after negative emoji rating
 * 
 * @param feedbackLength Length of the feedback provided (don't send actual content)
 */
export const trackAppSatisfactionDetailedFeedback = (feedbackLength: number) => {
    trackEvent('Feedback', 'AppSatisfactionDetailedFeedback', `Length: ${feedbackLength}`);
};
