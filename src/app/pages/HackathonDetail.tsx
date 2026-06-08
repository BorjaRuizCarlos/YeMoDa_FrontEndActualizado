import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  ArrowLeft, Loader2, AlertCircle, RefreshCw, Plus, Github, ExternalLink,
  ChevronDown, ChevronRight, Layers, Zap, FileWarning, ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { hackathonService } from '../../services';
import type { Hackathon, HackathonSubmission, HackathonFindingSeverity } from '../../services';
import { ApiRequestError } from '../../services/api';
import { ProgressBar } from '../components/ProgressBar';
import {
  HACKATHON_CATEGORIES,
  SEVERITY_ORDER,
  SEVERITY_LABELS,
  SEVERITY_CHIP_CLASS,
  VERIFY_BADGE_LABEL,
  categoryLabel,
  formatPrice,
  isSubmissionScoring,
  scoreColor,
  submissionStatusLabel,
} from '../utils/hackathon';

const GITHUB_REPO_RE = /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/?$/;

function ModeBadge({ mode }: { mode: Hackathon['processing_mode'] }) {
  const isBatch = mode === 'batch';
  return (
    <span
      className={
        isBatch
          ? 'inline-flex items-center gap-1 rounded-full border border-info/20 bg-info/10 px-2 py-0.5 text-[10px] font-medium text-info'
          : 'inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary'
      }
    >
      {isBatch ? <Layers className="h-2.5 w-2.5" /> : <Zap className="h-2.5 w-2.5" />}
      {isBatch ? 'Batch' : 'Normal'}
    </span>
  );
}

function VerifyBadge() {
  return (
    <span
      title="High-fidelity verification: critical/high findings are adversarially re-checked."
      className="inline-flex items-center gap-1 rounded-full border border-success/20 bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success"
    >
      <ShieldCheck className="h-2.5 w-2.5" />
      {VERIFY_BADGE_LABEL}
    </span>
  );
}

