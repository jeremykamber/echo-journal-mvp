# Supabase Reimplementation Plan

Date: 2026-02-20  
Time: 1200  
Topic: Detailed implementation plan for reimplementing Supabase functionality from monolithic service to modular services following SOLID and KISS principles.

## Overview

Based on the research in `thoughts/research/2026-02-20_Supabase_Integration_Documentation.md`, the current Supabase integration is monolithic in `src/services/supabaseService.ts`, which violates SOLID principles (e.g., Single Responsibility) and KISS by handling authentication, user management, journal entries, conversations, messages, stash, feedback, and encryption in one file. This plan proposes breaking it into modular services: an AuthService for authentication, domain-specific services (e.g., JournalService, ConversationService), and refactored repositories with dependency injection.

## Architecture Design

- **AuthService**: Handles all authentication operations (sign up, sign in, sign out, get user).
- **Domain Services**:
  - JournalService: Journal entries CRUD.
  - ConversationService: Threads and messages CRUD.
  - UserService: User profiles and settings.
  - FeedbackService: Stash and app feedback.
- **Repositories**: Refactored to use services via dependency injection, implementing IDataRepository.
- **Encryption**: Centralized in a utility, injected where needed.
- Follow SOLID: Interfaces for services, dependency inversion via injection.
- KISS: Simple, focused classes; avoid over-engineering.

## Phases

### Phase 1: Architecture Design and Planning
**Objective**: Design the modular architecture, define interfaces, and plan the refactoring without code changes.

**Steps**:
1. Define interfaces for AuthService, JournalService, ConversationService, UserService, FeedbackService.
2. Design dependency injection container or factory for services.
3. Plan how repositories will inject services.
4. Identify shared utilities (e.g., encryption, client creation).
5. Document class responsibilities and dependencies.

**Success Criteria**:
- All services have defined interfaces with clear methods.
- Dependency graph is acyclic and follows DIP.
- Plan covers all functionality from supabaseService.ts without gaps.

**Verification Checkboxes**:
- [ ] Interfaces defined for all services.
- [ ] Dependency injection plan documented.
- [ ] Shared utilities identified.
- [ ] No functionality gaps identified.

### Phase 2: Implement Auth Service
**Objective**: Extract authentication logic into a dedicated AuthService.

**Steps**:
1. Create `src/services/auth/AuthService.ts` implementing IAuthService.
2. Move auth-related functions from supabaseService.ts (signUp, signIn, signOut, getUser).
3. Inject Supabase client via constructor.
4. Update any direct auth calls to use AuthService.

**Success Criteria**:
- AuthService handles all auth operations without errors.
- No remaining auth logic in supabaseService.ts.
- Unit tests pass for auth methods.

**Verification Checkboxes**:
- [ ] AuthService created and implements interface.
- [ ] Auth functions moved and working.
- [ ] No auth logic in old service.
- [ ] Tests pass (create if needed).

### Phase 3: Implement Domain Services
**Objective**: Create domain-specific services for journal entries, conversations, users, and feedback.

**Steps**:
1. Create JournalService for journal entries CRUD.
2. Create ConversationService for threads and messages CRUD.
3. Create UserService for profiles and settings.
4. Create FeedbackService for stash and app feedback.
5. Each service injects AuthService and Supabase client.
6. Move corresponding functions from supabaseService.ts.

**Success Criteria**:
- Each domain service handles its operations independently.
- Services use AuthService for user checks.
- Encryption/decryption centralized and injected.

**Verification Checkboxes**:
- [ ] JournalService implemented and tested.
- [ ] ConversationService implemented and tested.
- [ ] UserService implemented and tested.
- [ ] FeedbackService implemented and tested.
- [ ] All services inject dependencies correctly.

### Phase 4: Repository Refactoring
**Objective**: Refactor SupabaseRepository to use the new modular services via dependency injection.

**Steps**:
1. Update SupabaseRepository constructor to inject services (AuthService, JournalService, etc.).
2. Refactor repository methods to delegate to appropriate services.
3. Ensure IDataRepository interface is still implemented.
4. Handle encryption at service level.

**Success Criteria**:
- Repository methods work without direct Supabase calls.
- IDataRepository contract maintained.
- No breaking changes to calling code.

**Verification Checkboxes**:
- [ ] Repository injects services.
- [ ] All methods refactored and working.
- [ ] Interface compliance verified.
- [ ] Integration tests pass.

### Phase 5: Remove Old Code
**Objective**: Remove the monolithic supabaseService.ts and clean up unused imports.

**Steps**:
1. Delete supabaseService.ts after confirming all functionality moved.
2. Remove unused imports from other files.
3. Update any remaining references to use new services.
4. Run lint and typecheck to ensure no errors.

**Success Criteria**:
- supabaseService.ts deleted without errors.
- No broken imports or references.
- Code compiles successfully.

**Verification Checkboxes**:
- [ ] supabaseService.ts deleted.
- [ ] Unused imports removed.
- [ ] No compilation errors.
- [ ] Lint and typecheck pass.

### Phase 6: UI Updates
**Objective**: Update UI components if needed to accommodate any changes (minimal expected).

**Steps**:
1. Check if repository interface changes affect UI.
2. Update any direct service calls in components.
3. Ensure auth flows use AuthService.
4. Test UI interactions.

**Success Criteria**:
- UI functions correctly with new architecture.
- No user-facing changes or regressions.

**Verification Checkboxes**:
- [ ] UI components updated if needed.
- [ ] Auth flows working.
- [ ] No regressions in functionality.

### Phase 7: Verification and Testing
**Objective**: Comprehensive testing to ensure the reimplementation works correctly.

**Steps**:
1. Run unit tests for all services and repositories.
2. Perform integration tests: create/update/delete entries, conversations, etc.
3. Test auth flows end-to-end.
4. Verify data persistence in Supabase.
5. Load testing for performance.
6. Check encryption/decryption works.

**Success Criteria**:
- All tests pass.
- Data saves correctly to Supabase.
- No functionality regressions.
- Performance maintained.

**Verification Checkboxes**:
- [ ] Unit tests pass.
- [ ] Integration tests pass.
- [ ] End-to-end auth tests pass.
- [ ] Data verified in Supabase.
- [ ] Performance benchmarks met.

## Risk Assessment
- **High Risk**: Dependency injection setup could introduce runtime errors if not configured properly.
- **Medium Risk**: Removing old code prematurely could break app if migration incomplete.
- **Low Risk**: UI changes are minimal.

## Timeline Estimate
- Phase 1: 1 day
- Phase 2: 1 day
- Phase 3: 2-3 days
- Phase 4: 1 day
- Phase 5: 0.5 day
- Phase 6: 0.5 day
- Phase 7: 2 days

## Resources Needed
- Development environment
- Supabase access for testing
- Code review
- Testing tools (Jest, etc.)

## Success Metrics
- 100% test coverage on new services.
- Zero runtime errors in production.
- Improved code maintainability (e.g., reduced file size, clear responsibilities).</content>
<parameter name="filePath">thoughts/plans/2026-02-20-1200-supabase-reimplementation.md