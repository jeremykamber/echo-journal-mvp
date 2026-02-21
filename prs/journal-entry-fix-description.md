## Summary

This PR fixes the issue where journal entries were not being saved to the Supabase database after successful authentication.

## Root Cause

The primary issue was that the complete database schema defined in `src/create-supabase-schema.sql` had not been applied to the Supabase project. Without the required tables (`journal_entries`, `users`, `threads`, etc.), insert operations would fail silently or with errors.

## Changes Made

### Code Fix: Date Format Correction
- **File**: `src/services/journal/JournalService.ts`
- **Change**: Modified `createJournalEntry` and `updateJournalEntry` methods to format the `date` field as `DATE` type (YYYY-MM-DD) instead of full ISO datetime string
- **Reason**: Supabase schema defines `journal_entries.date` as `DATE` type, but code was passing full datetime strings

### Required User Action: Apply Database Schema
To complete the fix, you must apply the database schema:

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy the contents of `src/create-supabase-schema.sql`
4. Execute the SQL to create all tables, indexes, triggers, and RLS policies

## Testing

After applying the schema:
1. Restart the application
2. Log in with an existing or new account
3. Create a new journal entry
4. Verify the entry appears in Supabase Dashboard → Table Editor → `journal_entries`
5. Check that the `date` field is stored as a proper DATE value

## Technical Details

- **Date Handling**: Now properly formats dates using `new Date(entry.date).toISOString().split('T')[0]` to match Supabase DATE column
- **Schema Dependencies**: The `journal_entries` table references `users(id)`, so both tables must exist
- **RLS Policies**: Row Level Security ensures users can only access their own entries
- **Encryption**: Continues to work as before, conditionally encrypting title/content based on user settings

## Verification Checklist

- [ ] Database schema applied successfully
- [ ] `journal_entries` table exists with correct structure
- [ ] `users` table exists for user profiles
- [ ] Journal entry creation works after login
- [ ] Date field stores as DATE type
- [ ] No console errors during entry creation
- [ ] Entry appears in Supabase dashboard

## Links

- Research: `thoughts/research/2026-02-20-1200-journal-entry-save-fix.md`
- Plan: `thoughts/plans/2026-02-20-1200-journal-entry-save-fix.md`</content>
<parameter name="filePath">./prs/journal-entry-fix-description.md