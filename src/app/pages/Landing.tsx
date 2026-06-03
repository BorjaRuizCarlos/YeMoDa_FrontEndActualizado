import { useState, useEffect, type ReactNode, type ComponentType } from 'react';
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
  Check,
  Menu,
  X,
} from 'lucide-react';
import {
  DashboardShowcase,
  CodeReviewShowcase,
  ProjectDetailShowcase,
  AiFixShowcase,
} from '../components/LandingShowcase';

// Shared focus ring — visible keyboard focus on the near-black canvas.
const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background';

type Icon = ComponentType<{ className?: string }>;

// ── Small building blocks ─────────────────────────────────────────────────────

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#c084fc]"
      style={{ fontFamily: 'var(--font-mono-lp)' }}
    >
      <span className="h-1 w-1 rounded-full bg-[#c084fc]" aria-hidden="true" />
      {children}
    </span>
  );
}

// A thin gradient divider with a centered chapter label — frames each demo
// without competing with the showcase's own internal heading.
function ChapterLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 pt-20">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" aria-hidden="true" />
      <Eyebrow>{children}</Eyebrow>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" aria-hidden="true" />
    </div>
  );
}

// Wraps a showcase so the marketing display font does not cascade into the
// dense demo UI (keeps the demos pixel-identical to before).
function DemoReset({ children }: { children: ReactNode }) {
  return <div style={{ fontFamily: 'var(--font-family)' }}>{children}</div>;
}

