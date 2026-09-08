import type { ReactNode } from 'react';

// Renderer de markdown para contenido educativo. Produce elementos React (nunca
// dangerouslySetInnerHTML). Endurecido para contenido que puede venir de terceros:
// - hrefs con allowlist de esquemas (https?:, mailto:, rutas relativas con /)
// - language del fence sanitizado antes de ir a className
// - tope de tamano para no colgar el render con documentos gigantes
// - variant='community' fuerza rel="ugc nofollow" en todos los links (sin jugo SEO)
export type MarkdownVariant = 'official' | 'community';

export const MAX_RENDER_CHARS = 60_000;

// Solo esquemas seguros: https?://, mailto:, o rutas internas que empiezan con
// "/" (pero no "//", que el navegador trata como protocol-relative). Cualquier
// otra cosa (javascript:, data:, vbscript:...) se descarta y el link se
// renderiza como texto plano.
function safeHref(href: string): string | null {
  const trimmed = href.trim();
  // El parser de URLs del navegador (WHATWG) elimina TAB/LF/CR antes de parsear
  // y trata '\' como '/' en esquemas http(s): '/\evil.com' o '/<TAB>/evil.com'
  // se vuelven '//evil.com' (protocol-relative externo). Cualquier caracter de
  // control o backslash invalida el link completo.
  if (/[\u0000-\u001f\u007f\\]/.test(trimmed)) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^mailto:[^\s]+$/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  return null;
}

function linkRel(variant: MarkdownVariant): string {
  return variant === 'community' ? 'ugc nofollow noopener noreferrer' : 'noopener noreferrer';
}

function headingId(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function renderInlineMarkdown(text: string, variant: MarkdownVariant = 'official') {
  // Cuantificadores acotados: con {1,n} el backtracking es lineal. Sin cota,
  // una linea de miles de '[' sin cerrar produce O(n^2) y congela el hilo
  // principal (~1.5s con 60k chars) en cada render.
  const pattern = /(`[^`]{1,300}`)|(\*\*[^*]{1,300}\*\*)|(\*[^*]{1,300}\*)|(\[[^\]]{1,200}\]\([^\)]{1,500}\))/g;

  const parts = text.split(pattern).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={`${part}-${index}`} className="rounded bg-muted px-1 py-0.5 text-[12px] text-foreground">
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={`${part}-${index}`}>{part.slice(1, -1)}</em>;
    }

    if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (match) {
        const href = safeHref(match[2]);
        if (!href) {
          // Esquema no permitido: mostrar solo el texto, sin ancla.
          return <span key={`${part}-${index}`}>{match[1]}</span>;
        }
        const external = !href.startsWith('/');
        return (
          <a
            key={`${part}-${index}`}
            href={href}
            target={external ? '_blank' : undefined}
            rel={linkRel(variant)}
            className="text-primary underline underline-offset-2"
          >
            {match[1]}
          </a>
        );
      }
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

export function renderMarkdown(markdown: string, variant: MarkdownVariant = 'official') {
  const truncated = markdown.length > MAX_RENDER_CHARS;
  const source = truncated ? markdown.slice(0, MAX_RENDER_CHARS) : markdown;

  const lines = source.split('\n');
  const nodes: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith('```')) {
      const rawLanguage = line.replace('```', '').trim();
      const language = /^[a-z0-9+#-]{1,20}$/i.test(rawLanguage) ? rawLanguage : '';
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !lines[index].startsWith('```')) {
        codeLines.push(lines[index]);
        index += 1;
      }

      nodes.push(
        <pre key={`code-${nodes.length}`} className="overflow-x-auto rounded-md border border-border bg-card p-4 text-[12px] text-foreground">
          <code className={language ? `language-${language}` : ''}>{codeLines.join('\n')}</code>
        </pre>,
      );
      index += 1;
      continue;
    }

    if (line.startsWith('## ')) {
      const text = line.slice(3);
      nodes.push(
        <h2 key={`h2-${nodes.length}`} id={headingId(text)} className="mt-8 scroll-mt-[calc(var(--topbar-height)+8px)] text-[22px] font-semibold text-foreground">
          {renderInlineMarkdown(text, variant)}
        </h2>,
      );
      index += 1;
      continue;
    }

    if (line.startsWith('### ')) {
      const text = line.slice(4);
      nodes.push(
        <h3 key={`h3-${nodes.length}`} id={headingId(text)} className="mt-6 scroll-mt-[calc(var(--topbar-height)+8px)] text-[18px] font-semibold text-foreground">
          {renderInlineMarkdown(text, variant)}
        </h3>,
      );
      index += 1;
      continue;
    }

    if (line.startsWith('> ')) {
      const items: string[] = [];
      while (index < lines.length && lines[index].startsWith('> ')) {
        items.push(lines[index].slice(2));
        index += 1;
      }
      nodes.push(
        <blockquote key={`quote-${nodes.length}`} className="mt-4 border-l-2 border-primary bg-muted/40 px-4 py-3 text-[14px] text-muted-foreground">
          {items.map((item, idx) => (
            <p key={`${item}-${idx}`} className="mb-1 last:mb-0">
              {renderInlineMarkdown(item, variant)}
            </p>
          ))}
        </blockquote>,
      );
      continue;
    }

    if (line.startsWith('- ')) {
      const items: string[] = [];
      while (index < lines.length && lines[index].startsWith('- ')) {
        items.push(lines[index].slice(2));
        index += 1;
      }
      nodes.push(
        <ul key={`ul-${nodes.length}`} className="mt-4 list-disc space-y-2 pl-5 text-[14px] leading-7 text-muted-foreground">
          {items.map((item, idx) => (
            <li key={`${item}-${idx}`}>{renderInlineMarkdown(item, variant)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\d+\.\s+/, ''));
        index += 1;
      }
      nodes.push(
        <ol key={`ol-${nodes.length}`} className="mt-4 list-decimal space-y-2 pl-5 text-[14px] leading-7 text-muted-foreground">
          {items.map((item, idx) => (
            <li key={`${item}-${idx}`}>{renderInlineMarkdown(item, variant)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].startsWith('## ') &&
      !lines[index].startsWith('### ') &&
      !lines[index].startsWith('```') &&
      !lines[index].startsWith('- ') &&
      !/^\d+\.\s+/.test(lines[index]) &&
      !lines[index].startsWith('> ')
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }

    nodes.push(
      <p key={`p-${nodes.length}`} className="mt-4 text-[14px] leading-7 text-muted-foreground">
        {renderInlineMarkdown(paragraph.join(' '), variant)}
      </p>,
    );
  }

  if (truncated) {
    nodes.push(
      <p key="truncated" className="mt-6 rounded-md border border-border bg-muted/40 px-4 py-3 text-[13px] text-muted-foreground">
        El contenido supera el tamaño máximo y se muestra recortado.
      </p>,
    );
  }

  return nodes;
}

export function MarkdownRenderer({ content, variant = 'official' }: { content: string; variant?: MarkdownVariant }) {
  return <>{renderMarkdown(content, variant)}</>;
}
