# Platform Super Admin — Centralized Audit Logging

## 1. Audit Requirements & Mechanism

Every state-altering platform operation produces a permanent entry in `AuditLog`.

### 1.1 Architecture
- **Service Layer**: `AuditService.record()` provides a direct API for logging sensitive mutations.
- **Controller Interceptor**: `@Audited({ action, entityType })` combined with `AuditInterceptor` captures actor identity, client IP, user agent, and payload metadata automatically.

### 1.2 Redaction Engine
`AuditService.sanitizeMetadata()` strips sensitive keys recursively:
- Passwords & password hashes
- JWT tokens & refresh tokens
- API secrets, private keys, and webhook secrets
- Credit card & banking details
