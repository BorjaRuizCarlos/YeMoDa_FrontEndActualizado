import { describe, it, expect } from 'vitest';
import { normalizeRepoFullName, validateRepoFullName } from '../../app/utils/repoName';

// The manual-connect box is the path that used to accept any string, so these cover both the
// shapes people actually paste and the ones that must be rejected before a round trip.

describe('normalizeRepoFullName', () => {
  it('passes through a bare owner/repo', () => {
    expect(normalizeRepoFullName('dinic/side-project')).toBe('dinic/side-project');
  });

  it('extracts owner/repo from a pasted GitHub URL', () => {
    expect(normalizeRepoFullName('https://github.com/dinic/side-project')).toBe('dinic/side-project');
  });

  it('handles a URL without the scheme, and with www', () => {
    expect(normalizeRepoFullName('www.github.com/dinic/side-project')).toBe('dinic/side-project');
    expect(normalizeRepoFullName('github.com/dinic/side-project')).toBe('dinic/side-project');
  });

  it('strips a trailing .git from a clone URL', () => {
    expect(normalizeRepoFullName('https://github.com/dinic/side-project.git')).toBe('dinic/side-project');
  });

  it('ignores deep links into the repo', () => {
    expect(normalizeRepoFullName('https://github.com/dinic/side-project/tree/main/src')).toBe(
      'dinic/side-project',
    );
  });

  it('trims surrounding whitespace and trailing slashes', () => {
    expect(normalizeRepoFullName('  dinic/side-project/  ')).toBe('dinic/side-project');
  });

  it('returns an empty string for empty input', () => {
    expect(normalizeRepoFullName('')).toBe('');
    expect(normalizeRepoFullName('   ')).toBe('');
  });
});

describe('validateRepoFullName', () => {
  it('accepts a well-formed name', () => {
    expect(validateRepoFullName('dinic/side-project')).toBeNull();
  });

  it('accepts dots and underscores, which GitHub allows', () => {
    expect(validateRepoFullName('my_org/my.repo_v2')).toBeNull();
  });

  it('accepts a pasted URL, since it normalizes first', () => {
    expect(validateRepoFullName('https://github.com/dinic/side-project')).toBeNull();
  });

  it('rejects an empty value', () => {
    expect(validateRepoFullName('')).toBe('Repository is required.');
  });

  it('rejects a name with no owner segment', () => {
    expect(validateRepoFullName('side-project')).toMatch(/owner\/repo/);
  });

  it('rejects extra path segments that are not a GitHub URL', () => {
    expect(validateRepoFullName('owner/repo/extra')).toMatch(/without extra path segments/);
  });

  it('rejects characters GitHub does not allow in a repo name', () => {
    expect(validateRepoFullName('owner/repo name')).not.toBeNull();
    expect(validateRepoFullName('owner/repo$')).not.toBeNull();
  });

  it('rejects a segment starting with a separator', () => {
    expect(validateRepoFullName('.hidden/repo')).not.toBeNull();
    expect(validateRepoFullName('owner/-repo')).not.toBeNull();
  });
});
