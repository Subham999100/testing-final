# Platform Super Admin — API Contract Specification

All Platform Super Admin endpoints are prefixed with `/api/v1`. Bearer JWT authentication is required for all calls.

---

## 1. Dashboard Endpoint

### `GET /api/v1/platform/dashboard`
- **Role**: `PLATFORM_SUPER_ADMIN`, `PLATFORM_ADMIN`
- **Purpose**: Aggregates macro KPIs (organizations, active users, token reserves, recent events, and system health).
- **Audit**: N/A (read-only)
- **Response**:
```json
{
  "success": true,
  "data": {
    "metrics": {
      "totalOrganisations": 4,
      "activeOrganisations": 2,
      "suspendedOrganisations": 1,
      "pendingOrganisations": 1,
      "totalPlatformUsers": 1420,
      "totalPlatformAdmins": 3,
      "tokenMetrics": {
        "totalActiveTokens": 13650,
        "totalAllocatedTokens": 19000,
        "totalConsumedTokens": 5350
      }
    },
    "recentOrganisations": [],
    "recentTransactions": [],
    "recentSecurityEvents": [],
    "recentAuditLogs": [],
    "systemHealth": { "status": "HEALTHY", "uptimeSeconds": 86420 }
  }
}
```

---

## 2. Organisation Management Endpoints

### `GET /api/v1/platform/organisations`
- **Permission**: `platform.organisations.read`
- **Query Params**: `page`, `limit`, `search`, `status`, `tier`, `sortBy`, `sortOrder`
- **Response**: Paginated array of organisations including member count and token balance.

### `GET /api/v1/platform/organisations/:id`
- **Permission**: `platform.organisations.read`
- **Response**: Full organization profile, metadata, token balance, and recent audit activity.

### `POST /api/v1/platform/organisations`
- **Permission**: `platform.organisations.create`
- **Audit Action**: `ORGANISATION_CREATED`
- **Request Body**:
```json
{
  "name": "Acme Corp",
  "slug": "acme-corp",
  "domain": "acme.com",
  "contactEmail": "talent@acme.com",
  "tier": "ENTERPRISE",
  "maxRecruiters": 25,
  "initialTokenAllocation": 5000
}
```

### `PATCH /api/v1/platform/organisations/:id`
- **Permission**: `platform.organisations.update`
- **Audit Action**: `ORGANISATION_UPDATED`
- **Request Body**: `UpdateOrganisationDto`

### `POST /api/v1/platform/organisations/:id/suspend`
- **Permission**: `platform.organisations.suspend`
- **Audit Action**: `ORGANISATION_SUSPENDED`
- **Request Body**:
```json
{
  "reason": "Violation of candidate data privacy policies section 4.2"
}
```

### `POST /api/v1/platform/organisations/:id/activate`
- **Permission**: `platform.organisations.suspend`
- **Audit Action**: `ORGANISATION_ACTIVATED`

### `DELETE /api/v1/platform/organisations/:id`
- **Permission**: `platform.organisations.delete`
- **Audit Action**: `ORGANISATION_ARCHIVED`

---

## 3. Platform Admin Management Endpoints

### `GET /api/v1/platform/admins`
- **Permission**: `platform.admins.read`
- **Response**: List of platform administrators with assigned departments and permissions.

### `POST /api/v1/platform/admins`
- **Role**: `PLATFORM_SUPER_ADMIN` strictly
- **Permission**: `platform.admins.create`
- **Audit Action**: `PLATFORM_ADMIN_CREATED`
- **Request Body**:
```json
{
  "email": "operations@clyptus.platform",
  "firstName": "Alex",
  "lastName": "Reed",
  "password": "TemporarySecurePassword123!",
  "department": "Security & Compliance",
  "permissions": ["platform.organisations.read", "platform.audit.read"]
}
```

### `PATCH /api/v1/platform/admins/:id/status`
- **Role**: `PLATFORM_SUPER_ADMIN` strictly
- **Permission**: `platform.admins.disable`
- **Audit Action**: `PLATFORM_ADMIN_ACTIVATED` / `PLATFORM_ADMIN_DEACTIVATED`
- **Request Body**: `{ "isActive": false }`

---

## 4. Token System Endpoints

### `GET /api/v1/platform/token-plans`
- **Permission**: `platform.tokens.read`
- **Response**: Array of token plans with pricing and feature lists.

### `POST /api/v1/platform/token-plans`
- **Permission**: `platform.tokens.manage`
- **Audit Action**: `TOKEN_PLAN_CREATED`
- **Request Body**:
```json
{
  "name": "Starter Plan",
  "code": "PLAN_STARTER",
  "tokenAmount": 1000,
  "priceCents": 9900,
  "currency": "USD",
  "billingCycle": "MONTHLY",
  "features": ["Resume Parsing", "Basic Support"]
}
```

### `POST /api/v1/platform/tokens/adjust`
- **Permission**: `platform.tokens.adjust`
- **Audit Action**: `TOKEN_ADJUSTMENT_EXECUTED`
- **Request Body**:
```json
{
  "organisationId": "org_acme_corp",
  "type": "ALLOCATION",
  "amount": 1000,
  "reason": "Enterprise contract quarterly renewal",
  "referenceId": "inv_2026_q3"
}
```

### `GET /api/v1/platform/token-transactions`
- **Permission**: `platform.tokens.read`
- **Query Params**: `page`, `limit`, `organisationId`, `type`, `startDate`, `endDate`
- **Response**: Immutable transaction records including `balanceBefore` and `balanceAfter`.

### `GET /api/v1/platform/token-usage`
- **Permission**: `platform.tokens.read`
- **Response**: Platform-wide circulation, consumption totals, and top consumer tenants.

---

## 5. Intelligence, Audit & Security Endpoints

### `GET /api/v1/platform/analytics`
- **Permission**: `platform.analytics.read`
- **Response**: Velocity curves, status/tier breakdown, and Gemini AI summary.

### `GET /api/v1/platform/audit-logs`
- **Permission**: `platform.audit.read`
- **Query Params**: `page`, `limit`, `action`, `actorId`, `entityType`, `entityId`, `startDate`, `endDate`
- **Response**: Paginated audit stream with sanitized metadata.

### `GET /api/v1/platform/security/events`
- **Permission**: `platform.security.read`
- **Query Params**: `severity`, `isResolved`, `page`, `limit`
- **Response**: Security incidents feed.

### `POST /api/v1/platform/security/events/:id/resolve`
- **Permission**: `platform.security.manage`
- **Audit Action**: `SECURITY_EVENT_RESOLVED`
- **Request Body**: `{ "resolutionNotes": "Attacker IP blocked on edge firewall." }`

### `GET /api/v1/platform/settings`
- **Permission**: `platform.settings.read`

### `PATCH /api/v1/platform/settings/:key`
- **Role**: `PLATFORM_SUPER_ADMIN` strictly
- **Permission**: `platform.settings.manage`
- **Audit Action**: `PLATFORM_SETTING_UPDATED`
- **Request Body**: `{ "value": true }`
