# Organisation Portal

One app shell for the three organisation roles: **Org Super Admin**, **Org Admin** and **Recruiter**. Navigation, routes and buttons are driven by permissions the server resolves. The API enforces every rule; the UI only hides what a member cannot use.

- Frontend: `frontend/src/portals/org/` → served at **`/org`**. Light theme, lazy-loaded per section.
- Backend: `backend/src/modules/org/` → **`/api/v1/org/*`**. Also a WebSocket namespace, **`/org-realtime`**.
- Database: additive migration `backend/prisma/migrations/20260930120000_org_portal`.

## Run it locally

```bash
# 1. Postgres (either compose file works — match DATABASE_URL to its port)
docker compose -f docker/docker-compose.yml up -d        # host port 5434

# 2. Backend
cd backend
cp .env.example .env            # set DATABASE_URL and a real JWT_SECRET (32+ chars)
npm ci
npx prisma migrate deploy       # applies platform + org portal migrations
npx prisma db seed              # platform seed (super admin, plans, acme-corp)
npm run seed:org                # org portal demo users + data (development only)
npm run start:dev               # http://localhost:3000, Swagger at /api/docs

# 3. Frontend
cd ../frontend
npm ci
npm run dev                     # http://localhost:5173/org
```

Demo sign-ins after `seed:org` (password `Clyptus@2026` unless `ORG_SEED_PASSWORD` is set):

| Email | Role |
|---|---|
| owner@acme.com | Org Super Admin |
| admin@acme.com | Org Admin |
| priya@acme.com | Recruiter |
| arjun@acme.com | Recruiter |

**Onboarding a real organisation:** a platform admin calls `POST /api/v1/org-provisioning/organisations/:orgId/owner-invitations { email }`. Outside production the response includes the one-time invite link.

## Environment variables (new)

| Variable | Purpose |
|---|---|
| `APP_URL` | Base URL used in invitation links (defaults to `CORS_ORIGIN`) |
| `ORG_INVITE_TTL_DAYS` | Invitation lifetime, default 7 |
| `ORG_SECRETS_KEY` | Key for encrypting integration secrets. **Required in production** |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Create orders. Online purchase is disabled until these are set |
| `RAZORPAY_WEBHOOK_SECRET` | Verifies webhook signatures. Webhook URL: `/api/v1/org/billing/razorpay/webhook` |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Optional writing tools (improve description, interview questions) |
| `VITE_WS_URL` (frontend) | WebSocket origin if the API is not on the same host |
| `ORG_SEED_PASSWORD` | Password for `seed:org` demo users |

## How the important rules are enforced

| Rule | Where |
|---|---|
| Org and permissions come from the DB session, never from the request | `common/org-context.ts` (`OrgGuard`) |
| Every query is scoped by `organisationId` (and by job/assignment for recruiters) | `common/org-helpers.ts` (`jobScope`, `applicationScope`) and each service |
| No escalation: grant ⊆ your own permissions ∩ the platform ceiling for the role; no self-grant; Org Super Admins can't be managed from the portal | `common/org-permissions.ts` (`validateGrant`), with unit tests |
| Token balances can't go negative or be spent twice | `common/org-token.service.ts`: wallet row lock (`SELECT … FOR UPDATE`), idempotency keys, DB `CHECK` on allocations |
| AI runs are refunded when they fail | `reserve → commit / release` in `OrgTokenService`, used by `money/ai.service.ts` |
| Purchases credit tokens only from a verified webhook, exactly once | `money/billing.service.ts` (HMAC-SHA256 + `timingSafeEqual`, idempotent credit) |
| AI never decides and never uses protected characteristics | `money/ai.service.ts` (`explainMatch` — explainable, job-relevant factors only) |
| Everything privileged is audited | Existing `AuditService`, via `OrgEventsService.audit` |
| Integration secrets are encrypted and never returned | `workspace/workspace.service.ts` (AES-256-GCM, masked `••••last4`) |
| Admins read others' candidate messages only if the privacy policy allows | `workspace/engagement.service.ts` (`messageOversight` setting + `messages.oversee`) |

## Tests

```bash
cd backend
npx jest --testPathIgnorePatterns real-concurrency   # unit tests (no DB needed)
npm run test:e2e                                     # needs DATABASE_URL: isolation, escalation,
                                                     # invite chain, 50 parallel spends, webhook forgery
```

## Deliberately simple (see `ASSUMPTIONS.md`)

- Search uses Postgres, not OpenSearch.
- There are no BullMQ workers: emails go through the existing `EmailService` (a stub today), and AI runs inline with token reservation.
- Exports are direct CSV downloads.
- Each user belongs to one organisation.
