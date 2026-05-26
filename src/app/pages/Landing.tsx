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
  AlertTriangle
} from 'lucide-react';
import { DashboardShowcase, CodeReviewShowcase } from '../components/LandingShowcase';

export default function Landing() {
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
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50" role="banner">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between max-w-6xl">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-primary rounded-[3px] flex items-center justify-center">
              <span className="text-primary-foreground font-semibold text-xs">YM</span>
            </div>
            <span className="font-semibold text-foreground text-[13px]">Yemoda</span>
          </div>
          <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
            <a href="#features" className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#demo" className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">Demo</a>
            <a href="#how-it-works" className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">How it works</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link 
              to="/login" 
              className="text-[12px] text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-20 pb-16 max-w-6xl">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[3px] bg-primary/10 text-primary text-[11px] font-medium mb-6">
            <Zap className="w-3 h-3" />
            Built for modern engineering teams
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-semibold text-foreground mb-5 leading-[1.15] tracking-tight">
            Intelligent Project{' '}
            <span className="text-primary">Management</span>
          </h1>
          
          <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">
            The project platform built around how teams actually work. Real-time visibility, early warnings, and AI that helps your team move faster — not get in the way.
          </p>

          <div className="flex items-center gap-3 justify-center mb-6">
            <Link 
              to="/login"
              className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground rounded-[3px] text-[13px] font-medium transition-colors inline-flex items-center gap-2"
            >
              Get started
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#demo"
              className="px-6 py-2.5 bg-secondary hover:bg-accent text-foreground rounded-[3px] text-[13px] font-medium transition-colors inline-flex items-center gap-2"
            >
              See the demo
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 justify-center text-[11px] text-muted-foreground mt-2">
            <span><span className="text-primary font-semibold">✓</span> AI that works for your team</span>
            <span><span className="text-primary font-semibold">✓</span> Designed for today's challenges</span>
            <span><span className="text-primary font-semibold">✓</span> Up and running in minutes</span>
          </div>

        </div>
      </section>

      <DashboardShowcase />
      <CodeReviewShowcase />

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