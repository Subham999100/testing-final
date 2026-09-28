# Architecture Guide — Platform Super Admin Module

## 1. System Topology & Domain Hierarchy

The Clyptus platform is designed as an enterprise multi-tenant recruitment ecosystem:

```text
                        PLATFORM TIER
                 ┌─────────────────────────┐
                 │  Platform Super Admin   │ (Highest platform authority)
                 └────────────┬────────────┘
                              │
                 ┌────────────▼────────────┐
                 │     Platform Admin      │ (Delegated permissions)
                 └────────────┬────────────┘
                              │
                    TOKEN LEDGER & ECONOMY
                              │
                 ORGANISATION TENANT BOUNDARY
                 ┌────────────▼────────────┐
                 │      Organisations      │
                 │ ┌─────────────────────┐ │
                 │ │ Org Super Admin     │ │
                 │ ├─────────────────────┤ │
                 │ │ Org Admin           │ │
                 │ ├─────────────────────┤ │
                 │ │ Recruiter           │ │
                 │ └─────────────────────┘ │
                 └────────────┬────────────┘
                              │
                    CANDIDATE ECOSYSTEM
                 ┌────────────▼────────────┐
                 │       Candidates        │
                 └─────────────────────────┘
```

---

## 2. Core Architectural Pillars

### 2.1 Multi-Tenant Safety & Server-Side Identity
- **Never trust client-submitted identity**: The authenticated actor ID, role, and tenant context are resolved strictly server-side by `JwtAuthGuard` and attached to `req.user`.
- **Tenant Isolation**: Platform Super Admin endpoints exist strictly on `/api/v1/platform/*` and are guarded by `RolesGuard` and `PermissionsGuard`. Non-platform roles (e.g. `ORGANISATION_ADMIN`, `RECRUITER`, `CANDIDATE`) are forbidden unconditionally.

### 2.2 Immutable Token Ledger
- Balances are never adjusted arbitrarily without an audit ledger transaction.
- Adjustments occur in an atomic database transaction (`$transaction`), updating `OrganisationTokenBalance` and inserting an immutable `TokenTransaction` record simultaneously.
- Debits that would result in a negative balance are rejected with `BadRequestException`.

### 2.3 Centralized Audit Logging
- Every destructive or mutating administrative operation records an audit entry through `AuditService.record()` or via the `@Audited` decorator with `AuditInterceptor`.
- Passwords, authorization tokens, payment secrets, and credentials are automatically redacted recursively prior to database persistence.

### 2.4 Loose Coupling with Integration Adapters
- External infrastructure systems (Redis, BullMQ, OpenSearch, AWS S3/Cloudflare R2, Razorpay/Stripe, Google Gemini AI, Email, Observability) are abstracted through service interfaces in `src/integrations/`.
- Each integration adapter features documented interfaces and `TODO(INTEGRATION)` markers for seamless enterprise connectivity.
