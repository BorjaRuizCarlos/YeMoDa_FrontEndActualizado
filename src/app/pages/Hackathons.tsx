import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Trophy, Plus, Loader2, AlertCircle, Users, Calendar, ChevronRight, ShieldCheck } from 'lucide-react';
import { hackathonService } from '../../services';
import type { Hackathon } from '../../services';
import { ModeBadge } from '../components/ModeBadge';
import { VERIFY_BADGE_LABEL, formatHackathonDate, formatPrice } from '../utils/hackathon';

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

export default function Hackathons() {
  const [hackathons, setHackathons] = useState<Hackathon[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    hackathonService.listHackathons()
      .then((data) => { if (!cancelled) setHackathons(data); })
      .catch(() => { if (!cancelled) setError('Could not load your hackathons.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="px-4 pb-8 pt-3 max-w-[960px] mx-auto flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Robustness Score</p>
          <h1 className="mt-1 flex items-center gap-2 text-[18px] font-semibold text-foreground">
            <Trophy className="h-4 w-4 text-primary" />
            Hackathons
          </h1>
          <p className="mt-1 max-w-2xl text-[12px] leading-5 text-muted-foreground">
            Score hackathon submissions on security, performance, robustness and more, then rank teams on a live leaderboard.
          </p>
        </div>

        <Link
          to="/hackathons/new"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-[5px] bg-primary px-4 text-[12px] font-semibold text-primary-foreground transition-colors hover:bg-primary-hover shrink-0"
        >
          <Plus className="h-4 w-4" />
          New hackathon
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-24 justify-center text-[12px] text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading hackathons…
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-[8px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-[12px] text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : hackathons && hackathons.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {hackathons.map((h) => (
            <Link
              key={h.id_hackathon}
              to={`/hackathons/${h.id_hackathon}`}
              className="group flex items-center gap-4 rounded-[10px] border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-[14px] font-semibold text-foreground">{h.name}</h2>
                  <ModeBadge mode={h.processing_mode} />
                  {h.verify_findings && <VerifyBadge />}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="capitalize">{h.status || 'open'}</span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {h.expected_teams != null ? `${h.expected_teams} team${h.expected_teams === 1 ? '' : 's'}` : 'Teams TBD'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatHackathonDate(h.created_at)}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="text-[13px] font-semibold tabular-nums text-foreground">{formatPrice(h.price_per_team)}</p>
                <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">per team</p>
              </div>

              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-[10px] border border-dashed border-border bg-card/40 px-6 py-14 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
            <Trophy className="h-5 w-5 text-primary" />
          </div>
          <p className="text-[13px] font-semibold text-foreground">No hackathons yet</p>
          <p className="mx-auto mt-1 max-w-md text-[11px] leading-5 text-muted-foreground">
            Create your first hackathon to add team submissions and rank them by their Robustness Score.
          </p>
          <Link
            to="/hackathons/new"
            className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-[5px] bg-primary px-4 text-[12px] font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Create your first hackathon
          </Link>
        </div>
      )}
    </div>
  );
}
