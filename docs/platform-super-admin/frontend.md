# Platform Super Admin — Frontend Architecture

## 1. Frontend Technology Stack

- **Framework**: React 18 with TypeScript in strict mode
- **Bundler**: Vite
- **Styling**: Tailwind CSS + custom glassmorphic design system
- **Routing**: React Router DOM (scoped to `/platform/*`)
- **Server State**: TanStack Query
- **Client State**: Zustand
- **Visualizations**: Recharts
- **Icons**: Lucide React
- **HTTP Client**: Axios with typed request/response interceptors

---

## 2. Directory Structure

```text
frontend/src/
├── layouts/
│   └── platform/
│       └── PlatformLayout.tsx      # Sidebar, header, breadcrumbs, search & status badge
├── pages/
│   └── platform/
│       ├── Dashboard.tsx           # Global telemetry, recent orgs, ledger activity, health
│       ├── Organisations.tsx       # Tenant table, status filters, create modal, suspend modal
│       ├── OrganisationDetails.tsx # Detailed metrics, metadata, balance breakdown
│       ├── PlatformAdmins.tsx      # Admin list, permission checkboxes, toggle status
│       ├── TokenPlans.tsx          # Plan cards, pricing, cycle, sort order, create modal
│       ├── TokenTransactions.tsx   # Immutable transaction ledger, type filter, balance drift
│       ├── TokenUsage.tsx          # Platform token balances, atomic adjustment modal
│       ├── Analytics.tsx           # Recharts area & bar charts, Gemini AI summary
│       ├── AuditLogs.tsx           # Central audit stream, search, metadata inspect modal
│       ├── Security.tsx            # Security incidents, severity tags, resolution workflow
│       └── Settings.tsx            # System parameters, external service toggle switches
├── services/
│   ├── api.ts                      # Axios instance with auth headers & error sanitization
│   ├── mockData.ts                 # Realistic development fallback data
│   └── platform.service.ts         # High-level typed API service layer
├── store/
│   └── auth.store.ts               # Zustand store managing Super Admin session & alerts
├── types/
│   └── platform.types.ts           # Unified TypeScript entity interfaces
├── routes/
│   └── index.tsx                   # Central route registration
├── App.tsx                         # QueryClient and BrowserRouter initialization
├── index.css                       # Design tokens, custom scrollbars, glassmorphism
└── main.tsx                        # DOM mount
```

---

## 3. UI Aesthetics & Experience

- **Curated Palette**: Deep navy `#080d1a`, slate glass surfaces, emerald token accents, and indigo platform highlights.
- **Audited Confirmation Dialogs**: Destructive actions (e.g. suspending a tenant organization) require entering a minimum 10-character justification before submitting.
- **Fail-Safe Development Mode**: When backend connectivity is pending, the frontend gracefully falls back to structured mock data without breaking or showing empty blanks.
