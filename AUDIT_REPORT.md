# Clyptus Job Portal — Comprehensive Engineering & Security Audit Report

**Date:** October 12, 2026  
**Auditor:** Senior Software Engineer (Pair Programming Agent)  
**Repository Branch:** `hema-candidate` (`testing-final`)  
**Scope:** Architecture, Code Quality, Security, Dependencies, Testing, Performance, Operations, Documentation (READ-ONLY Audit)

---

## 1. Executive Summary

The Clyptus Job Portal is a sophisticated, enterprise-grade multi-tenant recruitment and candidate management platform built on NestJS, Prisma ORM, PostgreSQL, React 18, and Vite. The codebase exhibits exemplary database design, robust multi-tenant authorization guards (`JwtAuthGuard`, `OrgGuard`, `OrgPerms`), strong transactional integrity, and comprehensive unit/flow test suites (45 backend suites with 355 passing tests; 20 frontend test files with 108 passing tests). However, the system currently displays pre-launch readiness gaps: several core enterprise integrations (BullMQ, Redis, SMTP email, payments) are mocked with placeholder loggers, blocking operations run synchronously in HTTP loops, and high-concurrency requests execute redundant database round-trips during guard evaluation. Addressing external queue offloading, security dependencies, and frontend component modularization is essential before production deployment.

**Overall System Health Score:** **7.8 / 10**

---

## 2. Project Context & Repository Map

### Project Profile
- **Purpose:** Enterprise multi-tenant Applicant Tracking System (ATS), Recruiter Workspace, Platform Administration, and Candidate Job Portal with global resume discovery and token monetization.
- **Tech Stack:**
  - **Backend:** Node.js 24, TypeScript 5.7, NestJS 10.4, Prisma ORM 6.4, PostgreSQL 15/16 (with `pg_trgm` and GIN indexing), Socket.IO.
  - **Frontend:** React 18.3, TypeScript 5.7, Vite 6.4, Tailwind CSS 3.4, TanStack React Query 5.66, Zustand, Axios, Lucide React.
  - **Infra/Services:** Docker Compose (PostgreSQL on port 5434), Local Vault & S3 storage adapters, Nodemailer, BullMQ (adapter contract).
- **Stage:** Pre-launch Enterprise Release Candidate.
- **Audit Priority:** Security, Scalability, High-Throughput Performance, Pre-Launch Readiness.

### Repository Map & Data Flow
```
candidate-main/testing-final/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma              # 25+ models, composite keys, Gin trgm indexes
│   │   ├── migrations/                # 13 verified idempotent SQL migrations
│   │   └── seed-org.ts                # Org & recruiter seed script
│   ├── src/
│   │   ├── common/                    # JwtAuthGuard, RolesGuard, RateLimiterGuard, HttpExceptionFilter
│   │   ├── config/                    # configuration.ts (central env loader)
│   │   ├── database/                  # PrismaService with connection pooling
│   │   ├── integrations/              # Storage, Email, Redis, BullMQ, AI, Payments (Adapters)
│   │   ├── modules/
│   │   │   ├── platform/              # Platform Super Admin (tenants, tokens, audit, monitoring)
│   │   │   ├── org/                   # Recruiter/ATS Portal (jobs, candidates, applications, outreach)
│   │   │   ├── candidate/             # Candidate Portal (auth, profile, resume, applications)
│   │   │   └── audit/                 # Central tamper-evident audit logging
│   │   └── main.ts                    # Bootstrap, CSP headers, CORS, ValidationPipe, Swagger
│   └── test/                          # e2e tests (org-portal.e2e-spec.ts)
├── frontend/
│   ├── src/
│   │   ├── portals/candidate/         # B2C Candidate Portal (Auth, Jobs, Resume, Profile)
│   │   ├── portals/org/               # Recruiter ATS Portal (Pipelines, Search, Outreach)
│   │   ├── pages/platform/            # Super Admin Operations & Governance
│   │   └── services/                  # Shared API client and session management
├── docker/                            # Docker Compose configuration (PostgreSQL)
├── docs/                              # Architecture, Candidate Portal, and API documentation
└── .github/workflows/ci.yml           # GitHub Actions CI matrix
```

