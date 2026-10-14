# Candidate Landing Page & Auth — Frontend Discovery Report

**Author:** Senior Frontend Engineer  
**Date:** October 12, 2026  
**Document Status:** Complete Discovery Report  
**Target Feature:** Production-Grade Candidate Landing Page, Job Discovery, Candidate Registration & Login  
**Scope:** Architecture, API Contracts, Existing UI Components, Public Data, and Production-Readiness Gaps  

---

## Executive Summary

This discovery report evaluates the architecture, design system, API contracts, and production gaps necessary to implement a high-converting, accessible, production-grade candidate landing page with registration and login.

The repository already contains the structural foundation for the candidate experience under `frontend/src/portals/candidate` and `backend/src/modules/candidate`. Public job listings (`/api/v1/candidate/jobs`) and job details (`/api/v1/candidate/jobs/:id`) are fully public and require no authentication. Candidate authentication (`/api/v1/candidate/auth/register` and `/login`) is active, issuing 24-hour JWT tokens backed by server-side `PlatformSession` database records. Candidate registration is not blocked by the stubbed email service, because email verification is explicitly non-blocking. 

However, critical gaps must be resolved for a production-grade rollout:
1. **Forms & Validation:** While `react-hook-form` and `zod` are installed and utilized across the recruiter portal, candidate auth pages currently rely on unmanaged `useState` and manual input binding.
2. **Design Inconsistencies:** The candidate portal implements a scoped stylesheet (`candidate.css`, Inter font, `#F97316` / `#2563EB`) while borrowing admin UI components (`@/portals/org/ui/ui`) styled with indigo palettes (`bg-indigo-600`).
3. **Missing Auth Capabilities:** There are no backend endpoints or UI flows for password recovery (`forgot-password`), session refreshing (`refresh-token`), email verification, or social OAuth.
4. **Resilience & SEO:** The candidate experience lacks root error boundaries, meta/Open Graph tags (the HTML title remains *"Clyptus — Platform Portal"*), client-side telemetry, and accessibility ARIA bindings.

---

## 1. Existing Frontend Setup

