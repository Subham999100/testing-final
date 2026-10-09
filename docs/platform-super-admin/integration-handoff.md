# Platform Super Admin & Shared Platform Architecture — Integration Handoff Specification

## 1. System Architecture: Unified Platform Portal Concept

Platform Super Admin and Platform Admin are **NOT** two independent applications. They are two roles operating inside the **SAME Platform Portal**:

```text
                    PLATFORM PORTAL
                         │
             ┌───────────┴───────────┐
             │                       │
     PLATFORM SUPER ADMIN      PLATFORM ADMIN
             │                       │
             └───────────┬───────────┘
                         │
                  SHARED PLATFORM
                    FOUNDATION
                         │
        ┌────────────────┼────────────────┐
        │                │                │
  Organizations        Tokens         Analytics
        │                │                │
        └────────────────┼────────────────┘
                         │
              Authentication / RBAC
                         │
                    Audit System
```

### Core Architecture Axioms
- **SHARED FEATURE = SHARED CODE**
- **DIFFERENT ACCESS = DIFFERENT PERMISSION**
- **SUPER ADMIN-ONLY FEATURE = ROLE-SPECIFIC CODE**

---

## 2. Integration Status Table

| Integration | Status | Owner | Current State | Next Step for Engineering Team |
|---|---|---|---|---|
| **Auth & Sessions** | **Implemented** | Platform / Shared | Connected via `JwtAuthGuard` & `PlatformSession` | Verify SSO / SAML integration when ready |
| **RBAC & Permissions** | **Implemented** | Platform | Connected via `RolesGuard`, `PermissionsGuard`, `usePermissions` hook | Maintain permission registry in `permissions.constant.ts` |
| **PostgreSQL Database** | **Implemented** | Backend | Prisma Client v6 generated & validated | Apply production database migrations |
| **Redis** | Interface Ready | Infrastructure | Memory fallback active (`RedisService`) | Configure `REDIS_URL` in production container |
| **BullMQ** | Interface Ready | Workers | Job payload contract defined (`BullMQService`) | Attach worker queue listeners |
| **Razorpay** | Interface Ready | Billing | Adapter stubbed (`PaymentGatewayService`) | Supply production credentials & webhook endpoints |
| **Stripe** | Interface Ready | Billing | Adapter stubbed (`PaymentGatewayService`) | Supply production credentials & webhook endpoints |
| **Email (SMTP)** | Interface Ready | Infrastructure | Dispatch interface defined (`EmailService`) | Configure SMTP transport host |
| **OpenSearch** | Interface Ready | Search | Indexing stub defined (`OpenSearchService`) | Connect OpenSearch cluster node |
| **AWS S3 / Cloudflare R2** | Interface Ready | Storage | Storage interface defined (`CloudStorageService`) | Configure S3 bucket credentials |
| **Google Gemini AI** | Interface Ready | AI Engine | Insights synthesizer stubbed (`GeminiAiService`) | Supply `GEMINI_API_KEY` for live generative insights |
| **Observability** | **Implemented** | DevOps | Health check endpoint & telemetry hooks ready | Connect Sentry DSN & OpenTelemetry exporter |

---

## 3. Reusable Platform Foundation for Future Platform Admin Developer

### 3.1 Reusable Frontend Components (`src/features/platform/`)
The Platform Admin developer can directly import and reuse these modular components without writing duplicates:

