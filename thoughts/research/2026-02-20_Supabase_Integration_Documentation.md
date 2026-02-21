# Supabase Integration Documentation

Date: 2026-02-20  
Topic: Current Supabase Integration in echo-journal-mvp, focusing on saving journal entries and conversations (convos) to the database.

## Overview

The echo-journal-mvp application integrates with Supabase as a cloud storage provider for user data, including journal entries, conversations (threads and messages), user profiles, settings, stash reflections, and feedback. This document details the relevant files, functions, and configurations involved in saving journal entries and convos to the Supabase database.

## Configurations

### Environment Variables
- **VITE_SUPABASE_URL**: The Supabase project URL, used in multiple client creations.
- **VITE_SUPABASE_ANON_KEY**: The anonymous/public key for Supabase, used in `supabaseService.ts`.
- **VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY**: Another public key variant, used in `clients/supabaseClient.ts`.
- **VITE_SUPABASE_PUBLISHABLE_OR_ANON_KEY**: Used in `lib/supabase/client.ts`.

### Supabase Client Instances
Multiple Supabase client instances are created across the codebase:

1. **src/clients/supabaseClient.ts**: Creates `supabaseClient` using `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`. Exports `supabase` for use in services.
2. **src/lib/supabase/client.ts**: Creates a client using `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_OR_ANON_KEY`.
3. **src/services/supabaseService.ts**: Uses the client from `src/clients/supabaseClient.ts` via import `{ supabase }`.

### Storage Provider Setting
In `src/store/settingsStore.ts`, the `storageProvider` setting defaults to `'supabase'`. When set to `'supabase'`, operations sync data to the cloud; otherwise, local storage (IndexedDB) is used.

## Database Schema Overview
Based on the code, the Supabase database includes tables such as:
- `users`: User profiles.
- `user_settings`: User-specific settings.
- `journal_entries`: Journal entries with title, content, date, encrypted if enabled.
- `threads`: Conversations, linked to users and optionally journal entries.
- `messages`: Messages within threads, with sender, text, timestamps, encryption.
- `stash`: Reflections stashed from journal entries or conversations.
- `reflections_feedback`: User feedback on reflections.
- `app_feedback`: General app feedback.

## Key Files for Journal Entries and Convos

### 1. src/services/supabaseService.ts
This is the primary service file containing all Supabase interaction functions. It handles authentication, user management, journal entries, threads, messages, stash, and feedback.

#### Journal Entry Functions
- **createJournalEntry(entry)**: Inserts a new journal entry into `journal_entries` table. Encrypts title and content if `enableEncryption` is true. Links to user via `user_id`, stores client-side ID as `external_id`. Returns the created entry with server ID.
- **getUserJournalEntries()**: Retrieves all journal entries for the current user, ordered by date descending. Decrypts encrypted fields. Maps DB fields to app's `JournalEntry` interface, preferring `external_id` for ID.
- **updateJournalEntry(entry)**: Updates an existing entry by finding via `external_id`. Encrypts updated title/content. Updates `updated_at`.
- **deleteJournalEntry(entryId)**: Deletes an entry by `external_id` or direct ID if not found.

#### Conversation (Thread) Functions
- **createThread(thread)**: Inserts a new thread into `threads` table. Encrypts title if enabled. Links to user and optionally a journal entry. Stores client ID as `external_id`. Updates `created_at` and `updated_at`.
- **getUserThreads()**: Retrieves all threads for the user, including messages for lastMessage. Decrypts titles and message texts. Maps to `Conversation` interface.
- **updateThread(threadId, updates)**: Updates thread title and `updated_at` by `external_id`.
- **deleteThread(threadId)**: Deletes thread by `external_id` or direct ID.

#### Message Functions (Part of Convos)
- **addMessage(message)**: Inserts a message into `messages` table. Encrypts text and reflectedContent if enabled. Links to thread and optionally journal entry. Stores client ID as `external_id`. Updates thread's `updated_at`.
- **getMessagesForThread(threadId)**: Retrieves all messages for a thread, ordered by `created_at`. Decrypts texts. Maps to `Message` interface.
- **updateMessage(messageId, updates)**: Updates message text or isRead, encrypts if needed. Updates thread's `updated_at` if text changed.

