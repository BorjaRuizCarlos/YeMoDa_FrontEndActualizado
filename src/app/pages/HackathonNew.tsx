import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, Loader2, Sparkles, Layers, Zap, TrendingDown, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { hackathonService } from '../../services';
import type { HackathonEstimate, HackathonProcessingMode, HackathonRubric } from '../../services';
import { ApiRequestError } from '../../services/api';
import {
  CATEGORY_LABELS,
  DEFAULT_RUBRIC,
  HACKATHON_CATEGORIES,
  PROCESSING_MODES,
  VERIFY_HELPER,
  formatPrice,
} from '../utils/hackathon';

export default function HackathonNew() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [mode, setMode] = useState<HackathonProcessingMode>('normal');
  const [verify, setVerify] = useState(false);
  const [expectedTeams, setExpectedTeams] = useState('10');
  const [rubric, setRubric] = useState<HackathonRubric>({ ...DEFAULT_RUBRIC });
  const [submitting, setSubmitting] = useState(false);

  const [quote, setQuote] = useState<HackathonEstimate | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Debounced live quote whenever mode, verify or expected_teams changes.
  const quoteReqRef = useRef(0);
  useEffect(() => {
    const teams = Number(expectedTeams);
    if (!Number.isFinite(teams) || teams < 0) {
      setQuote(null);
      return;
    }
    const reqId = ++quoteReqRef.current;
    setQuoteLoading(true);
    const timer = setTimeout(() => {
      hackathonService.estimate({ processing_mode: mode, verify_findings: verify, expected_teams: teams })
        .then((data) => { if (reqId === quoteReqRef.current) setQuote(data); })
        .catch(() => { if (reqId === quoteReqRef.current) setQuote(null); })
        .finally(() => { if (reqId === quoteReqRef.current) setQuoteLoading(false); });
    }, 400);
    return () => clearTimeout(timer);
  }, [mode, verify, expectedTeams]);

  const setWeight = (cat: keyof HackathonRubric, raw: string) => {
    const n = Math.max(0, Math.min(100, Math.round(Number(raw) || 0)));
    setRubric((prev) => ({ ...prev, [cat]: n }));
  };

  const savings = quote && quote.normal_price_per_team > 0
    ? Math.round((1 - quote.batch_price_per_team / quote.normal_price_per_team) * 100)
    : 0;

  // Rubric is a 100-point budget: the weights must total exactly 100.
  const rubricTotal = HACKATHON_CATEGORIES.reduce((sum, cat) => sum + (rubric[cat] || 0), 0);
  const rubricValid = rubricTotal === 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Please enter a hackathon name.');
      return;
    }
    if (rubricTotal !== 100) {
      toast.error(`Rubric weights must total 100 (currently ${rubricTotal}).`);
      return;
    }
    const teams = Number(expectedTeams);
    setSubmitting(true);
    try {
      const created = await hackathonService.createHackathon({
        name: trimmed,
        rubric,
        processing_mode: mode,
        verify_findings: verify,
        expected_teams: Number.isFinite(teams) && teams >= 0 ? teams : null,
      });
      toast.success('Hackathon created.');
      navigate(`/hackathons/${created.id_hackathon}`);
    } catch (err) {
      const status = err instanceof ApiRequestError ? err.status : undefined;
      if (status === 403) {
        toast.error('You do not have permission to create a hackathon.');
      } else if (status === 400) {
        const detail = err instanceof ApiRequestError ? err.body?.detail : undefined;
        toast.error(detail || 'Please check the form and try again.');
      } else {
        toast.error('Could not create the hackathon.');
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="px-4 pb-10 pt-3 max-w-[760px] mx-auto">
      <Link
        to="/hackathons"
        className="mb-4 inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to hackathons
      </Link>

      <h1 className="text-[18px] font-semibold text-foreground">New hackathon</h1>
      <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
        Set up the rubric and pricing, then add team submissions to start scoring.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-5">
        {/* Name */}
        <div className="rounded-[10px] border border-border bg-card p-4">
          <label htmlFor="hk-name" className="block text-[11px] font-medium text-foreground mb-1.5">Name *</label>
          <input
            id="hk-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Spring Robustness Challenge"
            className="w-full h-9 bg-surface-secondary border border-border rounded-[4px] px-3 text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/20"
          />
        </div>

        {/* Processing mode */}
        <div className="rounded-[10px] border border-border bg-card p-4">
          <p className="text-[11px] font-medium text-foreground mb-2">Processing mode</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PROCESSING_MODES.map((m) => {
              const active = mode === m.value;
              const Icon = m.value === 'batch' ? Layers : Zap;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMode(m.value)}
                  aria-pressed={active}
                  className={`flex flex-col items-start gap-1 rounded-[8px] border border-l-2 p-3 text-left transition-colors ${
                    active
                      ? 'border-primary border-l-primary bg-primary/5'
                      : 'border-border border-l-border bg-surface-secondary/40 hover:bg-accent/40'
                  }`}
                >
                  <span className={`flex items-center gap-1.5 text-[12px] font-semibold ${active ? 'text-primary' : 'text-foreground'}`}>
                    <Icon className="h-3.5 w-3.5" />
                    {m.label}
                  </span>
                  <span className="text-[10px] leading-4 text-muted-foreground">{m.helper}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* High-fidelity verification */}
        <div className="rounded-[10px] border border-border bg-card p-4">
          <button
            type="button"
            role="switch"
            aria-checked={verify}
            onClick={() => setVerify((v) => !v)}
            className={`flex w-full items-start gap-3 rounded-[8px] border border-l-2 p-3 text-left transition-colors ${
              verify
                ? 'border-primary border-l-primary bg-primary/5'
                : 'border-border border-l-border bg-surface-secondary/40 hover:bg-accent/40'
            }`}
          >
            <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${verify ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block text-[12px] font-semibold ${verify ? 'text-primary' : 'text-foreground'}`}>
                High-fidelity verification
              </span>
              <span className="mt-0.5 block text-[10px] leading-4 text-muted-foreground">
                {VERIFY_HELPER}
              </span>
            </span>
            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${verify ? 'bg-primary' : 'bg-border'}`}
            >
              <span className={`h-4 w-4 rounded-full bg-card shadow-sm transition-transform ${verify ? 'translate-x-4' : 'translate-x-0'}`} />
            </span>
          </button>
        </div>

        {/* Expected teams */}
        <div className="rounded-[10px] border border-border bg-card p-4">
          <label htmlFor="hk-teams" className="block text-[11px] font-medium text-foreground mb-1.5">Expected teams</label>
          <input
            id="hk-teams"
            type="number"
            min={0}
            step={1}
            value={expectedTeams}
            onChange={(e) => setExpectedTeams(e.target.value)}
            className="w-full sm:w-40 h-9 bg-surface-secondary border border-border rounded-[4px] px-3 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20"
          />
          <p className="mt-1.5 text-[10px] text-muted-foreground">Used to estimate your total cost. You can add more later.</p>
        </div>

        {/* Live quote */}
        <div className="rounded-[10px] border border-primary/30 bg-card p-4 ring-1 ring-primary/10">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Live quote
            </span>
            {quoteLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </div>

          {quote ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div className={`rounded-[8px] border p-3 ${mode === 'normal' ? 'border-primary/40 bg-primary/5' : 'border-border bg-surface-secondary/40'}`}>
                  <p className="flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    <Zap className="h-2.5 w-2.5" /> Normal
                  </p>
                  <p className="mt-1 text-[15px] font-semibold tabular-nums text-foreground">{formatPrice(quote.normal_price_per_team)}</p>
                  <p className="text-[10px] text-muted-foreground">per team</p>
                </div>
                <div className={`rounded-[8px] border p-3 ${mode === 'batch' ? 'border-primary/40 bg-primary/5' : 'border-border bg-surface-secondary/40'}`}>
                  <p className="flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    <Layers className="h-2.5 w-2.5" /> Batch
                  </p>
                  <p className="mt-1 text-[15px] font-semibold tabular-nums text-foreground">{formatPrice(quote.batch_price_per_team)}</p>
                  <p className="text-[10px] text-muted-foreground">per team</p>
                </div>
              </div>

              {savings > 0 && (
                <div className="flex items-center gap-1.5 rounded-[6px] border border-success/20 bg-success/10 px-2.5 py-1.5 text-[10px] font-medium text-success">
                  <TrendingDown className="h-3 w-3" />
                  Batch saves about {savings}% per team.
                </div>
              )}

              <div className="flex items-center justify-between border-t border-border pt-2.5">
                <span className="text-[11px] text-muted-foreground">
                  Estimated total ({mode}{quote.verify_findings ? ', high fidelity' : ''}, {quote.expected_teams} team{quote.expected_teams === 1 ? '' : 's'})
                </span>
                <span className="text-[16px] font-semibold tabular-nums text-foreground">{formatPrice(quote.estimated_total)}</span>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">Enter a team count to see pricing.</p>
          )}
        </div>

        {/* Rubric */}
        <div className="rounded-[10px] border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-foreground">Rubric weights</p>
            <span className={`text-[11px] font-semibold tabular-nums ${rubricValid ? 'text-success' : 'text-destructive'}`}>
              {rubricTotal} / 100
            </span>
          </div>
          <p className="mt-0.5 mb-3 text-[10px] text-muted-foreground">
            Distribute 100 points across the categories — they must total exactly 100. Set a category to 0 to ignore it.
          </p>
          <div className="space-y-3">
            {HACKATHON_CATEGORIES.map((cat) => (
              <div key={cat} className="flex items-center gap-3">
                <label htmlFor={`hk-rubric-${cat}`} className="w-32 shrink-0 text-[11px] font-medium text-foreground">
                  {CATEGORY_LABELS[cat]}
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={rubric[cat]}
                  onChange={(e) => setWeight(cat, e.target.value)}
                  aria-label={`${CATEGORY_LABELS[cat]} weight`}
                  className="flex-1 accent-primary"
                />
                <input
                  id={`hk-rubric-${cat}`}
                  type="number"
                  min={0}
                  max={100}
                  value={rubric[cat]}
                  onChange={(e) => setWeight(cat, e.target.value)}
                  className="w-16 h-8 bg-surface-secondary border border-border rounded-[4px] px-2 text-[11px] tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
              </div>
            ))}
          </div>
          {!rubricValid && (
            <p className="mt-3 text-[10px] font-medium text-destructive">
              {rubricTotal > 100
                ? `${rubricTotal - 100} point${rubricTotal - 100 === 1 ? '' : 's'} over — remove weight to reach 100.`
                : `${100 - rubricTotal} point${100 - rubricTotal === 1 ? '' : 's'} left to allocate.`}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          <Link
            to="/hackathons"
            className="inline-flex h-9 items-center justify-center rounded-[5px] border border-border bg-card px-4 text-[12px] font-medium text-foreground transition-colors hover:bg-surface-secondary"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || !rubricValid}
            title={!rubricValid ? 'Rubric weights must total 100' : undefined}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-[5px] bg-primary px-5 text-[12px] font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {submitting ? 'Creating…' : 'Create hackathon'}
          </button>
        </div>
      </form>
    </div>
  );
}
