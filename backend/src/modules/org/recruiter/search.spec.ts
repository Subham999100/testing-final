import { Prisma } from '@prisma/client';
import { escapedLike, keywordSql, parseKeywords, positiveTerms } from './search';
describe('Recruiter keyword language', () => {
  it('respects OR, AND, parentheses, NOT and quoted phrases', () => {
    expect(parseKeywords('Java AND (AWS OR "Spring Boot") NOT internship')).toEqual({
      op: 'AND',
      left: {
        op: 'AND',
        left: { term: 'Java' },
        right: { op: 'OR', left: { term: 'AWS' }, right: { term: 'Spring Boot' } },
      },
      right: { op: 'NOT', child: { term: 'internship' } },
    });
  });
  it('uses implicit AND and precedence', () => {
    expect(parseKeywords('Java AWS OR Python')).toEqual({
      op: 'OR',
      left: { op: 'AND', left: { term: 'Java' }, right: { term: 'AWS' } },
      right: { term: 'Python' },
    });
  });
  it.each(['Java AND', '(Java', 'Java)', '"Java', 'OR Java', 'Java OR ()', '""'])(
    'rejects invalid expression %s',
    (value) => expect(() => parseKeywords(value)).toThrow(),
  );
  it('limits expression complexity', () =>
    expect(() => parseKeywords('('.repeat(14) + 'Java' + ')'.repeat(14))).toThrow());
  it('extracts positive terms without excluded groups', () =>
    expect(positiveTerms(parseKeywords('Java NOT (AWS OR Azure)'))).toEqual(['Java']));
  it('binds input instead of adding it to SQL', () => {
    const sql = keywordSql(parseKeywords('"\' OR 1=1 --"'), Prisma.sql`document`);
    expect(sql.text).not.toContain('1=1');
    expect(sql.values).toEqual(["%' OR 1=1 --%"]);
  });
  it('escapes SQL wildcard characters', () => expect(escapedLike('a_b%\\')).toBe('%a\\_b\\%\\\\%'));
});