---

## 3. Findings Table

| ID | Area | Severity | File:Line | Issue | Recommended Fix | Effort |
| :--- | :--- | :---: | :--- | :--- | :--- | :---: |
| **SEC-01** | Security | **High** | `backend/src/main.ts:52-57` | Hardcoded `http://localhost:*` origins are unconditionally appended to CORS allowed origins even in production. | Wrap localhost origins inside `if (!isProduction)` to ensure production uses strict origins. | **S** |
| **ARC-01** | Architecture | **High** | `backend/src/integrations/bullmq/bullmq.service.ts:5-40`<br>`backend/src/modules/org/recruiter/outreach.service.ts:185-225` | BullMQ worker is a stub logger (`[TODO: BULLMQ DISPATCH]`), causing bulk emailing and candidate indexing to run synchronously inside HTTP requests. | Connect real Redis connection to BullMQ and dispatch email/indexing jobs asynchronously. | **L** |
| **PRF-01** | Performance | **High** | `backend/src/modules/org/common/org-context.ts:70-83`<br>`backend/src/common/guards/jwt-auth.guard.ts:53-60` | Every authenticated organisation HTTP request executes 4 database round-trips during guard evaluation (`platform_sessions`, `org_member_profiles`, `users`, `organisations`). | Cache validated session tokens and resolved `OrgContext` in Redis with 5-minute TTL and event invalidation. | **M** |
| **DEP-01** | Dependencies | **High** | `backend/package.json:35-37`<br>`frontend/package.json:20-25` | 68 backend vulnerabilities (1 Critical `handlebars`, 43 High `multer`, `lodash`, `deepmerge-ts`) and 16 frontend vulnerabilities (2 Critical `tinypool`). | Run targeted dependency upgrades (`npm audit fix` and pin safe major/minor versions). | **M** |
| **PRF-02** | Performance | **Medium** | `backend/src/modules/org/hiring/applications.service.ts:534-541` | `bulkMove()` executes stage migrations sequentially in a `for` loop, causing N round-trips for batch updates. | Implement batch stage updates in a single SQL update/transaction with aggregated history insertion. | **S** |
| **DOC-01** | Documentation | **Medium** | `INSTRUCTION.md:5-8, 22-23, 47-50` | Setup guide contains markdown formatting syntax errors, wrong Swagger URL (`/api` vs `/api/docs`), and omits platform seed step. | Fix markdown blocks, update Swagger path to `/api/docs`, and insert `npx prisma db seed` before `seed:org`. | **S** |
| **OPS-01** | Reliability / CI | **Medium** | `.github/workflows/ci.yml:39, 43-57` | CI skips concurrency integration tests (`--testPathIgnorePatterns real-concurrency`) and omits running frontend test suite (`npm test`). | Add a dedicated service container for concurrency testing and invoke `vitest run` in the frontend CI job. | **S** |
| **CQ-01** | Code Quality | **Medium** | `frontend/src/portals/org/recruiter/SearchPage.tsx:1-2064`<br>`frontend/src/portals/org/recruiter/AdvancedSearchPage.tsx:1-1154` | Monolithic components exceed 2,000 lines with duplicated filter state, query parameter synchronization, and styling. | Extract filter sidebars, chip groups, and search cards into modular reusable components. | **L** |
| **ARC-02** | Architecture | **Medium** | `backend/src/integrations/email/email.service.ts:5-35` | Platform `EmailService` logs to console rather than delivering emails, leaving invitation and verification links unsendable in staging. | Wire `nodemailer` transporter (already installed in dependencies) reading `SMTP_*` environment variables. | **S** |
| **SEC-02** | Security | **Low** | `backend/src/modules/org/workspace/workspace.service.ts:16-22` | Secret encryption key falls back to `dev-only:${process.env.JWT_SECRET || 'clyptus'}` when `ORG_SECRETS_KEY` is omitted in development. | Require an explicit 32-character key or generate a cryptographically random ephemeral key with a startup warning. | **S** |
| **CQ-02** | Code Quality | **Low** | `backend/package.json:15` | `npm run lint` fails with `'eslint' is not recognized` because ESLint is not installed in devDependencies. | Install `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, and `eslint` in backend devDependencies. | **S** |
| **OPS-02** | Operations | **Low** | `docker/docker-compose.yml:1-26` | Docker Compose only runs PostgreSQL; local developers must manually configure Redis and storage endpoints. | Provide optional docker-compose service definitions for Redis and MinIO (local S3). | **M** |

---

## 4. Detailed Audit Findings by Area

### Area 1: Architecture & System Design
- **Separation of Concerns:** The backend cleanly separates Platform Administration (`/api/v1/platform`), Recruiter ATS (`/api/v1/org`), and Candidate Portal (`/api/v1/candidate`). Each has its own dedicated controllers, services, guards, and DTOs.
- **Data Flow & Dual Candidate Model:** Candidate identities exist at the platform level (`candidate_profiles`), while organization-specific application and pipeline records exist in `candidates` (`organisationId` scoped). The bridging mechanism (`getOrCreateCandidateBridge`) successfully decouples applicant data from recruiter discovery while preventing data leakage.
- **Integration Layer Bottleneck:** `backend/src/integrations/` exposes clean TypeScript interfaces (`BullMQService`, `RedisService`, `EmailService`, `PaymentGatewayService`, `OpenSearchService`, `GeminiService`), but currently acts as a mock/stub layer. High-throughput operations (e.g. bulk email sending in `outreach.service.ts:185`) run synchronously inside HTTP threads, posing thread-pool exhaustion risks under load.
- **Frontend Modularity:** Candidate Portal and Recruiter Portal maintain independent `api.ts`, `session.ts`, and `queryKeys.ts` clients. While this cleanly prevents multi-tab session pollution, `SearchPage.tsx` (2,064 lines) and `AdvancedSearchPage.tsx` (1,154 lines) suffer from monolithic design and filter duplication.

### Area 2: Code Quality & Maintainability
- **Error Handling:** `HttpExceptionFilter` (`backend/src/common/filters/http-exception.filter.ts:47-52`) is exceptionally well-crafted. It catches all unhandled exceptions, logs full stack traces internally, and delivers standardized, sanitized error payloads (`PLATFORM_SYSTEM_ERROR`) to clients without leaking raw SQL or schema internals.
- **Input Validation:** Global `ValidationPipe` (`backend/src/main.ts:68-76`) is enabled with `whitelist: true`, `forbidNonWhitelisted: true`, and `transform: true`. All controller endpoints strictly declare validated DTOs.
- **TODO/FIXME Debt:** Zero `FIXME` comments exist in the codebase. All `TODO` markers are confined to documented integration adapter placeholders (`TODO(INTEGRATION)` in `backend/src/integrations/`).
- **Complexity Hotspots:**
  - `frontend/src/portals/org/recruiter/SearchPage.tsx` (2,064 lines)
  - `frontend/src/portals/org/recruiter/AdvancedSearchPage.tsx` (1,154 lines)
  - `backend/src/modules/org/recruiter/recruiter.service.ts` (909 lines)

### Area 3: Security & Governance
- **Authentication & JWT Perimeter:**
  - Standard bcrypt work factor of 12 used for passwords (`candidate-auth.service.ts:118`).
  - Active session verification via `platform_sessions` table (`jwt-auth.guard.ts:53-73`), enabling instant token revocation.
  - JWT tokens are hashed with SHA-256 (`tokenHash`) before database storage to prevent token theft via database dumps.
- **Authorization & Multi-Tenancy:**
  - Strict tenant scoping enforced in `OrgGuard` (`org-context.ts:74-83`), verifying active member status and organisation state.
  - Organization data is strictly filtered by `ctx.organisationId`.
  - Recruiter Global Talent Search enforces server-side masking: `email`, `phone`, `resumeUrl`, and `resumeText` are completely removed from JSON responses, and `lastName` is masked to an initial until unlocked.
- **SQL Injection:**
  - Dynamic SQL in `recruiter.service.ts:250-320` strictly uses `Prisma.sql` tagged template literals with parameter bindings, eliminating raw string concatenation and SQL injection vectors.
  - Zero usages of `$queryRawUnsafe` or `$executeRawUnsafe` exist in the repository.
- **Security Headers & CORS:**
  - Native security headers configured in `main.ts:30-40`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, and CSP.
  - **Identified Risk:** In `main.ts:52-57`, `localhost` development ports are hardcoded into the allowed CORS origin list regardless of `NODE_ENV`.

### Area 4: Dependencies & Licensing
- **Backend Vulnerabilities:** `npm audit` reports 68 vulnerabilities (1 Critical, 43 High, 20 Moderate, 4 Low).
  - Critical: `handlebars` (AST type confusion code injection via nested dev tooling).
  - High: `multer <=2.2.0` (DoS via unhandled file stream aborts), `lodash <=4.17.23` (prototype pollution in CLI dependencies), `deepmerge-ts` (stack exhaustion).
- **Frontend Vulnerabilities:** `npm audit` reports 16 vulnerabilities (2 Critical, 7 High, 7 Moderate).
  - Critical: `tinypool <=2.1.1` (prototype pollution gadget in worker options).
  - High: `braces` / `chokidar` (ReDoS/DoS).
- **Package Pinning:** In `backend/package.json`, only `pdf-parse: "1.1.1"` and `mammoth: "1.13.0"` are pinned with exact versions; remaining dependencies use caret `^` ranges.

### Area 5: Testing Quality & Coverage
- **Backend Test Suite:** 45 test suites containing 355 tests pass cleanly in 16.54s (`exit code 0`).
  - Thorough coverage of RBAC permissions, token concurrency, resume parsing, multi-tenancy isolation, and global search masking.
- **Frontend Test Suite:** 20 test files containing 108 tests pass cleanly in 41.14s (`vitest run`, `exit code 0`).
  - Tests cover applicant workflows, recruiter filters, INR salary conversions, and modal dialogs.
- **Test Pipeline Gaps:**
  - In `.github/workflows/ci.yml:39`, `--testPathIgnorePatterns real-concurrency` skips concurrency verification in CI.
  - In `.github/workflows/ci.yml:43-57`, the frontend workflow runs `typecheck` and `build`, but completely omits running `npm test`.

### Area 6: Performance & Scalability
- **Guard Query Overhead:** `JwtAuthGuard` executes 1 DB query (`platformSession`), and `OrgGuard` executes 3 DB queries (`orgMemberProfile`, `user`, `organisation`). Consequently, 4 database queries occur on every single organisation request before controller logic begins.
- **Database Indexing:**
  - GIN trigram index on `candidate_profiles.searchableText` enables fast substring search across 100k+ profiles.
  - GIN array index on `candidate_profiles.skills`.
  - Composite unique indexes on `applications(jobId, candidateId)` and `candidates(organisationId, userId)`.
- **Bulk Stage Migration:** `bulkMove()` in `applications.service.ts:534` iterates sequentially over candidate IDs rather than utilizing batch updates.

### Area 7: Reliability & Operations
- **Database Migrations:** 13 migrations are present and ordered. Both `clyptus_migration_test` and `clyptus_unified_dev` match `schema.prisma` with zero drift (`prisma migrate diff` confirmed clean).
- **Audit Logging:** Every administrative, auth, and candidate discovery action writes structured records to `audit_logs` with automated metadata sanitization (`audit.service.ts:266`).
- **Environment Handling:** `configuration.ts` enforces `JWT_SECRET` length (>= 32 characters) in production and blocks placeholder strings.

### Area 8: Documentation & Setup
- **API Documentation:** Swagger / OpenAPI is properly initialized at `/api/docs` with bearer token auth.
- **Documentation Discrepancies:**
  - `INSTRUCTION.md` contains broken markdown formatting (lines 5, 8, 50).
  - `INSTRUCTION.md` lists Swagger UI at `http://localhost:3000/api` instead of `http://localhost:3000/api/docs`.
  - Setup instructions omit the prerequisite `npx prisma db seed` required before running `npm run seed:org`.

