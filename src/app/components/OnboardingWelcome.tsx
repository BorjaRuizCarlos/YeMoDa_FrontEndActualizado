import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, Check, Github, Loader2, X, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { projectsService, githubService } from '../../services';
import { hasSeen, markSeen, WELCOME_ID } from '../utils/onboarding';

// ── Forced-dark instrument palette ──────────────────────────────────────────────
// The welcome is a "commissioning console": it deliberately keeps the landing's
// dark instrument voice (same hexes as Landing.tsx + tours.css) regardless of the
// app theme, so landing → first run → tours read as one continuous panel.
const BG = '#0D1117';
const LINE = '#21262D';
const INK = '#E6EDF3';
const MUTED = '#8B949E';
const FAINT = '#6E7681';
const ACCENT = '#9333EA';
const ST_GREEN = '#3FB950';
const ST_AMBER = '#E3B341';

const MONO = { fontFamily: 'var(--font-mono-lp, var(--font-mono, monospace))' } as const;
const DISPLAY = { fontFamily: 'var(--font-display, var(--font-family))' } as const;

const pad = (n: number) => String(n).padStart(2, '0');

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9333EA] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1117]';

interface Step {
  id: string;
  /** Short label on the left step rail. */
  rail: string;
  /** Mono kicker above the title. */
  kicker: string;
  title: string;
  body: string;
}

