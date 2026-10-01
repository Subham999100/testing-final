# ASSUMPTIONS — Organisation Portal

Each entry is numbered so code comments and reviews can reference it.

## Codebase vs spec conflicts (codebase wins for conventions)

A1. **Spelling:** code uses `Organisation` / `organisationId` (British), so new code follows it.
A2. **UI kit:** the repo has no shadcn/ui. We use a small Tailwind kit (`portals/org/ui`) rather than add a second UI library.
A3. **Audit:** we reuse the existing `AuditLog` + `AuditService` (no new `AuditEvent` table). Before/after values go in `metadata`.
A4. **Sessions:** we reuse `PlatformSession` and the existing `JwtAuthGuard`. Org users sign in through `/org/auth/login`.
A5. **API envelope and pagination:** we use the existing `{ success, data, meta }` shape and `page`/`limit` (max 100).
A6. **Validation:** the global `ValidationPipe` has `forbidNonWhitelisted: false` (existing). Unknown fields are stripped, not rejected.

## Simplifications (user asked: simple, no over-engineering)

A7. **One organisation per user**, using `User.organisationId` plus `OrgMemberProfile`. There's no `X-Org-Id` selector.
A8. **Permission ceilings** are code constants (`ROLE_CEILINGS`), not a DB table.
A9. **Search** uses PostgreSQL (`ILIKE` / array `has`) instead of OpenSearch.
A10. **No BullMQ.** Emails go through the existing `EmailService` (a stub today). AI runs inline, inside a token reservation that is refunded on failure.
A11. **Realtime** uses one socket.io namespace (`/org-realtime`). Events carry ids only, and clients refetch.
A12. **Candidates** are org-scoped `Candidate` records created by recruiters, not `User` rows. There's no candidate portal yet. Resumes are stored as text plus an https link, not uploaded files.
A13. **ATS stages are fixed** (APPLIED → … → HIRED, plus REJECTED and WITHDRAWN), with a code transition table. Orgs control "reject reason required", not the stage list.
A14. **Exports** are direct CSV downloads (max 5,000 rows). Candidate exports exclude contact details.
A15. **AI:** match scoring and resume skill extraction are deterministic and explainable (no external call). JD improvement and interview questions use Gemini only when `GEMINI_API_KEY` is set.
A16. **Token costs** are platform-owned constants (`TOKEN_COSTS`), not org settings.
A17. **Login rate limiting** is in memory, keyed by socket IP and by email. Behind a proxy, configure Express `trust proxy`.

## Security rules kept from the spec (not simplified)

S1. Org, role and permissions are resolved from the DB session on every request. Every org query is filtered by `organisationId` from the session.
S2. No escalation: a grant must be within both the granter's own permissions and the role's ceiling. No self-grant. Org Super Admins can't be managed from the portal, so the last owner can't be removed.
S3. Token spends lock the wallet row (`SELECT … FOR UPDATE`) and use unique idempotency keys. A DB `CHECK` stops allocations being overspent.
S4. Razorpay: price comes from the server-side plan. Tokens are credited only by a webhook with a valid HMAC signature, exactly once, and an amount mismatch is flagged.
S5. Integration secrets are AES-256-GCM encrypted and never returned (masked `••••last4`). `ORG_SECRETS_KEY` is required in production.
S6. Candidate messages are visible to others only when the org enables `messageOversight` and the viewer holds `messages.oversee`.
S7. AI output is advisory, never auto-applied, and uses no protected characteristics.

## Touchpoints in existing files (additive only)

T1. `backend/prisma/schema.prisma`: new models appended, `User.orgMemberProfile` relation, nullable `TokenTransaction.idempotencyKey`.
T2. `backend/src/app.module.ts`: imports `OrgModule`.
T3. `backend/src/main.ts`: `NestFactory.create(AppModule, { rawBody: true })` for webhook signatures.
T4. `backend/package.json`: socket.io packages and a `seed:org` script. `frontend/package.json`: `socket.io-client`.
T5. `frontend/src/routes/index.tsx`: lazy `/org/*` route.

## Not done yet

- Frontend unit and E2E tests (no test runner is installed in the frontend).
- Accessibility and Lighthouse audits.
- 2FA.
- Real email delivery.
- File uploads.
- Configurable pipelines.