---

## 5. Top 10 Prioritized Actions

1. **[SEC-01] Restrict Production CORS Origins:** Update `backend/src/main.ts:52-57` to only include localhost origins when `process.env.NODE_ENV !== 'production'`.
2. **[DEP-01] Remediate Critical & High Vulnerabilities:** Upgrade `handlebars`, `multer`, `lodash`, and frontend `tinypool`/`vitest` dependencies to eliminate known CVEs.
3. **[ARC-01] Implement Asynchronous Queue for Bulk Outreach:** Connect BullMQ with Redis to offload bulk email sending (`outreach.service.ts`) from HTTP request loops.
4. **[PRF-01] Implement Redis Caching for Guard Contexts:** Cache validated `platform_sessions` and `OrgContext` in Redis to eliminate 4 DB round-trips per HTTP request.
5. **[ARC-02] Wire Production SMTP Transporter:** Replace dummy logger in `backend/src/integrations/email/email.service.ts` with real Nodemailer transport using configured SMTP credentials.
6. **[OPS-01] Add Frontend Tests to CI:** Add `npm test` step to `.github/workflows/ci.yml` frontend job and re-enable concurrency tests in backend CI.
7. **[DOC-01] Fix Setup Guide (`INSTRUCTION.md`):** Correct markdown typos, update Swagger URL to `/api/docs`, and document `npx prisma db seed` requirement.
8. **[PRF-02] Optimize Application Bulk Moves:** Refactor `applications.service.ts:bulkMove` from sequential loops to batch SQL transactions.
9. **[CQ-01] Refactor Monolithic Search Components:** Modularize `frontend/src/portals/org/recruiter/SearchPage.tsx` into reusable filter and candidate card sub-components.
10. **[CQ-02] Fix Backend Linting Script:** Add ESLint packages to `backend/package.json` devDependencies so `npm run lint` executes in local development.