// A hairline "readout" row: mono label on the left, content to the right.
function ReadoutRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      className="mt-5 flex items-center gap-4 rounded-[6px] border px-3.5 py-2.5"
      style={{ borderColor: LINE }}
    >
      <span
        className="shrink-0 text-[9.5px] font-medium uppercase tracking-[0.16em]"
        style={{ ...MONO, color: FAINT }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

// First-run intro, restyled as the brand's "commissioning console" — the numbered
// step rail + mono readouts continue the landing's instrument-panel language. Only
// shown to brand-new users (no projects yet) who haven't completed it. Mounted in
// AppLayout so it floats over the app and survives navigation (so the last step can
// route the user to Projects while staying open).
export function OnboardingWelcome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'checking' | 'show' | 'hidden'>('checking');
  const [step, setStep] = useState(0);
  const [ghConnected, setGhConnected] = useState<boolean | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  // Decide whether to show: skip if already seen; skip (and remember) for users who
  // already have projects — they're not new. Never block the app on errors.
  useEffect(() => {
    if (!user) return;
    if (hasSeen(user.id, WELCOME_ID)) {
      setPhase('hidden');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const projects = await projectsService.list();
        if (cancelled) return;
        if (projects.length > 0) {
          markSeen(user.id, WELCOME_ID);
          setPhase('hidden');
        } else {
          setPhase('show');
        }
      } catch {
        if (!cancelled) setPhase('hidden');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Reflect current GitHub connection state on the connect step.
  useEffect(() => {
    if (phase !== 'show') return;
    let cancelled = false;
    githubService
      .checkConnectionStatus()
      .then((s) => !cancelled && setGhConnected(Boolean(s?.connected)))
      .catch(() => !cancelled && setGhConnected(false));
    return () => {
      cancelled = true;
    };
  }, [phase]);

  if (phase !== 'show' || !user) return null;

  const firstName = user.name?.split(' ')[0] ?? '';
  const steps: Step[] = [
    {
      id: 'hello',
      rail: 'Welcome',
      kicker: 'System online',
      title: firstName ? `Welcome to Yemoda, ${firstName}` : 'Welcome to Yemoda',
      body: 'Project intelligence for engineering teams — one panel that reads your projects like instruments. Setup takes under a minute.',
    },
    {
      id: 'github',
      rail: 'Link GitHub',
      kicker: 'Signal input',
      title: 'Connect GitHub',
      body: 'This is where Yemoda shines: pushes link to tasks, diffs get reviewed, and AI fixes arrive ready to commit.',
    },
    {
      id: 'project',
      rail: 'First project',
      kicker: 'Workspace',
      title: 'Create your first project',
      body: 'A project holds your boards, sprints, timeline, code review and team. Create one and the instruments start reading.',
    },
    {
      id: 'team',
      rail: 'Invite team',
      kicker: 'Crew',
      title: 'Bring the team aboard',
      body: 'Roles are set per project. Open any project’s Team tab to invite teammates and decide what each one can touch.',
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  const finish = () => {
    markSeen(user.id, WELCOME_ID);
    setPhase('hidden');
  };

  const connectGitHub = async () => {
    if (ghConnected) {
      setStep(2);
      return;
    }
    // The user is about to leave for GitHub OAuth — mark done so it doesn't reappear
    // when they return, then redirect.
    markSeen(user.id, WELCOME_ID);
    setRedirecting(true);
    try {
      await githubService.startOAuth();
    } catch {
      setRedirecting(false);
    }
  };

  const handlePrimary = () => {
    if (step === 0) setStep(1);
    else if (step === 1) void connectGitHub();
    else if (step === 2) setStep(3);
    else {
      finish();
      navigate('/projects');
    }
  };

  const primaryLabel =
    step === 0
      ? 'Start setup'
      : step === 1
        ? ghConnected
          ? 'Connected — continue'
          : 'Connect GitHub'
        : step === 2
          ? 'Next'
          : 'Finish & open Projects';

  const secondary = step === 1 ? 'Skip for now' : step === 2 ? 'Later' : null;

  const ghStatusColor = ghConnected === null ? FAINT : ghConnected ? ST_GREEN : ST_AMBER;

  return (
    <div
      className="fixed inset-0 z-[125] flex items-center justify-center bg-[#010409]/85 px-4 sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Yemoda"
    >
      <div
        className="ym-console-in relative w-full max-w-[640px] overflow-hidden rounded-[10px] border shadow-[0_40px_120px_-24px_rgba(0,0,0,0.9)]"
        style={{ background: BG, borderColor: LINE }}
      >
        {/* ── Console header: brand · step counter · close · progress scan-line ── */}
        <div
          className="relative flex items-center justify-between gap-3 border-b px-4 py-2.5 sm:px-5"
          style={{ borderColor: LINE }}
        >
          <span
            className="flex min-w-0 items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em]"
            style={{ ...MONO, color: MUTED }}
          >
            <Zap className="h-3 w-3 shrink-0" style={{ color: ACCENT }} aria-hidden="true" />
            <span className="truncate">
              Yemoda <span style={{ color: FAINT }}>/ first run</span>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-3">
            <span
              className="text-[10px] uppercase tracking-[0.14em]"
              style={{ ...MONO, color: FAINT, fontVariantNumeric: 'tabular-nums' }}
            >
              Step {pad(step + 1)}/{pad(steps.length)}
            </span>
            <button
              type="button"
              onClick={finish}
              aria-label="Skip onboarding"
              className={`rounded-[4px] p-1 text-[#6E7681] transition-colors hover:bg-white/[0.06] hover:text-[#E6EDF3] ${FOCUS}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
          {/* Progress scan-line riding the header's bottom hairline */}
          <span className="absolute inset-x-0 -bottom-px h-px" aria-hidden="true">
            <span
              className="block h-full transition-all duration-500 ease-out"
              style={{ width: `${((step + 1) / steps.length) * 100}%`, background: ACCENT }}
            />
          </span>
        </div>

        <div className="grid sm:grid-cols-[188px_minmax(0,1fr)]">
          {/* ── Step rail (desktop) — the landing's measure rail, repurposed ── */}
          <ol className="hidden border-r py-3 sm:block" style={{ borderColor: LINE }}>
            {steps.map((s, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <li
                  key={s.id}
                  aria-current={active ? 'step' : undefined}
                  className="relative flex items-center gap-2.5 px-4 py-2.5"
                >
                  {active && (
                    <span
                      className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2"
                      style={{ background: ACCENT }}
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className="w-5 shrink-0 text-[10px]"
                    style={{
                      ...MONO,
                      color: done || active ? ACCENT : FAINT,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {pad(i + 1)}
                  </span>
                  <span
                    className="min-w-0 truncate text-[12px]"
                    style={{ color: active ? INK : done ? MUTED : FAINT, fontWeight: active ? 500 : 400 }}
                  >
                    {s.rail}
                  </span>
                  <span className="ml-auto shrink-0" aria-hidden="true">
                    {done ? (
                      <Check className="h-3 w-3" style={{ color: ACCENT }} />
                    ) : active ? (
                      <span className="ym-pulse block h-1.5 w-1.5 rounded-full" style={{ background: ACCENT }} />
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ol>

          {/* ── Step content (keyed so each step re-enters) ── */}
          <div key={current.id} className="ym-step-in flex flex-col px-5 pb-5 pt-5 sm:px-6">
            <p
              className="text-[10px] font-medium uppercase tracking-[0.18em]"
              style={{ ...MONO, color: ACCENT }}
            >
              {current.kicker}
            </p>
            <h2
              className="mt-2 text-[19px] font-semibold leading-snug tracking-[-0.01em]"
              style={{ ...DISPLAY, color: INK }}
            >
              {current.title}
            </h2>
            <p className="mt-2 text-[12.5px] leading-relaxed" style={{ color: MUTED }}>
              {current.body}
            </p>

            {/* Step extras — spec rows and readouts, never badge pills. */}
            {step === 0 && (
              <dl className="mt-5 border-t" style={{ borderColor: LINE }}>
                {[
                  ['Scope', 'Projects, sprints, boards, milestones, timeline'],
                  ['Signal', 'GitHub pushes linked to tasks · AI review & fixes'],
                  ['Watchdog', 'Early-warning alerts before work becomes a blocker'],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-4 border-b py-2" style={{ borderColor: LINE }}>
                    <dt
                      className="w-[72px] shrink-0 pt-[3px] text-[9.5px] font-medium uppercase tracking-[0.16em]"
                      style={{ ...MONO, color: FAINT }}
                    >
                      {k}
                    </dt>
                    <dd className="min-w-0 text-[12px] leading-relaxed" style={{ color: MUTED }}>
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            {step === 1 && (
              <ReadoutRow label="Signal">
                <span
                  className="flex min-w-0 items-center gap-2 text-[11px] tracking-[0.06em]"
                  style={{ ...MONO, color: INK }}
                >
                  <Github className="h-3.5 w-3.5 shrink-0" style={{ color: MUTED }} aria-hidden="true" />
                  GITHUB
                </span>
                <span
                  className="ml-auto flex shrink-0 items-center gap-1.5 text-[10px] uppercase tracking-[0.14em]"
                  style={{ ...MONO, color: ghStatusColor }}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${ghConnected === null ? 'ym-pulse' : ''}`}
                    style={{ background: ghStatusColor }}
                    aria-hidden="true"
                  />
                  {ghConnected === null ? 'Checking' : ghConnected ? 'Linked' : 'Not linked'}
                </span>
              </ReadoutRow>
            )}

            {step === 2 && (
              <ReadoutRow label="Path">
                <span className="min-w-0 truncate text-[11.5px]" style={{ ...MONO, color: MUTED }}>
                  Projects <span style={{ color: FAINT }}>→</span> New project
                </span>
              </ReadoutRow>
            )}

            {step === 3 && (
              <ReadoutRow label="Path">
                <span className="min-w-0 truncate text-[11.5px]" style={{ ...MONO, color: MUTED }}>
                  Open a project <span style={{ color: FAINT }}>→</span> Team{' '}
                  <span style={{ color: FAINT }}>→</span> Invite
                </span>
              </ReadoutRow>
            )}

            {/* ── Footer ── */}
            <div
              className="mt-6 flex items-center justify-between gap-3 border-t pt-4"
              style={{ borderColor: LINE }}
            >
              <button
                type="button"
                onClick={finish}
                className={`rounded-[4px] text-[10px] font-medium uppercase tracking-[0.14em] text-[#6E7681] transition-colors hover:text-[#E6EDF3] ${FOCUS}`}
                style={MONO}
              >
                Skip intro
              </button>

              <div className="flex items-center gap-2">
                {secondary && (
                  <button
                    type="button"
                    onClick={() => setStep(step + 1)}
                    className={`h-9 rounded-[6px] border border-[#30363D] px-3.5 text-[12px] font-medium text-[#E6EDF3] transition-colors hover:bg-white/[0.06] ${FOCUS}`}
                  >
                    {secondary}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePrimary}
                  disabled={redirecting}
                  autoFocus
                  className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-[6px] bg-[#9333EA] px-4 text-[12px] font-semibold text-white transition-colors hover:bg-[#A855F7] disabled:opacity-60 ${FOCUS}`}
                >
                  {redirecting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Redirecting…
                    </>
                  ) : (
                    <>
                      {primaryLabel}
                      {!isLast && step !== 1 && <ArrowRight className="h-3.5 w-3.5" />}
                      {step === 1 && !ghConnected && <Github className="h-3.5 w-3.5" />}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
