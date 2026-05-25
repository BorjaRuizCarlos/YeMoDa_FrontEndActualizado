import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Briefcase,
  ChevronRight,
  Code2,
  FileCode2,
  FileText,
  GitCommit,
  GitMerge,
  Home,
  Settings2,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router';

// ── Window / browser chrome wrapper ──────────────────────────────────────────

// ── Browser chrome ──────────────────────────────────────────────────────────

function AppFrame({
  children,
  url = 'app.yemoda.io',
  className = '',
}: {
  children: ReactNode;
  url?: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[10px] border border-border bg-card overflow-hidden shadow-[0_32px_80px_-24px_rgba(0,0,0,0.45)] ${className}`}
    >
      <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-secondary/80 border-b border-border shrink-0">
        <div className="flex gap-1.5 shrink-0">
          <div className="w-3 h-3 rounded-full bg-[#FF5F57]/75" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E]/75" />
          <div className="w-3 h-3 rounded-full bg-[#28C840]/75" />
        </div>
        <div className="flex-1 flex justify-center min-w-0">
          <div className="bg-background/50 border border-border/40 rounded-[3px] px-8 py-0.5 text-[10px] text-muted-foreground/60 truncate max-w-[300px]">
            {url}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

// ── Demo data ───────────────────────────────────────────────────────────────

type DemoView = 'dashboard' | 'projects' | 'alerts';

const NAV_ITEMS: Array<{
  view: DemoView | null;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
  danger?: boolean;
}> = [
  { view: 'dashboard', icon: Home,      label: 'Dashboard' },
  { view: 'projects',  icon: Briefcase, label: 'Projects',    count: 4 },
  { view: null,        icon: FileText,  label: 'Backlog' },
  { view: null,        icon: BarChart3, label: 'Reports' },
  { view: 'alerts',    icon: Bell,      label: 'Alerts',      count: 2, danger: true },
  { view: null,        icon: Code2,     label: 'Code Review' },
  { view: null,        icon: Settings2, label: 'Settings' },
];

const KPI_DATA = [
  { label: 'Active Projects', value: '4',   delta: '+1 this month',  tone: 'primary' as const },
  { label: 'Tasks Done',      value: '847', delta: '+18% vs last',   tone: 'success' as const },
  { label: 'At Risk',         value: '2',   delta: '−1 resolved',    tone: 'warning' as const },
  { label: 'Team Size',       value: '24',  delta: 'contributors',   tone: 'info'    as const },
];

const DEMO_PROJECTS = [
  { id: 1, name: 'Atlas Retail Platform', status: 'In Progress', progress: 74, health: 'warning' as const, daysLeft: 18, team: 12, owner: 'M. Gonzalez' },
  { id: 2, name: 'Core API Refactor',     status: 'In Review',   progress: 58, health: 'warning' as const, daysLeft: 9,  team: 8,  owner: 'D. Ortega'   },
  { id: 3, name: 'Data Hub v2',           status: 'Planning',    progress: 42, health: 'danger'  as const, daysLeft: 27, team: 6,  owner: 'A. Flores'   },
  { id: 4, name: 'Mobile App v2.4',       status: 'Completed',   progress: 100,health: 'success' as const, daysLeft: 0,  team: 5,  owner: 'R. Perez'    },
];

const DEMO_ALERTS = [
  { id: 1, type: 'danger',  title: 'Sprint delayed',       project: 'Core API Refactor',     time: '1h ago', detail: '4 tasks past deadline'         },
  { id: 2, type: 'warning', title: 'Budget at 81%',        project: 'Atlas Retail Platform', time: '3h ago', detail: 'Projected overrun in 2 weeks'   },
  { id: 3, type: 'success', title: 'PR merged',            project: 'Mobile App v2.4',       time: '2h ago', detail: 'feat: offline reports · 6 files'},
  { id: 4, type: 'warning', title: 'Milestone in 2 days',  project: 'Core API Refactor',     time: '5h ago', detail: 'Security review deadline'       },
  { id: 5, type: 'info',    title: 'New member added',     project: 'Data Hub v2',           time: '4h ago', detail: 'Sarah K. → Developer'          },
];

const HEALTH_DOT: Record<string, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger:  'bg-destructive',
  info:    'bg-info',
};

const HEALTH_BADGE: Record<string, string> = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger:  'bg-destructive/10 text-destructive',
};

const TONE_CHIP: Record<string, string> = {
  primary: 'text-primary bg-primary/10',
  success: 'text-success bg-success/10',
  warning: 'text-warning bg-warning/10',
  info:    'text-info bg-info/10',
};

const ALERT_DOT: Record<string, string> = {
  danger:  'bg-destructive',
  warning: 'bg-warning',
  success: 'bg-success',
  info:    'bg-info',
};

const VIEW_LABEL: Record<DemoView, string> = {
  dashboard: 'Dashboard',
  projects:  'Projects',
  alerts:    'Alerts',
};

// ── Dashboard view ──────────────────────────────────────────────────────────

function DashboardView({ onNavigate }: { onNavigate: (v: DemoView) => void }) {
  return (
    <div className="p-3 space-y-2.5 overflow-y-auto h-full">
      <div className="grid grid-cols-4 gap-2">
        {KPI_DATA.map((card) => (
          <div key={card.label} className="rounded-[4px] border border-border bg-background p-2.5">
            <div className="text-[8px] text-muted-foreground mb-1 uppercase tracking-[0.07em] truncate">{card.label}</div>
            <div className="text-[18px] font-semibold text-foreground leading-none mb-1">{card.value}</div>
            <div className={`inline-flex items-center px-1.5 py-0.5 rounded-[3px] text-[8px] font-medium ${TONE_CHIP[card.tone]}`}>
              {card.delta}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[4px] border border-border bg-card p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] font-semibold text-foreground">Recent Projects</div>
          <button
            onClick={() => onNavigate('projects')}
            className="text-[9px] text-primary hover:underline flex items-center gap-0.5"
          >
            View all <ChevronRight className="w-2.5 h-2.5" />
          </button>
        </div>
        <div className="space-y-1.5">
          {DEMO_PROJECTS.slice(0, 3).map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-[3px] border border-border bg-background px-3 py-2"
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${HEALTH_DOT[p.health]}`} />
              <span className="text-[10px] font-medium text-foreground flex-1 truncate">{p.name}</span>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary/70" style={{ width: `${p.progress}%` }} />
                </div>
                <span className="text-[9px] text-muted-foreground w-7 text-right">{p.progress}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => onNavigate('alerts')}
        className="w-full flex items-center gap-2 rounded-[4px] border border-warning/20 bg-warning/5 px-3 py-2 hover:bg-warning/10 transition-colors text-left"
      >
        <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
        <span className="text-[10px] font-medium text-foreground flex-1">2 active alerts require your attention</span>
        <ChevronRight className="w-3 h-3 text-warning/60 shrink-0" />
      </button>
    </div>
  );
}