#### Encryption
- Uses `encryptText` and `decryptText` from `encryptionService.ts`.
- Checks `useSettingsStore.getState().enableEncryption` to decide encryption.
- Encrypted fields are prefixed (checked via `isEncrypted`).

### 2. src/services/storage/SupabaseRepository.ts
Implements `IDataRepository` interface, wrapping `supabaseService` functions for repository pattern.

#### Journal Entry Methods
- **getJournalEntries()**: Calls `supabaseService.getUserJournalEntries()`.
- **createJournalEntry(entry)**: Calls `supabaseService.createJournalEntry()` with client ID.
- **updateJournalEntry(entry)**: Calls `supabaseService.updateJournalEntry()`.
- **deleteJournalEntry(id)**: Calls `supabaseService.deleteJournalEntry()`.

#### Conversation Methods
- **getConversations()**: Calls `supabaseService.getUserThreads()`.
- **createConversation(conversation)**: Calls `supabaseService.createThread()` with ID and isGlobal.
- **updateConversation(conversation)**: Calls `supabaseService.updateThread()` with title.
- **deleteConversation(id)**: Calls `supabaseService.deleteThread()`.

#### Message Methods
- **getMessagesForConversation(conversationId)**: Calls `supabaseService.getMessagesForThread()`, maps to `ConversationMessage` type.
- **addMessageToConversation(message)**: Calls `supabaseService.addMessage()` mapping fields.
- **getMessagesForJournalEntry(entryId, threadId)**: Calls `supabaseService.getMessagesForThread()` for journal context.
- **addMessageToJournalEntry(message)**: Calls `supabaseService.addMessage()` with full message details.
- **updateMessage(messageId, content)**: Calls `supabaseService.updateMessage()`.

### 3. src/store/settingsStore.ts
Manages app settings, including `storageProvider`.
- Syncs settings to Supabase via `updateUserSettings()` and `getUserSettings()` when `storageProvider === 'supabase'`.
- Persists locally using Zustand with robustStorage.

### 4. src/clients/supabaseClient.ts
Creates and exports the main Supabase client.
- Also provides `insertAppFeedback()` for app feedback submissions.

### 5. src/lib/supabase/client.ts
Alternative client creation function, not directly used in the documented integration.

## Data Flow for Saving Journal Entries
1. User creates/edits a journal entry in the app.
2. If `storageProvider` is `'supabase'`, `SupabaseRepository.createJournalEntry()` or `updateJournalEntry()` is called.
3. This invokes `supabaseService.createJournalEntry()` or `updateJournalEntry()`.
4. The service authenticates the user via `supabase.auth.getUser()`.
5. Prepares data: encrypts if enabled, sets `user_id`, `external_id` (client ID), date in YYYY-MM-DD.
6. Inserts/updates into `journal_entries` table.
7. Returns the entry with server-generated fields.

## Data Flow for Saving Convos
1. User creates a conversation or adds messages.
2. For threads: `SupabaseRepository.createConversation()` calls `supabaseService.createThread()`.
3. Authenticates, prepares thread data (title encrypted, links to entry if applicable), inserts into `threads`.
4. For messages: `SupabaseRepository.addMessageToConversation()` calls `supabaseService.addMessage()`.
5. Authenticates, finds thread by `external_id`, inserts message with encrypted text, updates thread `updated_at`.

## Additional Notes
- All operations require user authentication; unauthenticated calls fail.
- Encryption is optional, controlled by `enableEncryption` setting.
- Client-side IDs are stored as `external_id` in DB for mapping.
- Auto-save features trigger EPRA orchestration and mem0 integration on creation.
- Feedback and stash are also saved but not the focus here.
- Local storage fallback exists when `storageProvider` is `'local'`.
