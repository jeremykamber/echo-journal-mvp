/**
 * Shared types for the application
 */

// Error type for handling errors across service
export class SupabaseError extends Error {
    constructor(
        message: string,
        public originalError?: any,
    ) {
        super(message);
        this.name = "SupabaseError";
    }
}

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    is_beta_user: boolean;
    created_at: string;
    last_seen_at: string;
    avatar_url?: string;
}