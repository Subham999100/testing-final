# Clyptus Hiring — Recruiter Portal Integration

## Inputs and merge policy

- **Base:** `testing-final(8).zip` — treated as the authoritative current Clyptus platform and Organisation Super Admin application.
- **Recruiter source:** `recruiter-final-main.zip` — recruiter UI, API, data models and recruiter-specific workflow improvements.
- **Policy:** additive integration rather than replacing the base repository. No live database, GitHub remote, user credentials, or deployment was modified.

## Wired into the merged code

| Surface | Integration |
| --- | --- |
| Organisation routes | Existing `/org/*` shell and all base Organisation Super Admin routes retained. Recruiter dashboard and candidate search/detail switch to the recruiter UI for the `RECRUITER` role. |
| Recruiter navigation | Dedicated recruiter top navigation, advanced candidate search, folders, reports, and actions. Non-recruiter and super-admin navigation from the base remains. |
| Recruiter API | NestJS `RecruiterController` and `RecruiterService` registered in the existing `OrgModule` with reports and outreach providers, reusing the base auth/context, Prisma, event and AI services. |
| Existing workflow | Recruiter-specific job date filters, application pipeline paging/search, notes, AI content generation and interview/offer action pages integrated with existing services. |
| Database | Base `schema.prisma` kept (including Organisation Application verification and Platform Notification models); recruiter models, Candidate relations, and 3 recruiter migrations added. |
| Dependencies | Additive package/lockfile dependencies for reports, SMTP and recruiter UI fonts. Actual install is required on the deployment machine. |
| Configuration | Existing `.env.example` files retained. Recruiter outreach example in `backend/recruiter-email.env.example` added. |

## Important conflict decisions

- All base **Platform Super Admin / Organisation Super Admin** modules, routes, verification workflows, notifications, permissions management and storage providers were **kept**.
- The recruiter GitHub snapshot changed shared Organisation Super Admin dashboard, recruiters/roles management UI and authentication. Those changes were **not copied** over the newer base. The recruiter dashboard is kept separately in `frontend/src/portals/org/pages/dashboard-recruiter.tsx`.
- The base security behavior for initial password changes and recruiter password management is preserved. This differs from the recruiter snapshot, which bypassed first-login password changes for recruiters. Reconcile this explicitly with your product/security team before changing it.
- The recruiter workspace migration from the repo had the lexicographically early name `0261006090000_recruiter_workspace`. For a **fresh installation**, it was renamed to `20261007120000_recruiter_workspace` to ensure it runs **after** initial Organisation portal migrations and **before** outreach/downloads migrations. **Do not deploy this renamed migration blindly to a DB that already applied the old migration name.** Review its migration history first.
- PDF generation uses PDFKit's built-in font as fallback if `backend/assets/fonts/DejaVuSans.ttf` is absent. To support non-Latin PDF text, provide a suitable licensed Unicode font in the deployment environment; no font binaries are bundled in this merged artifact.

## Local setup and checks to run

Requires Node.js, PostgreSQL and all services declared in the base project's setup and environment samples. Keep secrets outside source control.

```bash
# Backend
cd backend
npm ci
# Set DATABASE_URL and other variables in your own non-committed .env
npx prisma generate
npx prisma migrate deploy
npm run typecheck
npm run build
npm test -- --runInBand

# Frontend (from root)
cd ../frontend
npm ci
npm run typecheck
npm run build
npm test
```

Then sign in as (1) Platform Super Admin, (2) Organisation Super Admin, (3) Recruiter and verify: platform verification + notifications, recruiter dashboard, search/filter and detail pages, save folder, jobs and pipeline actions, interview/offer creation, report exports, SMTP/WhatsApp/SMS *only when integrations are configured*, and permissions/role isolation. Real-time events require a configured backend and database.

## Verification performed in this merge environment

- Both provided ZIP files were extracted and structurally compared.
- All merged TS and TSX files were parsed using TypeScript's compiler API: **185 TS and 129 TSX source files, no syntax errors**.
- All **1,071 relative TypeScript imports** resolved to a file or directory entry; zero missing imports.
- Prisma schema model/enum declarations checked for duplicate names; the base verification models and recruiter models are both present.
- Frontend and backend package manifests match their corresponding lockfile root dependencies.

**Not yet verified:** a successful `npm ci` (external package downloads stalled in this environment), Prisma client generation / migration against a real PostgreSQL database, TypeScript semantic typecheck, tests, build, or live frontend-to-backend/database/external service connectivity. These must be run before production deployment. A source merge does not constitute runtime verification.
