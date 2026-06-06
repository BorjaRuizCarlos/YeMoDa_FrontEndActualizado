import { useMemo } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-yaml';

interface CodeDiffViewerProps {
  patch: string;
  filename: string;
}

interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'header';
  content: string;
  oldLine?: number;
  newLine?: number;
}

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  py: 'python',
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  json: 'json',
  css: 'css',
  scss: 'css',
  less: 'css',
  html: 'markup',
  htm: 'markup',
  xml: 'markup',
  yml: 'yaml',
  yaml: 'yaml',
  md: 'markdown',
  sh: 'bash',
  sql: 'sql',
  go: 'go',
  java: 'java',
  cs: 'csharp',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function detectLanguage(filename: string): string | null {
  const lowerName = filename.toLowerCase();
  if (lowerName.endsWith('.dockerfile') || lowerName === 'dockerfile') return 'bash';
  const ext = lowerName.split('.').pop() ?? '';
  return LANGUAGE_BY_EXTENSION[ext] ?? null;
}

function highlightLine(content: string, language: string | null): string {
  if (!language) return escapeHtml(content);
  const grammar = Prism.languages[language];
  if (!grammar) return escapeHtml(content);
  return Prism.highlight(content, grammar, language);
}

function parsePatch(patch: string): DiffLine[] {
  const lines = patch.split('\n');
  const result: DiffLine[] = [];
  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLine = parseInt(match[1], 10);
        newLine = parseInt(match[2], 10);
      }
      result.push({ type: 'header', content: line });
    } else if (line.startsWith('+')) {
      result.push({ type: 'add', content: line.slice(1), newLine: newLine++ });
    } else if (line.startsWith('-')) {
      result.push({ type: 'remove', content: line.slice(1), oldLine: oldLine++ });
    } else {
      result.push({ type: 'context', content: line.startsWith(' ') ? line.slice(1) : line, oldLine: oldLine++, newLine: newLine++ });
    }
  }
  return result;
}

const lineStyles: Record<DiffLine['type'], string> = {
  add: 'bg-emerald-500/6 text-emerald-300',
  remove: 'bg-red-500/10 text-red-400',
  context: 'text-muted-foreground',
  header: 'bg-primary/5 text-primary font-medium',
};

const gutterStyles: Record<DiffLine['type'], string> = {
  add: 'bg-emerald-500/4 text-emerald-400/45',
  remove: 'bg-red-500/5 text-red-500/50',
  context: 'text-muted-foreground/40',
  header: 'bg-primary/5 text-primary/40',
};

export function CodeDiffViewer({ patch, filename }: CodeDiffViewerProps) {
  const parsedLines = useMemo(() => (patch ? parsePatch(patch) : []), [patch]);
  const language = useMemo(() => detectLanguage(filename), [filename]);

  const isCode = language != null;

  return (
    <div data-cr-file={filename} className="rounded-[4px] border border-border overflow-hidden text-[11px] leading-[18px]">
      {/* File header */}
      <div className="px-3 py-1.5 bg-surface-secondary/50 border-b border-border flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full shrink-0 ${isCode ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
        <span className="font-mono text-[10px] text-foreground truncate">{filename}</span>
      </div>

      {parsedLines.length === 0 ? (
        <p className="px-3 py-2 text-[10px] text-muted-foreground/60 italic">No text diff available (binary file or diff omitted)</p>
      ) : (
      <div className="overflow-x-auto">
        <table className="w-full font-mono">
          <tbody>
            {parsedLines.map((line, i) => (
              <tr key={i} className={`${lineStyles[line.type]} hover:brightness-110 transition-all`}>
                {/* Old line number */}
                <td className={`w-10 text-right px-1.5 select-none text-[10px] border-r border-border/30 ${gutterStyles[line.type]}`}>
                  {line.type === 'header' ? '' : line.oldLine ?? ''}
                </td>
                {/* New line number */}
                <td className={`w-10 text-right px-1.5 select-none text-[10px] border-r border-border/30 ${gutterStyles[line.type]}`}>
                  {line.type === 'header' ? '' : line.newLine ?? ''}
                </td>
                {/* Marker */}
                <td className="w-4 text-center select-none">
                  {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ''}
                </td>
                {/* Content */}
                <td
                  className="px-2 whitespace-pre"
                  data-cr-line={line.type === 'header' ? undefined : (line.newLine ?? line.oldLine)}
                >
                  {line.type === 'header' ? (
                    line.content
                  ) : (
                    <span
                      className="code-tokenized"
                      dangerouslySetInnerHTML={{ __html: highlightLine(line.content, language) }}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
