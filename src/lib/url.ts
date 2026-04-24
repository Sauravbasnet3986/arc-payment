/**
 * URL normalization helpers for user-provided targets.
 */

const SCHEME_REGEX = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;

/**
 * Normalize a user URL into an absolute HTTP(S) URL.
 * Returns null for invalid or unsupported schemes.
 */
export function normalizeSwarmUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const candidate = SCHEME_REGEX.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    parsed.hash = '';
    return parsed.toString();
  } catch {
    return null;
  }
}
