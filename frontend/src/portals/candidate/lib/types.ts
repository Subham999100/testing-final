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
  | 'REJECTED'
  | 'WITHDRAWN';

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
  company?: string;
  jobTitle?: string;
  employmentType?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  currentJob?: boolean;
  description?: string;
}

export interface CandidateProjectItem {
  id?: string;
  title: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  url?: string;
  description?: string;
  technologies?: string[];
}

export interface CandidateCertificationItem {
  id?: string;
  name: string;
  issuingOrg: string;
  issuer?: string;
  issueDate?: string;
  expiryDate?: string;
  credentialId?: string;
  credentialUrl?: string;
  url?: string;
}

export interface CandidateLanguageItem {
  name: string;
  proficiency: string; // 'Basic' | 'Conversational' | 'Fluent' | 'Native'
}

export interface CandidateProfile {
  id: string;
  phone: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  experienceYears: number | null;
  currentCompany: string | null;
  coverUrl?: string | null;
  openToWork?: boolean | null;
  fromResumeSections?: string[];
  skills: string[];
  education?: CandidateEducationItem[] | null;
  experience?: CandidateExperienceItem[] | null;
  projects?: CandidateProjectItem[] | null;
  certifications?: CandidateCertificationItem[] | null;
  languages?: Array<{ name: string; proficiency: string }> | string[] | null;
  resumeFileName?: string | null;
  resumeUploadedAt?: string | null;
  visibleToRecruiters?: boolean;
  blockedOrganisations?: string[];
}

export type OnboardingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';
export type VideoInterviewStatus = 'NOT_STARTED' | 'SKIPPED' | 'IN_PROGRESS' | 'COMPLETED';

export interface CompletionSectionScore {
  weight: number;
  earned: number;
  completed: boolean;
  hint: string;
}

export interface OnboardingStatusResponse {
  onboardingStatus: OnboardingStatus;
  onboardingStep: number;
  videoInterviewStatus: VideoInterviewStatus;
  completionScore: number;
  completionBreakdown: Record<string, CompletionSectionScore>;
  isComplete: boolean;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
    fullName?: string;
    isEmailVerified: boolean;
  };
  profile: any;
}

export interface CandidateFullProfile {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string | null;
  fullName: string;
  role: UserRole;
  isEmailVerified: boolean;
  phone: string | null;
  phoneCountryCode?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  isFresher?: boolean;
  photoUrl?: string | null;
  coverUrl?: string | null;
  openToWork?: boolean | null;
  fromResumeSections?: string[];
  headline: string | null;
  location: string | null;
  experienceYears: number | null;
  experienceMonths?: number;
  currentJobTitle?: string | null;
  currentCompany: string | null;
  currentSalary?: number | null;
  expectedSalary?: number | null;
  noticePeriod?: string | null;
  preferredLocations?: string[];
  preferredJobTypes?: string[];
  preferredWorkModes?: string[];
  skills: string[];
  bio: string | null;
  education: CandidateEducationItem[];
  experience: CandidateExperienceItem[];
  projects?: CandidateProjectItem[];
  certifications?: CandidateCertificationItem[];
  languages?: Array<{ name: string; proficiency: string }> | string[];
  socialLinks?: Record<string, string>;
  resume: CandidateResumeMetadata;
  onboardingStatus?: OnboardingStatus;
  onboardingStep?: number;
  videoInterviewStatus?: VideoInterviewStatus;
  completionScore?: number;
  completionBreakdown?: Record<string, CompletionSectionScore>;
  visibleToRecruiters?: boolean;
  blockedOrganisations?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CandidateUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  fullName?: string;
  role: UserRole;
  isEmailVerified: boolean;
  createdAt?: string;
}

export interface CandidateMeResult {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  fullName?: string;
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
  visibleToRecruiters?: boolean;
}

export interface UpdateCandidateProfileRequest {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phone?: string;
  phoneCountryCode?: string;
  dateOfBirth?: string;
  gender?: string;
  isFresher?: boolean;
  photoUrl?: string;
  coverUrl?: string;
  openToWork?: boolean;
  headline?: string;
  location?: string;
  experienceYears?: number;
  experienceMonths?: number;
  currentJobTitle?: string;
  currentCompany?: string;
  currentSalary?: number;
  expectedSalary?: number;
  noticePeriod?: string;
  preferredLocations?: string[];
  preferredJobTypes?: string[];
  preferredWorkModes?: string[];
  skills?: string[];
  bio?: string;
  education?: CandidateEducationItem[];
  experience?: CandidateExperienceItem[];
  projects?: CandidateProjectItem[];
  certifications?: CandidateCertificationItem[];
  languages?: Array<{ name: string; proficiency: string }> | string[];
  socialLinks?: Record<string, string>;
  visibleToRecruiters?: boolean;
  blockedOrganisations?: string[];
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
  rawMessages?: string[];
}
