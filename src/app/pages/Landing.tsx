import { useState, useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router';
import {
  BarChart3,
  Bell,
  Brain,
  Shield,
  TrendingUp,
  Users,
  ArrowRight,
  Zap,
  GitBranch,
  Layers,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Check,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  DashboardShowcase,
  CodeReviewShowcase,
  ProjectDetailShowcase,
  AiFixShowcase,
} from '../components/LandingShowcase';

// ── Design tokens — dark canvas + the brand PURPLE accent ──────────────────────
// The accent is the brand primary (matches the demos). Generic-AI tells are gone:
// no gradient headline, no glass pill nav, no ambient glow — the structure carries it.
const ACCENT = '#9333EA'; // brand purple (dark) — CTAs, highlights, marks (hover: #A855F7 via Tailwind classes)
const INK = '#E6EDF3'; // primary text
const MUTED = '#8B949E'; // secondary text
const FAINT = '#6E7681'; // tertiary (rail indices, footer meta)
// ONE uniform dark tone everywhere — equals the demos' own card color so the page,
// the cards and the demo frames all read as a single black (no "two blacks").
// Structure comes from hairline borders, not fill contrast.
const BG = '#0D1117';
const SURFACE = '#0D1117';
const SURFACE2 = '#0D1117';
const LINE = '#21262D'; // hairlines
const LINE_STRONG = '#30363D'; // stronger dividers / outline buttons

// Status colors — semantic only (Healthy / At-risk / Critical), mirroring the app + demos.
const ST_GREEN = '#3FB950';
const ST_AMBER = '#E3B341';
const ST_RED = '#F85149';

// Three typographic voices: Space Grotesk = the statement, IBM Plex = the explanation,
// JetBrains Mono = the instrument (labels, numerals, status, paths).
const DISPLAY = { fontFamily: 'var(--font-display)' } as const;
const MONO = { fontFamily: 'var(--font-mono-lp)' } as const;
const NUM = { fontFamily: 'var(--font-mono-lp)', fontVariantNumeric: 'tabular-nums' } as const;

// Visible keyboard focus on the dark canvas.
const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9333EA] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1117]';

type Icon = LucideIcon;

// ── Hooks ─────────────────────────────────────────────────────────────────────

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

// Count a number up to its target once the element scrolls into view (or immediately
// if motion is reduced). Numbers are the page's "readout" — they animate, briefly.
function useCountUp(target: number, durationMs: number, enabled: boolean) {
  const [value, setValue] = useState(enabled ? 0 : target);
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!enabled) {
      setValue(target);
      return;
    }
    const node = ref.current;
    if (!node) return;

    let raf = 0;
    let started = false;
    const run = () => {
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        const eased = 1 - Math.pow(1 - t, 3);
        setValue(Math.round(target * eased));
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !started) {
          started = true;
          run();
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(node);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target, durationMs, enabled]);

  return { value, ref };
}

// ── Small building blocks ─────────────────────────────────────────────────────

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em]"
      style={{ ...MONO, color: MUTED }}
    >
      <span className="h-1 w-1 rounded-full" style={{ background: ACCENT }} aria-hidden="true" />
      {children}
    </span>
  );
}

// Wraps a showcase so the marketing display font does not cascade into the dense
// demo UI (keeps the demos pixel-identical to the real app).
function DemoReset({ children }: { children: ReactNode }) {
  return <div style={{ fontFamily: 'var(--font-family)' }}>{children}</div>;
}

// A numbered chapter laid against the left "measure rail" — the page's calibrated
// scale. Section content hangs off the rail like readings off an instrument.
function RailBlock({
  id,
  index,
  accent = false,
  children,
}: {
  id?: string;
  index: string;
  accent?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className="relative scroll-mt-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-[1.75rem_1fr] gap-x-4 sm:grid-cols-[4rem_1fr] sm:gap-x-8">
          <div className="relative flex flex-col items-center pt-1" aria-hidden="true">
            <span className="text-[11px] font-medium tracking-[0.16em]" style={{ ...MONO, color: FAINT }}>
              {index}
            </span>
            <span className="mt-3 w-px flex-1" style={{ background: accent ? 'rgba(147,51,234,0.5)' : LINE }} />
            <span
              className="mt-2 h-1.5 w-1.5 rounded-full"
              style={{ background: accent ? ACCENT : LINE_STRONG }}
            />
          </div>
          <div className="min-w-0 pb-24 pt-1">{children}</div>
        </div>
      </div>
    </section>
  );
}