| Component | Path | Functionality & Permission Controls |
|---|---|---|
| `OrganisationTable` | `src/features/platform/organisations/OrganisationTable.tsx` | Data table of tenant organisations. Row actions (Details, Suspend, Reactivate) are guarded by `platform.organisations.read` and `platform.organisations.suspend`. |
| `OrganisationFilters` | `src/features/platform/organisations/OrganisationFilters.tsx` | Search input, status dropdown (`ACTIVE`, `SUSPENDED`, `PENDING_VERIFICATION`). |
| `OrganisationStatusBadge` | `src/features/platform/organisations/OrganisationStatusBadge.tsx` | Standardized status pill badge for all organisation states. |
| `SuspendOrganisationModal` | `src/features/platform/organisations/SuspendOrganisationModal.tsx` | Destructive suspension modal requiring mandatory 10+ character audit reason. |
| `CreateOrganisationModal` | `src/features/platform/organisations/CreateOrganisationModal.tsx` | Tenant onboarding modal for provisioning new organisations. |
| `TokenLedgerTable` | `src/features/platform/tokens/TokenLedgerTable.tsx` | Immutable transaction ledger table with drift tracking (`balanceBefore` → `balanceAfter`). |
| `TokenBalanceTable` | `src/features/platform/tokens/TokenBalanceTable.tsx` | Tenant balance table with utilization bar and "Adjust" action button guarded by `platform.tokens.adjust`. |
| `TokenPlansGrid` | `src/features/platform/tokens/TokenPlansGrid.tsx` | Card grid displaying token pricing plans, tiers, and features. |
| `CreateTokenPlanModal` | `src/features/platform/tokens/CreateTokenPlanModal.tsx` | Package creation modal for token plans. |
| `AdjustTokensModal` | `src/features/platform/tokens/AdjustTokensModal.tsx` | Audited credit/debit modal for token adjustments. |
| `AnalyticsCharts` | `src/features/platform/analytics/AnalyticsCharts.tsx` | Recharts registration velocity area chart and token consumption bar charts. |
| `GeminiSummaryCard` | `src/features/platform/analytics/GeminiSummaryCard.tsx` | AI-generated executive telemetry summary card. |
| `AuditLogsTable` | `src/features/platform/audit/AuditLogsTable.tsx` | Centralized audit log event stream with actor/IP/timestamp. |
| `AuditInspectModal` | `src/features/platform/audit/AuditInspectModal.tsx` | JSON metadata inspector with credential redaction. |
| `SecurityEventsTable` | `src/features/platform/security/SecurityEventsTable.tsx` | Incident feed with severity badges; resolve action guarded by `platform.security.manage`. |
| `ResolveIncidentModal` | `src/features/platform/security/ResolveIncidentModal.tsx` | Remediation notes submission modal. |

### 3.2 Reusable Layout & Navigation (`src/layouts/platform/`)
- `PlatformLayout`: Shared shell containing `PlatformHeader`, `PlatformSidebar`, and content outlet.
- `PlatformSidebar`: Menu items are automatically filtered based on the current user's explicit permissions via `usePermissions()`. Platform Admins will only see menu items they have permissions for.
- `PlatformHeader`: Displays current cluster health, active alerts, search bar, and user profile / role switcher simulator.

### 3.3 Reusable Frontend Services & Hooks
- `src/services/platform.service.ts`: Single centralized API transport client for all platform operations with automatic mock fallback during local development.
- `src/hooks/usePermissions.ts`: Client-side RBAC hook providing `hasPermission(perm)` and `hasAnyPermission(perms)`.
- `src/store/auth.store.ts`: Session store supporting both `PLATFORM_SUPER_ADMIN` and `PLATFORM_ADMIN` states with simulated permission switching.
- `src/types/platform.types.ts`: Centralized TypeScript contracts for all platform domain models.

### 3.4 Reusable Backend Domain Services (`backend/src/modules/platform/`)
The backend is completely modular and shared:
- `PlatformOrganisationService`: Tenant CRUD, status lifecycles, and audit logging.
- `PlatformTokenService`: Atomic ledger balance adjustments, overdraft prevention, plan provisioning.
- `PlatformDashboardService`: Aggregated metrics.
- `PlatformAnalyticsService`: Macro-telemetry aggregations and AI summaries.
- `PlatformAuditService` / `AuditService`: Centralized audit trail with recursive secret redaction.
- `PlatformSecurityService`: Security incident ingestion and remediation.
- `PlatformSettingsService`: System configurations.

---

## 4. Permission Matrix

