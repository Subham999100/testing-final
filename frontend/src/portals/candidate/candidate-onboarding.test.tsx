// ============================================================
// Clyptus Job Portal - Candidate Portal
// Unit & Integration Tests: Candidate Onboarding & Scoring System
// ============================================================

import { describe, it, expect } from 'vitest';
import { inrToWords, INDIAN_CITIES, SKILLS_TAXONOMY } from './lib/constants';
import { sanitizeNextUrl } from './lib/url';

describe('Candidate Onboarding & Profile Helpers', () => {
  describe('inrToWords (Indian Salary Verbalizer)', () => {
    it('correctly converts Lakhs and Crores', () => {
      expect(inrToWords(700000)).toBe('Seven Lakh Rupees per year');
      expect(inrToWords(1200000)).toBe('Twelve Lakh Rupees per year');
      expect(inrToWords(10000000)).toBe('One Crore Rupees per year');
      expect(inrToWords(50000)).toBe('Fifty Thousand Rupees per year');
    });

    it('handles zero and negative amounts safely', () => {
      expect(inrToWords(0)).toBe('');
      expect(inrToWords(-100)).toBe('');
      expect(inrToWords(null)).toBe('');
    });
  });

  describe('sanitizeNextUrl (Open-Redirect Prevention)', () => {
    it('accepts safe relative paths', () => {
      expect(sanitizeNextUrl('/candidate/profile')).toBe('/candidate/profile');
      expect(sanitizeNextUrl('/candidate/jobs/123')).toBe('/candidate/jobs/123');
      expect(sanitizeNextUrl('/jobs?q=engineer')).toBe('/jobs?q=engineer');
    });

    it('rejects protocol relative URLs (//evil.com)', () => {
      expect(sanitizeNextUrl('//evil.com')).toBe('/candidate/profile');
      expect(sanitizeNextUrl('//evil.com/phish')).toBe('/candidate/profile');
    });

    it('rejects absolute URLs (http://evil.com, https://phish.com)', () => {
      expect(sanitizeNextUrl('https://evil.com')).toBe('/candidate/profile');
      expect(sanitizeNextUrl('http://evil.com/hack')).toBe('/candidate/profile');
      expect(sanitizeNextUrl('javascript:alert(1)')).toBe('/candidate/profile');
    });

    it('uses fallbackUrl when nextUrl is invalid or missing', () => {
      expect(sanitizeNextUrl(null, '/default')).toBe('/default');
      expect(sanitizeNextUrl(undefined, '/candidate/dashboard')).toBe('/candidate/dashboard');
      expect(sanitizeNextUrl('', '/custom')).toBe('/custom');
    });
  });

  describe('Indian Cities & Taxonomy Dataset', () => {
    it('contains major metropolitan hubs', () => {
      expect(INDIAN_CITIES).toContain('Bengaluru');
      expect(INDIAN_CITIES).toContain('Mumbai');
      expect(INDIAN_CITIES).toContain('Hyderabad');
      expect(INDIAN_CITIES).toContain('Delhi NCR');
      expect(INDIAN_CITIES).toContain('Pune');
    });

    it('contains key modern tech skills for de-duplication and autocomplete', () => {
      expect(SKILLS_TAXONOMY).toContain('React');
      expect(SKILLS_TAXONOMY).toContain('TypeScript');
      expect(SKILLS_TAXONOMY).toContain('Node.js');
      expect(SKILLS_TAXONOMY).toContain('PostgreSQL');
      expect(SKILLS_TAXONOMY).toContain('Docker');
    });
  });
});
