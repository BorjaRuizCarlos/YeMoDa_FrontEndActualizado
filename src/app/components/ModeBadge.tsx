import type { HackathonProcessingMode } from '../../services';

/**
 * Batch/Normal processing-mode badge for hackathons.
 *
 * Hairline border, mono uppercase text and a tiny status dot — not a filled
 * pill. Batch reads neutral (border-border / muted text); Normal carries the
 * brand primary (border-primary/40 / text-primary).
 */
export function ModeBadge({ mode }: { mode: HackathonProcessingMode }) {
  const isBatch = mode === 'batch';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border bg-transparent px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] ${
        isBatch ? 'border-border text-muted-foreground' : 'border-primary/40 text-primary'
      }`}
      style={{ fontFamily: 'var(--font-mono-lp, monospace)' }}
    >
      <span className="h-1 w-1 rounded-full bg-current" aria-hidden="true" />
      {isBatch ? 'Batch' : 'Normal'}
    </span>
  );
}
