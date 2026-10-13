import { describe, it, expect } from 'vitest';
import { splitFullName, joinFullName } from './name.util';

describe('name.util (Frontend)', () => {
  describe('splitFullName', () => {
    it('handles single name with lastName as null', () => {
      const result = splitFullName('Hema');
      expect(result).toEqual({
        firstName: 'Hema',
        lastName: null,
        fullName: 'Hema',
      });
    });

    it('handles two names (firstName and lastName)', () => {
      const result = splitFullName('Aarav Sharma');
      expect(result).toEqual({
        firstName: 'Aarav',
        lastName: 'Sharma',
        fullName: 'Aarav Sharma',
      });
    });

    it('handles three names (first token -> firstName, rest -> lastName)', () => {
      const result = splitFullName('Ganti Hema Sriram');
      expect(result).toEqual({
        firstName: 'Ganti',
        lastName: 'Hema Sriram',
        fullName: 'Ganti Hema Sriram',
      });
    });

    it('collapses and trims irregular whitespace', () => {
      const result = splitFullName('   hema     sriram   ganti   ');
      expect(result).toEqual({
        firstName: 'Hema',
        lastName: 'Sriram Ganti',
        fullName: 'Hema Sriram Ganti',
      });
    });

    it('preserves uppercase initials and titles', () => {
      const result = splitFullName('G. Hema Sriram');
      expect(result.firstName).toBe('G.');
      expect(result.lastName).toBe('Hema Sriram');
    });

    it('properly capitalizes hyphenated and apostrophe names', () => {
      const hyphenated = splitFullName('jean-luc picard');
      expect(hyphenated.firstName).toBe('Jean-Luc');
      expect(hyphenated.lastName).toBe('Picard');

      const apostrophe = splitFullName("o'connor d'souza");
      expect(apostrophe.firstName).toBe("O'Connor");
      expect(apostrophe.lastName).toBe("D'Souza");
    });

    it('caps firstName and lastName at 100 characters max', () => {
      const longFirst = 'A'.repeat(120);
      const longLast = 'B'.repeat(120);
      const result = splitFullName(`${longFirst} ${longLast}`);

      expect(result.firstName.length).toBe(100);
      expect(result.lastName?.length).toBe(100);
    });

    it('correctly handles non-ASCII accented characters', () => {
      const result = splitFullName('renée dupont');
      expect(result.firstName).toBe('Renée');
      expect(result.lastName).toBe('Dupont');
      expect(result.fullName).toBe('Renée Dupont');
    });

    it('returns empty result for empty, whitespace, or invalid inputs', () => {
      expect(splitFullName('')).toEqual({ firstName: '', lastName: null, fullName: '' });
      expect(splitFullName('   ')).toEqual({ firstName: '', lastName: null, fullName: '' });
      expect(splitFullName(null as any)).toEqual({ firstName: '', lastName: null, fullName: '' });
    });
  });

  describe('joinFullName', () => {
    it('joins firstName and lastName cleanly', () => {
      expect(joinFullName('Hema', 'Ganti')).toBe('Hema Ganti');
    });

    it('returns only firstName without trailing whitespace when lastName is null or empty', () => {
      expect(joinFullName('Hema', null)).toBe('Hema');
      expect(joinFullName('Hema', '')).toBe('Hema');
      expect(joinFullName('Hema', undefined)).toBe('Hema');
    });

    it('handles empty inputs', () => {
      expect(joinFullName(null, null)).toBe('');
      expect(joinFullName('', '')).toBe('');
    });
  });
});
