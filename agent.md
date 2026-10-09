# agent.md — Working Context for AI Agents

> Read this file first on every prompt. Update it at the end of every piece of work
> (status, decisions, new files, session log). Keep it short and factual.

Last updated: 2026-09-30 · State: **Org portal built + verified on real Postgres, on `feature/org-portal`, not committed**

---

## 1. User preferences (always apply)

- **Do not change existing code.** Add new modules/files. Allowed edits to existing files:
  one-line registrations (module import, route entry), additive Prisma schema changes,
  and dependency/script additions to package.json — always call these out first.
- **Simple, fast, reactive UI with light colours.** No over-engineering in any module.
- Don't commit, push, pull or switch branches unless asked.
- Master spec: "Organization Portal" prompt. Codebase wins for conventions; spec wins for
  security rules; "keep it simple" wins over spec extras (see §6).

## 2. Repo & git state

- Remote: https://github.com/Clyptus-Soft/Clyptus-software-solutions-job-portal
- Local clone: `Desktop/clyptus job portal/Clyptus-software-solutions-job-portal`
- Local `main` intentionally stays at `823360b` (user asked to undo a pull).
- Work branch: **`feature/org-portal`** (created from `origin/main` @ `23025b2`). All org-portal
  work is **uncommitted** in the working tree.
- Local DB = Docker Desktop: `docker compose -f docker/docker-compose.yml up -d` → container clyptus-postgres (postgres:15), host port **5434**, db clyptus_recruitment, volume docker_clyptus-postgres-data. `backend/.env` (gitignored) points there. Root docker-compose.yml is deleted in the working tree (user consolidated on docker/).

## 3. Codebase map

