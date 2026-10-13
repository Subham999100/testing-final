// ============================================================
// Clyptus Landing Page - Unit Tests for Pure Logic & Services
// Tests filtering logic, deterministic ATS scoring, and mock APIs
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  getCities,
  getJobs,
  getCompanies,
  getSwipeJobs,
  getAtsReport,
} from './services/landingApi';

describe('Landing Mock APIs & Pure Logic', () => {
  it('loads 12 Indian hiring cities with valid SVG coordinates', async () => {
    const cities = await getCities();
    expect(cities.length).toBe(12);
    cities.forEach((city) => {
      expect(city.name).toBeTruthy();
      expect(city.jobCount).toBeGreaterThan(0);
      expect(city.companyCount).toBeGreaterThan(0);
      expect(city.x).toBeGreaterThan(0);
      expect(city.x).toBeLessThan(1000);
      expect(city.y).toBeGreaterThan(0);
      expect(city.y).toBeLessThan(1100);
      expect(city.topSectors.length).toBeGreaterThan(0);
    });
  });

  it('filters jobs by keyword case-insensitively', async () => {
    const results = await getJobs({ keyword: 'python' });
    expect(results.length).toBeGreaterThan(0);
    results.forEach((job) => {
      const matchesTitle = job.title.toLowerCase().includes('python');
      const matchesSkill = job.skills.some((s) => s.toLowerCase().includes('python'));
      expect(matchesTitle || matchesSkill).toBe(true);
    });
  });

  it('filters jobs by work mode accurately', async () => {
    const remoteJobs = await getJobs({ workMode: 'Remote' });
    expect(remoteJobs.length).toBeGreaterThan(0);
    remoteJobs.forEach((job) => {
      expect(job.workMode).toBe('Remote');
    });
  });

  it('filters jobs by city accurately', async () => {
    const bengaluruJobs = await getJobs({ city: 'Bengaluru' });
    expect(bengaluruJobs.length).toBeGreaterThan(0);
    bengaluruJobs.forEach((job) => {
      expect(job.city).toBe('Bengaluru');
    });
  });

  it('generates deterministic ATS score from filename and size', async () => {
    const report1 = await getAtsReport('rahul_verma_resume.pdf', 300);
    const report2 = await getAtsReport('rahul_verma_resume.pdf', 300);

    expect(report1.overallScore).toBe(report2.overallScore);
    expect(report1.overallScore).toBeGreaterThanOrEqual(68);
    expect(report1.overallScore).toBeLessThanOrEqual(98);
    expect(report1.breakdown.keywords).toBeGreaterThan(0);
    expect(report1.breakdown.formatting).toBeGreaterThan(0);
    expect(report1.topFixes.length).toBe(3);
  });

  it('returns valid swipe deck recommendations', async () => {
    const deck = await getSwipeJobs();
    expect(deck.length).toBe(5);
    deck.forEach((job) => {
      expect(job.title).toBeTruthy();
      expect(job.salaryMinLpa).toBeGreaterThan(0);
      expect(job.matchScore).toBeGreaterThanOrEqual(80);
    });
  });
});
