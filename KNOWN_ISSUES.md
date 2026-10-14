# Known Issues & Operational Notes

## 1. Local Storage for Resumes
- In the local development environment, candidate uploaded resumes are persisted to `./storage_vault` using the local disk adapter.
- Production deployments should set `STORAGE_ADAPTER=s3` or configure dedicated cloud bucket storage.

## 2. Recruiter Frontend Packages
- `testing-final/frontend` requires `node_modules` installed locally (`npm install`). Installed and verified during Stage 4 integration testing.

## 3. Demo Email Verification
- Per the demo requirements and deadline specifications, candidate registration does not enforce SMTP email verification links before login/application creation.

## 4. Concurrent Application Submissions
- Duplicate and concurrent applications are protected via composite database unique constraints (`jobId`, `candidateId`) and transaction isolation. On race conditions, the secondary request is caught cleanly and returns `409 Conflict` (idempotent, never 500).
