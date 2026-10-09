# Clyptus Platform Super Admin Documentation

Welcome to the documentation for the **Platform Super Admin** module of the Clyptus Multi-Organisation Job Portal Platform.

---

## 1. Documentation Index

- [Architecture Guide](./architecture/platform-super-admin.md) — High-level architecture, module boundaries, tenant isolation, and security topology.
- [Module Overview](./platform-super-admin/overview.md) — Responsibilities, functional boundaries, and non-goals.
- [Frontend Documentation](./platform-super-admin/frontend.md) — Routes, UI layouts, components, state management, and mock layer.
- [Backend Documentation](./platform-super-admin/backend.md) — NestJS architecture, controllers, services, guards, and interceptors.
- [API Contract Specification](./platform-super-admin/api.md) — Exhaustive REST endpoint specifications with authorization and payload definitions.
- [Database & Prisma Schema](./platform-super-admin/database.md) — PostgreSQL models, relations, indexes, and migrations.
- [Security & Access Control](./platform-super-admin/security.md) — RBAC, fine-grained permissions, and privilege hierarchy safeguards.
- [Audit Logging Specification](./platform-super-admin/audit-logging.md) — Centralized audit mechanism and secret-redaction rules.
- [Token Economy & Ledger](./platform-super-admin/token-system.md) — Immutable ledger design, atomic operations, and plan management.
- [Integration Handoff](./platform-super-admin/integration-handoff.md) — Upstream/downstream contracts and external service adapters.
- [Implementation Summary](./platform-super-admin/IMPLEMENTATION_SUMMARY.md) — Summary of files created, modified, and operational status.
- [Next Developer Handoff](./platform-super-admin/NEXT-DEVELOPER-HANDOFF.md) — Transition guidance for incoming engineering teams.
- [Development Journal](./platform-super-admin/DEVELOPMENT_JOURNAL.md) — Chronological implementation history.
- [Changelog](./changelog/platform-super-admin.md) — Version and feature release history.

---

## 2. Quick Start

### Backend
```bash
cd project/backend
npm install
npx prisma generate
npm test
npm run start:dev
```

### Frontend
```bash
cd project/frontend
npm install
npm run dev
```
Navigate to `http://localhost:5173/platform`.
