import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Gauge, Bot, Zap, MessageSquare, Loader2, AlertCircle, ArrowUpRight, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { projectsService, paymentsService } from '../../services';
import type { AiUsage } from '../../services';
import { ApiRequestError } from '../../services/api';
import { ProgressBar } from './ProgressBar';

interface AiUsageCardProps {
  projectId: number;
}

interface MeterRow {
  key: 'reviews' | 'aifix' | 'chat';
  label: string;
  icon: typeof Bot;
}

const ROWS: MeterRow[] = [
  { key: 'reviews', label: 'AI reviews', icon: Bot },
  { key: 'aifix', label: 'AI fixes', icon: Zap },
  { key: 'chat', label: 'AI chat', icon: MessageSquare },
];

// Color the bar by remaining headroom (so a near-full meter reads as "warning/danger").
function barColor(percent: number): string {
  if (percent >= 90) return 'var(--destructive)';
  if (percent >= 75) return 'var(--warning)';
  return 'var(--primary)';
}

export function AiUsageCard({ projectId }: AiUsageCardProps) {
  const [usage, setUsage] = useState<AiUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    projectsService.getAiUsage(projectId)
      .then((data) => { if (!cancelled) setUsage(data); })
      .catch(() => { if (!cancelled) setError('Could not load AI usage.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  const isFree = usage?.plan === 'free';
  const isPro = usage?.plan === 'pro';

  const handleCancel = async () => {
    if (!window.confirm('Cancel this project’s Pro subscription? It stays active until the end of the current billing period.')) {
      return;
    }
    setCancelling(true);
    try {
      await paymentsService.cancelSubscription(projectId);
      toast.success('Subscription will be cancelled at the end of the billing period.');
      // Refresh usage so the plan badge reflects the change once Stripe confirms.
      projectsService.getAiUsage(projectId).then(setUsage).catch(() => {});
    } catch (err) {
      const status = err instanceof ApiRequestError ? err.status : undefined;
      if (status === 403) {
        toast.error('Only the project admin can cancel the subscription.');
      } else if (status === 404) {
        toast.error('No active subscription found for this project.');
      } else {
        const detail = err instanceof ApiRequestError ? err.body?.detail : undefined;
        toast.error(detail || 'Could not cancel the subscription.');
      }
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-[4px] p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-[0.06em]">
          <Gauge className="w-3.5 h-3.5" />
          AI usage
        </h2>
        {usage && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">
              {usage.period} · {usage.seats} seat{usage.seats !== 1 ? 's' : ''}
            </span>
            <span
              className={
                isPro
                  ? 'inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary'
                  : 'inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground'
              }
            >
              {isPro && <Crown className="w-2.5 h-2.5" />}
              {isPro ? 'Pro' : 'Free'}
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-[11px] text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Loading usage…
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 py-6 text-[11px] text-destructive">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      ) : usage ? (
        <div className="space-y-3">
          {ROWS.map((row) => {
            const quota = usage.quota[row.key];
            const used = usage.used[row.key];
            const percent = quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;
            const Icon = row.icon;
            return (
              <div key={row.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
                    <Icon className="w-3 h-3 text-muted-foreground" />
                    {row.label}
                  </span>
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {used} / {quota}
                  </span>
                </div>
                <ProgressBar value={percent} color={barColor(percent)} height={5} />
              </div>
            );
          })}

          {!usage.enforced && (
            <p className="text-[10px] text-muted-foreground/70 italic pt-1">
              Limits are not enforced yet.
            </p>
          )}

          {/* Free projects: always offer the upgrade (project-scoped). The /plans page
              starts the monthly per-seat checkout for this specific project. */}
          {isFree && (
            <Link
              to={`/plans?project=${projectId}`}
              className="inline-flex items-center gap-1.5 mt-1 h-8 px-3 rounded-[3px] bg-primary hover:bg-primary-hover text-primary-foreground text-[11px] font-medium transition-colors"
            >
              Upgrade to Pro
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          )}

          {/* Pro projects: a subtle affordance to cancel at period end. The backend
              enforces admin-only and surfaces 403, which we catch and toast. */}
          {isPro && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className="inline-flex items-center gap-1.5 mt-1 h-7 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60"
            >
              {cancelling && <Loader2 className="w-3 h-3 animate-spin" />}
              {cancelling ? 'Cancelling…' : 'Cancel subscription'}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
