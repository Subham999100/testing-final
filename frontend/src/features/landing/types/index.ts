// ============================================================
// Clyptus Landing Page - Type Definitions
// Defines contracts for mock services, India map, interactive demos,
// and candidate discovery data structures.
// ============================================================

export type WorkMode = 'Remote' | 'Hybrid' | 'Onsite';

export interface City {
  id: string;
  name: string;
  state: string;
  // Normalized SVG canvas coordinates (0-1000 width x 0-1100 height)
  x: number;
  y: number;
  jobCount: number;
  companyCount: number;
  topSectors: string[];
  description: string;
}

export interface Company {
  id: string;
  name: string;
  monogram: string;
  industry: string;
  city: string;
  openRolesCount: number;
  cultureTags: string[];
  hiringNow: boolean;
  blurb: string;
  jobs?: Job[];
}

export interface Job {
  id: string;
  title: string;
  companyId: string;
  companyName: string;
  companyMonogram: string;
  city: string;
  workMode: WorkMode;
  experience: string;
  salaryMinLpa: number;
  salaryMaxLpa: number;
  category: string;
  postedTime: string;
  skills: string[];
  blurb: string;
  matchScore?: number;
}

export interface RoleCategory {
  id: string;
  name: string;
  iconName: string;
  jobCount: number;
  slug: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  city: string;
  company: string;
  quote: string;
  rating: number;
}

export interface AtsFix {
  id: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  recommendation: string;
}

export interface AtsReport {
  overallScore: number;
  fileName: string;
  fileSizeKb: number;
  breakdown: {
    keywords: number;
    formatting: number;
    impact: number;
    readability: number;
  };
  topFixes: AtsFix[];
}

export interface SwipeJob extends Job {
  tags: string[];
}

export interface JobFilters {
  category?: string;
  workMode?: string;
  experience?: string;
  city?: string;
  keyword?: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface CareerResource {
  id: string;
  title: string;
  category: string;
  readTime: string;
  summary: string;
}
