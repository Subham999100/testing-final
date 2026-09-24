# Clyptus Job Portal — Backend

Enterprise-grade backend API for the Clyptus Job Portal.

The backend is responsible for authentication, users, candidates, recruiters, jobs, applications, ATS, interviews, offers, messaging, notifications, search, AI services, billing, analytics, administration, and platform infrastructure.

---

## 1. Technology Stack

| Technology                 | Purpose                               |
| -------------------------- | ------------------------------------- |
| Node.js                    | Runtime                               |
| TypeScript                 | Programming language                  |
| NestJS                     | Backend framework                     |
| PostgreSQL                 | Primary database                      |
| Redis                      | Cache, sessions and distributed state |
| BullMQ                     | Background jobs and queues            |
| WebSocket                  | Real-time communication               |
| REST API                   | Client-server communication           |
| OpenAPI / Swagger          | API documentation                     |
| Docker                     | Containerization                      |
| JWT / OAuth                | Authentication                        |
| S3-compatible Storage      | File and document storage             |
| Elasticsearch / OpenSearch | Search infrastructure                 |
| Jest                       | Testing                               |

---

## 2. Architecture

```text
Client Applications
        │
        ▼
   REST / WebSocket
        │
        ▼
┌─────────────────────────┐
│       API Layer         │
│        /api/v1          │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│       Modules           │
│                         │
│ Auth                     │
│ Users                    │
│ Candidates               │
│ Jobs                     │
│ Applications             │
│ ATS                      │
│ Interviews               │
│ Offers                   │
│ Messaging                │
│ Notifications            │
│ Search                   │
│ AI                       │
│ Billing                  │
│ Admin                    │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│    Infrastructure       │
│                         │
│ PostgreSQL               │
│ Redis                    │
│ Queue                    │
│ Storage                  │
│ Search                   │
│ Email                    │
│ SMS                      │
│ Payments                 │
│ AI Providers             │
└─────────────────────────┘
```

---

## 3. Project Structure

```text
backend/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── bootstrap.ts
│   │
│   ├── config/
│   ├── common/
│   ├── infrastructure/
│   ├── modules/
│   ├── events/
│   ├── workers/
│   ├── api/
│   └── security/
│
├── database/
│   ├── migrations/
│   ├── seeds/
│   ├── fixtures/
│   └── schemas/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── contract/
│   ├── e2e/
│   ├── performance/
│   └── security/
│
├── docs/
├── scripts/
├── docker/
├── .env.example
├── package.json
├── tsconfig.json
├── nest-cli.json
└── README.md
```

---

## 4. Backend Modules

Core business domains:

```text
auth
users
candidates
profiles
resumes
skills
education
experience
companies
jobs
saved-jobs
job-alerts
applications
ats
interviews
offers
search
matching
ai
notifications
messaging
referrals
billing
credits
moderation
support
analytics
audit
settings
employees
system
```

Each business domain should remain independently maintainable and should not directly access another module's internal implementation.

---

## 5. Prerequisites

Install:

* Node.js 20+
* npm 10+
* PostgreSQL 15+
* Redis 7+
* Git
* Docker Desktop — recommended

Verify:

```bash
node --version
npm --version
git --version
docker --version
```

---

## 6. Installation

Clone the repository:

```bash
git clone <REPOSITORY_URL>
cd clyptus-job-portal/backend
```

Install dependencies:

```bash
npm install
```

Create environment configuration:

```bash
cp .env.example .env
```

For Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Update `.env` with your local configuration.

---

## 7. Environment Variables

Never commit `.env` files or credentials to GitHub.

Example:

```env
NODE_ENV=development

PORT=3000

DATABASE_URL=postgresql://username:password@localhost:5432/clyptus

REDIS_URL=redis://localhost:6379

JWT_SECRET=change-me

STORAGE_BUCKET=
STORAGE_REGION=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=

SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=

AI_API_KEY=

PAYMENT_SECRET_KEY=
```

Only placeholder values should exist in `.env.example`.

---

## 8. Database

Run migrations:

