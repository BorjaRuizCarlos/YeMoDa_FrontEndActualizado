/**
 * Helpers for the `owner/repo` string typed into the manual-connect box.
 *
 * This is a convenience so a typo shows up before a round trip. The backend runs the same check
 * and is the only one that counts — a client-side format check is not a control.
 */

/** Mirrors `_REPO_FULL_NAME_RE` in the backend's views.py. */
const REPO_FULL_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * Reduce whatever the user pasted to a bare `owner/repo`.
 *
 * People paste the browser URL far more often than they type the short form, so accept
 * `https://github.com/owner/repo`, a trailing `.git` from a clone command, and trailing slashes.
 */
export function normalizeRepoFullName(raw: string): string {
  let value = (raw ?? '').trim();
  if (!value) return '';

  const urlMatch = value.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+\/[^/\s?#]+)/i);
  if (urlMatch) value = urlMatch[1];

  return value.replace(/\.git$/i, '').replace(/\/+$/, '');
}

/** Returns an error message for display, or null when the value looks well-formed. */
export function validateRepoFullName(raw: string): string | null {
  const value = normalizeRepoFullName(raw);
  if (!value) return 'Repository is required.';
  if (!value.includes('/')) return 'Use the owner/repo format, e.g. yemoda/backend.';
  if (value.split('/').length > 2) return 'Use the owner/repo format, without extra path segments.';
  if (!REPO_FULL_NAME_PATTERN.test(value)) {
    return 'Only letters, numbers, dot, hyphen and underscore are allowed.';
  }
  return null;
}
