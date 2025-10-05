# Architecture & Conventions — echo-journal-mvp

Purpose
- Provide a single, concise source of truth describing how the app is organized, how responsibilities are divided, how dependencies are provided, and what the naming/file conventions are.
- Make it easy for contributors to add features, write tests, and follow the Dependency Inversion Principle and SOLID-friendly patterns.

High-level summary (one line)
- Clients (SDK wrappers) talk to External APIs; Services contain business logic and orchestrate clients; React Query handles canonical remote state and caching; Hooks orchestrate UI flows; Components render UI and read/write lightweight UI state in Zustand; Providers (Context) inject runtime implementations for DI.

Layer responsibilities
- External APIs
  - Third-party systems (Supabase, LLM providers, analytics, auth).

- Clients (preferred term — Client / previously called Adapters or Connectors)
  - Thin wrappers around SDKs/http calls.
  - Responsibilities: direct network calls, error normalization, DTO mapping.
  - Must NOT contain business rules or cross-system orchestration.
  - Naming: `*Client.ts` (e.g. `supabaseClient.ts`).

- Services
  - Domain and business logic: validation, enrichment, composition across clients, fallback/retry policies, telemetry calls, and transaction-like flows.
  - Services depend on Clients (injected) and return typed DTOs/Promises.
  - They are the primary unit to mock when testing higher layers.
  - Naming: `*Service.ts` (use `Service` consistently across the repo).

- React Query (or other query layer)
  - Responsible for canonical remote state: caching, invalidation, background refresh, and state reconciliation.
  - Hooks should wrap useQuery/useMutation and call Service functions.
  - Services do the work; React Query orchestrates and caches it.

- Hooks
  - Small, composable UI orchestration: call React Query, perform optimistic updates, update zustand for ephemeral UI state, and expose actions and state to components.
  - Accept injected service/client when appropriate for testing.
  - Naming: `use*`.

- Components
  - Pure rendering + event wiring. Components call hooks and render data returned by hooks.
  - Keep UI state (focus, open/closed) local or in zustand stores if shared.
  - Keep presentational components in `components/ui/`.

- Zustand stores (UI-only)
  - For frequently updated ephemeral state: dialogs, toasts, active ids, UI toggles.
  - Avoid storing canonical remote data in zustand — use React Query for that.
  - Naming: `*Store.ts` (e.g. `uiStore.ts`).

- Providers (Context mechanism)
  - Mechanism for Dependency Injection (ApiClientProvider, ServiceProvider, AuthProvider, AnalyticsProvider).
  - Provide implementations of Clients/Services for the app or tests.
  - Provider values should be referentially stable (memoized) to avoid wide re-renders.

Naming conventions
- File & folder names
  - Feature-first layout: `src/features/<feature>/{components,hooks,services,clients,tests}`.
  - Shared infra: `src/clients/`, `src/contexts/`, `src/stores/`, `src/lib/`.
- Suffixes / prefixes
  - Clients: `*Client.ts` (low-level API wrappers).
  - Services: `*Service.ts` (business logic).
  - Hooks: `use*`.
  - Stores: `*Store.ts`.
  - Providers: `*Provider.tsx`.
- Methods & interfaces
  - Service methods are verbs: `submitFeedback`, `listJournalEntries`.
  - Interfaces use names without `I` prefix: `FeedbackService` (or `FeedbackServiceInterface` if you prefer explicitness).

Dependency flow (who calls who)
- Component -> Hook
- Hook -> React Query mutation/query
- React Query -> Service function
- Service -> Client
- Client -> External API
- Provider supplies Client and/or Service implementations
- Component & Hook -> Zustand for UI-only state
- Hook/Service -> Analytics Provider for telemetry

Testing rules (what to mock at each layer)
- Component & Hook tests: mock Service (or provide a Provider with a mocked Service). Use React Testing Library + queryClient wrapper.
- Service tests: mock Clients (network layer) to assert business rules and side effects.
- Client tests: test mapping and error normalization using network fakes or integration tests.
- E2E: provide real or in-memory implementations for Clients, or run against test backends.

DI & testability patterns
- Prefer injecting dependencies via Providers for app runtime and helpers for tests.
- Hooks should accept optional overrides: `function useX({service = defaultService} = {})` — this lets tests inject mocks without manipulating global providers.
- Keep Providers shallow: they should construct services from clients and provide them on context.

Where to put business logic — explicit rule
- Business logic belongs in Services. Adapters/Clients must be pure wrappers. Hooks can contain UI-only logic (optimistic updates, UI validation), but any data validation or behavior that must be consistent across the app must be in Services.

Migration checklist (example: FeedbackNudge)
1. Create `src/features/feedback/clients/supabaseClient.ts` exposing `insertFeedback(payload)`.
2. Create `src/features/feedback/services/feedbackService.ts` exposing `submitFeedback(dto)` and implementing validation, enrichment, analytics calls, and calling `supabaseClient.insertFeedback`.
3. Add tests: unit test for `feedbackService` (mock client), unit tests for `supabaseClient` (network fakes), and hook/component tests for `useFeedbackNudge` and `FeedbackNudge` (mock `feedbackService`).
4. Extract UI orchestration to `src/features/feedback/hooks/useFeedbackNudge.ts` using a React Query mutation that calls `feedbackService.submitFeedback`.
5. Keep `FeedbackNudge.tsx` purely presentational — it calls the hook only.
6. Update `ServiceProvider` to provide `feedbackService` constructed from `supabaseClient`.
7. Acceptance: no UX regressions, tests added, PR < 300LOC where possible.

PR & review checklist for refactors
- Small, focused PRs (prefer multiple small PRs to one large one).
- Include unit tests for new services and clients.
- Add Storybook for visual UI components where possible.
- Manual smoke test steps included in the PR description.
- Update `docs/ARCHITECTURE_AND_CONVENTIONS.md` if any conventions were changed.

FAQ — quick answers
- "Why Clients + Services?" — Clients isolate SDK changes; Services own business rules; together they make swapping backends and testing trivial.
- "When to use Providers vs Zustand?" — Providers = DI for stable singletons; Zustand = UI-only state that changes frequently.
- "Where does React Query fit?" — React Query provides canonical remote state and cache; Services do the API work and are called by queries/mutations.

Appendix: Quick file map example
- src/
  - features/
    - feedback/
      - components/FeedbackNudge.tsx
      - hooks/useFeedbackNudge.ts
      - services/feedbackService.ts
      - clients/supabaseClient.ts
      - tests/
  - clients/
    - supabaseClient.ts
  - providers/
    - ServiceProvider.tsx
  - stores/
    - uiStore.ts
  - lib/
    - analytics.ts

If you'd like, I can:
- Generate a CONTRIBUTING.md snippet that enforces these rules,
- Produce a small PR plan for renaming existing files (safe, reversible),
- Scaffold the exact `feedbackService` + `supabaseClient` files as a concrete exemplar (with tests),
- Or convert this document into a linting/PR checklist for maintainers.

