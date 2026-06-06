import { useMemo, type ReactNode } from 'react';
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

// Lightweight Markdown renderer for AI chat answers — no extra deps. Handles the
// blocks the model actually emits: headings, bold, inline code, fenced code (with
// Prism highlighting), lists, links and horizontal rules.

type Block =
  | { kind: 'code'; lang: string | null; code: string }
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'hr' }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'p'; text: string };

const LANG_ALIAS: Record<string, string> = {
  html: 'markup',
  xml: 'markup',
  js: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  tsx: 'tsx',
  py: 'python',
  rb: 'ruby',
  sh: 'bash',
  shell: 'bash',
  yml: 'yaml',
  cs: 'csharp',
};

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function isSafeHref(url: string): boolean {
  return /^(https?:|mailto:|#|\/)/i.test(url.trim());
}

function parseBlocks(md: string): Block[] {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    const fence = line.match(/^```\s*([\w+-]+)?\s*$/);
    if (fence) {
      const lang = fence[1] ?? null;
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        code.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push({ kind: 'code', lang, code: code.join('\n') });
      continue;
    }

    if (line.trim() === '') {
      i++;
      continue;
    }

    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ kind: 'hr' });
      i++;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2].replace(/\s*#+\s*$/, '').trim() });
      i++;
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ''));
        i++;
      }
      blocks.push({ kind: 'ul', items });
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ kind: 'ol', items });
      continue;
    }

    // Paragraph: gather until a blank line or the start of another block
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^```/.test(lines[i]) &&
      !/^#{1,6}\s/.test(lines[i]) &&
      !/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push({ kind: 'p', text: para.join('\n') });
  }

  return blocks;
}

// Inline: `code`, **bold**, [text](url). Order matters — code first so ** inside it is left alone.
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let k = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith('`')) {
      nodes.push(
        <code key={`${keyPrefix}-${k++}`} className="rounded bg-surface-tertiary px-1 py-0.5 font-mono text-[10px] text-primary">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith('**')) {
      nodes.push(
        <strong key={`${keyPrefix}-${k++}`} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch && isSafeHref(linkMatch[2])) {
        nodes.push(
          <a
            key={`${keyPrefix}-${k++}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2"
          >
            {linkMatch[1]}
          </a>,
        );
      } else {
        nodes.push(token);
      }
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function CodeBlock({ lang, code }: { lang: string | null; code: string }) {
  const html = useMemo(() => {
    const normalized = lang ? (LANG_ALIAS[lang.toLowerCase()] ?? lang.toLowerCase()) : null;
    const grammar = normalized ? Prism.languages[normalized] : null;
    return grammar && normalized ? Prism.highlight(code, grammar, normalized) : escapeHtml(code);
  }, [lang, code]);

  return (
    <pre className="my-1.5 overflow-x-auto rounded-[4px] border border-border bg-surface-secondary/50 p-2">
      <code
        className="code-tokenized block font-mono text-[10px] leading-[16px] whitespace-pre"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </pre>
  );
}

export function ChatMarkdown({ content }: { content: string }) {
  const blocks = useMemo(() => parseBlocks(content), [content]);

  return (
    <div className="space-y-1.5">
      {blocks.map((block, i) => {
        switch (block.kind) {
          case 'code':
            return <CodeBlock key={i} lang={block.lang} code={block.code} />;
          case 'hr':
            return <hr key={i} className="my-2 border-border" />;
          case 'heading':
            return (
              <p
                key={i}
                className={`mt-2 font-semibold text-foreground first:mt-0 ${
                  block.level <= 1 ? 'text-[13px]' : block.level === 2 ? 'text-[12px]' : 'text-[11px]'
                }`}
              >
                {renderInline(block.text, `h${i}`)}
              </p>
            );
          case 'ul':
            return (
              <ul key={i} className="list-disc space-y-0.5 pl-4">
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item, `ul${i}-${j}`)}</li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={i} className="list-decimal space-y-0.5 pl-4">
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item, `ol${i}-${j}`)}</li>
                ))}
              </ol>
            );
          default:
            return (
              <p key={i} className="whitespace-pre-wrap first:mt-0">
                {renderInline(block.text, `p${i}`)}
              </p>
            );
        }
      })}
    </div>
  );
}
