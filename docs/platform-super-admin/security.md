# Platform Super Admin — Security & Access Control

## 1. Zero Trust Principles

1. **Server-Side Authorization**: Neither user role, permissions, nor organization identity sent by the client is ever trusted. Identity is extracted directly from the verified cryptographic JWT bearer token by `JwtAuthGuard`.
2. **Principle of Least Privilege**:
   - `PLATFORM_SUPER_ADMIN`: Root authority, possesses implicit access to all platform actions (`*`).
   - `PLATFORM_ADMIN`: Bound strictly to explicitly assigned fine-grained permissions (e.g. `platform.organisations.read`).
   - `ORGANISATION_*`, `RECRUITER`, `CANDIDATE`: Blocked unconditionally from accessing platform endpoints.
3. **Privilege Escalation Prevention**:
   - A `PLATFORM_ADMIN` is programmatically blocked from creating, modifying, or promoting any user to `PLATFORM_SUPER_ADMIN` in `PlatformAdminService.create()`.
4. **Credential Isolation**:
   - Passwords and API tokens are never written into audit logs or returned through API responses.
5. **Destructive Operation Safety**:
   - Suspending a tenant organization requires entering a verified formal justification (minimum 10 characters).