// The four dark demos sit flush on the uniform dark page (no distinct panel tone) — each
// keeps its own AppFrame chrome. DemoReset preserves the demos' internal font + metrics.
function DemoRack({ children }: { children: ReactNode }) {
  return <div className="dark mt-7">{children}</div>;
}

function ChapterHead({ title, caption }: { title: string; caption: string }) {
  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl lg:text-4xl" style={{ ...DISPLAY, color: INK }}>
        {title}
      </h2>
      <p className="mt-3 text-[15px] leading-relaxed" style={{ color: MUTED }}>
        {caption}
      </p>
    </div>
  );
}

// ── Hero instrument cluster ─────────────────────────────────────────────────────
// Built from the real app's vocabulary (Healthy / At-risk / Critical · emerald/amber/red ·
// mono numerals) so it reads as a genuine readout, not a marketing widget.

function InstrumentCluster() {
  const reduced = usePrefersReducedMotion();
  const active = useCountUp(6, 850, !reduced);
  const open = useCountUp(24, 950, !reduced);
  const overdue = useCountUp(3, 1050, !reduced);

  const [resolved, setResolved] = useState(reduced);
  useEffect(() => {
    if (reduced) {
      setResolved(true);
      return;
    }
    const t = setTimeout(() => setResolved(true), 1400);
    return () => clearTimeout(t);
  }, [reduced]);

  const health = [
    { label: 'Healthy', count: 4, color: ST_GREEN },
    { label: 'At risk', count: 2, color: ST_AMBER },
    { label: 'Critical', count: 1, color: ST_RED },
  ];
  const total = health.reduce((s, h) => s + h.count, 0);

  const kpis = [
    { ref: active.ref, value: active.value, label: 'Active', delta: '+2 wk' },
    { ref: open.ref, value: open.value, label: 'Open', delta: null },
    { ref: overdue.ref, value: overdue.value, label: 'Overdue', delta: null },
  ];

  return (
    <div
      className="rounded-2xl border p-4 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] sm:p-5"
      style={{ borderColor: LINE, background: SURFACE }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[0.16em]" style={{ ...MONO, color: MUTED }}>
          Portfolio signal
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em]" style={{ ...MONO, color: ACCENT }}>
          <span className="relative flex h-2 w-2">
            {!reduced && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: ACCENT }} />
            )}
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: ACCENT }} />
          </span>
          live
        </span>
      </div>

      {/* KPI strip */}
      <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-xl border" style={{ borderColor: LINE }}>
        {kpis.map((k, i) => (
          <div
            key={k.label}
            className="px-3 py-3 sm:px-4 sm:py-3.5"
            style={{ borderLeft: i === 0 ? undefined : `1px solid ${LINE}`, background: SURFACE2 }}
          >
            <span ref={k.ref} className="text-[22px] font-semibold leading-none sm:text-[26px]" style={{ ...NUM, color: INK }}>
              {String(k.value).padStart(2, '0')}
            </span>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-[0.12em]" style={{ ...MONO, color: MUTED }}>
                {k.label}
              </span>
              {k.delta && (
                <span className="inline-flex items-center gap-0.5 text-[10px]" style={{ ...MONO, color: ST_GREEN }}>
                  <TrendingUp className="h-3 w-3" aria-hidden="true" />
                  {k.delta}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Portfolio health */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-[0.14em]" style={{ ...MONO, color: MUTED }}>
            Portfolio health
          </span>
          <span className="text-[10px]" style={{ ...NUM, color: MUTED }}>
            {total} projects
          </span>
        </div>
        <div className="mt-2 flex h-2 overflow-hidden rounded-full" style={{ background: LINE }}>
          {health.map((h) => (
            <span key={h.label} style={{ width: `${(h.count / total) * 100}%`, background: h.color }} />
          ))}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
          {health.map((h) => (
            <span key={h.label} className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: MUTED }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: h.color }} aria-hidden="true" />
              <span style={MONO}>{h.label}</span>
              <span style={{ ...NUM, color: INK }}>{h.count}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Early-warning row — surfaced amber, then resolved emerald */}
      <div
        className="mt-4 flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors duration-500"
        style={{
          borderColor: resolved ? 'rgba(63,185,80,0.35)' : 'rgba(227,179,65,0.35)',
          background: resolved ? 'rgba(63,185,80,0.08)' : 'rgba(227,179,65,0.08)',
        }}
      >
        <span className="transition-colors duration-500" style={{ color: resolved ? ST_GREEN : ST_AMBER }}>
          {resolved ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium" style={{ color: INK }}>
            <span style={MONO}>atlas-api</span> · test coverage dropped
          </p>
          <p className="text-[11px]" style={{ color: MUTED }}>
            {resolved ? 'Flagged early — owner assigned, back on track' : 'Early warning raised before the sprint slips'}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] transition-colors duration-500"
          style={{
            ...MONO,
            color: resolved ? ST_GREEN : ST_AMBER,
            background: resolved ? 'rgba(63,185,80,0.14)' : 'rgba(227,179,65,0.14)',
          }}
        >
          {resolved ? 'Resolved' : 'At risk'}
        </span>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Mobile menu: close on Escape and lock body scroll while open.
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    { href: '#features', label: 'Features' },
    { href: '#demo', label: 'Demo' },
    { href: '#how-it-works', label: 'How it works' },
  ];

  const trust = [
    'AI that works for your team',
    "Designed for today's challenges",
    'Up and running in minutes',
  ];

  const thesis: { dot: string; title: string; desc: string }[] = [
    {
      dot: ST_AMBER,
      title: 'Delivery went into overdrive',
      desc: 'AI ships more code across more platforms, faster than engineering teams have ever shipped before.',
    },
    {
      dot: ST_RED,
      title: 'Risk grew right alongside it',
      desc: 'New vulnerabilities slip in, context gets lost, and blockers surface only once it is too late to course-correct.',
    },
    {
      dot: ST_GREEN,
      title: 'We make it robust',
      desc: 'Yemoda keeps AI-assisted teams fast — surfacing risk early so what they ship stays solid, secure, and complete.',
    },
  ];

  const painPoints: { icon: Icon; title: string; desc: string }[] = [
    {
      icon: Clock,
      title: 'Too many status meetings',
      desc: 'Hours lost chasing updates that should be visible to the whole team automatically.',
    },
    {
      icon: AlertTriangle,
      title: 'Blockers caught too late',
      desc: "Issues surface only when it's too late to course-correct — delays become inevitable.",
    },
    {
      icon: Brain,
      title: 'AI tools that add friction',
      desc: 'Complex AI features that require setup, disrupt workflows, and feel like extra work rather than help.',
    },
  ];

  const features: { icon: Icon; key: string; description: string }[] = [
    {
      icon: BarChart3,
      key: 'Real-time KPIs',
      description: 'Continuous monitoring of progress, budget, and critical metrics across your entire portfolio.',
    },
    {
      icon: Bell,
      key: 'Early-warning alerts',
      description: 'Smart notifications that surface risks before they turn into blockers for your team.',
    },
    {
      icon: Brain,
      key: 'AI that works for you',
      description: 'Yemoda surfaces blockers and flags risks early — a clear signal your team can act on, not a black box.',
    },
    {
      icon: Shield,
      key: 'Enterprise security',
      description: 'Granular roles and permissions per project to safeguard sensitive business data.',
    },
    {
      icon: TrendingUp,
      key: 'Executive dashboards',
      description: 'Customizable dashboards with actionable insights tailored for stakeholders and leads.',
    },
    {
      icon: Users,
      key: 'Built for real teams',
      description: 'Async updates, clear ownership, and a single source of truth — for engineers, leads, and stakeholders alike.',
    },
  ];

  const steps: { number: string; icon: Icon; title: string; description: string }[] = [
    {
      number: '01',
      icon: Layers,
      title: 'Set up your projects',
      description: 'Import or create projects with timelines, budgets, and assigned teams in minutes.',
    },
    {
      number: '02',
      icon: GitBranch,
      title: 'Monitor in real time',
      description: 'Visualize KPIs, sprint progress, and deviations with automatically updated dashboards.',
    },
    {
      number: '03',
      icon: Zap,
      title: 'Act with confidence',
      description: 'AI surfaces blockers early so your team can respond — clear, actionable signals, not noise.',
    },
  ];

  return (
    // `dark` forces the deep-dark palette tokens for the whole page (incl. the demos)
    // regardless of the app's active theme — same mechanic the demos rely on.
    <div className="dark relative min-h-screen overflow-x-hidden antialiased" style={{ background: BG, color: INK, fontFamily: 'var(--font-body)' }}>
      {/* ── Flat hairline nav (no glass, no float) ──────────────────────────── */}
      <header className="sticky top-0 z-50 border-b" style={{ borderColor: LINE, background: BG }} role="banner">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <Link to="/" className={`flex items-center gap-2.5 rounded ${FOCUS}`} aria-label="Yemoda home">
            <span className="flex h-7 w-7 items-center justify-center rounded-[7px]" style={{ background: ACCENT }}>
              <span className="text-[11px] font-bold text-white" style={MONO}>YM</span>
            </span>
            <span className="text-[15px] font-semibold" style={{ ...DISPLAY, color: INK }}>Yemoda</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className={`rounded text-[12px] uppercase tracking-[0.1em] transition-colors hover:text-[#E6EDF3] ${FOCUS}`}
                style={{ ...MONO, color: MUTED }}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Link
              to="/login"
              className={`rounded-lg px-3.5 py-2 text-[14px] font-medium transition-colors hover:bg-white/[0.06] ${FOCUS}`}
              style={{ color: INK }}
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className={`rounded-lg bg-[#9333EA] px-4 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-[#A855F7] ${FOCUS}`}
            >
              Get started
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className={`rounded-lg p-1.5 transition-colors hover:bg-white/[0.06] md:hidden ${FOCUS}`}
            style={{ color: INK }}
            aria-label="Open menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className="fixed inset-0 z-[60] flex flex-col md:hidden"
          style={{ background: BG }}
        >
          <div className="flex items-center justify-between border-b px-6 py-3" style={{ borderColor: LINE }}>
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-[7px]" style={{ background: ACCENT }}>
                <span className="text-[11px] font-bold text-white" style={MONO}>YM</span>
              </span>
              <span className="text-[15px] font-semibold" style={{ ...DISPLAY, color: INK }}>Yemoda</span>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className={`rounded-lg p-1.5 transition-colors hover:bg-white/[0.06] ${FOCUS}`}
              style={{ color: INK }}
              aria-label="Close menu"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex flex-1 flex-col items-center justify-center gap-8" aria-label="Mobile navigation">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`rounded text-[20px] font-medium transition-colors ${FOCUS}`}
                style={{ ...DISPLAY, color: INK }}
              >
                {link.label}
              </a>
            ))}
            <div className="mt-4 flex w-60 flex-col items-center gap-3">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className={`w-full rounded-lg border py-3 text-center text-[15px] font-semibold ${FOCUS}`}
                style={{ borderColor: LINE_STRONG, color: INK }}
              >
                Sign in
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className={`w-full rounded-lg py-3 text-center text-[15px] font-semibold text-white ${FOCUS}`}
                style={{ background: ACCENT }}
              >
                Get started
              </Link>
            </div>
          </nav>
        </div>
      )}

      {/* ── Hero — the instrument cluster ───────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <div className="lp-paper-grid absolute inset-0" />
        </div>

        <div className="mx-auto max-w-6xl px-6 pb-20 pt-14 sm:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="lp-fade-up">
              <Eyebrow>Project intelligence platform</Eyebrow>
              <h1
                className="mt-5 text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-5xl lg:text-[3.75rem]"
                style={{ ...DISPLAY, color: INK }}
              >
                AI made shipping faster.
                <br />
                It also made shipping{' '}
                <span style={{ color: ACCENT }}>riskier.</span>
              </h1>
              <p className="mt-6 max-w-xl text-[17px] leading-relaxed" style={{ color: MUTED }}>
                Yemoda is the project platform that surfaces risk early — real-time visibility, early warnings,
                and AI that helps your team move faster without shipping something fragile.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  to="/register"
                  className={`group inline-flex items-center justify-center gap-2 rounded-lg bg-[#9333EA] px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#A855F7] ${FOCUS}`}
                >
                  Get started
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
                <a
                  href="#demo"
                  className={`inline-flex items-center justify-center gap-2 rounded-lg border px-6 py-3 text-[15px] font-medium transition-colors hover:bg-white/[0.04] ${FOCUS}`}
                  style={{ borderColor: LINE_STRONG, color: INK }}
                >
                  See the demo
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>

              <ul className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
                {trust.map((item) => (
                  <li key={item} className="inline-flex items-center gap-1.5 text-[13px]" style={{ color: MUTED }}>
                    <Check className="h-3.5 w-3.5" style={{ color: ACCENT }} aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="lp-fade-up" style={{ animationDelay: '0.1s' }}>
              <InstrumentCluster />
            </div>
          </div>
        </div>
      </section>

      {/* ── Thesis band ─────────────────────────────────────────────────────── */}
      <section aria-label="Why Yemoda" className="border-y" style={{ borderColor: LINE, background: SURFACE }}>
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>The idea behind Yemoda</Eyebrow>
            <p className="mt-5 text-2xl font-medium leading-[1.3] tracking-[-0.01em] sm:text-[1.75rem]" style={{ ...DISPLAY, color: INK }}>
              The AI era sent delivery into overdrive — but that speed brought new vulnerabilities, lost context,
              and risk that surfaces far too late. Yemoda exists to{' '}
              <span style={{ color: ACCENT }}>close that gap</span>.
            </p>
          </div>

          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border md:grid-cols-3" style={{ borderColor: LINE, background: LINE }}>
            {thesis.map((c, i) => (
              <div key={c.title} className="p-6" style={{ background: SURFACE }}>
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px]" style={{ ...MONO, color: FAINT }}>0{i + 1}</span>
                  <span className="h-2 w-2 rounded-full" style={{ background: c.dot }} aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-[15px] font-semibold" style={{ ...DISPLAY, color: INK }}>{c.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed" style={{ color: MUTED }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="h-16" />

      {/* ── 01 · The problem ────────────────────────────────────────────────── */}
      <RailBlock index="01">
        <ChapterHead
          title="Most project tools were built for managers, not teams"
          caption="The result? Visibility gaps, late surprises, and AI features nobody actually uses."
        />
        <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border md:grid-cols-3" style={{ borderColor: LINE, background: LINE }}>
          {painPoints.map((p) => (
            <div key={p.title} className="p-6" style={{ background: SURFACE }}>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border" style={{ borderColor: LINE, color: ACCENT }}>
                <p.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold" style={{ ...DISPLAY, color: INK }}>{p.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed" style={{ color: MUTED }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </RailBlock>

      {/* ── 02 · Product workspace (Dashboard + Project detail) ──────────────── */}
      <RailBlock index="02" accent>
        <Eyebrow>Product workspace</Eyebrow>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed" style={{ color: MUTED }}>
          Portfolio health, project workspaces, sprints and timelines — explore the live console below.
        </p>
        <DemoRack>
          <DemoReset>
            <DashboardShowcase />
          </DemoReset>
          <div className="h-px" style={{ background: LINE }} aria-hidden="true" />
          <DemoReset>
            <ProjectDetailShowcase />
          </DemoReset>
        </DemoRack>
      </RailBlock>

      {/* ── 03 · Capabilities (features as a spec sheet) ─────────────────────── */}
      <RailBlock id="features" index="03">
        <ChapterHead
          title="Built for the problems engineering teams face today"
          caption="Too many status meetings, blockers caught too late, AI tools that feel like extra work. Yemoda solves all three."
        />
        <div className="mt-8 border-t" style={{ borderColor: LINE }}>
          {features.map((feature) => (
            <div
              key={feature.key}
              className="grid items-start gap-2 border-b py-5 sm:grid-cols-[minmax(0,15rem)_1fr] sm:gap-8"
              style={{ borderColor: LINE }}
            >
              <div className="flex items-center gap-3">
                <feature.icon className="h-4 w-4 shrink-0" style={{ color: ACCENT }} aria-hidden="true" />
                <span className="text-[12px] font-medium uppercase tracking-[0.12em]" style={{ ...MONO, color: INK }}>
                  {feature.key}
                </span>
              </div>
              <p className="text-[15px] leading-relaxed" style={{ color: MUTED }}>{feature.description}</p>
            </div>
          ))}
        </div>
      </RailBlock>

      {/* ── 04 · The AI workflow (Code review + AI fix) ──────────────────────── */}
      <RailBlock index="04" accent>
        <Eyebrow>The AI workflow</Eyebrow>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed" style={{ color: MUTED }}>
          Code review connected to your tasks, and AI that proposes — then commits — patch diffs via GitHub.
        </p>
        <DemoRack>
          <DemoReset>
            <CodeReviewShowcase />
          </DemoReset>
          <div className="h-px" style={{ background: LINE }} aria-hidden="true" />
          <DemoReset>
            <AiFixShowcase />
          </DemoReset>
        </DemoRack>
      </RailBlock>

      {/* ── 05 · How it works ───────────────────────────────────────────────── */}
      <RailBlock id="how-it-works" index="05">
        <ChapterHead title="Up and running in 3 steps" caption="From setup to actionable intelligence in minutes." />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number} className="rounded-2xl border p-6" style={{ borderColor: LINE, background: SURFACE }}>
              <div className="flex items-center justify-between">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border" style={{ borderColor: LINE, color: ACCENT }}>
                  <step.icon className="h-5 w-5" />
                </span>
                <span className="text-[13px] font-semibold tracking-[0.12em]" style={{ ...MONO, color: FAINT }}>{step.number}</span>
              </div>
              <h3 className="mt-4 text-[15px] font-semibold" style={{ ...DISPLAY, color: INK }}>{step.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed" style={{ color: MUTED }}>{step.description}</p>
            </div>
          ))}
        </div>
      </RailBlock>

      {/* ── Final CTA ───────────────────────────────────────────────────────── */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-4xl rounded-3xl border px-8 py-16 text-center sm:px-16" style={{ borderColor: LINE, background: SURFACE }}>
          <h2 className="text-3xl font-semibold tracking-[-0.02em] sm:text-4xl" style={{ ...DISPLAY, color: INK }}>
            Give your team the clarity they need to ship.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed" style={{ color: MUTED }}>
            No steep learning curve, no AI black boxes — just real insights your whole team can act on from day one.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/register"
              className={`group inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#9333EA] px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#A855F7] sm:w-auto ${FOCUS}`}
            >
              Get started
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link
              to="/login"
              className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border px-6 py-3 text-[15px] font-medium transition-colors hover:bg-white/[0.04] sm:w-auto ${FOCUS}`}
              style={{ borderColor: LINE_STRONG, color: INK }}
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t" style={{ borderColor: LINE }} role="contentinfo">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 md:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-[6px]" style={{ background: ACCENT }}>
              <span className="text-[10px] font-bold text-white" style={MONO}>YM</span>
            </span>
            <span className="text-[14px] font-semibold" style={{ ...DISPLAY, color: INK }}>Yemoda</span>
          </div>
          <nav className="flex items-center gap-6" aria-label="Footer">
            {['Terms', 'Privacy', 'Contact'].map((item) => (
              <a
                key={item}
                href="#"
                className={`rounded text-[12px] uppercase tracking-[0.1em] transition-colors hover:text-[#E6EDF3] ${FOCUS}`}
                style={{ ...MONO, color: MUTED }}
              >
                {item}
              </a>
            ))}
          </nav>
          <p className="text-[12px]" style={{ ...MONO, color: FAINT }}>© 2026 Yemoda</p>
        </div>
      </footer>
    </div>
  );
}
