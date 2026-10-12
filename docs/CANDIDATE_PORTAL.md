# Clyptus Candidate Portal Documentation

The Candidate Portal enables job seekers to discover open requisitions, manage resumes, build profiles, and track applications across multiple hiring organisations.

---

## 1. Running the System Locally

### Backend (Port 3000)
Connect to PostgreSQL container `clyptus-postgres` on port 5434 (`clyptus_unified_dev`):

```bash
cd testing-final/backend

# Windows CMD session
set DATABASE_URL=postgresql://postgres:postgres@localhost:5434/clyptus_unified_dev?schema=public
node dist/src/main

# Or development mode with auto-reload
set DATABASE_URL=postgresql://postgres:postgres@localhost:5434/clyptus_unified_dev?schema=public
npm run start:dev
```

### Frontend (Port 5173)
Start the Vite development server:

```bash
cd testing-final/frontend
npm run dev
```

The frontend will run on `http://localhost:5173/` and proxies/calls API requests to `http://localhost:3000/api/v1`.

---

## 2. Environment Variables

### Backend
| Variable | Default / Local Development | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5434/clyptus_unified_dev?schema=public` | PostgreSQL connection string |
| `PORT` | `3000` | HTTP service port |
| `JWT_SECRET` | Configured in backend config | Token signing secret |
| `STORAGE_DRIVER` | `local` | Storage driver (`local` vault directory in backend) |

### Frontend
| Variable | Default / Local Development | Description |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `http://localhost:3000/api/v1` | Backend REST API base URL |

---

## 3. Route Map

### Candidate Portal (Public & Workspace)
| Route | Access | Description |
| :--- | :--- | :--- |
| `/` | Public | Candidate landing page with hero search, popular skills, latest published jobs, and hiring partners |
| `/jobs` | Public | Job directory with search, location, work mode, and employment type filters |
| `/jobs/:id` | Public | Job detail view with company overview, requirements, salary, and quick apply |
| `/login` | Public | Candidate login page (supports `?next=` redirect) |
| `/register` | Public | Candidate registration page |
| `/candidate/dashboard` | Candidate Auth | Candidate workspace dashboard with profile completeness and recent applications |
| `/candidate/profile` | Candidate Auth | Comprehensive profile editor (bio, headline, skills, location, experience, education) |
| `/candidate/resume` | Candidate Auth | Resume vault (upload PDF/DOCX, preview, download, delete with modal confirm) |
| `/candidate/applications` | Candidate Auth | My Applications list with real-time status badges |
| `/candidate/applications/:id` | Candidate Auth | Application detail view with stage progression history timeline |

### Recruiter & Platform Portals
| Route | Access | Description |
| :--- | :--- | :--- |
| `/org/login` | Public | Organisation recruiter login |
| `/org/candidates` | Recruiter Auth | Talent pool list for the recruiter's organisation |
| `/org/applications` | Recruiter Auth | Applications pipeline across all jobs in the organisation |
| `/org/jobs/:id/pipeline` | Recruiter Auth | Job-specific ATS pipeline with drag-and-drop / stage actions |
| `/platform/login` | Public | Platform portal selection |
| `/platform/super-admin/login` | Public | Platform Super Admin login |
| `/platform/admin/login` | Public | Platform Admin login |

---

## 4. End-to-End Demo Script (Demo Credentials Only)

### Demo Credentials
* **Acme Corporation Recruiter:** `priya@acme.com` / `Clyptus@2026`
* **Zenith Technologies Recruiter:** `recruiter@zenithtech.io` / `Clyptus@2026`
* **Existing Verified Candidate:** `phase3.realcandidate@example.com` / `Password123!`
* **Platform Super Admin:** `superadmin@clyptus.platform` / `SuperAdmin@123456!`

### Step-by-Step Flow
1. **Public Discovery:**
   - Navigate to `http://localhost:5173/`
   - Search for keyword `"React"` or filter by location `"Bengaluru"`
   - Open a job detail page at `/jobs/<job-id>`
2. **Registration & Onboarding:**
   - Click **Sign Up** (`/register`) and register a new candidate
   - Redirects to `/candidate/dashboard`
   - Upload a PDF resume at `/candidate/resume`
   - Edit headline, location, and skills at `/candidate/profile`
3. **Application Submission:**
   - Navigate to `/jobs`
   - Apply to an Acme Corporation position
   - Check `/candidate/applications` — see **Applied** badge
4. **Recruiter Stage Transition:**
   - Log into `/org/login` as `priya@acme.com`
   - Open `/org/applications` or the job pipeline
   - Open the application detail: view applicant contact and resume **without token cost** (token balance remains unchanged)
   - Move application from `APPLIED` to `SHORTLISTED`
5. **Candidate Real-Time Sync:**
   - Switch back to Candidate Portal (`/candidate/applications`)
   - Refresh: status updates to **Shortlisted**
   - Click into application: see stage history timeline (`Application submitted` $\rightarrow$ `Moved to Shortlisted`)
6. **Cross-Organisation Isolation:**
   - Log into `/org/login` as `recruiter@zenithtech.io`
   - Verify Zenith recruiter cannot see the Acme application or candidate

---

## 5. Architectural Policies & Known Limitations

1. **Token Storage:**
   Candidate JWT token is stored under `clyptus_candidate_token` in `localStorage`. In a production release, migrating to secure, `HttpOnly`, `SameSite=Strict` cookies is recommended to mitigate XSS vectors.
2. **Local Resume Storage:**
   Uploaded resumes are stored on disk in the backend `storage_vault/resumes/` folder using the `LocalStorageProvider`. For multi-instance production deployments, configure S3/GCS object storage.
3. **Unverified Email Accounts:**
   Registration automatically activates candidate access without email OTP verification for demo convenience.
4. **Talent Discovery Scope:**
   Recruiters cannot browse candidates who registered on the candidate portal but have not applied to their organisation. Candidates only enter an organisation's ATS talent pool when they submit an application or are manually sourced.
5. **Direct Applicant Resume Access:**
   Inbound applicants who submitted an application to an organisation are free to view by that organisation (`unlockCost = 0`, no token charges). External sourced talent remains token-gated (2 tokens per resume unlock).
6. **Out of Scope Features:**
   Saved jobs bookmarks, candidate profile photos, real-time chat, interview scheduling self-service, and in-app notifications are intentionally omitted from Candidate Portal MVP.