### 1.1 Router & Route Hierarchy
- **Library & Version:** `react-router-dom`: `^6.29.0` ([frontend/package.json:23](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/package.json#L23)).
- **Top-Level Route Structure:** Defined in [frontend/src/routes/index.tsx](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/routes/index.tsx#L42-L219):
  - Line 40: Lazy-imports `CandidatePortal` (`const CandidatePortal = React.lazy(() => import('../portals/candidate/CandidatePortal'));`).
  - Line 217: Mounts the Candidate Portal at the root wildcard: `<Route path="/*" element={<React.Suspense fallback={null}><CandidatePortal /></React.Suspense>} />`.
  - Line 214: Mounts the Organisation / Recruiter Portal under `/org/*`.
  - Lines 45–57: Public employer onboarding (`/apply`, `/apply/status`, `/organisation-invitation`).
  - Lines 60–211: Protected Platform Super Admin workspace (`/platform/*`).
- **Candidate Portal Internal Router:** Configured in [frontend/src/portals/candidate/CandidatePortal.tsx](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/candidate/CandidatePortal.tsx#L27-L57):
  - **Public Routes** wrapped with `<PublicLayout />`:
    - `/` (`index`) $\rightarrow$ `<HomePage />` ([CandidatePortal.tsx:30](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/candidate/CandidatePortal.tsx#L30))
    - `/jobs` $\rightarrow$ `<JobsPage />` ([CandidatePortal.tsx:31](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/candidate/CandidatePortal.tsx#L31))
    - `/jobs/:id` $\rightarrow$ `<JobDetailPage />` ([CandidatePortal.tsx:32](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/candidate/CandidatePortal.tsx#L32))
    - `/login` $\rightarrow$ `<LoginPage />` ([CandidatePortal.tsx:33](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/candidate/CandidatePortal.tsx#L33))
    - `/register` $\rightarrow$ `<RegisterPage />` ([CandidatePortal.tsx:34](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/candidate/CandidatePortal.tsx#L34))
  - **Authenticated Routes** wrapped with `<ProtectedCandidateRoute><CandidateShell /></ProtectedCandidateRoute>`:
    - `/candidate` $\rightarrow$ Redirects to `/candidate/dashboard`
    - `/candidate/dashboard` $\rightarrow$ `<DashboardPage />`
    - `/candidate/applications` $\rightarrow$ `<ApplicationsPage />`
    - `/candidate/applications/:id` $\rightarrow$ `<ApplicationDetailPage />`
    - `/candidate/profile` $\rightarrow$ `<ProfilePage />`
    - `/candidate/resume` $\rightarrow$ `<ResumePage />`
  - Fallback: Wildcard `*` redirects to `/` ([CandidatePortal.tsx:55](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/candidate/CandidatePortal.tsx#L55)).

### 1.2 State Management & Data Fetching
- **Server State / Cache:** `@tanstack/react-query`: `^5.66.0` ([frontend/package.json:16](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/package.json#L16)).
  - Initialized globally in [frontend/src/App.tsx:11-18](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/App.tsx#L11-L18) with `refetchOnWindowFocus: false` and `staleTime: 60000`.
  - Cache keys are organized through a central factory in [frontend/src/portals/candidate/lib/queryKeys.ts:1-25](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/candidate/lib/queryKeys.ts#L1-L25) (`me`, `profile`, `resume`, `jobs.list`, `jobs.detail`, `applications.all`).
  - Active candidate hooks include `useCandidateMe`, `useCandidateProfile`, and `useCandidateResume` in [frontend/src/portals/candidate/lib/session.ts:26-70](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/candidate/lib/session.ts#L26-L70).
- **Client State Management:** `zustand`: `^5.0.3` ([frontend/package.json:28](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/package.json#L28)).
  - Used for platform administration authentication ([frontend/src/store/auth.store.ts:38-117](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/store/auth.store.ts#L38-L117)) and the organisation toast notification bus ([frontend/src/portals/org/ui/toast.tsx:25-33](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/org/ui/toast.tsx#L25-L33)).
  - *Candidate Portal Specifics:* The candidate portal currently does not use a Zustand store. Candidate session state is derived directly from the React Query cache via `useCandidateAuth` ([frontend/src/portals/candidate/lib/session.ts:72-163](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/candidate/lib/session.ts#L72-L163)).
- **HTTP Client:** `axios`: `^1.7.9` ([frontend/package.json:17](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/package.json#L17)).
  - Candidate portal uses an isolated client instance `candidateAxios` in [frontend/src/portals/candidate/lib/api.ts:36-45](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/candidate/lib/api.ts#L36-L45):
    - Base URL: `import.meta.env.VITE_API_URL || '/api/v1'`.
    - Timeout: 15,000ms.
    - Default Headers: `'X-Requested-With': 'XMLHttpRequest'`, `'Content-Type': 'application/json'`.
    - Request interceptor: Reads Bearer token from `localStorage.getItem('clyptus_candidate_token')` ([api.ts:47-53](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/candidate/lib/api.ts#L47-L53)).
    - Response interceptor: Unwraps NestJS `{ success: true, data: T }` envelope ([api.ts:56-64](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/candidate/lib/api.ts#L56-L64)).
    - 401 Interceptor: Clears `clyptus_candidate_token` and dispatches `clyptus:candidate-session-expired` ([api.ts:68-71](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/candidate/lib/api.ts#L68-L71)).

### 1.3 Form Handling & Validation
- **Available Dependencies:**
  - `react-hook-form`: `^7.54.2` ([frontend/package.json:22](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/package.json#L22))
  - `zod`: `^3.24.2` ([frontend/package.json:27](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/package.json#L27))
  - `@hookform/resolvers`: `^3.9.1` ([frontend/package.json:15](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/package.json#L15))
- **Current Candidate Portal Implementation:**
  - In [frontend/src/portals/candidate/pages/public/LoginPage.tsx:23-49](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/candidate/pages/public/LoginPage.tsx#L23-L49), login uses unmanaged React `useState` (`email`, `password`) and standard `<form onSubmit={handleSubmit}>`.
  - In [frontend/src/portals/candidate/pages/public/RegisterPage.tsx:18-70](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/candidate/pages/public/RegisterPage.tsx#L18-L70), registration uses an unmanaged object state (`form`, `confirmPassword`, `visibleToRecruiters`) with manually computed regex boolean flags for validation.
  - *Observation:* While the recruiter portal (`portals/org/pages/auth.tsx:49`) extensively uses `useForm` with `zodResolver`, the candidate auth pages do not yet leverage React Hook Form or Zod.

### 1.4 Styling System, Design Tokens & Dark Mode
- **Styling Architecture:** Tailwind CSS `^3.4.17` with PostCSS `^8.5.2` and Autoprefixer `^10.4.20`.
- **Dual Design Token Paradigm:**
  1. *Platform Design Tokens:* Defined in [frontend/src/styles/variables.css:1-31](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/styles/variables.css#L1-L31) and extended in [frontend/tailwind.config.ts:9-21](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/tailwind.config.ts#L9-L21).
     - Palette: `--color-primary: #E8630A` (Burnt Orange), `--color-background: #FAF7F2` (Warm Linen), `--color-surface: #FFFDF9`, `--color-text: #171614`.
     - Fonts: `--font-sans: 'DM Sans'`, `--font-heading: 'Fraunces'` (Serif).
  2. *Candidate Portal Scoped Tokens:* Defined in [frontend/src/portals/candidate/candidate.css:8-39](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/candidate/candidate.css#L8-L39), scoped under the wrapper class `.candidate-portal`:
     - Palette: Background `--cand-bg: #FFFFFF`, Alt `--cand-bg-alt: #F8FAFC`, Navy Text `--cand-text: #0F172A`, Muted Text `--cand-text-muted: #64748B`, Primary CTA `--cand-cta: #F97316` (Hover `#EA580C`), Secondary Accent `--cand-accent: #2563EB` (Hover `#1D4ED8`).
     - Fonts: Enforces `'Inter'` across all heading and input elements ([candidate.css:46-61](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/candidate/candidate.css#L46-L61)) via `@fontsource/inter`.
- **Dark Mode Support:**
  - **No dark mode support exists for the candidate portal.**
  - `tailwind.config.ts` does not specify `darkMode: 'class'`.
  - Neither `variables.css` nor `candidate.css` defines dark mode CSS variables or media queries. Isolated dark mode classes (`dark:text-blue-400`) appear only in platform admin reports.

### 1.5 Shared UI Components
- **Platform & Org UI Kit:** Located at [frontend/src/portals/org/ui/ui.tsx](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/org/ui/ui.tsx):
  - `Button` ([ui.tsx:34-54](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/org/ui/ui.tsx#L34-L54)): Supports `variant` (`primary` [indigo-600], `secondary`, `ghost`, `danger`, `success`), `size` (`sm`, `md`), and `loading` spinner.
  - `Input` ([ui.tsx:61-87](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/org/ui/ui.tsx#L61-L87)): Supports show/hide password toggle.
  - `Textarea` ([ui.tsx:89-94](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/org/ui/ui.tsx#L89-L94)), `Select` ([ui.tsx:96-105](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/org/ui/ui.tsx#L96-L105)), `Field` wrapper with labels/hints/errors ([ui.tsx:107-115](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/org/ui/ui.tsx#L107-L115)).
  - `Modal` ([ui.tsx:356-369](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/org/ui/ui.tsx#L356-L369)) and `Sheet` ([ui.tsx:336-354](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/org/ui/ui.tsx#L336-L354)) with escape-key listeners.
  - `Skeleton` & `PageSkeleton` ([ui.tsx:171-187](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/org/ui/ui.tsx#L171-L187)).
  - `Toaster` & `toast` in [frontend/src/portals/org/ui/toast.tsx:35-77](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/org/ui/toast.tsx#L35-L77).
- **Candidate-Specific Components:**
  - `JobCard` ([frontend/src/portals/candidate/components/JobCard.tsx:1-105](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/candidate/components/JobCard.tsx#L1-L105)): Renders job details, salary, work mode, and relative posted date.
  - `JobFilters` ([frontend/src/portals/candidate/components/JobFilters.tsx:1-175](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/candidate/components/JobFilters.tsx#L1-L175)): Multi-faceted search and filter panel.
  - `CompanyMonogram` ([frontend/src/portals/candidate/components/CompanyMonogram.tsx:1-35](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/candidate/components/CompanyMonogram.tsx#L1-L35)): Monogram logo fallback.
  - `QuickApplyModal` ([frontend/src/portals/candidate/components/QuickApplyModal.tsx:1-285](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/candidate/components/QuickApplyModal.tsx#L1-L285)): 1-click modal application submission.
  - `ProtectedCandidateRoute` ([frontend/src/portals/candidate/components/ProtectedCandidateRoute.tsx:1-38](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/candidate/components/ProtectedCandidateRoute.tsx#L1-L38)): Guards private candidate routes.
- **Layout Shells:**
  - `PublicLayout` ([frontend/src/portals/candidate/layout/PublicLayout.tsx:1-24](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/candidate/layout/PublicLayout.tsx#L1-L24)): Wraps public views with `<Navbar />` and `<Footer />`.
  - `Navbar` ([frontend/src/portals/candidate/layout/Navbar.tsx:1-160](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/candidate/layout/Navbar.tsx#L1-L160)): Renders navigation links, unauthenticated auth CTAs ("Sign In", "Create Account"), or authenticated candidate profile dropdown.
  - `Footer` ([frontend/src/portals/candidate/layout/Footer.tsx:1-90](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/candidate/layout/Footer.tsx#L1-L90)): Public discovery and recruiter links.
  - `Brand` ([frontend/src/components/common/Brand.tsx:1-13](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/components/common/Brand.tsx#L1-L13)).
  - `ErrorBoundary` ([frontend/src/components/common/ErrorBoundary.tsx:1-60](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/components/common/ErrorBoundary.tsx#L1-L60)).

### 1.6 Existing Auth & Landing Pages — Reusable vs. Replaceable

| Page / Component | File Path | Current Status | Recommendation |
| :--- | :--- | :--- | :--- |
| **HomePage** | `portals/candidate/pages/public/HomePage.tsx` | Functional discovery page with hero search, trending skills, and live jobs | **Keep & Enhance:** Retain hero search, live job feed, and company grid; upgrade with SEO meta tags, category carousels, and responsive micro-animations. |
| **LoginPage** | `portals/candidate/pages/public/LoginPage.tsx` | Basic unmanaged `useState` login form | **Refactor:** Replace manual form handling with React Hook Form + Zod schema; improve error mapping and accessibility. |
| **RegisterPage** | `portals/candidate/pages/public/RegisterPage.tsx` | Basic unmanaged form with inline password regex checks | **Refactor:** Migrate to React Hook Form + Zod; improve accessibility on real-time password checklist. |
| **PublicLayout** | `portals/candidate/layout/PublicLayout.tsx` | Container mounting Navbar + Outlet + Footer | **Reusable:** Well-structured; mount `Toaster` and an `ErrorBoundary` inside this layout. |
| **Navbar & Footer** | `portals/candidate/layout/{Navbar,Footer}.tsx` | Dynamic header with auth detection and links | **Reusable:** Clean, responsive, and handles active session state properly. |
| **JobCard & Filters**| `portals/candidate/components/{JobCard,JobFilters}.tsx` | Search, filtering, and job cards | **Reusable:** High-quality presentation with complete facet handling. |

---

## 2. Candidate Auth API Contract

### 2.1 Candidate Auth Endpoints
Backend routes are declared in [backend/src/modules/candidate/auth/candidate-auth.controller.ts](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/backend/src/modules/candidate/auth/candidate-auth.controller.ts#L48-L99):

| Action | HTTP Method | Endpoint | Auth Required | Rate Limit |
| :--- | :--- | :--- | :--- | :--- |
| **Register** | `POST` | `/api/v1/candidate/auth/register` | None (Public) | 10 req / 60s per IP ([controller.ts:54](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/backend/src/modules/candidate/auth/candidate-auth.controller.ts#L54)) |
| **Login** | `POST` | `/api/v1/candidate/auth/login` | None (Public) | 10 req / 60s per IP ([controller.ts:67](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/backend/src/modules/candidate/auth/candidate-auth.controller.ts#L67)) |
| **Get Session (`me`)** | `GET` | `/api/v1/candidate/auth/me` | Bearer JWT (Role: `CANDIDATE`) | Standard global limit |
| **Logout** | `POST` | `/api/v1/candidate/auth/logout` | Bearer JWT (Role: `CANDIDATE`) | Standard global limit |

#### Unsupported / Missing Auth Features
- **No Token Refresh Endpoint (`/refresh`):** The system issues a 24-hour access token. There is no refresh token endpoint.
- **No Self-Serve Password Reset (`/forgot-password`, `/reset-password`):** The backend provides no public candidate password reset endpoints.
- **No Email Verification Endpoint (`/verify-email`):** Candidates have an `isEmailVerified` flag set to `false`, but no verification endpoint exists.
- **No Social Login:** No Google, LinkedIn, or GitHub OAuth endpoints exist.

### 2.2 Request & Response Shapes, Validation Rules & Errors

#### 1. Candidate Registration
- **Request DTO:** `CandidateRegisterDto` in [backend/src/modules/candidate/auth/dto/candidate-register.dto.ts:22-59](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/backend/src/modules/candidate/auth/dto/candidate-register.dto.ts#L22-L59):
  ```typescript
  {
    email: string;               // Required, valid email, trimmed/lowercased, max 255 chars
    password: string;            // Required, max 100 chars, regex enforced:
                                 // /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/
                                 // (Min 8 chars, >=1 uppercase, >=1 number, >=1 special character)
    firstName: string;           // Required, trimmed, max 80 chars
    lastName: string;            // Required, trimmed, max 80 chars
    phone?: string;              // Optional, trimmed, max 30 chars
    visibleToRecruiters?: boolean; // Optional boolean (defaults to false)
  }
  ```
- **Success Response (HTTP 201 Created):**
  Unwrapped by `candidateAxios` from the standard NestJS envelope (`{ success: true, data: CandidateAuthResult }`):
  ```typescript
  {
    accessToken: string;         // JWT bearer token (expires in 1d)
    user: {
      id: string;                // UUIDv4
      email: string;
      firstName: string;
      lastName: string;
      role: "CANDIDATE";
      isEmailVerified: false;
    };
    profile: {
      id: string;                // CandidateProfile UUIDv4
      phone: string | null;
      headline: string | null;
      bio: string | null;
      location: string | null;
      experienceYears: number | null;
      currentCompany: string | null;
      skills: string[];          // string[]
    };
    sessionId: string;           // PlatformSession UUIDv4
    expiresAt: string;           // ISO 8601 timestamp (Date.now() + 24h)
  }
  ```
- **Error Codes:**
  - Duplicate Email: `HTTP 409 Conflict` $\rightarrow$ `{ success: false, error: { code: "CONFLICT", message: "An account with this email address already exists" } }` ([candidate-auth.service.ts:114](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/backend/src/modules/candidate/auth/candidate-auth.service.ts#L114)).
  - Validation Failure: `HTTP 400 Bad Request` $\rightarrow$ array of class-validator failure messages.

#### 2. Candidate Login
- **Request DTO:** `CandidateLoginDto` in [backend/src/modules/candidate/auth/dto/candidate-login.dto.ts:12-21](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/backend/src/modules/candidate/auth/dto/candidate-login.dto.ts#L12-L21):
  ```typescript
  {
    email: string;    // Required, valid email, trimmed/lowercased
    password: string; // Required, non-empty string
  }
  ```
- **Success Response (HTTP 200 OK):** Identical `CandidateAuthResult` payload as Registration.
- **Error Codes:**
  - Invalid Credentials: `HTTP 401 Unauthorized` $\rightarrow$ `{ success: false, error: { code: "UNAUTHORIZED", message: "Invalid credentials" } }` ([candidate-auth.service.ts:227, 235, 241, 247](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/backend/src/modules/candidate/auth/candidate-auth.service.ts#L227)).
  - *Timing Attack Protection:* Evaluates `bcrypt.compare(dto.password, DUMMY_HASH)` when email is nonexistent or role does not match ([candidate-auth.service.ts:225, 231](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/backend/src/modules/candidate/auth/candidate-auth.service.ts#L225)).

#### 3. Current User (`GET /api/v1/candidate/auth/me`)
- **Headers:** `Authorization: Bearer <accessToken>`.
- **Response (HTTP 200 OK):**
  ```typescript
  {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: "CANDIDATE";
    isEmailVerified: boolean;
    createdAt: string;
    profile: {
      id: string;
      phone: string | null;
      headline: string | null;
      bio: string | null;
      location: string | null;
      experienceYears: number | null;
      currentCompany: string | null;
      skills: string[];
      education: any[];
      experience: any[];
      resumeFileName: string | null;
      resumeUploadedAt: string | null;
      visibleToRecruiters: boolean;
      blockedOrganisations: string[];
    } | null;
  }
  ```

#### 4. Candidate Logout (`POST /api/v1/candidate/auth/logout`)
- **Headers:** `Authorization: Bearer <accessToken>`.
- **Behavior:** Revokes the active session row in `platform_sessions` (`revokedAt = new Date()`) ([candidate-auth.service.ts:371-374](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/backend/src/modules/candidate/auth/candidate-auth.service.ts#L371-L374)).
- **Response (HTTP 200 OK):** `{ message: "Logged out successfully" }`.

### 2.3 Token Issuance, Storage, CSRF & CORS
- **Token Format:** Signed JWT containing `{ sub: user.id, email: user.email, role: user.role, sessionId }` ([candidate-auth.service.ts:149-156](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/backend/src/modules/candidate/auth/candidate-auth.service.ts#L149-L156)).
- **Database Session Binding:** The SHA-256 hash of the access token is recorded in the `platform_sessions` table ([candidate-auth.service.ts:161-170](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/backend/src/modules/candidate/auth/candidate-auth.service.ts#L161-L170)). On every authenticated request, `JwtAuthGuard` ([backend/src/common/guards/jwt-auth.guard.ts:53-72](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/backend/src/common/guards/jwt-auth.guard.ts#L53-L72)) verifies that the session is neither revoked nor expired.
- **Storage Mechanism:** Stored client-side in `localStorage` under `clyptus_candidate_token` ([frontend/src/portals/candidate/lib/api.ts:10-26](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/candidate/lib/api.ts#L10-L26)).
  > [!NOTE]
  > As noted in `frontend/src/portals/candidate/lib/session.ts:5-10`, storing tokens in `localStorage` persists sessions across browser restarts, but introduces XSS vulnerability risks compared to `HttpOnly` cookie-backed sessions.
- **CSRF Handling:** Not applicable for ambient credentials since tokens are explicitly injected into the `Authorization: Bearer` header. The frontend also supplies `'X-Requested-With': 'XMLHttpRequest'`.
- **CORS Configuration:** Enforced in [backend/src/main.ts:49-64](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/backend/src/main.ts#L49-L64):
  - Allowed origins: `http://localhost:5173`, `http://localhost:3000`, `http://localhost:5174`, and `process.env.CORS_ORIGINS`.
  - Credentials: `credentials: true`.
  - Allowed headers: `['Content-Type', 'Authorization', 'X-Requested-With']`.

### 2.4 Rate Limiting & Lockout Behavior
- **Guard:** `RateLimiterGuard` ([backend/src/common/guards/rate-limiter.guard.ts:32-87](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/backend/src/common/guards/rate-limiter.guard.ts#L32-L87)).
- **Limits on Candidate Auth:** `@RateLimit({ points: 10, duration: 60 })` allows up to 10 attempts per 60 seconds per IP + URL path.
- **Lockout Response:** When exceeded, throws `HTTP 429 Too Many Requests` with a `Retry-After: <seconds>` response header ([rate-limiter.guard.ts:74-83](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/backend/src/common/guards/rate-limiter.guard.ts#L74-L83)):
  ```json
  {
    "statusCode": 429,
    "message": "Too many requests. Please try again after 48 seconds.",
    "error": "Too Many Requests"
  }
  ```
- **UI Requirement:** The UI must catch HTTP 429 errors, extract the `Retry-After` time, and display a temporary countdown disabling the submit button.

### 2.5 Role Isolation: Candidate vs. Organisation / Recruiter Users
- **Database Model:** All accounts share the `User` model with the `UserRole` enum ([backend/prisma/schema.prisma:253-260](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/backend/prisma/schema.prisma#L253-L260)):
  ```prisma
  enum UserRole {
    PLATFORM_SUPER_ADMIN
    PLATFORM_ADMIN
    ORGANISATION_SUPER_ADMIN
    ORGANISATION_ADMIN
    RECRUITER
    CANDIDATE
  }
  ```
- **Login Separation:**
  1. *Candidate Login (`POST /api/v1/candidate/auth/login`):*
     Checks `user.role !== UserRole.CANDIDATE` ([candidate-auth.service.ts:230-236](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/backend/src/modules/candidate/auth/candidate-auth.service.ts#L230-L236)). Any recruiter or admin attempting to login through candidate auth receives `401 Unauthorized ("Invalid credentials")`.
  2. *Organisation Login (`POST /api/v1/org/auth/login`):*
     Checks `isOrgRole(user.role)` ([backend/src/modules/org/auth/org-auth.service.ts:85](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/backend/src/modules/org/auth/org-auth.service.ts#L85)). Any candidate attempting to login through org auth receives `401 Unauthorized ("Invalid credentials")`.
  3. *Client Token Isolation:*
     - Platform portal uses `sessionStorage['clyptus_platform_access_token']`.
     - Org portal uses `sessionStorage['clyptus_org_token']`.
     - Candidate portal uses `localStorage['clyptus_candidate_token']`.

---

## 3. Public Data Available for the Landing Page

### 3.1 Public Job Discovery Endpoints
The backend provides dedicated, public endpoints for candidate job discovery without authentication:

1. **List Published Jobs:** `GET /api/v1/candidate/jobs` ([backend/src/modules/candidate/jobs/candidate-jobs.controller.ts:17-21](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/backend/src/modules/candidate/jobs/candidate-jobs.controller.ts#L17-L21))
   - **Authentication:** **None (Completely Public).**
   - **Supported Query Parameters (`CandidateJobQueryDto` in [candidate-jobs.dto.ts:10-57](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/backend/src/modules/candidate/jobs/candidate-jobs.dto.ts#L10-L57)):**
     - `search`: Searches `title` (ILIKE), `description` (ILIKE), or `requiredSkills` (array contains).
     - `location`: Case-insensitive partial match.
     - `workMode`: `REMOTE`, `HYBRID`, or `ONSITE`.
     - `employmentType`: `FULL_TIME`, `CONTRACT`, `PART_TIME`, `INTERNSHIP`, `TEMPORARY`.
     - `experienceMin`: Number of years.
     - `salaryMin`: Minimum compensation threshold.
     - `sort`: `'newest'` (default) or `'salary'`.
     - `page`: Page index (default 1).
     - `limit`: Items per page (default 20, max 100).
   - **Filter Logic:** Strictly scoped to `JobStatus.PUBLISHED`, active organisations (`OrganisationStatus.ACTIVE`), and non-expired deadlines ([candidate-jobs.service.ts:99-112](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/backend/src/modules/candidate/jobs/candidate-jobs.service.ts#L99-L112)).
   - **Response Payload:**
     ```typescript
     {
       items: Array<{
         id: string;
         title: string;
         companyId: string;
         companyName: string;
         companyLogo: string;
         location: string;
         workMode: "Remote" | "Hybrid" | "On-site";
         employmentType: "Full-time" | "Contract" | "Part-time" | "Internship" | "Temporary";
         experience: string;           // e.g. "3-5 yrs"
         salary: string;               // e.g. "₹12.0 LPA - ₹18.0 LPA"
         skills: string[];
         postedAt: string;             // ISO date
         description: string;
         responsibilities: string[];
         requirements: string[];
         benefits: string[];
         category: string;             // Derived from department || industry || 'Engineering'
         openings: number;
         deadline: string | null;
         status: string;
       }>;
       page: number;
       limit: number;
       total: number;
       totalPages: number;
     }
     ```

2. **Job Details:** `GET /api/v1/candidate/jobs/:id` ([candidate-jobs.controller.ts:23-27](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/backend/src/modules/candidate/jobs/candidate-jobs.controller.ts#L23-L27))
   - **Authentication:** **None (Completely Public).**
   - Returns full details for a single job opening.

3. **Public Token Plans:** `GET /api/v1/public/plans` ([backend/src/modules/public/public-organisation-application.controller.ts:42-46](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/backend/src/modules/public/public-organisation-application.controller.ts#L42-L46))
   - Returns active employer subscription and token packages. Useful for a recruiter CTA section.

### 3.2 What Can Be Done Without Login
- **Job Search & Browsing:** Candidates can search, filter by multiple facets, paginate, and read detailed job descriptions without logging in.
- **When is Authentication Required?** Authentication is required **only when submitting an application** via `POST /api/v1/candidate/applications` ([candidate-applications.controller.ts:28-32](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/backend/src/modules/candidate/applications/candidate-applications.controller.ts#L28-L32)), or accessing workspace pages (`/candidate/*`).

### 3.3 Data Aggregations on the Landing Page
- **Current Approach:** There are no dedicated endpoints for featured job badges, categories, or active hiring companies. The current `HomePage.tsx` ([HomePage.tsx:36-68](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/candidate/pages/public/HomePage.tsx#L36-L68)) fetches `GET /candidate/jobs?limit=50&sort=newest` and derives:
  - Top 8 trending skills (`derivedSkills` from unique job skill arrays).
  - Actively hiring companies (`companyMap` counting openings per company).
  - Total active job count (`data?.total`).

---

## 4. Production-Readiness Gaps

### 4.1 Accessibility (a11y)
- **Form Error Feedback:** In [frontend/src/portals/candidate/pages/public/LoginPage.tsx:62-67](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/candidate/pages/public/LoginPage.tsx#L62-L67), the error container lacks `role="alert"` and `aria-live="assertive"`.
- **Dynamic Password Checklist:** In [frontend/src/portals/candidate/pages/public/RegisterPage.tsx:145-181](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/candidate/pages/public/RegisterPage.tsx#L145-L181), real-time rule passes/failures are visually conveyed with icons but lack `aria-live="polite"` or `sr-only` feedback.
- **Missing Field Associations:** Form controls lack explicit `id` and `aria-describedby` associations connecting inputs to validation error messages.
- **Search Inputs:** Hero inputs in `HomePage.tsx:98-118` rely solely on `placeholder` attributes without accessible `<label>` or `aria-label` elements.

### 4.2 SEO & Social Graph (Open Graph / Twitter)
- **Document Title:** [frontend/index.html:6](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/index.html#L6) has `<title>Clyptus — Platform Portal</title>` hardcoded.
- **Missing Meta Tags:** `index.html` has no `<meta name="description">`, canonical URL link, or viewport theme color.
- **Open Graph & Twitter Cards:** Missing `og:title`, `og:description`, `og:image`, `og:type`, and `twitter:card`. Sharing job links on social media will yield blank link previews.
- **Dynamic Head Management:** No head management library (`react-helmet-async`) is installed. Page routes cannot dynamically inject page-specific titles or JSON-LD structured data (`JobPosting`).

### 4.3 Internationalization (i18n)
- **Status:** No i18n framework (`i18next`, `react-i18next`) is installed.
- All copy, button labels, and validation messages across candidate pages are hardcoded in English.

### 4.4 Analytics & Product Telemetry
- **Status:** No client-side analytics or product telemetry library (Google Tag Manager, PostHog, Mixpanel, or Segment) is integrated.
- Key candidate funnel events (landing page visits, keyword searches, filter toggles, registration attempts, and sign-up drop-offs) currently go untracked.

### 4.5 Environment & Configuration Handling
- **Missing Documentation:** The `frontend/` directory lacks `.env.example` or `.env` files.
- The base URL fallback `import.meta.env.VITE_API_URL || '/api/v1'` ([api.ts:37](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/portals/candidate/lib/api.ts#L37)) relies on Vite's local dev server proxy ([vite.config.ts:15-18](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/vite.config.ts#L15-L18)) to reach `http://127.0.0.1:3000`. Production build pipelines require documented environment variables.

### 4.6 Error Boundaries & Fallback UI
- **Candidate Portal Missing Boundary:** `ErrorBoundary` ([frontend/src/components/common/ErrorBoundary.tsx](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/components/common/ErrorBoundary.tsx)) is mounted only in `PlatformLayout.tsx` ([PlatformLayout.tsx:52](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/frontend/src/layouts/platform/PlatformLayout.tsx#L52)).
- An unhandled error during candidate landing page rendering or authentication will cause a white screen crash for the entire application.

### 4.7 Loading & Skeleton States
- The candidate landing page currently imports `PageSkeleton` from the organisation UI kit (`@/portals/org/ui/ui`), which renders an admin KPI grid (4 metric boxes + table skeleton) rather than job cards.

### 4.8 Backend Blockers & Sign-Up Friction Analysis
- **Stubbed Email Service:** In [backend/src/integrations/email/email.service.ts:29-32](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/backend/src/integrations/email/email.service.ts#L29-L32), `EmailService.sendMail` logs `[TODO: EMAIL DISPATCH]` to the console without sending actual emails.
- **Does this block candidate registration?**
  **NO.** [backend/src/modules/candidate/auth/candidate-auth.service.ts:98, 129](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/backend/src/modules/candidate/auth/candidate-auth.service.ts#L98) explicitly sets `isEmailVerified: false` upon registration and issues an active access token immediately. Candidate login ([candidate-auth.service.ts:212-248](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/backend/src/modules/candidate/auth/candidate-auth.service.ts#L212-L248)) does not require `isEmailVerified: true`.
- **Consequences of Stubbed Email & No Verification:**
  1. *Account Recovery Impossibility:* Because there is no email dispatch and no password recovery endpoint, a candidate who forgets their password cannot regain access.
  2. *Typo Lockout:* Candidates who mistype their email during sign-up cannot be reached and cannot fix their email.
  3. *ATS Profile Hijacking / Squatting:* In [backend/src/modules/candidate/applications/candidate-applications.service.ts:135-138](file:///c:/Users/hemas/Desktop/candidate-main/testing-final/backend/src/modules/candidate/applications/candidate-applications.service.ts#L135-L138), a newly registered candidate applying to a job is linked by email to any existing recruiter-created ATS candidate record:
     ```typescript
     // TODO: In production, linking an unverified portal account to a recruiter-created ATS candidate
     // by email should require verified email ownership to prevent unverified email squatting.
     ```
     An attacker could register with an executive's public email and apply to a job, merging into the recruiter's internal candidate record without proving email ownership.

---

## 5. Open Questions for the Product Owner

1. **Password Recovery Strategy:**  
   Since there is currently no backend endpoint or UI flow for candidate password reset (`/forgot-password`), what should the user experience be when a candidate clicks "Forgot password"? Should we implement the backend reset token workflow with SMTP email dispatch before launching candidate auth?
2. **Email Verification Timing:**  
   Currently, candidates can register, sign in, upload resumes, and submit job applications with `isEmailVerified: false`. Should email verification be mandatory before a candidate can apply for jobs, or should it remain non-blocking for launch?
3. **Design System & Visual Language:**  
   Should the candidate landing and auth experience align with the Warm Editorial Platform theme (`DM Sans` + `Fraunces` serif + `#E8630A` orange + `#FAF7F2` warm linen in `variables.css`) or standardize on the Modern Tech Clean palette (`Inter` + `#F97316` + `#2563EB` blue in `candidate.css`)?
4. **Landing Page Dynamic Aggregations:**  
   Should we add backend aggregation endpoints (e.g. `GET /api/v1/candidate/stats`, `GET /api/v1/candidate/categories`, `GET /api/v1/candidate/featured-jobs`) for the landing page, or continue deriving top companies and skill chips by fetching the 50 newest jobs on the client?
5. **Session Architecture (localStorage vs. HttpOnly Cookie):**  
   The candidate portal stores bearer tokens in `localStorage`. Is this acceptable for the initial production launch, or is pairing access tokens with an `HttpOnly` secure cookie / refresh flow required by your security policy?
6. **Social Sign-In (OAuth):**  
   Are candidate social logins (e.g., Google or LinkedIn 1-click sign-in) in scope for this milestone, or should the candidate landing page support email/password only?
7. **Onboarding Routing Post-Registration:**  
   Currently, registration navigates directly to the resume upload onboarding screen (`/candidate/resume?onboarding=true`). If a candidate arrived via a specific job link (`?next=/jobs/:id`), should they be returned directly to the job application modal after registering, or forced through resume upload first?
