import { storageService } from './storageService';

export type SessionService = {
    ensureSessionId: () => Promise<string>;
    getSessionId: () => Promise<string | undefined>;
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
};

export function makeSessionService(): SessionService {
    return {
        async ensureSessionId() {
            let id = await storageService.getItem<string>('sessionId');
            if (!id) {
                id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
                await storageService.setItem('sessionId', id);
            }
            return id;
        },
        async getSessionId() {
            return (await storageService.getItem<string>('sessionId')) || undefined;
        },
        async getItem(key: string) {
            return await storageService.getItem<string>(key);
        },
        async setItem(key: string, value: string) {
            await storageService.setItem(key, value);
        },
        async removeItem(key: string) {
            await storageService.removeItem(key);
        },
    };
}

// Export a default singleton for modules that aren't wired through DI yet.
export const defaultSessionService = makeSessionService();

export default makeSessionService;
