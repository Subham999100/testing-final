// ============================================================
// Clyptus Job Portal - Candidate Portal
// Security Helper: URL Sanitization & Open-Redirect Prevention
// ============================================================

/**
 * Sanitizes ?next= redirect destinations to strictly prevent open redirects.
 * Only accepts paths that start with a single "/" and NOT "//" or protocol prefixes.
 */
export function sanitizeNextUrl(
  rawUrl: string | null | undefined,
  defaultUrl = '/candidate/profile',
): string {
  if (!rawUrl || typeof rawUrl !== 'string') return defaultUrl;
  const trimmed = rawUrl.trim();

  // Must start with '/' and not '//'
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes(':\\')) {
    // Avoid cycling through auth pages
    if (
      trimmed.startsWith('/login') ||
      trimmed.startsWith('/register') ||
      trimmed.startsWith('/onboarding')
    ) {
      return defaultUrl;
    }
    return trimmed;
  }

  return defaultUrl;
}
