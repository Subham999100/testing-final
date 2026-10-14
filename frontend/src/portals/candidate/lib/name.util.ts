// ============================================================
// Clyptus Job Portal - Shared Name Utilities (Frontend)
// Canonical source of truth for full name splitting, normalization & joining
// ============================================================

export interface SplitNameResult {
  firstName: string;
  lastName: string | null;
  fullName: string;
}

function titleCaseToken(token: string): string {
  if (!token) return '';

  // Initial like "A." or single letter "S"
  if (/^[a-zA-Z]\.?$/.test(token)) {
    return token.toUpperCase();
  }

  // Hyphenated parts
  if (token.includes('-')) {
    return token
      .split('-')
      .map(titleCaseToken)
      .join('-');
  }

  // Apostrophes
  if (token.includes("'")) {
    const parts = token.split("'");
    return parts
      .map((part, idx) => (idx === 0 && part.length === 1 ? part.toUpperCase() : titleCaseToken(part)))
      .join("'");
  }

  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

/**
 * Splits and sanitizes a candidate full name:
 * - Trims and collapses whitespace
 * - First token -> firstName; remaining tokens -> lastName
 * - Single-word names are VALID: lastName becomes null
 * - Title-cases result, preserves initials, caps at 100 chars per part
 */
export function splitFullName(input: string): SplitNameResult {
  if (!input || typeof input !== 'string') {
    return { firstName: '', lastName: null, fullName: '' };
  }

  const collapsed = input.trim().replace(/\s+/g, ' ');
  if (!collapsed) {
    return { firstName: '', lastName: null, fullName: '' };
  }

  const tokens = collapsed.split(' ');
  const titleCasedTokens = tokens.map(titleCaseToken);

  const rawFirst = titleCasedTokens[0] || '';
  const firstName = rawFirst.slice(0, 100);

  const rawLast = titleCasedTokens.slice(1).join(' ');
  const lastName = rawLast ? rawLast.slice(0, 100) : null;

  const fullName = lastName ? `${firstName} ${lastName}` : firstName;

  return {
    firstName,
    lastName,
    fullName,
  };
}

/**
 * Formats candidate full name for display:
 * Returns "FirstName LastName", or just "FirstName" if lastName is null/empty.
 */
export function joinFullName(firstName?: string | null, lastName?: string | null): string {
  const parts = [firstName, lastName]
    .map((s) => (s ? s.trim() : ''))
    .filter(Boolean);
  return parts.join(' ');
}
