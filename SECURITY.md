# Security Assessment & Posture

## Overview
This document outlines the security posture of the Echo Journal application, identifying potential vulnerabilities and their mitigations.

## OWASP Top 10 Assessment (2025)

### 1. Broken Access Control
*   **Status**: Good.
*   **Implementation**: Application relies on Supabase Row Level Security (RLS). Client-side code consistently filters by `user_id`, preventing accidental data leakage in the UI.
*   **Recommendation**: Ensure Supabase RLS policies strictly enforce `auth.uid() = user_id` for `journal_entries`, `stash`, and `conversations`.

### 2. Cryptographic Failures
*   **Status**: IMPROVED.
*   **Identification**: Previously, sensitive journal data was stored in plain text in the Cloud (Supabase).
*   **Mitigation**: Implemented **End-to-End Encryption (E2EE)** (AES-GCM-256) for `journal_entries` and `stash`. This ensures that even if the database is compromised, the content remains unreadable without the user's session password.
*   **Note**: Metadata (dates, tags) is not encrypted to facilitate indexing and search.

### 3. Injection
*   **Status**: Low Risk.
*   **Implementation**: The application uses the Supabase (PostgREST) client library, which handles parameterization and prevents SQL injection.

### 4. Insecure Design
*   **Status**: Moderate.
*   **Risk**: The use of Cloud LLMs (OpenRouter) requires sending plain text data to third-party providers. This is inherent to the features but constitutes a data privacy risk.
*   **Mitigation**: Users can opt for **Local LLM (WebLLM)** mode (Epic 1) to keep inference privacy-preserving.

### 5. Security Misconfiguration
*   **Status**: Low Risk.
*   **Risk**: Exposure of Supabase Anon Key is standard but requires robust RLS.
*   **Check**: Ensure `mem0` proxy (if deployed) is secured and not publicly accessible without authentication.

### 6. Vulnerable and Outdated Components
*   **Status**: Ongoing.
*   **Recommendation**: Regularly run `npm audit` to identify and patch vulnerable dependencies.

### 7. Identification and Authentication Failures
*   **Status**: Good.
*   **Implementation**: Supabase Auth handles identity management, reducing the risk of custom auth bugs.

### 8. Software and Data Integrity Failures
*   **Status**: Low Risk.
*   **Implementation**: WebLLM verifies model integrity via hashes.

### 9. Security Logging and Monitoring
*   **Status**: Needs Attention.
*   **Risk**: Ensure no PII or Encryption Passwords are logged to the console or analytics services. The current E2EE implementation is careful not to log keys.

### 10. Server-Side Request Forgery (SSRF)
*   **Status**: Low Risk.
*   **Description**: Client-side application makes direct requests; no vulnerable server-side proxy identified (unless `mem0` proxy is used insecurely).

## Security Features Implemented
*   **Client-Side Zero-Knowledge Encryption**: AES-GCM encryption for journal content and stash. Encrypted data is prefixed with `::ENC::`.
*   **Session-Based Key Management**: Encryption keys are derived from a session password and are NOT stored on the server.