function StatusChip({ submission }: { submission: HackathonSubmission }) {
  if (submission.status === 'failed') {
    return (
      <span
        title={submission.error ?? 'Scoring failed'}
        className="inline-flex items-center gap-1 rounded-full border border-destructive/20 bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive cursor-help"
      >
        <AlertCircle className="h-2.5 w-2.5" />
        {submissionStatusLabel(submission.status)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      <Loader2 className="h-2.5 w-2.5 animate-spin" />
      {submissionStatusLabel(submission.status)}
    </span>
  );
}

function SubmissionDetail({ submission }: { submission: HackathonSubmission }) {
  const breakdown = submission.score_breakdown ?? {};
  const orderedCats = HACKATHON_CATEGORIES.filter((c) => c in breakdown);
  // Include any backend categories not in the known list, after the known ones.
  const extraCats = Object.keys(breakdown).filter((c) => !orderedCats.includes(c as typeof orderedCats[number]));
  const cats = [...orderedCats, ...extraCats];

  const findings = submission.findings ?? [];
  const grouped = SEVERITY_ORDER.map((sev) => ({
    sev,
    items: findings.filter((f) => f.severity === sev),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="border-t border-border bg-surface-secondary/30 px-4 py-4">
      {submission.summary && (
        <p className="mb-4 text-[11px] leading-5 text-muted-foreground">{submission.summary}</p>
      )}

      {/* Per-category score bars */}
      {cats.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Score breakdown</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
            {cats.map((cat) => {
              const entry = breakdown[cat];
              return (
                <div key={cat}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-foreground">
                      {categoryLabel(cat)}
                      <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">w{entry.weight}</span>
                    </span>
                    <span className="text-[10px] tabular-nums text-muted-foreground">{Math.round(entry.score)}</span>
                  </div>
                  <ProgressBar value={entry.score} color={scoreColor(entry.score)} height={5} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Findings grouped by severity */}
      {grouped.length > 0 ? (
        <div className="space-y-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Findings ({findings.length})
          </p>
          {grouped.map((group) => (
            <div key={group.sev}>
              <div className="mb-1.5 flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${SEVERITY_CHIP_CLASS[group.sev as HackathonFindingSeverity]}`}>
                  {SEVERITY_LABELS[group.sev as HackathonFindingSeverity]}
                </span>
                <span className="text-[10px] text-muted-foreground">{group.items.length}</span>
              </div>
              <ul className="space-y-2">
                {group.items.map((f, i) => (
                  <li key={`${group.sev}-${i}`} className="rounded-[6px] border border-border bg-card px-3 py-2">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[11px] font-medium text-foreground">{f.title}</p>
                      {f.category && (
                        <span className="shrink-0 text-[10px] text-muted-foreground">{categoryLabel(f.category)}</span>
                      )}
                    </div>
                    {f.file && (
                      <p className="mt-0.5 font-mono text-[10px] text-muted-foreground break-all">{f.file}</p>
                    )}
                    {f.description && (
                      <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{f.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <FileWarning className="h-3.5 w-3.5" />
          No findings reported.
        </div>
      )}
    </div>
  );
}

export default function HackathonDetail() {
  const { id } = useParams();
  const hackathonId = Number(id);

  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [leaderboard, setLeaderboard] = useState<HackathonSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  // Add-submission form
  const [teamName, setTeamName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [ref, setRef] = useState('main');
  const [adding, setAdding] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [hk, board] = await Promise.all([
        hackathonService.getHackathon(hackathonId),
        hackathonService.getLeaderboard(hackathonId),
      ]);
      setHackathon(hk);
      setLeaderboard(board);
    } catch (err) {
      const status = err instanceof ApiRequestError ? err.status : undefined;
      setError(status === 404 ? 'Hackathon not found.' : 'Could not load this hackathon.');
    } finally {
      setLoading(false);
    }
  }, [hackathonId]);

  useEffect(() => {
    if (!Number.isFinite(hackathonId)) {
      setError('Invalid hackathon.');
      setLoading(false);
      return;
    }
    void loadAll();
  }, [hackathonId, loadAll]);

  const refreshLeaderboard = useCallback(async () => {
    setRefreshing(true);
    try {
      const board = await hackathonService.getLeaderboard(hackathonId);
      setLeaderboard(board);
    } catch {
      toast.error('Could not refresh the leaderboard.');
    } finally {
      setRefreshing(false);
    }
  }, [hackathonId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const team = teamName.trim();
    const repo = repoUrl.trim();
    if (!team) {
      toast.error('Please enter a team name.');
      return;
    }
    if (!GITHUB_REPO_RE.test(repo)) {
      toast.error('Enter a valid GitHub repo URL (https://github.com/owner/repo).');
      return;
    }
    setAdding(true);
    try {
      await hackathonService.addSubmission(hackathonId, {
        team_name: team,
        repo_url: repo,
        ref: ref.trim() || 'main',
      });
      toast.success('Submission added. Scoring will start shortly.');
      setTeamName('');
      setRepoUrl('');
      setRef('main');
      await refreshLeaderboard();
    } catch (err) {
      const status = err instanceof ApiRequestError ? err.status : undefined;
      if (status === 403) {
        toast.error('You do not have permission to add submissions.');
      } else if (status === 400 || status === 409) {
        const detail = err instanceof ApiRequestError ? err.body?.detail : undefined;
        toast.error(detail || 'Please check the submission details.');
      } else {
        toast.error('Could not add the submission.');
      }
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-[12px] text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading hackathon…
      </div>
    );
  }

  if (error || !hackathon) {
    return (
      <div className="px-4 pt-3 max-w-[960px] mx-auto">
        <Link
          to="/hackathons"
          className="mb-4 inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to hackathons
        </Link>
        <div className="flex items-center gap-2 rounded-[8px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-[12px] text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error ?? 'Hackathon not found.'}
        </div>
      </div>
    );
  }

  const rubricEntries = HACKATHON_CATEGORIES.map((c) => ({ cat: c, weight: hackathon.rubric?.[c] ?? 0 }));

  return (
    <div className="px-4 pb-10 pt-3 max-w-[960px] mx-auto flex flex-col gap-4">
      <Link
        to="/hackathons"
        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground w-fit"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to hackathons
      </Link>

      {/* Header */}
      <div className="rounded-[10px] border border-border bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[18px] font-semibold text-foreground">{hackathon.name}</h1>
              <ModeBadge mode={hackathon.processing_mode} />
              {hackathon.verify_findings && <VerifyBadge />}
            </div>
            <p className="mt-1 text-[11px] capitalize text-muted-foreground">{hackathon.status || 'open'}</p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <p className="text-[14px] font-semibold tabular-nums text-foreground">{formatPrice(hackathon.price_per_team)}</p>
              <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">per team</p>
            </div>
            <div className="text-right">
              <p className="text-[14px] font-semibold tabular-nums text-foreground">{formatPrice(hackathon.estimated_total)}</p>
              <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">est. total</p>
            </div>
          </div>
        </div>

        {/* Rubric chips */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {rubricEntries.map(({ cat, weight }) => (
            <span
              key={cat}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                weight > 0
                  ? 'border-border bg-surface-secondary/60 text-foreground'
                  : 'border-border/60 bg-transparent text-muted-foreground/60'
              }`}
            >
              {categoryLabel(cat)}
              <span className="tabular-nums">{weight}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Add submission */}
      <div className="rounded-[10px] border border-border bg-card p-4">
        <p className="mb-3 flex items-center gap-1.5 text-[11px] font-medium text-foreground">
          <Plus className="h-3.5 w-3.5 text-primary" />
          Add a team submission
        </p>
        <form onSubmit={handleAdd} className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_1.5fr_auto_auto] sm:items-end">
          <div>
            <label htmlFor="sub-team" className="block text-[10px] font-medium text-muted-foreground mb-1">Team name</label>
            <input
              id="sub-team"
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Team Falcon"
              className="w-full h-9 bg-surface-secondary border border-border rounded-[4px] px-2.5 text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
          </div>
          <div>
            <label htmlFor="sub-repo" className="block text-[10px] font-medium text-muted-foreground mb-1">Repo URL</label>
            <input
              id="sub-repo"
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="w-full h-9 bg-surface-secondary border border-border rounded-[4px] px-2.5 text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
          </div>
          <div>
            <label htmlFor="sub-ref" className="block text-[10px] font-medium text-muted-foreground mb-1">Ref</label>
            <input
              id="sub-ref"
              type="text"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="main"
              className="w-full sm:w-24 h-9 bg-surface-secondary border border-border rounded-[4px] px-2.5 text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
          </div>
          <button
            type="submit"
            disabled={adding}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-[4px] bg-primary px-4 text-[12px] font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            {adding ? 'Adding…' : 'Add'}
          </button>
        </form>
      </div>

      {/* Leaderboard */}
      <div className="rounded-[10px] border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Leaderboard
            <span className="ml-1.5 text-muted-foreground/70">({leaderboard.length})</span>
          </h2>
          <button
            type="button"
            onClick={() => void refreshLeaderboard()}
            disabled={refreshing}
            className="inline-flex h-7 items-center gap-1.5 rounded-[4px] border border-border bg-card px-2.5 text-[11px] font-medium text-foreground transition-colors hover:bg-surface-secondary disabled:opacity-60"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {leaderboard.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-[12px] font-medium text-foreground">No submissions yet</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Add a team above to start scoring.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {leaderboard.map((sub, idx) => {
              const isDone = sub.status === 'done';
              const isOpen = expanded === sub.id_submission;
              const breakdown = sub.score_breakdown ?? {};
              const miniCats = HACKATHON_CATEGORIES.filter((c) => c in breakdown).slice(0, 6);
              return (
                <li key={sub.id_submission}>
                  <div
                    role={isDone ? 'button' : undefined}
                    tabIndex={isDone ? 0 : undefined}
                    onClick={isDone ? () => setExpanded(isOpen ? null : sub.id_submission) : undefined}
                    onKeyDown={isDone ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpanded(isOpen ? null : sub.id_submission);
                      }
                    } : undefined}
                    className={`flex items-center gap-3 px-4 py-3 ${isDone ? 'cursor-pointer hover:bg-accent/30 transition-colors' : ''}`}
                  >
                    <span className="w-6 shrink-0 text-center text-[12px] font-semibold tabular-nums text-muted-foreground">
                      {idx + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium text-foreground">{sub.team_name}</p>
                      <a
                        href={sub.repo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground hover:underline"
                      >
                        <Github className="h-3 w-3" />
                        <span className="truncate max-w-[280px]">{sub.repo_url.replace(/^https:\/\/github\.com\//, '')}</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>

                    {/* mini per-category breakdown for done rows */}
                    {isDone && miniCats.length > 0 && (
                      <div className="hidden md:flex items-end gap-1" aria-hidden="true">
                        {miniCats.map((c) => {
                          const s = breakdown[c]?.score ?? 0;
                          return (
                            <span
                              key={c}
                              title={`${categoryLabel(c)}: ${Math.round(s)}`}
                              className="w-1.5 rounded-sm"
                              style={{ height: `${Math.max(3, (s / 100) * 22)}px`, backgroundColor: scoreColor(s) }}
                            />
                          );
                        })}
                      </div>
                    )}

                    <div className="flex w-24 shrink-0 items-center justify-end gap-2">
                      {isDone ? (
                        <>
                          <span className="text-[18px] font-semibold tabular-nums text-foreground">
                            {sub.score != null ? Math.round(sub.score) : '—'}
                          </span>
                          {isOpen
                            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                        </>
                      ) : (
                        <StatusChip submission={sub} />
                      )}
                    </div>
                  </div>

                  {isDone && isOpen && <SubmissionDetail submission={sub} />}
                </li>
              );
            })}
          </ul>
        )}

        {leaderboard.some((s) => isSubmissionScoring(s.status)) && (
          <div className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
            Scoring is asynchronous. Use Refresh to update scores as teams finish.
          </div>
        )}
      </div>
    </div>
  );
}
