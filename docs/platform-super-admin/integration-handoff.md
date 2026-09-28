# Platform Super Admin — Integration Handoff Specification

## 1. System Integration Map

```text
PLATFORM SUPER ADMIN
        │
        ├── Organisation Module
        │     └── organisation creation / status sync APIs
        │
        ├── Platform Admin Module
        │     └── admin user management & role delegation
        │
        ├── Token & Billing Module
        │     ├── Razorpay adapter (PaymentGatewayService)
        │     ├── Stripe adapter (PaymentGatewayService)
        │     └── Token ledger & balance accounting
        │
        ├── Redis
        │     └── Distributed caching, sessions & rate limiting
        │
        ├── BullMQ
        │     └── Background task dispatching
        │
        ├── OpenSearch
        │     └── Cross-tenant search indexing
        │
        ├── Email Service
        │     └── Platform incident alerts & admin invitations
        │
        ├── AWS S3 / Cloudflare R2
        │     └── Tenant asset & audit export storage
        │
        ├── Google Gemini AI
        │     └── Macro-telemetry synthesis & threat detection
        │
        └── Observability
              ├── Prometheus & Grafana metrics
              ├── OpenTelemetry distributed tracing
              └── Sentry exception monitoring
```

---

## 2. Integration Status Table

| Integration | Status | Owner | Current State | Next Step for Engineering Team |
|---|---|---|---|---|
| **Auth & Sessions** | **Implemented** | Platform / Shared | Connected via `JwtAuthGuard` & `PlatformSession` | Verify SSO / SAML integration when ready |
| **RBAC & Permissions** | **Implemented** | Platform | Connected via `RolesGuard` & `PermissionsGuard` | Maintain permission registry in `permissions.constant.ts` |
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
