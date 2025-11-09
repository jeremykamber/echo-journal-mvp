export type SessionService = {
    ensureSessionId: () => string;
    getSessionId: () => string | undefined;
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
};

export function makeSessionService(): SessionService {
    return {
        ensureSessionId() {
            let id = localStorage.getItem('sessionId');
            if (!id) {
                id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
                localStorage.setItem('sessionId', id);
            }
            return id;
        },
        getSessionId() {
            return localStorage.getItem('sessionId') || undefined;
        },
        getItem(key: string) {
            return localStorage.getItem(key);
        },
        setItem(key: string, value: string) {
            localStorage.setItem(key, value);
        },
        removeItem(key: string) {
            localStorage.removeItem(key);
        },
    };
}

// Export a default singleton for modules that aren't wired through DI yet.
export const defaultSessionService = makeSessionService();

export default makeSessionService;
