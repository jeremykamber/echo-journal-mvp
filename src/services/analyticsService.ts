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