// ── Projects view ───────────────────────────────────────────────────────────

function ProjectsView({ activeId, onSelect }: { activeId: number | null; onSelect: (id: number) => void }) {
  return (
    <div className="p-3 space-y-2.5 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold text-foreground">All Projects</div>
        <div className="text-[9px] px-2 py-0.5 rounded-[3px] bg-primary/10 text-primary font-medium">4 total</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {DEMO_PROJECTS.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`rounded-[4px] border p-3 text-left transition-all ${
              activeId === p.id
                ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
                : 'border-border bg-background hover:border-primary/20'
            }`}
          >
            <div className="flex items-start justify-between gap-1 mb-2">
              <div className="text-[10px] font-semibold text-foreground leading-tight">{p.name}</div>
              <span
                className={`text-[8px] font-medium px-1 py-0.5 rounded-[2px] shrink-0 whitespace-nowrap ${
                  HEALTH_BADGE[p.health] ?? 'bg-muted text-muted-foreground'
                }`}
              >
                {p.status}
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[8px] text-muted-foreground">
                <span>{p.progress}%</span>
                <span>{p.daysLeft > 0 ? `${p.daysLeft}d left` : '✓ Done'}</span>
              </div>
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    p.health === 'success' ? 'bg-success/70' : p.health === 'danger' ? 'bg-destructive/70' : 'bg-primary/70'
                  }`}
                  style={{ width: `${p.progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[8px] text-muted-foreground">
                  <Users className="w-2.5 h-2.5" />
                  {p.team} members
                </div>
                <div className="text-[8px] text-muted-foreground">{p.owner}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Alerts view ─────────────────────────────────────────────────────────────

function AlertsView() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-card/60 shrink-0">
        <div className="text-[11px] font-semibold text-foreground">Active Alerts</div>
        <div className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-warning/15 text-warning">
          {DEMO_ALERTS.length} alerts
        </div>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {DEMO_ALERTS.map((alert) => (
          <div key={alert.id} className="px-3 py-2.5 hover:bg-surface-secondary/30 transition-colors">
            <div className="flex items-start gap-2">
              <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${ALERT_DOT[alert.type]}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-[10px] font-medium text-foreground leading-tight truncate">{alert.title}</div>
                  <div className="text-[9px] text-muted-foreground shrink-0">{alert.time}</div>
                </div>
                <div className="text-[9px] text-muted-foreground mt-0.5 truncate">{alert.project}</div>
                <div className="text-[9px] text-muted-foreground/60 mt-0.5 truncate">{alert.detail}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Dashboard Showcase (interactive) ───────────────────────────────────────

export function DashboardShowcase() {
  const [activeView, setActiveView] = useState<DemoView>('dashboard');
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);

  return (
    <section id="demo" className="container mx-auto px-6 py-24 max-w-6xl scroll-mt-16">
      <div className="grid lg:grid-cols-[1fr_1.7fr] gap-14 items-center">

        {/* ── Text column ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[3px] border border-primary/20 bg-primary/10 text-primary text-[11px] font-medium">
            <Sparkles className="w-3 h-3" />
            Interactive demo — click to explore
          </div>

          <h2 className="text-[2rem] md:text-[2.35rem] font-semibold text-foreground leading-[1.15] tracking-tight">
            Everything your team needs,{' '}
            <span className="text-primary">in one workspace</span>
          </h2>

          <p className="text-[14px] text-muted-foreground leading-relaxed">
            Project portfolio, real-time KPIs, sprint boards, and code review — all connected. Navigate the demo to see how Yemoda fits your daily workflow.
          </p>

          <ul className="space-y-3">
            {[
              { icon: BarChart3, text: 'Real-time KPIs across all projects' },
              { icon: Users,     text: 'Team and role management per project' },
              { icon: Zap,       text: 'Predictive alerts powered by AI' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2.5 text-[13px] text-foreground">
                <div className="w-5 h-5 rounded-[3px] bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-3 h-3 text-primary" />
                </div>
                {text}
              </li>
            ))}
          </ul>

          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground rounded-[3px] text-[13px] font-medium transition-colors"
          >
            Get started for free
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>

        {/* ── App frame column ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
          className="space-y-3"
        >
          <AppFrame url="app.yemoda.io/dashboard">
            <div className="grid grid-cols-[160px_minmax(0,1fr)] h-[420px] overflow-hidden">

              {/* Sidebar */}
              <aside className="border-r border-border bg-surface-secondary/40 flex flex-col p-2.5 gap-0.5 overflow-hidden shrink-0">
                <div className="flex items-center gap-2 px-2 py-2 mb-1.5">
                  <div className="w-6 h-6 rounded-[3px] bg-primary flex items-center justify-center shrink-0">
                    <span className="text-primary-foreground font-bold text-[9px]">YM</span>
                  </div>
                  <span className="text-[10px] font-semibold text-foreground truncate">Yemoda</span>
                </div>

                {NAV_ITEMS.map(({ view, icon: Icon, label, count, danger }) => {
                  const isActive = view === activeView;
                  const isClickable = view !== null;
                  return (
                    <button
                      key={label}
                      type="button"
                      disabled={!isClickable}
                      onClick={() => view && setActiveView(view)}
                      className={`flex items-center justify-between gap-2 w-full px-2.5 py-1.5 rounded-[3px] transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-foreground'
                          : isClickable
                          ? 'text-muted-foreground hover:bg-accent/50 hover:text-foreground cursor-pointer'
                          : 'text-muted-foreground/35 cursor-default'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-primary' : ''}`} />
                        <span className="text-[10px] truncate">{label}</span>
                      </div>
                      {count != null && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                            danger ? 'bg-destructive/15 text-destructive' : 'bg-primary/10 text-primary'
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </aside>

              {/* Main content */}
              <div className="bg-background flex flex-col overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border bg-card/80 shrink-0">
                  <div className="text-[11px] font-semibold text-foreground">{VIEW_LABEL[activeView]}</div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-surface-secondary/60 border border-border/50 rounded-[3px] px-2.5 py-1">
                    <Activity className="w-3 h-3" />
                    Quick search…
                  </div>
                </div>

                <div className="flex-1 overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeView}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="h-full"
                    >
                      {activeView === 'dashboard' && (
                        <DashboardView onNavigate={(v) => setActiveView(v)} />
                      )}
                      {activeView === 'projects' && (
                        <ProjectsView
                          activeId={activeProjectId}
                          onSelect={(id) => setActiveProjectId(id)}
                        />
                      )}
                      {activeView === 'alerts' && <AlertsView />}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </AppFrame>

          <p className="text-center text-[11px] text-muted-foreground">
            Click{' '}
            <span className="font-medium text-foreground">Dashboard</span>,{' '}
            <span className="font-medium text-foreground">Projects</span>, or{' '}
            <span className="font-medium text-foreground">Alerts</span>{' '}
            in the sidebar to explore
          </p>
        </motion.div>
      </div>
    </section>
  );
}

// ── Code Review Showcase ──────────────────────────────────────────────────────

type DiffLineType = 'header' | 'add' | 'remove' | 'context';

interface MockDiffLine {
  type: DiffLineType;
  content: string;
}

const MOCK_DIFF: MockDiffLine[] = [
  { type: 'header',  content: "@@ -8,7 +8,14 @@ import type { Project } from './types';" },
  { type: 'context', content: ' ' },
  { type: 'context', content: ' export function calculateProjectHealth(' },
  { type: 'context', content: '   project: Project,' },
  { type: 'context', content: '   tasks: Task[],' },
  { type: 'context', content: ' ): ProjectHealth {' },
  { type: 'remove',  content: "-  const completion = tasks.filter(t => t.status === 'done').length / tasks.length;" },
  { type: 'remove',  content: "-  if (completion < 0.3) return 'at_risk';" },
  { type: 'add',     content: "+  if (tasks.length === 0) return 'unknown';" },
  { type: 'add',     content: '+' },
  { type: 'add',     content: "+  const done = tasks.filter(t => t.status === 'done').length;" },
  { type: 'add',     content: "+  const blocked = tasks.filter(t => t.status === 'blocked').length;" },
  { type: 'add',     content: '+  const completion = done / tasks.length;' },
  { type: 'add',     content: '+' },
  { type: 'add',     content: "+  if (blocked > 2 || completion < 0.2) return 'at_risk';" },
  { type: 'add',     content: "+  if (completion < 0.4) return 'warning';" },
  { type: 'context', content: "   return completion >= 0.8 ? 'on_track' : 'warning';" },
  { type: 'context', content: ' }' },
];

const DIFF_ROW_STYLE: Record<DiffLineType, string> = {
  header:  'bg-primary/5 text-primary/70',
  add:     'bg-emerald-500/8 text-emerald-400',
  remove:  'bg-red-500/8 text-red-400',
  context: 'text-muted-foreground',
};

const MOCK_ALERTS = [
  { id: 1, type: 'danger',  title: 'API Gateway timeout',      project: 'Phoenix Backend',     time: '5m ago',  detail: 'Avg latency 2.3s in prod'              },
  { id: 2, type: 'warning', title: 'Sprint behind schedule',   project: 'Dashboard Analytics', time: '1h ago',  detail: '4 tasks past deadline'                 },
  { id: 3, type: 'success', title: 'PR merged successfully',   project: 'Mobile App v2',       time: '2h ago',  detail: 'feat: health score refactor · 6 files'  },
  { id: 4, type: 'warning', title: 'Budget at 87%',            project: 'Client Portal',       time: '3h ago',  detail: 'Projected overrun in 2 weeks'           },
  { id: 5, type: 'info',    title: 'New team member added',    project: 'Core Platform',       time: '4h ago',  detail: 'Maria G. → Developer'                  },
];

const CR_ALERT_DOT: Record<string, string> = {
  danger:  'bg-destructive',
  warning: 'bg-warning',
  success: 'bg-success',
  info:    'bg-info',
};

export function CodeReviewShowcase() {
  return (
    <section className="bg-card/30 border-y border-border">
      <div className="container mx-auto px-6 py-24 max-w-6xl">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[3px] border border-primary/20 bg-primary/10 text-primary text-[11px] font-medium mb-4">
            <Code2 className="w-3 h-3" />
            Integrated code review
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-3">
            Code review connected to your tasks
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Link commits and pull requests directly to sprint tasks.
            See project alerts while reviewing every code change.
          </p>
        </motion.div>

        {/* App frame */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
        >
          <AppFrame url="app.yemoda.io/projects/atlas-retail/code-review">

            {/* Commit info bar */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 bg-surface-secondary/50 border-b border-border">
              <div className="flex items-center gap-2 text-[11px] text-foreground min-w-0 flex-1">
                <GitCommit className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="font-mono font-medium truncate">feat: improve project health score calculation</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">
                    AB
                  </div>
                  a.bravo
                </div>
                <div className="text-[10px] text-muted-foreground border-l border-border pl-3">3 hours ago</div>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-success/10 text-success text-[10px] font-medium">
                  <GitMerge className="w-3 h-3" />
                  Merged
                </div>
              </div>
            </div>

            {/* Two-column content */}
            <div className="grid lg:grid-cols-[1.35fr_0.65fr] max-h-[480px]">

              {/* ── Diff viewer ─────────────────────────────────────────────── */}
              <div className="border-r border-border overflow-y-auto bg-background">
                {/* File header */}
                <div className="sticky top-0 z-10 px-3 py-2 border-b border-border bg-surface-secondary/50 flex items-center gap-2">
                  <FileCode2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="font-mono text-[10px] text-foreground truncate">
                    src/utils/projectHealth.ts
                  </span>
                  <div className="ml-auto flex gap-1.5 text-[9px] shrink-0">
                    <span className="text-success bg-success/10 px-1.5 py-0.5 rounded-[2px] font-medium">+8</span>
                    <span className="text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-[2px] font-medium">−2</span>
                  </div>
                </div>

                {/* Diff table */}
                <table className="w-full font-mono text-[10px] leading-[18px]">
                  <tbody>
                    {MOCK_DIFF.map((line, i) => (
                      <tr key={i} className={`${DIFF_ROW_STYLE[line.type]}`}>
                        <td className="w-5 text-center select-none text-[9px] border-r border-border/30 text-muted-foreground/50 px-1 shrink-0">
                          {line.type === 'add' ? '+' : line.type === 'remove' ? '−' : ''}
                        </td>
                        <td className="px-3 whitespace-pre">{line.content}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Alerts panel ────────────────────────────────────────────── */}
              <div className="flex flex-col overflow-hidden bg-background">
                <div className="px-4 py-2.5 border-b border-border bg-card/60 shrink-0 flex items-center justify-between">
                  <div className="text-[11px] font-semibold text-foreground">Project alerts</div>
                  <div className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-warning/15 text-warning">
                    {MOCK_ALERTS.length} active
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-border">
                  {MOCK_ALERTS.map((alert) => (
                    <div key={alert.id} className="px-4 py-3 hover:bg-surface-secondary/30 transition-colors">
                      <div className="flex items-start gap-2.5">
                        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${CR_ALERT_DOT[alert.type]}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="text-[11px] font-medium text-foreground leading-tight truncate">
                              {alert.title}
                            </div>
                            <div className="text-[9px] text-muted-foreground shrink-0">{alert.time}</div>
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{alert.project}</div>
                          <div className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">{alert.detail}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer hint */}
                <div className="px-4 py-2.5 border-t border-border bg-surface-secondary/30 shrink-0">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <AlertTriangle className="w-3 h-3 text-warning" />
                    2 critical alerts require action
                  </div>
                </div>
              </div>
            </div>
          </AppFrame>
        </motion.div>
      </div>
    </section>
  );
}
