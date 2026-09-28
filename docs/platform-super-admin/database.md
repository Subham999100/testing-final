# Platform Super Admin — Database & Prisma Schema

## 1. Database Engine & Connection

- **RDBMS**: PostgreSQL 15+
- **Schema Driver**: Prisma ORM
- **Migration Path**: `prisma/schema.prisma`

---

## 2. Platform Models & Tables

| Model Name | Table Name | Purpose | Key Indexes |
|---|---|---|---|
| `User` | `users` | Platform and Tenant Accounts | `role`, `organisationId`, `isActive`, `createdAt` |
| `PlatformAdminProfile` | `platform_admin_profiles` | Department & permissions for platform admins | `userId` |
| `PlatformSession` | `platform_sessions` | Active administrative session tokens | `userId`, `expiresAt` |
| `Organisation` | `organisations` | Tenant companies on the platform | `status`, `slug`, `domain`, `createdAt` |
| `OrganisationMetadata`| `organisation_metadata` | Industry, size, address, billing details | `organisationId` |
| `TokenPlan` | `token_plans` | Token packages and pricing tiers | `code`, `isActive` |
| `OrganisationTokenBalance` | `organisation_token_balances` | Current active & cumulative token counters | `organisationId` |
| `TokenTransaction` | `token_transactions` | Immutable transaction ledger | `organisationId`, `type`, `createdAt`, `actorId` |
| `TokenAllocationLimit` | `token_allocation_limits` | Max caps & auto-recharge settings | `organisationId` |
| `AuditLog` | `audit_logs` | Central sanitized audit entries | `action`, `(entityType, entityId)`, `actorId`, `createdAt` |
| `SecurityEvent` | `security_events` | Anomaly and security alert tracking | `eventType`, `severity`, `isResolved`, `createdAt` |
| `PlatformSetting` | `platform_settings` | Global platform parameters & toggle flags | `category`, `key` |

---

## 3. Immutability & Ledger Rules

1. `TokenTransaction` is strictly append-only. No `UPDATE` or `DELETE` operations are ever performed on this table.
2. Every mutation to `OrganisationTokenBalance` is executed inside a transaction with an accompanying `TokenTransaction` record.
3. `AuditLog` records are immutable and stored with sanitized metadata payloads.