| Permission Key | Description | Platform Super Admin | Future Platform Admin |
|---|---|---|---|
| `platform.organisations.read` | View organisations and details | Yes (Wildcard) | Assigned by Super Admin |
| `platform.organisations.create` | Provision new tenant organisations | Yes (Wildcard) | Assigned by Super Admin |
| `platform.organisations.update` | Update organisation metadata | Yes (Wildcard) | Assigned by Super Admin |
| `platform.organisations.suspend` | Suspend or reactivate tenants | Yes (Wildcard) | Assigned by Super Admin |
| `platform.organisations.delete` | Hard delete tenants | Yes (Wildcard) | No (Restricted) |
| `platform.admins.read` | View platform admin accounts | Yes (Wildcard) | No (Restricted) |
| `platform.admins.create` | Create new Platform Admins | Yes (Wildcard) | No (Restricted) |
| `platform.admins.update` | Edit platform admin profiles | Yes (Wildcard) | No (Restricted) |
| `platform.admins.disable` | Deactivate platform admins | Yes (Wildcard) | No (Restricted) |
| `platform.tokens.read` | View token ledger and balances | Yes (Wildcard) | Assigned by Super Admin |
| `platform.tokens.manage` | Create or update token plans | Yes (Wildcard) | Assigned by Super Admin |
| `platform.tokens.adjust` | Adjust tenant token balances | Yes (Wildcard) | Assigned by Super Admin |
| `platform.analytics.read` | View macro analytics & AI briefings | Yes (Wildcard) | Assigned by Super Admin |
| `platform.audit.read` | View audit logs & inspect payloads | Yes (Wildcard) | Assigned by Super Admin |
| `platform.security.read` | View security incident feed | Yes (Wildcard) | Assigned by Super Admin |
| `platform.security.manage` | Resolve security incidents | Yes (Wildcard) | Optional / Restricted |
| `platform.settings.read` | View platform settings | Yes (Wildcard) | Assigned by Super Admin |
| `platform.settings.manage` | Modify platform settings & flags | Yes (Wildcard) | No (Restricted) |

---

## 5. Super Admin Exclusive Features vs Shared Features

### Super Admin-Only Features
1. **Platform Admin Account Governance** (`/platform/admins`):
   - Only `PLATFORM_SUPER_ADMIN` can provision, modify, or deactivate Platform Admins.
   - Guarded server-side by `PlatformAdminService.createAdmin()` and `RolesGuard`.
   - Explicit guard: Platform Admins cannot create other admins or escalate any account to Super Admin.
2. **Critical Security Settings & Platform Configuration** (`/platform/settings`, `platform.settings.manage`):
   - Gateway toggle switches, system maintenance mode, registration throttling.
3. **Hard Deletion / Unrecoverable Tenant Actions**:
   - `platform.organisations.delete` is reserved for Super Admin.

### Shared Features (Reused with Permissions)
1. **Organisation Oversight**:
   - Both roles view organizations; action buttons (Suspend, Reactivate, Create) toggle dynamically based on permissions.
2. **Token Management & Ledger**:
   - Ledger viewing and balance tracking are shared. Adjustment buttons only appear if `platform.tokens.adjust` is held.
3. **Audit Log Stream**:
   - Shared stream for compliance oversight.
4. **Platform Analytics**:
   - Shared telemetry charts and generative AI summaries.

---

## 6. Guidelines for the Future Platform Admin Developer

### What You Can Reuse Directly
- **Layout & Navigation**: Simply add any new routes under `/platform/*` inside `App.tsx` and wrap with `PlatformLayout`.
- **Sidebar**: The sidebar will automatically show the routes your user has permissions for.
- **UI Components**: Import tables, modals, filters, and badges from `src/features/platform/*`.
- **Services**: Call `PlatformService` methods directly; authentication and error handling are pre-configured.
- **Backend APIs**: Use existing `/api/v1/platform/*` endpoints with permission guards.

