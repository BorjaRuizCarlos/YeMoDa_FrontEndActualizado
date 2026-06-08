import type {
  HackathonCategory,
  HackathonFindingSeverity,
  HackathonProcessingMode,
  HackathonRubric,
  HackathonSubmissionStatus,
} from '../../services/types';

/** The fixed scoring categories, in display order. */
export const HACKATHON_CATEGORIES: HackathonCategory[] = [
  'security',
  'performance',
  'robustness',
  'correctness',
  'maintainability',
  'tdd',
];

export const CATEGORY_LABELS: Record<HackathonCategory, string> = {
  security: 'Security',
  performance: 'Performance',
  robustness: 'Robustness',
  correctness: 'Correctness',
  maintainability: 'Maintainability',
  tdd: 'TDD',
};

/** Default rubric weights used to prefill the create form. */
export const DEFAULT_RUBRIC: HackathonRubric = {
  security: 30,
  performance: 10,
  robustness: 25,
  correctness: 20,
  maintainability: 15,
  tdd: 0,
};

/** Human label for a category key, falling back to the raw key for unknowns. */
export function categoryLabel(key: string): string {
  return (CATEGORY_LABELS as Record<string, string>)[key] ?? key;
}

// ─── Processing mode ──────────────────────────────────────────────────────────

interface ProcessingModeMeta {
  value: HackathonProcessingMode;
  label: string;
  helper: string;
}

export const PROCESSING_MODES: ProcessingModeMeta[] = [
  { value: 'normal', label: 'Normal', helper: 'Instant results, scored as teams are added.' },
  { value: 'batch', label: 'Batch', helper: '~50% cheaper, finalizes later (up to 24h).' },
];

// ─── High-fidelity verification ───────────────────────────────────────────────

/** Short badge label shown when a hackathon has high-fidelity verification enabled. */
export const VERIFY_BADGE_LABEL = 'High fidelity';

/** Helper copy for the verification toggle on the create form. */
export const VERIFY_HELPER =
  'Adversarially re-checks critical/high findings to drop false positives — more accurate, costs more per team.';

// ─── Submission status ────────────────────────────────────────────────────────

/** True while a submission is still being scored (not done, not failed). */
export function isSubmissionScoring(status: HackathonSubmissionStatus): boolean {
  return status === 'pending' || status === 'running' || status === 'batch_pending';
}

export function submissionStatusLabel(status: HackathonSubmissionStatus): string {
  switch (status) {
    case 'pending': return 'Queued';
    case 'running': return 'Scoring…';
    case 'batch_pending': return 'Batch queued';
    case 'done': return 'Done';
    case 'failed': return 'Failed';
    default: return status;
  }
}

// ─── Finding severity ─────────────────────────────────────────────────────────

/** Severities ordered most → least critical. */
export const SEVERITY_ORDER: HackathonFindingSeverity[] = ['critical', 'high', 'medium', 'low'];

export const SEVERITY_LABELS: Record<HackathonFindingSeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

/** Tailwind classes for a severity chip, using the design-token colors. */
export const SEVERITY_CHIP_CLASS: Record<HackathonFindingSeverity, string> = {
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
  high: 'bg-orange-500/10 text-orange-700 border-orange-500/20 dark:text-orange-200',
  medium: 'bg-warning/10 text-warning border-warning/20',
  low: 'bg-muted text-muted-foreground border-border',
};

// ─── Score / formatting ───────────────────────────────────────────────────────

/** Bar color for a 0–100 score: green high, amber mid, red low. */
export function scoreColor(score: number): string {
  if (score >= 75) return 'var(--success)';
  if (score >= 40) return 'var(--warning)';
  return 'var(--destructive)';
}

/** Format a USD price; whole numbers show no decimals, otherwise two. */
export function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;
}

/** Format an ISO date string as e.g. "07 Jun 2026" (English). */
export function formatHackathonDate(date: string | null | undefined): string {
  if (!date) return '—';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}
