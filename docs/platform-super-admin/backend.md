# Platform Super Admin — Backend Architecture

## 1. Backend Technology Stack

- **Runtime**: Node.js v20+ with TypeScript
- **Framework**: NestJS (Modular Architecture)
- **Database ORM**: Prisma ORM with PostgreSQL engine
- **Authentication**: JWT & Passport (`JwtAuthGuard`)
- **Authorization**: Role-Based (`RolesGuard`) & Fine-Grained Permission (`PermissionsGuard`)
- **Validation**: `class-validator` & `class-transformer`
- **Audit Logging**: `AuditService` & `AuditInterceptor`

---

## 2. Directory Structure

```text
backend/
├── prisma/
│   ├── schema.prisma                  # PostgreSQL models, enums & relational indexes
│   └── seed.ts                        # Initial Super Admin, plans, and system settings
├── src/
│   ├── main.ts                        # NestJS bootstrap, Swagger, Pipes, Filters, Interceptors
│   ├── app.module.ts                  # Root application wiring
│   ├── config/
│   │   └── configuration.ts           # Type-safe environment loader
│   ├── common/
│   │   ├── constants/
│   │   │   └── permissions.constant.ts# Fine-grained platform permissions
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   ├── roles.decorator.ts
│   │   │   ├── permissions.decorator.ts
│   │   │   └── audit.decorator.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── roles.guard.ts
│   │   │   └── permissions.guard.ts
│   │   ├── interceptors/
│   │   │   ├── transform.interceptor.ts
│   │   │   └── audit.interceptor.ts
│   │   └── interfaces/
│   │       ├── api-response.interface.ts
│   │       └── authenticated-user.interface.ts
│   ├── database/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   ├── integrations/                  # External service adapters & interfaces
│   │   ├── ai/gemini.service.ts
│   │   ├── bullmq/bullmq.service.ts
│   │   ├── email/email.service.ts
│   │   ├── observability/observability.service.ts
│   │   ├── opensearch/opensearch.service.ts
│   │   ├── payments/payment-gateway.service.ts
│   │   ├── redis/redis.service.ts
│   │   ├── storage/storage.service.ts
│   │   └── integrations.module.ts
│   └── modules/
│       ├── audit/
│       │   ├── audit.module.ts
│       │   └── audit.service.ts
│       └── platform/
│           ├── platform.module.ts
│           ├── dashboard/
│           ├── organisations/
│           ├── admins/
│           ├── tokens/
│           ├── analytics/
│           ├── audit/
│           ├── security/
│           └── settings/
└── test/
```

---

## 3. Core Design Principles

1. **Explicit Server-Side Authorization**:
   - `RolesGuard` ensures that only `PLATFORM_SUPER_ADMIN` and `PLATFORM_ADMIN` can access `/api/v1/platform/*`.
   - `PermissionsGuard` verifies explicit permission assignments for `PLATFORM_ADMIN`, whereas `PLATFORM_SUPER_ADMIN` inherently holds all permissions.
2. **Atomic Ledger Transactions**:
   - Token balance modifications occur strictly inside `prisma.$transaction`.
   - Before applying an adjustment, `balanceBefore` is verified, overdrafts are rejected, and `balanceAfter` is recorded alongside a permanent `TokenTransaction` entry.
3. **Safe Exception Handling**:
   - `HttpExceptionFilter` intercepts unhandled exceptions, sanitizes database errors or stack traces, and returns clean `{ success: false, error: { code, message, timestamp, path } }` payloads.