```
backend/  NestJS 10 + Prisma 6 + PostgreSQL
  prisma/schema.prisma           platform models + ORG PORTAL block at the end (additive)
  prisma/migrations/20260930120000_org_portal   generated offline (prisma migrate diff) + CHECKs
  prisma/seed.ts (platform)      prisma/seed-org.ts (npm run seed:org — demo org users/data)
  src/modules/platform/*         EXISTING platform super admin (don't touch)
  src/modules/org/               NEW organisation portal
    org.module.ts                registers everything below (imported in app.module.ts)
    common/org-permissions.ts    catalogue, ROLE_CEILINGS, ROLE_DEFAULTS, validateGrant (unit tested)
    common/org-workflows.ts      job/ATS/interview/offer state machines, TOKEN_COSTS, token math (tested)
    common/org-context.ts        OrgGuard, @OrgPerms(any-of), @Org() ctx, resolveOrgContext
    common/org-helpers.ts        paging, jobScope/applicationScope, userSummaries, toCsv
    common/org-events.service.ts audit (existing AuditService) + notifications + realtime emit
    common/org-realtime.gateway.ts socket.io namespace /org-realtime (rooms org:<id>, user:<id>)
    common/org-token.service.ts  wallet lock (FOR UPDATE), consume/reserve/commit/release/credit, allocations
    auth/                        /org/auth/login|logout|me, public /org/invitations/preview|accept
    team/                        members, permission matrix, invitations, platform owner provisioning; ALL shared DTOs for auth/team/tokens
    jobs/                        jobs CRUD + lifecycle actions + assignees + pipeline route
    hiring/                      candidates, applications/ATS, interviews, offers (controllers in hiring.controller.ts)
    money/                       tokens, billing (Razorpay order + HMAC webhook), AI (match/parse local, JD/questions Gemini)
    workspace/                   organisation, settings, integrations (AES-GCM), profile, notifications, tasks, messages, dashboard, analytics, audit, security, exports
  test/org-portal.e2e-spec.ts    isolation, escalation, invite chain, 50 parallel spends, webhook (needs DB)
frontend/ React 18 + Vite + Tailwind + TanStack Query + RHF/zod + recharts + socket.io-client
  src/routes/index.tsx           + lazy route `/org/*` → portals/org/OrgPortal
  src/portals/org/               NEW light-theme portal
    OrgPortal.tsx                routes + Guard(perms) → Forbidden page
    layout/nav.ts                single nav config + lazy `loaders` (also used for hover prefetch)
    layout/OrgShell.tsx          sidebar/drawer, topbar (Ctrl+K search, token chip, bell, user menu), realtime, 401 handling
    lib/api.ts (typed helpers on shared apiClient) · queryKeys.ts (qk factory) · session.ts (useMe, usePermissions, useWallet) · realtime.ts · format.ts
    ui/ui.tsx (Button, Field, Card, Badge/StatusBadge, Sheet, Modal, ConfirmDialog, Tabs, Pagination, FilterChips, KpiCard, TokenButton…) · DataTable.tsx · toast.tsx
    pages/ auth, dashboard, team, jobs, pipeline (Kanban), candidates, applications, interviews, offers, tokens (+billing, invoice), insights (analytics, AI, audit, security), engagement (messages, notifications, tasks), settings (organisation, profile)
docs/org-portal/README.md        how to run, env vars, where each rule is enforced
.github/workflows/ci.yml         backend typecheck/unit/migrate/e2e/build + frontend typecheck/build
```

Gotcha: the global TransformInterceptor keeps ONLY data/meta from `{data, meta, ...}` results — never add extra top-level keys to a paged result (nest instead, e.g. ai/runs → `{ runs: {data,meta}, summary }`). Frontend: paged endpoints must use `api.page`, not `api.get`.

Conventions: British spelling (`Organisation`); envelope `{success,data,meta}`; errors
`{code,message}` (401 → code `Unauthorized`, 402 → `INSUFFICIENT_TOKENS`); controllers call
services with `OrgContext`; services audit via `OrgEventsService.audit`.

## 4. Known issues in EXISTING platform code (from review — not fixed, don't fix without asking)

1. Platform `adjustTokens` race → negative balances (org token service locks correctly).
2. RateLimiter trusts client `X-Forwarded-For`; in-memory only.
3. `prisma/seed.ts` resets super admin password to a public constant on every run.
4. ✅ FIXED (user asked): OrganisationDetails crash — backend findOne now flattens tokenBalance/allocatedTokens/consumedTokens like findAll.
5. ✅ FIXED (user asked): Dashboard + Analytics show an error instead of spinning forever; create-admin form defaults include analytics.read and lists organisations.create + tokens.allocate. PlatformLayout has a per-page error boundary.
6. No pagination in platform UI; ledger shows UUIDs; header search ignored.
7. Hardcoded healthy/MFA/AI claims in platform UI; `PaymentGatewayService.verifyWebhookSignature` returns true (org portal doesn't use it).
8. Two docker-compose files (5432 vs 5434); lint/format scripts lack eslint/prettier deps.

## 5. Key design decisions (org portal)

- One org per user: `User.role` + `User.organisationId` + new `OrgMemberProfile` (status, permissions[], title, timezone, muted notification types).
- Sessions: existing `PlatformSession` + existing `JwtAuthGuard`; org login is separate (`/org/auth/login`).
- Effective permissions = stored ∩ role ceiling (Org Super Admin = full ceiling). Ceilings are code constants.
- Candidates are org-scoped `Candidate` records (no candidate portal yet); contact/resume unlocked per org for RESUME_VIEW tokens (idempotency key `resume:<candidateId>`).
- Tokens: org wallet = existing `OrganisationTokenBalance`; ledger = existing `TokenTransaction` (+ `idempotencyKey`); per-member `TokenAllocation` + `MemberTokenEntry`. Owner spends the unallocated pool; others spend their allocation.
- Job first publish costs JOB_PUBLISH (50) inside the same transaction (`job-publish:<id>`).
- Offer accept → application HIRED; manual HIRED requires an accepted offer. Approver ≠ creator.
- Realtime payloads carry ids only; clients refetch through permission-checked REST.

## 6. Deferred on purpose

OpenSearch (Postgres search), BullMQ workers, SES/Resend (EmailService stub logs), S3 resume files (text + https link only),
configurable ATS stages (fixed stages + transition table), multi-org membership, 2FA, command palette (Ctrl+K focuses search),
list virtualization, frontend unit/E2E tests (no vitest/Playwright installed), Prometheus/Grafana/OTel, ESLint.

## 7. Status

| Phase | Status |
|---|---|
| 0 Recon | ✅ |
| 1 Foundation (schema, auth, guards, /me, shell, nav, queryKeys, realtime) | ✅ built |
| 2 Members & invitations | ✅ built |
| 3 Jobs | ✅ built |
| 4 Candidates, applications, ATS Kanban | ✅ built |
| 5 Interviews & offers | ✅ built |
| 6 Tokens, payments, billing | ✅ built |
| 7 AI | ✅ built (local match/parse; Gemini optional) |
| 8 Messaging, notifications, tasks | ✅ built |
| 9 Analytics, audit, security, integrations, exports | ✅ built |
| 10 Hardening | ✅ mostly — migrations+seeds+e2e (4/4)+platform real-concurrency (3/3) pass on real Postgres; all 42 GET routes × 4 roles (no 5xx); full write-flow smoke; browser click-through of every page; no frontend unit tests; no Lighthouse run |

Verified here: backend `tsc` ✓, backend unit tests 83/83 ✓ (13 suites), backend boots & maps 99 `/api/v1/org` routes ✓,
frontend `tsc` ✓, `vite build` ✓ (per-section chunks 5–18 KB, shell 60 KB gz).

## 8. Session log

- 2026-09-30: Reviewed origin/main. Undid pull (main → 823360b). Phase 0 recon.
- 2026-09-30: User said "start and complete all phases". Created `feature/org-portal` from origin/main, built backend
  org module + migration + seed + tests, frontend portal, CI, docs. Nothing committed. Next: run migration + seed on a
  real Postgres, run `npm run test:e2e`, click through each role, then commit/PR when the user asks.
- 2026-09-30 (cont.): Ran everything on real Postgres (embedded-postgres in scratchpad). Found & fixed via click-through:
  AI page crash (summary dropped by interceptor → nested `runs`), Notifications crash (api.get → api.page),
  OrgShell logged users out on any /me network error (now only on Unauthorized/Forbidden; retry screen otherwise),
  added per-page error boundary (PageBoundary in OrgPortal.tsx), org tab title. Verified drag-and-drop persists,
  mobile 390px no horizontal scroll, recruiter nav/forbidden pages. Next: commit/PR when the user asks.
- 2026-09-30 (cont.): User asked to fix platform errors. Fixed known issues #4 and #5 (see §4). Verified every /platform page loads with no console/API errors. Platform Admin login does not exist by default — create one via /platform/admins (auto-mode blocked me creating it).
- 2026-10-01: User asked to audit + set up the DB with docker/docker-compose.yml, no backend code changes. Started Docker Desktop, container already healthy; created backend/.env (port 5434, blank Razorpay keys); migrate deploy (3 migrations), db seed, seed:org → 37 tables, CHECK constraints present, 5 users. Logins verified via the user's running backend. Not run: e2e (would add test orgs to the dev DB).