---

## 6. Quick Wins (< 1 Hour Each)

- **QW-1:** Wrap localhost CORS origins in `backend/src/main.ts` with `if (process.env.NODE_ENV !== 'production')`.
- **QW-2:** Correct formatting, Swagger URL (`/api/docs`), and seed command sequence in `INSTRUCTION.md`.
- **QW-3:** Add `npm test` step to `frontend` job in `.github/workflows/ci.yml`.
- **QW-4:** Install `eslint` and typescript plugins in `backend/package.json` to restore `npm run lint`.
- **QW-5:** Update `applications.service.ts:assign` to use `updateMany` for multi-candidate assignment.

---

## 7. Things Done Well

- **Database Integrity & Constraints:** Exceptional use of composite unique constraints (`[jobId, candidateId]`, `[organisationId, userId]`) and restrictive foreign keys (`onDelete: Restrict`) preventing duplicate applications and data corruption.
- **Privacy & Server-Side Data Masking:** Candidate contact information is strictly masked on the server side in global talent searches. Sensitive properties (`email`, `phone`, `resumeUrl`, `resumeText`) are excluded from JSON projections until an explicit, token-charged unlock occurs.
- **Safe SQL Query Construction:** Zero string concatenation in raw queries; dynamic filters in `recruiter.service.ts` use `Prisma.sql` parameterized fragments, eliminating SQL injection.
- **Exception Sanitization:** Global `HttpExceptionFilter` prevents internal database errors, query texts, or stack traces from ever leaking to API clients.
- **Token Economy Concurrency Protection:** Token transactions use atomic balance decrements, transaction logs, and idempotency keys, preventing double-spending during concurrent requests.
- **High Test Quality:** 355 unit/integration tests and 108 frontend tests pass with 0 failures, covering core business logic and regression paths.

---

## 8. Open Questions & Assessment Limits

- **Production Redis & BullMQ Configuration:** BullMQ and Redis services currently run as in-memory stubs. The exact production Redis cluster topology (standalone vs Redis Sentinel vs AWS ElastiCache) and retry backoff strategies could not be assessed because infrastructure manifests are not in the repository.
- **Production Storage Vault S3 Bucket IAM:** While the local storage vault and S3 adapter code were verified, production S3 bucket ACLs, KMS encryption keys, and presigned URL expiry settings reside in cloud provider configuration outside this repository.
- **Production Email Provider:** SMTP configuration in `.env.example` points to Mailtrap. Production transactional deliverability (DKIM, SPF, bounce handling) will depend on which external provider (AWS SES, SendGrid, Postmark) is chosen.
