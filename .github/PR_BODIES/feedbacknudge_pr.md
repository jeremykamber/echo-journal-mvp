This PR introduces a small exemplar refactor that standardizes how the app talks to external APIs and organizes business logic for the Feedback feature.

Summary of changes:
- Add `src/clients/supabaseClient.ts` (low-level Supabase client + helpers)
- Add `src/features/feedback/services/feedbackService.ts` (business logic for feedback)
- Add `src/features/feedback/hooks/useFeedbackNudge.ts` (hook that wraps mutation + UI flow)
- Add `src/providers/ServiceProvider.tsx` + `useServices()` for DI
- Wire `QueryClientProvider` in `src/main.tsx` and add `src/lib/queryClient.ts`
- Add Vitest config + tests for service, client and hook; make tests deterministic
- Add minimal CI workflow to run tests on PR

Why this PR:
- Establishes a clear pattern (Clients -> Services -> Hooks -> Components) and DI via Providers so future features are easier to test and swap implementations.

Testing & verification checklist:
- Run `bun install` and `bun run test -- --run` locally — all tests should pass.
- Manually verify FeedbackNudge behavior in the app: nudge displays, emoji submission works, follow-up for 😞 works, and analytics events fire as before.

Follow-ups (planned in separate PRs):
- Sweep repository to replace direct Supabase SDK client creation with the shared client in `src/clients/`
- Remove deprecated functions in `src/services/supabaseService.ts` after migration
- Expand test coverage for edge-case failure modes and CI integration

This PR is intentionally small and focused to make the pattern reviewable and to allow iterative rollouts for additional features.
