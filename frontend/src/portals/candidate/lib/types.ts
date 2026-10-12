// ============================================================
// Clyptus Job Portal - Candidate Portal
// Type Definitions mirroring backend controllers, services & DTOs
// ============================================================

export type UserRole = 'CANDIDATE';

export type ApplicationStage =
  | 'APPLIED'
  | 'SCREENING'
  | 'SHORTLISTED'
  | 'INTERVIEW'
  | 'OFFER'
  | 'HIRED'
  | 'REJECTED';

export type WorkMode = 'Remote' | 'Hybrid' | 'On-site';
export type EmploymentType = 'Full-time' | 'Contract' | 'Part-time' | 'Internship' | 'Temporary';

export interface CandidateEducationItem {
  id?: string;
  degree?: string;
  institution?: string;
  fieldOfStudy?: string;
  startYear?: number;
  endYear?: number;
  grade?: string;
  description?: string;
}

export interface CandidateExperienceItem {
  id?: string;
  title?: string;
  company?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  description?: string;
}

export interface CandidateProfile {
  id: string;
  phone: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  experienceYears: number | null;
  currentCompany: string | null;
  skills: string[];
  education?: CandidateEducationItem[] | null;
  experience?: CandidateExperienceItem[] | null;
  resumeFileName?: string | null;
  resumeUploadedAt?: string | null;
}

export interface CandidateUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isEmailVerified: boolean;
  createdAt?: string;
}

export interface CandidateMeResult {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isEmailVerified: boolean;
  createdAt: string;
  profile: CandidateProfile | null;
}

export interface CandidateAuthResult {
  accessToken: string;
  user: CandidateUser;
  profile: CandidateProfile;
  sessionId: string;
  expiresAt: string;
}

export interface CandidateResumeMetadata {
  hasResume: boolean;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  uploadedAt: string | null;
  hasText?: boolean;
}

export interface CandidateJob {
  id: string;
  title: string;
  companyId: string;
  companyName: string;
  companyLogo: string;
  location: string;
  workMode: WorkMode;
  employmentType: EmploymentType;
  experience: string;
  salary: string;
  skills: string[];
  postedAt: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  category: string;
  openings: number;
  deadline: string | null;
  status: string;
}

export interface CandidateJobListResult {
  items: CandidateJob[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CandidateJobQueryParams {
  search?: string;
  location?: string;
  workMode?: string;
  employmentType?: string;
  category?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface CandidateApplicationHistory {
  id: string;
  fromStage: ApplicationStage | null;
  toStage: ApplicationStage;
  createdAt: string;
}

export interface CandidateApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  companyLogo: string;
  location: string;
  status: ApplicationStage;
  appliedAt: string;
  resume: {
    id: string;
    originalFileName: string;
    status: string;
  } | null;
  history?: CandidateApplicationHistory[];
}

export interface CandidateLoginRequest {
  email: string;
  password: string;
}

export interface CandidateRegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface UpdateCandidateProfileRequest {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phone?: string;
  headline?: string;
  location?: string;
  experienceYears?: number;
  currentCompany?: string;
  skills?: string[];
  bio?: string;
  education?: CandidateEducationItem[];
  experience?: CandidateExperienceItem[];
}

export interface CreateCandidateApplicationRequest {
  jobId: string;
  resumeId?: string;
  notes?: string;
}

export interface ApiError {
  code?: string;
  message?: string;
  details?: unknown;
  status?: number;
}