```bash
npm run migration:run
```

Run seed data:

```bash
npm run seed
```

Create a migration:

```bash
npm run migration:create
```

Rollback:

```bash
npm run migration:revert
```

---

## 9. Development

Start the backend:

```bash
npm run start:dev
```

Backend:

```text
http://localhost:3000
```

API:

```text
http://localhost:3000/api/v1
```

Swagger:

```text
http://localhost:3000/api/docs
```

---

## 10. Production Build

```bash
npm run build
```

Start production:

```bash
npm run start:prod
```

---

## 11. Testing

Unit tests:

```bash
npm run test
```

Watch mode:

```bash
npm run test:watch
```

Coverage:

```bash
npm run test:cov
```

E2E:

```bash
npm run test:e2e
```

---

## 12. Code Quality

Lint:

```bash
npm run lint
```

Format:

```bash
npm run format
```

Type checking:

```bash
npm run typecheck
```

---

## 13. API Versioning

All public APIs should be versioned.

Example:

```text
/api/v1/auth
/api/v1/users
/api/v1/candidates
/api/v1/jobs
/api/v1/applications
/api/v1/ats
```

Future versions:

```text
/api/v2/...
```

Breaking API changes must not be introduced directly into an existing version.

---

## 14. Security Rules

Never commit:

```text
.env
API keys
JWT secrets
database passwords
private certificates
cloud credentials
payment credentials
production credentials
```

All endpoints must use appropriate:

* Authentication
* Authorization
* Role checks
* Permission checks
* Input validation
* Rate limiting
* Sanitization
* Audit logging

---

## 15. Git Branching

Recommended branches:

```text
main
develop
feature/*
fix/*
hotfix/*
release/*
```

Example:

```bash
git checkout -b feature/job-search
```

Commit example:

```bash
git add .
git commit -m "feat: implement job search API"
```

---

## 16. Development Rules

1. Use TypeScript strict mode.
2. Keep business logic inside domain modules.
3. Do not put business logic inside controllers.
4. Controllers should handle HTTP concerns.
5. Services should handle business operations.
6. Repositories should handle persistence.
7. Use DTOs for API input/output.
8. Validate all external input.
9. Never expose internal database entities directly through APIs.
10. Write tests for business-critical functionality.
11. Maintain API documentation.
12. Use events for loosely coupled asynchronous workflows.
13. Use queues for long-running background jobs.
14. Never commit secrets.

---

## 17. Background Workers

The platform uses workers for long-running operations.

```text
Email Worker
Notification Worker
Resume Worker
Search Worker
AI Worker
Analytics Worker
Cleanup Worker
```

Example:

```text
Candidate uploads resume
        ↓
API
        ↓
Queue
        ↓
Resume Worker
        ↓
Parse Resume
        ↓
Extract Skills
        ↓
Update Candidate Profile
        ↓
Publish Event
```

---

## 18. Observability

Backend monitoring should include:

```text
Application Logs
Error Tracking
Metrics
Distributed Tracing
Health Checks
Audit Logs
Request IDs
Performance Monitoring
```

Health endpoint:

```text
/api/health
```

---

## 19. API Contract

OpenAPI specification:

```text
/openapi.yaml
```

Frontend API types should be generated from the API contract where possible.

---

## 20. Docker

Build:

```bash
docker build -t clyptus-backend .
```

Run:

```bash
docker run -p 3000:3000 clyptus-backend
```

For local infrastructure:

```bash
docker compose up -d
```

Stop:

```bash
docker compose down
```

---

## 21. Contribution Workflow

```text
Create branch
      ↓
Implement feature
      ↓
Write tests
      ↓
Run lint
      ↓
Run typecheck
      ↓
Run tests
      ↓
Create Pull Request
      ↓
Code Review
      ↓
Merge
```

---

## 22. Ownership

Backend development should follow the approved architecture and API contracts.

Any architectural change affecting:

* Database
* API contracts
* Authentication
* Authorization
* Events
* Queues
* Infrastructure
* Security

should be reviewed before implementation.
