// ============================================================
// Clyptus Landing Page - Mock API Services Layer
// All landing components must consume data via this abstraction.
// Swapping mock services with real backend endpoints only requires
// updating this file in the future.
// ============================================================

import {
  MOCK_CITIES,
  MOCK_COMPANIES,
  MOCK_JOBS,
  MOCK_SWIPE_JOBS,
  MOCK_ROLE_CATEGORIES,
  MOCK_TESTIMONIALS,
  MOCK_FAQS,
  MOCK_CAREER_RESOURCES,
} from '../data/mockData';
import {
  City,
  Company,
  Job,
  JobFilters,
  RoleCategory,
  Testimonial,
  AtsReport,
  FaqItem,
  CareerResource,
} from '../types';

const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch all hiring cities with coordinates and job metrics
 * TODO: Replace with GET /api/v1/candidate/discovery/cities
 */
export async function getCities(): Promise<City[]> {
  await delay(80);
  return [...MOCK_CITIES];
}

/**
 * Fetch specific city detail with associated companies and roles
 * TODO: Replace with GET /api/v1/candidate/discovery/cities/:cityId
 */
export async function getCityDetail(cityId: string): Promise<{
  city: City;
  companies: Company[];
  jobs: Job[];
}> {
  await delay(120);
  const city = MOCK_CITIES.find(
    (c) => c.id.toLowerCase() === cityId.toLowerCase() || c.name.toLowerCase() === cityId.toLowerCase(),
  ) || MOCK_CITIES[0];

  const cityCompanies = MOCK_COMPANIES.filter(
    (c) => c.city.toLowerCase() === city.name.toLowerCase(),
  );

  const cityJobs = MOCK_JOBS.filter(
    (j) => j.city.toLowerCase() === city.name.toLowerCase(),
  );

  // Attach jobs to companies
  const enrichedCompanies = (cityCompanies.length ? cityCompanies : MOCK_COMPANIES.slice(0, 4)).map((c) => ({
    ...c,
    jobs: cityJobs.filter((j) => j.companyId === c.id),
  }));

  return {
    city,
    companies: enrichedCompanies,
    jobs: cityJobs,
  };
}

/**
 * Fetch filtered jobs list for Discovery & Search sections
 * TODO: Replace with GET /api/v1/candidate/discovery/jobs
 */
export async function getJobs(filters: JobFilters = {}): Promise<Job[]> {
  await delay(100);
  let result = [...MOCK_JOBS];

  if (filters.keyword && filters.keyword.trim()) {
    const q = filters.keyword.toLowerCase().trim();
    result = result.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.skills.some((s) => s.toLowerCase().includes(q)) ||
        j.companyName.toLowerCase().includes(q),
    );
  }

  if (filters.city && filters.city.trim()) {
    const c = filters.city.toLowerCase().trim();
    result = result.filter((j) => j.city.toLowerCase().includes(c));
  }

  if (filters.category && filters.category !== 'all') {
    const cat = filters.category.toLowerCase();
    result = result.filter((j) => j.category.toLowerCase().includes(cat));
  }

  if (filters.workMode && filters.workMode !== 'all') {
    result = result.filter(
      (j) => j.workMode.toLowerCase() === filters.workMode?.toLowerCase(),
    );
  }

  return result;
}

/**
 * Fetch top hiring companies with cultural tags
 * TODO: Replace with GET /api/v1/candidate/discovery/companies
 */
export async function getCompanies(): Promise<Company[]> {
  await delay(90);
  return [...MOCK_COMPANIES];
}

/**
 * Fetch candidate recommendation deck for Swipe to Apply
 * TODO: Replace with GET /api/v1/candidate/recommendations/swipe-deck
 */
export async function getSwipeJobs(): Promise<Job[]> {
  await delay(80);
  return [...MOCK_SWIPE_JOBS];
}

/**
 * Deterministic client-side ATS analysis simulation
 * TODO: Replace with POST /api/v1/candidate/resume/ats-analyze
 */
export async function getAtsReport(
  fileName = 'sample_resume.pdf',
  fileSizeKb = 340,
): Promise<AtsReport> {
  // Artificial 1.8s delay to simulate complex parsing
  await delay(1800);

  // Deterministic calculation based on file name characteristics
  const nameHash = fileName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const baseScore = 72 + (nameHash % 22); // between 72 and 93

  return {
    overallScore: Math.min(96, Math.max(68, baseScore)),
    fileName,
    fileSizeKb,
    breakdown: {
      keywords: Math.min(98, baseScore + 4),
      formatting: Math.min(95, baseScore - 2),
      impact: Math.min(92, baseScore - 6),
      readability: Math.min(96, baseScore + 3),
    },
    topFixes: [
      {
        id: 'fix-1',
        severity: 'high',
        title: 'Missing Quantitative Business Metrics',
        recommendation:
          'Add concrete measurable metrics (e.g. "reduced latency by 35%", "scaled to 2M DAU") under key achievements.',
      },
      {
        id: 'fix-2',
        severity: 'medium',
        title: 'Non-Standard Section Headers',
        recommendation:
          'Use recognized ATS taxonomy like "Professional Experience" and "Core Competencies" rather than bespoke labels.',
      },
      {
        id: 'fix-3',
        severity: 'low',
        title: 'Multi-Column Table Layout Detected',
        recommendation:
          'Single-column chronological layouts ensure 99.4% parsing accuracy across older enterprise applicant tracking software.',
      },
    ],
  };
}

/**
 * Fetch role categories with live job counts
 * TODO: Replace with GET /api/v1/candidate/discovery/categories
 */
export async function getRoleCategories(): Promise<RoleCategory[]> {
  await delay(60);
  return [...MOCK_ROLE_CATEGORIES];
}

/**
 * Fetch candidate verified reviews & testimonials
 * TODO: Replace with GET /api/v1/candidate/marketing/testimonials
 */
export async function getTestimonials(): Promise<Testimonial[]> {
  await delay(60);
  return [...MOCK_TESTIMONIALS];
}

/**
 * Fetch frequently asked questions
 * TODO: Replace with GET /api/v1/candidate/marketing/faqs
 */
export async function getFaqs(): Promise<FaqItem[]> {
  await delay(50);
  return [...MOCK_FAQS];
}

/**
 * Fetch career resources and guides
 * TODO: Replace with GET /api/v1/candidate/marketing/resources
 */
export async function getCareerResources(): Promise<CareerResource[]> {
  await delay(50);
  return [...MOCK_CAREER_RESOURCES];
}