// ── Page ──────────────────────────────────────────────────────────────────────

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

  const stats = [
    { value: '99.9%', label: 'Uptime guaranteed' },
    { value: '150+', label: 'Projects managed' },
    { value: '40%', label: 'Fewer delays' },
    { value: '4.8/5', label: 'User satisfaction' },
  ];

  const painPoints: { icon: Icon; title: string; desc: string; tint: string; bg: string; ring: string }[] = [
    {
      icon: Clock,
      title: 'Too many status meetings',
      desc: 'Hours lost chasing updates that should be visible to the whole team automatically.',
      tint: 'text-destructive',
      bg: 'bg-destructive/10',
      ring: 'border-destructive/20',
    },
    {
      icon: AlertTriangle,
      title: 'Blockers caught too late',
      desc: "Issues surface only when it's too late to course-correct — delays become inevitable.",
      tint: 'text-warning',
      bg: 'bg-warning/10',
      ring: 'border-warning/20',
    },
    {
      icon: Brain,
      title: 'AI tools that add friction',
      desc: 'Complex AI features that require setup, disrupt workflows, and feel like extra work rather than help.',
      tint: 'text-info',
      bg: 'bg-info/10',
      ring: 'border-info/20',
    },
  ];

  const features: { icon: Icon; title: string; description: string }[] = [
    {
      icon: BarChart3,
      title: 'Real-Time KPIs',
      description: 'Continuous monitoring of progress, budget, and critical metrics across your entire portfolio.',
    },
    {
      icon: Bell,
      title: 'Early Warning Alerts',
      description: 'Smart notifications to identify risks before they turn into blockers for your team.',
    },
    {
      icon: Brain,
      title: 'AI That Works For You',
      description:
        'Yemoda surfaces blockers and flags risks early — as a clear signal your team can act on, not a black box that slows you down.',
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Granular roles and permissions per project to safeguard sensitive business data.',
    },
    {
      icon: TrendingUp,
      title: 'Executive Dashboards',
      description: 'Customizable dashboards with actionable insights tailored for stakeholders and leads.',
    },
    {
      icon: Users,
      title: 'Built for Real Teams',
      description:
        'Async updates, clear ownership, and a single source of truth — for engineers, leads, and stakeholders alike.',
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
    // `dark` forces the deep-dark palette for the whole landing — including the
    // showcases — regardless of the app's active theme. Display font set here;
    // each <DemoReset> opts the demos back out so their metrics stay unchanged.
    <div
      className="dark relative min-h-screen overflow-x-hidden bg-background text-foreground antialiased"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      {/* ── Floating glass nav ─────────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4" role="banner">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#0D1117]/70 px-4 py-2.5 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:px-5">
          <Link to="/" className={`flex items-center gap-2.5 rounded-lg ${FOCUS}`} aria-label="Yemoda home">
            <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-primary">
              <span className="text-[11px] font-bold text-primary-foreground">YM</span>
            </span>
            <span className="text-[15px] font-semibold text-foreground">Yemoda</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className={`rounded text-[14px] font-medium text-slate-300 transition-colors hover:text-foreground ${FOCUS}`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2.5 md:flex">
            <Link
              to="/login"
              className={`rounded-lg px-3.5 py-2 text-[14px] font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-foreground ${FOCUS}`}
            >
              Sign in
            </Link>
            <Link
              to="/login"
              className={`rounded-lg bg-primary px-4 py-2 text-[14px] font-semibold text-primary-foreground transition-colors hover:bg-primary-hover ${FOCUS}`}
            >
              Get started
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className={`rounded-lg p-1.5 text-foreground transition-colors hover:bg-white/5 md:hidden ${FOCUS}`}
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
          className="fixed inset-0 z-[60] flex flex-col bg-[#07090D]/98 backdrop-blur-md md:hidden"
        >
          <div className="flex items-center justify-between px-6 pt-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-primary">
                <span className="text-[11px] font-bold text-primary-foreground">YM</span>
              </span>
              <span className="text-[15px] font-semibold text-foreground">Yemoda</span>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className={`rounded-lg p-1.5 text-foreground transition-colors hover:bg-white/5 ${FOCUS}`}
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
                className={`rounded text-[22px] font-medium text-foreground transition-colors hover:text-primary ${FOCUS}`}
              >
                {link.label}
              </a>
            ))}
            <div className="mt-4 flex w-60 flex-col items-center gap-3">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className={`w-full rounded-lg border border-white/15 bg-white/5 py-3 text-center text-[15px] font-semibold text-foreground ${FOCUS}`}
              >
                Sign in
              </Link>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className={`w-full rounded-lg bg-primary py-3 text-center text-[15px] font-semibold text-primary-foreground ${FOCUS}`}
              >
                Get started
              </Link>
            </div>
          </nav>
        </div>
      )}

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 pt-36 pb-24 sm:pt-44 lg:pb-28">
        {/* Ambient background — decorative, motion gated by prefers-reduced-motion */}
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute inset-0 lp-grid" />
          <div className="lp-glow lp-glow-pulse absolute inset-x-0 top-0 h-[640px]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
        </div>

        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <div className="lp-fade-up mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3.5 backdrop-blur-md">
            <span
              className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground"
              style={{ fontFamily: 'var(--font-mono-lp)' }}
            >
              New
            </span>
            <span className="text-[13px] text-slate-200">Built for modern engineering teams</span>
          </div>

          <h1
            className="lp-fade-up text-[2.75rem] font-semibold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-6xl lg:text-7xl"
            style={{ animationDelay: '0.05s' }}
          >
            Intelligent project{' '}
            <span className="bg-gradient-to-r from-primary via-[#a855f7] to-[#c084fc] bg-clip-text text-transparent">
              management
            </span>
          </h1>

          <p
            className="lp-fade-up mx-auto mt-7 max-w-2xl text-[17px] leading-relaxed text-slate-300 sm:text-lg"
            style={{ animationDelay: '0.1s' }}
          >
            The project platform built around how teams actually work. Real-time visibility, early warnings,
            and AI that helps your team move faster — not get in the way.
          </p>

          <div
            className="lp-fade-up mt-9 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row"
            style={{ animationDelay: '0.15s' }}
          >
            <Link
              to="/login"
              className={`group inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-[15px] font-semibold text-primary-foreground shadow-[0_8px_30px_-8px_rgba(147,51,234,0.6)] transition-colors hover:bg-primary-hover sm:w-auto ${FOCUS}`}
            >
              Get started
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <a
              href="#demo"
              className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-6 py-3 text-[15px] font-medium text-slate-100 backdrop-blur-md transition-colors hover:bg-white/10 sm:w-auto ${FOCUS}`}
            >
              See the demo
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>

          <ul
            className="lp-fade-up mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
            style={{ animationDelay: '0.2s' }}
          >
            {trust.map((item) => (
              <li key={item} className="inline-flex items-center gap-1.5 text-[13px] text-slate-400">
                <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Stats band ─────────────────────────────────────────────────────── */}
      <section aria-label="Key metrics" className="border-y border-white/[0.07] bg-[#0B0E14]">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 py-10 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p
                className="text-3xl font-bold tracking-tight text-foreground md:text-4xl"
                style={{ fontFamily: 'var(--font-mono-lp)' }}
              >
                {stat.value}
              </p>
              <p className="mt-1.5 text-[12px] uppercase tracking-wider text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── The problem ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>The problem</Eyebrow>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-foreground md:text-4xl">
            Most project tools were built for managers, not teams
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-400">
            The result? Visibility gaps, late surprises, and AI features nobody actually uses.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-3">
          {painPoints.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 transition-colors hover:border-white/15"
            >
              <span className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border ${p.ring} ${p.bg} ${p.tint}`}>
                <p.icon className="h-5 w-5" />
              </span>
              <h3 className="text-[15px] font-semibold text-foreground">{p.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-400">{p.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-[13px] font-medium text-[#c084fc]">
            <Zap className="h-4 w-4" aria-hidden="true" />
            Yemoda was designed specifically to solve all three
          </span>
        </div>
      </section>

      {/* ── Product tour: dashboard + project workspace ────────────────────── */}
      <ChapterLabel>Product tour</ChapterLabel>
      <DemoReset>
        <DashboardShowcase />
      </DemoReset>
      <DemoReset>
        <ProjectDetailShowcase />
      </DemoReset>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>Why teams choose Yemoda</Eyebrow>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-foreground md:text-4xl">
            Built for the problems engineering teams face today
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-400">
            Too many status meetings, blockers caught too late, AI tools that feel like extra work. Yemoda was
            built to solve all three.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 transition-colors hover:border-primary/30 hover:bg-white/[0.04]"
            >
              <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                <feature.icon className="h-5 w-5" />
              </span>
              <h3 className="text-[15px] font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── AI workflow: code review + AI fix ──────────────────────────────── */}
      <ChapterLabel>The AI workflow</ChapterLabel>
      <DemoReset>
        <CodeReviewShowcase />
      </DemoReset>
      <DemoReset>
        <AiFixShowcase />
      </DemoReset>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section id="how-it-works" className="scroll-mt-24 border-y border-white/[0.07] bg-[#0B0E14]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>Process</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-foreground md:text-4xl">
              Up and running in 3 steps
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-slate-400">
              From setup to actionable intelligence in minutes.
            </p>
          </div>

          <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                {index < steps.length - 1 && (
                  <span
                    className="absolute left-[calc(50%+2rem)] top-6 hidden h-px w-[calc(100%-2rem)] bg-gradient-to-r from-white/15 to-transparent md:block"
                    aria-hidden="true"
                  />
                )}
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                      <step.icon className="h-5 w-5" />
                    </span>
                    <span
                      className="text-[13px] font-semibold tracking-widest text-[#c084fc]"
                      style={{ fontFamily: 'var(--font-mono-lp)' }}
                    >
                      {step.number}
                    </span>
                  </div>
                  <h3 className="mt-4 text-[15px] font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-slate-400">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-[#0B0E14] px-8 py-16 text-center sm:px-16">
          <div className="lp-glow lp-glow-pulse pointer-events-none absolute inset-x-0 -top-24 h-72" aria-hidden="true" />
          <div className="relative">
            <h2 className="text-3xl font-semibold tracking-[-0.02em] text-foreground md:text-4xl">
              Give your team the clarity they need to ship.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-slate-300">
              No steep learning curve, no AI black boxes — just real insights your whole team can act on from
              day one.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/login"
                className={`group inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-[15px] font-semibold text-primary-foreground shadow-[0_8px_30px_-8px_rgba(147,51,234,0.6)] transition-colors hover:bg-primary-hover sm:w-auto ${FOCUS}`}
              >
                Get started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <Link
                to="/login"
                className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-6 py-3 text-[15px] font-medium text-slate-100 transition-colors hover:bg-white/10 sm:w-auto ${FOCUS}`}
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.07]" role="contentinfo">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 md:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-primary">
              <span className="text-[10px] font-bold text-primary-foreground">YM</span>
            </span>
            <span className="text-[14px] font-semibold text-foreground">Yemoda</span>
          </div>
          <nav className="flex items-center gap-6" aria-label="Footer">
            {['Terms', 'Privacy', 'Contact'].map((item) => (
              <a
                key={item}
                href="#"
                className={`rounded text-[13px] text-slate-400 transition-colors hover:text-foreground ${FOCUS}`}
              >
                {item}
              </a>
            ))}
          </nav>
          <p className="text-[13px] text-slate-400">&copy; 2026 Yemoda. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