### What You Must NOT Implement or Duplicate
1. **Do NOT create separate directories** such as `pages/platform-admin/` or `features/platform-admin/`.
2. **Do NOT create separate services** like `PlatformAdminOrganizationService` or `adminApiClient.ts`.
3. **Do NOT duplicate API routes** like `/platform-admin/organisations`. The existing `/api/v1/platform/organisations` endpoint already handles RBAC.
4. **Do NOT create a separate layout** (`AdminLayout.tsx`). Use `PlatformLayout.tsx`.

---

## 7. File Ownership & Modification Directory

### Files Created
- `frontend/src/features/platform/organisations/OrganisationTable.tsx` (Shared)
- `frontend/src/features/platform/organisations/OrganisationFilters.tsx` (Shared)
- `frontend/src/features/platform/organisations/OrganisationStatusBadge.tsx` (Shared)
- `frontend/src/features/platform/organisations/SuspendOrganisationModal.tsx` (Shared)
- `frontend/src/features/platform/organisations/CreateOrganisationModal.tsx` (Shared)
- `frontend/src/features/platform/tokens/TokenLedgerTable.tsx` (Shared)
- `frontend/src/features/platform/tokens/TokenBalanceTable.tsx` (Shared)
- `frontend/src/features/platform/tokens/TokenPlansGrid.tsx` (Shared)
- `frontend/src/features/platform/tokens/CreateTokenPlanModal.tsx` (Shared)
- `frontend/src/features/platform/tokens/AdjustTokensModal.tsx` (Shared)
- `frontend/src/features/platform/admins/PlatformAdminTable.tsx` (Super Admin feature)
- `frontend/src/features/platform/admins/CreatePlatformAdminModal.tsx` (Super Admin feature)
- `frontend/src/features/platform/analytics/AnalyticsCharts.tsx` (Shared)
- `frontend/src/features/platform/analytics/GeminiSummaryCard.tsx` (Shared)
- `frontend/src/features/platform/audit/AuditLogsTable.tsx` (Shared)
- `frontend/src/features/platform/audit/AuditInspectModal.tsx` (Shared)
- `frontend/src/features/platform/security/SecurityEventsTable.tsx` (Shared)
- `frontend/src/features/platform/security/ResolveIncidentModal.tsx` (Shared)
- `frontend/src/hooks/usePermissions.ts` (Shared)

### Shared Files Modified
- `frontend/src/layouts/platform/PlatformLayout.tsx` — Modularized shell
- `frontend/src/layouts/platform/PlatformSidebar.tsx` — Permission-driven navigation
- `frontend/src/layouts/platform/PlatformHeader.tsx` — Added live role switcher simulator
- `frontend/src/pages/platform/Organisations.tsx` — Refactored to compose shared feature components
- `frontend/src/pages/platform/TokenTransactions.tsx` — Refactored to compose `TokenLedgerTable`
- `frontend/src/pages/platform/TokenPlans.tsx` — Refactored to compose `TokenPlansGrid` & `CreateTokenPlanModal`
- `frontend/src/pages/platform/TokenUsage.tsx` — Refactored to compose `TokenBalanceTable` & `AdjustTokensModal`
- `frontend/src/pages/platform/PlatformAdmins.tsx` — Refactored to compose `PlatformAdminTable` & `CreatePlatformAdminModal`
- `frontend/src/pages/platform/Analytics.tsx` — Refactored to compose `GeminiSummaryCard` & `AnalyticsCharts`
- `frontend/src/pages/platform/AuditLogs.tsx` — Refactored to compose `AuditLogsTable` & `AuditInspectModal`
- `frontend/src/pages/platform/Security.tsx` — Refactored to compose `SecurityEventsTable` & `ResolveIncidentModal`
- `frontend/src/pages/platform/Dashboard.tsx` — Refactored to compose `OrganisationStatusBadge`
- `frontend/src/store/auth.store.ts` — Added role simulator and permission helpers
- `frontend/src/types/platform.types.ts` — Centralized platform data contracts
