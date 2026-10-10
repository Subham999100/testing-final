export interface CareerEntry {
  level?: string;
  industry?: string;
  startMonth?: string;
  endMonth?: string;
  current?: boolean;
  title: string;
  organisation: string;
  period?: string;
  description?: string;
}
export interface ITSkill {
  name: string;
  version?: string;
  lastUsed?: string;
  months?: number;
}
export interface SearchDetails {
  workAuthorisations?: string[];
  servingNotice?: boolean;
  educationComplete?: boolean;
  emailOptOut?: boolean;
  languages?: string[];
  insights?: string[];
  portfolioUrl?: string;
  dateOfBirth?: string;
  age?: number | string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
}
export interface ProfessionalProfile {
  searchDetails?: SearchDetails;
  summary: string;
  designation: string;
  industry: string;
  experienceMonths: number;
  currentSalary: number | null;
  expectedSalary: number | null;
  noticePeriodDays: number | null;
  preferredLocations: string[];
  employmentPreference: string;
  workPreference: string;
  employment: CareerEntry[];
  education: CareerEntry[];
  certifications: CareerEntry[];
  itSkills: ITSkill[];
  lastActiveAt?: string | null;
  updatedAt?: string;
}
export interface TalentCard {
  source?: string | null;
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  headline: string | null;
  location: string | null;
  currentCompany: string | null;
  experienceYears: number | null;
  skills: string[];
  saved: boolean;
  createdAt: string;
  updatedAt?: string;
  professional: ProfessionalProfile | null;
  matchingSkills?: string[];
  skillCoverage?: number;
  aiReason?: string;
  viewCount?: number;
  downloadCount?: number;
  hasResume?: boolean;
  unlocked?: boolean;
}
export interface TalentDetail extends TalentCard {
  hasResume: boolean;
  unlocked: boolean;
  unlockCost: number;
  viewers: number;
  contact: {
    email: string;
    phone: string | null;
    resumeText: string | null;
    resumeUrl: string | null;
  } | null;
  applications: {
    id: string;
    stage: string;
    job: { id: string; title: string; status: string };
  }[];
  notes: { id: string; body: string; author: string; createdAt: string }[];
}
export interface Folder {
  id: string;
  name: string;
  _count: { candidates: number };
}
export interface SavedSearch {
  id: string;
  name: string;
  shared: boolean;
  owned: boolean;
  filters: Record<string, string | number | boolean>;
}
export const root = "/org/recruiter";
export const talentKeys = ["org", "recruiter"] as const;
