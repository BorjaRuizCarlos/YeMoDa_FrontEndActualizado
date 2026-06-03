import { useState } from 'react';
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
  ChevronDown,
  Menu,
  X
} from 'lucide-react';
import { DashboardShowcase, CodeReviewShowcase, ProjectDetailShowcase, AiFixShowcase } from '../components/LandingShowcase';

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '#features', label: 'Features' },
    { href: '#demo', label: 'Services', chevron: true },
    { href: '#how-it-works', label: 'How it works' },
  ];

  const features = [
    {
      icon: <BarChart3 className="w-5 h-5" />,
      title: 'Real-Time KPIs',
      description: 'Continuous monitoring of progress, budget, and critical metrics across your entire portfolio.'
    },
    {
      icon: <Bell className="w-5 h-5" />,
      title: 'Early Warning Alerts',
      description: 'Smart notifications to identify risks before they turn into blockers for your team.'
    },
    {
      icon: <Brain className="w-5 h-5" />,
      title: 'AI That Works For You',
      description: 'Yemoda uses AI to surface blockers and flag risks early — as a clear signal your team can act on, not a black box that slows you down.'
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: 'Enterprise Security',
      description: 'Granular roles and permissions per project to safeguard sensitive business data.'
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      title: 'Executive Dashboards',
      description: 'Customizable dashboards with actionable insights tailored for stakeholders and leads.'
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: 'Built for Real Teams',
      description: 'Async updates, clear ownership, and a single source of truth — for engineers, leads, and stakeholders, without switching between a dozen tools.'
    }
  ];

  const stats = [
    { value: '99.9%', label: 'Uptime guaranteed' },
    { value: '150+',  label: 'Projects managed' },
    { value: '40%',   label: 'Fewer delays' },
    { value: '4.8/5', label: 'User satisfaction' },
  ];

  const steps = [
    { number: '01', icon: <Layers className="w-5 h-5" />, title: 'Set up your projects', description: 'Import or create projects with timelines, budgets, and assigned teams in minutes.' },
    { number: '02', icon: <GitBranch className="w-5 h-5" />, title: 'Monitor in real time', description: 'Visualize KPIs, sprint progress, and deviations with automatically updated dashboards.' },
    { number: '03', icon: <Zap className="w-5 h-5" />, title: 'Act with confidence', description: 'AI surfaces blockers early so your team can respond — clear, actionable signals, not noise.' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero with full-screen video background ─────────────────────────── */}
      <div className="relative min-h-screen overflow-hidden">
        {/* Video background */}
        <video
          className="absolute inset-0 w-full h-full object-cover z-0"
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
        >
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260210_031346_d87182fb-b0af-4273-84d1-c6fd17d6bf0f.mp4"
            type="video/mp4"
          />
        </video>

        {/* Header (transparent overlay) */}
        <header className="relative z-20 w-full" role="banner">
          <div className="flex items-center justify-between px-6 lg:px-[120px] py-4">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-[var(--hero-purple)] rounded-[6px] flex items-center justify-center">
                <span className="text-white font-semibold text-xs">YM</span>
              </div>
              <span className="font-semibold text-white text-[15px] font-['Manrope']">Yemoda</span>
            </div>

            {/* Nav links (desktop) */}
            <nav className="hidden md:flex items-center gap-7" aria-label="Main navigation">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="flex items-center gap-1 font-['Manrope'] font-medium text-[14px] text-white hover:opacity-80 transition-opacity"
                >
                  {link.label}
                  {link.chevron && <ChevronDown className="w-4 h-4" />}
                </a>
              ))}
            </nav>

            {/* Action buttons (desktop) */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                to="/login"
                className="px-4 py-2 bg-white border border-[#d4d4d4] rounded-[8px] text-[#171717] font-['Manrope'] font-semibold text-[14px] hover:bg-white/90 transition-colors"
              >
                Sign in
              </Link>
              <Link
                to="/login"
                className="px-4 py-2 bg-[var(--hero-purple)] hover:bg-[var(--hero-purple-hover)] rounded-[8px] text-[#fafafa] font-['Manrope'] font-semibold text-[14px] shadow-md transition-colors"
              >
                Get Started
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden text-white"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/95 flex flex-col md:hidden">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-[var(--hero-purple)] rounded-[6px] flex items-center justify-center">
                  <span className="text-white font-semibold text-xs">YM</span>
                </div>
                <span className="font-semibold text-white text-[15px] font-['Manrope']">Yemoda</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="text-white"
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex flex-col items-center justify-center gap-8 flex-1" aria-label="Mobile navigation">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="font-['Manrope'] font-medium text-[20px] text-white hover:opacity-80 transition-opacity"
                >
                  {link.label}
                </a>
              ))}
              <div className="flex flex-col items-center gap-3 mt-4 w-56">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center px-4 py-2.5 bg-white border border-[#d4d4d4] rounded-[8px] text-[#171717] font-['Manrope'] font-semibold text-[14px]"
                >
                  Sign in
                </Link>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center px-4 py-2.5 bg-[var(--hero-purple)] rounded-[8px] text-[#fafafa] font-['Manrope'] font-semibold text-[14px] shadow-md"
                >
                  Get Started
                </Link>
              </div>
            </nav>
          </div>
        )}

        {/* Hero Content (centered) */}
        <section className="relative z-10 flex flex-col items-center text-center px-6 mt-32 pb-24">
          {/* Tagline pill — glassmorphism */}
          <div className="inline-flex items-center gap-2 h-[38px] px-2 rounded-[10px] bg-[rgba(85,80,110,0.4)] backdrop-blur-md border border-[rgba(164,132,215,0.5)] mb-8">
            <span className="px-2 py-0.5 rounded-[6px] bg-[var(--hero-purple)] text-white font-['Cabin'] font-medium text-[12px]">
              New
            </span>
            <span className="font-['Cabin'] font-medium text-[14px] text-white pr-1">
              Built for modern engineering teams
            </span>
          </div>

          <h1 className="font-['Instrument_Serif'] text-white text-5xl md:text-7xl lg:text-[96px] leading-[1.1] mb-6 max-w-5xl">
            Intelligent Project <span className="italic px-1">Management</span>
          </h1>

          <p className="font-['Inter'] font-normal text-[18px] text-white/70 max-w-[662px] mx-auto mb-9 leading-relaxed">
            The project platform built around how teams actually work. Real-time visibility, early warnings, and AI that helps your team move faster — not get in the way.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 justify-center mb-7">
            <Link
              to="/login"
              className="px-6 py-3 bg-[var(--hero-purple)] hover:bg-[var(--hero-purple-hover)] text-white rounded-[10px] font-['Cabin'] font-medium text-[16px] transition-colors inline-flex items-center gap-2"
            >
              Get started
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#demo"
              className="px-6 py-3 bg-[var(--hero-dark)] hover:bg-[var(--hero-dark-hover)] text-[#f6f7f9] rounded-[10px] font-['Cabin'] font-medium text-[16px] transition-colors inline-flex items-center gap-2"
            >
              See the demo
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 justify-center font-['Inter'] text-[12px] text-white/70">
            <span><span className="text-white font-semibold">✓</span> AI that works for your team</span>
            <span><span className="text-white font-semibold">✓</span> Designed for today's challenges</span>
            <span><span className="text-white font-semibold">✓</span> Up and running in minutes</span>
          </div>
        </section>
      </div>

      <DashboardShowcase />
      <ProjectDetailShowcase />
      <CodeReviewShowcase />
      <AiFixShowcase />

      {/* Stats Bar */}
      <section className="border-y border-border bg-card/50">
        <div className="container mx-auto px-6 py-10 max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-2xl font-semibold text-foreground mb-1">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pain Points */}
      <section className="container mx-auto px-6 py-16 max-w-6xl">
        <div className="text-center mb-10">
          <p className="text-xs font-medium text-primary uppercase tracking-wider mb-2">The Problem</p>
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-3">
            Most project tools were built for managers, not teams
          </h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            The result? Visibility gaps, late surprises, and AI features nobody actually uses.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto mb-8">
          <div className="bg-destructive/5 border border-destructive/15 rounded-[4px] p-5">
            <div className="w-8 h-8 bg-destructive/10 rounded-[3px] flex items-center justify-center text-destructive mb-3">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-[12px] font-semibold text-foreground mb-1.5">Too many status meetings</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Hours lost chasing updates that should be visible to the whole team automatically.
            </p>
          </div>
          <div className="bg-warning/5 border border-warning/15 rounded-[4px] p-5">
            <div className="w-8 h-8 bg-warning/10 rounded-[3px] flex items-center justify-center text-warning mb-3">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="text-[12px] font-semibold text-foreground mb-1.5">Blockers caught too late</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Issues surface only when it&apos;s too late to course-correct &mdash; delays become inevitable.
            </p>
          </div>
          <div className="bg-info/5 border border-info/15 rounded-[4px] p-5">
            <div className="w-8 h-8 bg-info/10 rounded-[3px] flex items-center justify-center text-info mb-3">
              <Brain className="w-4 h-4" />
            </div>
            <h3 className="text-[12px] font-semibold text-foreground mb-1.5">AI tools that add friction</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Complex AI features that require setup, disrupt workflows, and feel like extra work rather than help.
            </p>
          </div>
        </div>

        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-[3px] text-primary text-[12px] font-medium">
            <Zap className="w-3.5 h-3.5" />
            Yemoda was designed specifically to solve all three
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-6 py-20 max-w-6xl scroll-mt-13">
        <div className="text-center mb-14">
          <p className="text-xs font-medium text-primary uppercase tracking-wider mb-2">Why teams choose Yemoda</p>
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-3">
            Built for the problems engineering teams face today
          </h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Too many status meetings, blockers caught too late, AI tools that feel like extra work. Yemoda was built to solve all three.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-card border border-border rounded-[4px] p-4 hover:border-primary/30 transition-colors group"
            >
              <div className="w-9 h-9 bg-primary/10 rounded-[3px] flex items-center justify-center text-primary mb-3 group-hover:bg-primary/15 transition-colors">
                {feature.icon}
              </div>
              <h3 className="text-[12px] font-semibold text-foreground mb-1.5">{feature.title}</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-card/50 border-y border-border scroll-mt-25">
        <div className="container mx-auto px-6 py-20 max-w-6xl">
          <div className="text-center mb-14">
            <p className="text-xs font-medium text-primary uppercase tracking-wider mb-2">Process</p>
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-3">
              Up and running in 3 steps
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              From setup to actionable intelligence in minutes
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <div key={index} className="relative text-center">
                <div className="w-11 h-11 rounded-[4px] bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
                  {step.icon}
                </div>
                <span className="text-[10px] font-semibold text-primary uppercase tracking-widest">{step.number}</span>
                <h3 className="text-sm font-semibold text-foreground mt-1 mb-2">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[60%] w-[80%] border-t border-dashed border-border" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* CTA */}
      <section className="container mx-auto px-6 pb-20 max-w-6xl">
        <div className="bg-card border border-border rounded-[4px] p-8 md:p-12 text-center max-w-3xl mx-auto relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/[0.02]" />
          <div className="relative">
            <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-3">
              Give your team the clarity they need to ship.
            </h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
              No steep learning curve, no AI black boxes — just real insights your whole team can act on from day one.
            </p>
            <div className="flex items-center gap-3 justify-center">
              <Link 
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground rounded-[3px] text-[13px] font-medium transition-colors"
              >
                Get started
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link 
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-secondary hover:bg-accent text-foreground rounded-[3px] text-[13px] font-medium transition-colors"
              >
                Sign in
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border" role="contentinfo">
        <div className="container mx-auto px-6 py-8 max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 bg-primary rounded-[3px] flex items-center justify-center">
                <span className="text-primary-foreground font-semibold text-[10px]">YM</span>
              </div>
              <span className="text-[13px] font-medium text-foreground">Yemoda</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Contact</a>
            </div>
            <p className="text-xs text-muted-foreground">
              &copy; 2026 Yemoda. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}