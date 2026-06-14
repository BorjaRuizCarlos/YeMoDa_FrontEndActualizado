import { describe, it, expect } from 'vitest';
import { applyUnifiedPatchToContent, parseAiFileList } from '../../app/components/TaskDetailPanel';

// These cover the AI-fix → GitHub push flow's new-file support: the AI may CREATE files that
// don't exist in the repo yet, so the diff applier must work against empty base content and the
// JSON parser must surface "create" actions.

describe('applyUnifiedPatchToContent — new file (empty base)', () => {
  it('builds a brand-new file from a pure-addition hunk', () => {
    const patch = '@@ -0,0 +1,3 @@\n+import flask\n+app = flask.Flask(__name__)\n+# entry';
    const out = applyUnifiedPatchToContent('', patch);
    expect(out).toBe('import flask\napp = flask.Flask(__name__)\n# entry\n');
  });

  it('handles a hunk header without a count (@@ -1,0 +1,N @@ style)', () => {
    const patch = '@@ -0,0 +1 @@\n+single line';
    const out = applyUnifiedPatchToContent('', patch);
    expect(out).toBe('single line\n');
  });

  it('still modifies an existing file (regression)', () => {
    const original = 'line1\nline2\nline3';
    const patch = '@@ -1,3 +1,3 @@\n line1\n-line2\n+line2-changed\n line3';
    const out = applyUnifiedPatchToContent(original, patch);
    expect(out).toContain('line2-changed');
    expect(out).not.toContain('\nline2\n');
  });

  it('throws when the patch has no applicable hunks', () => {
    expect(() => applyUnifiedPatchToContent('', 'not a diff')).toThrow();
  });
});

describe('parseAiFileList — create/modify/delete contract', () => {
  it('parses a create action with full content', () => {
    const raw = '{"files":[{"path":"app.py","action":"create","content":"print(1)"}]}';
    const files = parseAiFileList(raw);
    expect(files).toEqual([{ path: 'app.py', action: 'create', content: 'print(1)' }]);
  });

  it('strips ```json fences before parsing', () => {
    const raw = '```json\n{"files":[{"path":"a.txt","action":"modify","content":"x"}]}\n```';
    const files = parseAiFileList(raw);
    expect(files).toHaveLength(1);
    expect(files?.[0].action).toBe('modify');
  });

  it('keeps a delete action even without content', () => {
    const raw = '{"files":[{"path":"old.py","action":"delete"}]}';
    const files = parseAiFileList(raw);
    expect(files).toEqual([{ path: 'old.py', action: 'delete', content: '' }]);
  });

  it('returns an empty list for the explicit no-changes response', () => {
    expect(parseAiFileList('{"files":[]}')).toEqual([]);
  });

  it('returns null for a non-file-list response so callers fall back to diff mode', () => {
    expect(parseAiFileList('diff --git a/x b/x\n@@ -0,0 +1 @@\n+x')).toBeNull();
    expect(parseAiFileList('')).toBeNull();
  });
});
