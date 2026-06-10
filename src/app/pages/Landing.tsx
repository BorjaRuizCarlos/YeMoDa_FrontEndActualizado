import { useState, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router';
import {
  BarChart3,
  Bell,
  Brain,
  Shield,
  TrendingUp,
  Users,
  ArrowRight,
  GitBranch,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Check,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react';
import { motion } from 'motion/react';
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

// The rail column for one chapter: a mono index, a transparent spacer that the
// global ThreadCanvas measures (and draws through), and the chapter's end dot.
// The index lights purple when the thread head enters the chapter, the dot when
// it completes it. Lighting state lives here — isolated from the chapter content
// (the demo racks are heavy) so scroll updates never re-render children.
function RailThread({ index, accent }: { index: string; accent: boolean }) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const node = ref.current;
    if (!node) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = node.getBoundingClientRect();
      if (rect.height <= 0) return;
      // Same head anchor as ThreadCanvas, so lighting tracks the drawn trace.
      const head = window.innerHeight * 0.58;
      setProgress(Math.min(1, Math.max(0, (head - rect.top) / rect.height)));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [reduced]);

  // Reduced motion keeps the calm static rail: accent chapters purple, rest faint.
  const fill = reduced ? (accent ? 1 : 0) : progress;
  const reached = fill > 0.02;
  const done = fill >= 0.985;

  return (
    <div ref={ref} className="relative flex flex-col items-center pt-1" aria-hidden="true">
      {/* Solid bg masks the trace passing behind the label. */}
      <span
        className="relative z-10 px-0.5 py-0.5 text-[11px] font-medium tracking-[0.16em] transition-colors duration-300"
        style={{ ...MONO, color: reached ? ACCENT : FAINT, background: BG }}
      >
        {index}
      </span>
      {/* Invisible spacer — the ThreadCanvas measures this to route the trace. */}
      <span data-rail-line className="mt-1 w-px flex-1" />
      <span
        className="relative z-10 mt-2 h-1.5 w-1.5 rounded-full transition-colors duration-300"
        style={{ background: done ? ACCENT : LINE_STRONG }}
      />
    </div>
  );
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
          <RailThread index={index} accent={accent} />
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

// Scroll-into-view entrance (opacity + small rise), reduced-motion aware.
// Used for chapter heads, table rows and cards so the page reveals as it's read.
function Reveal({
  children,
  delay = 0,
  className,
  style,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const reduced = usePrefersReducedMotion();
  if (reduced)
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

// ── The thread ──────────────────────────────────────────────────────────────────
// One continuous SVG trace for the whole chapter run: it enters from the page's
// left edge, curves into the measure rail, descends through every chapter, and
// finally curves across to plug into the CTA card — like a signal trace on a
// plotter. The purple stroke draws itself as the reader scrolls (head anchored at
// ~58% of the viewport), with a bead riding the tip. Geometry is measured from
// the [data-rail-line] spacers + [data-thread-end] target, and rebuilt on resize.
// Scroll updates mutate the DOM directly (dashoffset / bead position) so nothing
// re-renders per frame. Reduced motion: only the static hairline track is drawn.
function ThreadCanvas({ children }: { children: ReactNode }) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const progRef = useRef<SVGPathElement | null>(null);
  const beadRef = useRef<SVGCircleElement | null>(null);
  const [geom, setGeom] = useState<{ w: number; h: number; d: string } | null>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const build = () => {
      const cRect = c.getBoundingClientRect();
      const rails = Array.from(c.querySelectorAll('[data-rail-line]')) as HTMLElement[];
      if (rails.length === 0) {
        setGeom(null);
        return;
      }
      const segs = rails.map((r) => {
        const rect = r.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2 - cRect.left,
          top: rect.top - cRect.top,
          bottom: rect.bottom - cRect.top,
        };
      });
      const x = segs[0].x;
      const firstTop = segs[0].top;
      const lastBottom = segs[segs.length - 1].bottom;
      const yEntry = Math.max(8, firstTop - 48);
      let d = `M 0 ${yEntry}`;
      d += ` C ${x * 0.6} ${yEntry}, ${x} ${yEntry + (firstTop - yEntry) * 0.4}, ${x} ${firstTop}`;
      d += ` L ${x} ${lastBottom}`;
      const end = c.querySelector('[data-thread-end]') as HTMLElement | null;
      if (end) {
        const eRect = end.getBoundingClientRect();
        const ex = eRect.left + eRect.width / 2 - cRect.left;
        const ey = eRect.top - cRect.top;
        d += ` C ${x} ${lastBottom + (ey - lastBottom) * 0.6}, ${ex} ${lastBottom + (ey - lastBottom) * 0.4}, ${ex} ${ey}`;
      }
      setGeom({ w: cRect.width, h: cRect.height, d });
    };
    build();
    const ro = new ResizeObserver(build);
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (reduced || !geom) return;
    const c = ref.current;
    const prog = progRef.current;
    const bead = beadRef.current;
    if (!c || !prog || !bead) return;
    const total = prog.getTotalLength();
    prog.style.strokeDasharray = `${total}`;
    prog.style.strokeDashoffset = `${total}`;
    prog.style.visibility = 'visible';
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = c.getBoundingClientRect();
      const head = window.innerHeight * 0.58;
      const p = Math.min(1, Math.max(0, (head - rect.top) / rect.height));
      const len = p * total;
      prog.style.strokeDashoffset = `${total - len}`;
      const pt = prog.getPointAtLength(len);
      bead.setAttribute('cx', `${pt.x}`);
      bead.setAttribute('cy', `${pt.y}`);
      bead.style.opacity = p > 0.002 && p < 0.998 ? '1' : '0';
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [geom, reduced]);

  return (
    <div ref={ref} className="relative">
      {geom && (
        <svg
          className="pointer-events-none absolute left-0 top-0"
          width={geom.w}
          height={geom.h}
          viewBox={`0 0 ${geom.w} ${geom.h}`}
          fill="none"
          aria-hidden="true"
        >
          <path d={geom.d} stroke={LINE} strokeWidth="1" />
          {!reduced && (
            <>
              <path
                ref={progRef}
                d={geom.d}
                stroke="rgba(147,51,234,0.65)"
                strokeWidth="1.5"
                style={{ visibility: 'hidden' }}
              />
              <circle ref={beadRef} r="2.5" fill={ACCENT} style={{ opacity: 0 }} />
            </>
          )}
        </svg>
      )}
      {children}
    </div>
  );
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

      {/* Early-warning row — surfaced amber, then resolved emerald. Click replays
          the sequence (scroll/idle users get the one automatic run). */}
      <button
        type="button"
        onClick={() => {
          if (reduced || !resolved) return;
          setResolved(false);
          window.setTimeout(() => setResolved(true), 1400);
        }}
        title="Replay the early-warning sequence"
        className={`mt-4 flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors duration-500 ${FOCUS}`}
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
            <span style={MONO}>atlas-api</span> · 3 tasks overdue — sprint at risk
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
      </button>
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
    'Connects to GitHub in minutes',
    'Adopt it one project at a time',
    'Signals, not status meetings',
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
      desc: 'Fragile changes slip in, context gets lost, and blockers surface only once it is too late to course-correct.',
    },
    {
      dot: ST_GREEN,
      title: 'We make it robust',
      desc: 'Yemoda keeps AI-assisted teams fast — surfacing risk early so what they ship stays solid, reviewed, and complete.',
    },
  ];

  const features: { icon: Icon; key: string; description: string }[] = [
    {
      icon: GitBranch,
      key: 'Push-to-task traceability',
      description:
        'Every GitHub push is linked to the task it implements, with coverage tracking — you see what actually shipped, not what the ticket says.',
    },
    {
      icon: Brain,
      key: 'AI code review & fixes',
      description:
        'Diffs reviewed in the context of the task and the project, with AI-proposed fixes that arrive ready to commit. A clear signal, not a black box.',
    },
    {
      icon: Bell,
      key: 'Early-warning alerts',
      description: 'Overdue work, slipping sprints, projects drifting to at-risk — flagged the moment it happens, not at the retro.',
    },
    {
      icon: BarChart3,
      key: 'Real-time KPIs',
      description: 'Progress, budget, and health computed live from the work — refreshed as tasks move, not as meetings happen.',
    },
    {
      icon: TrendingUp,
      key: 'Executive dashboards',
      description: 'Portfolio KPIs and per-project health, presented plainly for stakeholders and leads.',
    },
    {
      icon: Shield,
      key: 'Per-project roles & permissions',
      description: 'Granular access control on every project — each member sees exactly what their role allows.',
    },
    {
      icon: Users,
      key: 'A full workspace, included',
      description:
        'Boards, sprints, backlog, milestones and timeline — everything a project needs, adopted one project at a time. No rip-and-replace.',
    },
  ];

  const steps: { number: string; title: string; description: string }[] = [
    {
      number: '01',
      title: 'Connect your repo',
      description: 'Link GitHub and create your project — no process change, no rip-and-replace. Yemoda starts reading the signal in minutes.',
    },
    {
      number: '02',
      title: 'See the real state of work',
      description: 'Pushes link to tasks automatically; KPIs, sprint progress, and deviations update without anyone filing a status report.',
    },
    {
      number: '03',
      title: 'Act before it breaks',
      description: 'AI reviews diffs, flags risk early, and proposes fixes ready to commit — clear signals, not noise.',
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
                Connect your repo and Yemoda shows you which projects are at risk — and why. Every GitHub
                push is linked to its task, diffs are AI-reviewed, and fixes arrive ready to commit.
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

      {/* The chapter run lives inside the ThreadCanvas: one continuous trace enters
          from the left edge, rides the measure rail, and plugs into the CTA card. */}
      <ThreadCanvas>
      {/* ── 01 · The AI workflow — the differentiator leads (Code review + AI fix) ── */}
      <RailBlock id="demo" index="01" accent>
        <Reveal>
          <Eyebrow>The AI workflow</Eyebrow>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed" style={{ color: MUTED }}>
            Code review connected to your tasks, and AI that proposes — then commits — patch diffs via GitHub.
            This is the part your tracker can’t do.
          </p>
        </Reveal>
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

      {/* ── 02 · Capabilities (features as a spec sheet) ─────────────────────── */}
      <RailBlock id="features" index="02">
        <Reveal>
          <ChapterHead
            title="Signals from the source, not from status updates"
            caption="Most project tools track what people say in tickets and meetings. Yemoda reads the work itself — and the warning arrives with a fix ready to commit."
          />
        </Reveal>
        <div className="mt-8 border-t" style={{ borderColor: LINE }}>
          {features.map((feature, i) => (
            <Reveal
              key={feature.key}
              delay={Math.min(i * 0.05, 0.25)}
              className="grid items-start gap-2 border-b py-5 transition-colors hover:bg-white/[0.02] sm:grid-cols-[minmax(0,15rem)_1fr] sm:gap-8"
              style={{ borderColor: LINE }}
            >
              <div className="flex items-center gap-3">
                <feature.icon className="h-4 w-4 shrink-0" style={{ color: ACCENT }} aria-hidden="true" />
                <span className="text-[12px] font-medium uppercase tracking-[0.12em]" style={{ ...MONO, color: INK }}>
                  {feature.key}
                </span>
              </div>
              <p className="text-[15px] leading-relaxed" style={{ color: MUTED }}>{feature.description}</p>
            </Reveal>
          ))}
        </div>
      </RailBlock>

      {/* ── 03 · The workspace, included (Dashboard + Project detail) ─────────── */}
      <RailBlock index="03" accent>
        <Reveal>
          <Eyebrow>The workspace, included</Eyebrow>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed" style={{ color: MUTED }}>
            Portfolio health, project workspaces, sprints and timelines — the rest of the platform, live below.
          </p>
        </Reveal>
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

      {/* ── 04 · How it works — editorial rows, same spec-sheet voice as 02 ──── */}
      <RailBlock id="how-it-works" index="04">
        <Reveal>
          <ChapterHead title="Up and running in 3 steps" caption="From connect to first signal in minutes." />
        </Reveal>
        <div className="mt-8 border-t" style={{ borderColor: LINE }}>
          {steps.map((step, i) => (
            <Reveal
              key={step.number}
              delay={i * 0.07}
              className="grid items-start gap-2 border-b py-5 transition-colors hover:bg-white/[0.02] sm:grid-cols-[minmax(0,15rem)_1fr] sm:gap-8"
              style={{ borderColor: LINE }}
            >
              <div className="flex items-baseline gap-3">
                <span className="text-[12px] font-semibold tracking-[0.12em]" style={{ ...MONO, color: ACCENT }}>
                  {step.number}
                </span>
                <h3 className="text-[14px] font-semibold" style={{ ...DISPLAY, color: INK }}>{step.title}</h3>
              </div>
              <p className="text-[15px] leading-relaxed" style={{ color: MUTED }}>{step.description}</p>
            </Reveal>
          ))}
        </div>
      </RailBlock>

      {/* ── Final CTA — the thread plugs into this card ─────────────────────── */}
      <section className="px-6 pb-24">
        <div
          data-thread-end
          className="mx-auto max-w-4xl rounded-3xl border px-8 py-16 text-center sm:px-16"
          style={{ borderColor: LINE, background: SURFACE }}
        >
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-[-0.02em] sm:text-4xl" style={{ ...DISPLAY, color: INK }}>
              Know which project is slipping — before the standup does.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed" style={{ color: MUTED }}>
              No AI black boxes, no rip-and-replace — connect GitHub and get signals your whole team can act on from day one.
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
          </Reveal>
        </div>
      </section>
      </ThreadCanvas>

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
