import { useState, type ReactNode, type ComponentType } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  BarChart3,
  Bell,
  Bot,
  Briefcase,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleUser,
  Clock,
  Cloud,
  Crown,
  Download,
  ExternalLink,
  FileDown,
  Filter,
  GitCommit,
  Github,
  GripVertical,
  KeyRound,
  LayoutDashboard,
  LayoutGrid,
  LayoutList,
  List,
  ListChecks,
  Lock,
  Mail,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings2,
  Shield,
  Square,
  Sun,
  Timer,
  Trash2,
  TrendingDown,
  TrendingUp,
  Unlock,
  User,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router';

type Icon = ComponentType<{ className?: string }>;

// ── Browser chrome wrapper ───────────────────────────────────────────────────

function AppFrame({
  children,
  url = 'yemoda.site',
  className = '',
}: {
  children: ReactNode;
  url?: string;
  className?: string;
}) {
  return (
    <div className={`lp-demo-scroll rounded-[10px] border border-border bg-card overflow-hidden shadow-[0_32px_80px_-24px_rgba(0,0,0,0.45)] ${className}`}>
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

// ── Shared status helpers (mirror the real app) ──────────────────────────────

// Project workflow status → dot color (StatusBadge dot variant: neutral pill + colored dot)
const PROJECT_STATUS_DOT: Record<string, string> = {
  'Planning': 'bg-slate-500',
  'In Progress': 'bg-info',
  'Review': 'bg-violet-500',
  'Completed': 'bg-success',
  'Retired': 'bg-orange-500',
  'Cancelled': 'bg-rose-500',
};

// Per-task status name → pill color (taskStatusColor)
const TASK_STATUS_COLOR: Record<string, string> = {
  'Backlog': 'bg-slate-500/15 text-slate-400',
  'To do': 'bg-sky-500/15 text-sky-400',
  'In progress': 'bg-amber-500/15 text-amber-400',
  'In review': 'bg-violet-500/15 text-violet-400',
  'Done': 'bg-emerald-500/15 text-emerald-400',
  'Blocked': 'bg-red-500/15 text-red-400',
};

// Health bucket → color
const HEALTH_DOT: Record<'green' | 'yellow' | 'red', string> = {
  green: 'bg-success',
  yellow: 'bg-warning',
  red: 'bg-destructive',
};
const HEALTH_LABEL: Record<'green' | 'yellow' | 'red', string> = {
  green: 'Healthy',
  yellow: 'At risk',
  red: 'Critical',
};

function progressColor(pct: number): string {
  return pct >= 75 ? 'bg-success' : pct >= 40 ? 'bg-warning' : 'bg-destructive';
}

// ── Demo data ────────────────────────────────────────────────────────────────

type DemoView = 'dashboard' | 'proyectos' | 'reportes' | 'alertas' | 'perfil';

const VIEW_LABEL: Record<DemoView, string> = {
  dashboard: 'Dashboard',
  proyectos: 'Projects',
  reportes: 'Reports',
  alertas: 'Alerts',
  perfil: 'Profile',
};

// Interactive nav pills (above the frame) map to the 5 demo views.
const NAV_VIEWS: { view: DemoView; label: string }[] = [
  { view: 'dashboard', label: 'Dashboard' },
  { view: 'proyectos', label: 'Projects' },
  { view: 'reportes', label: 'Reports' },
  { view: 'alertas', label: 'Alerts' },
  { view: 'perfil', label: 'Profile' },
];

// Real sidebar grouping (Backlog is shown but non-interactive in this mock).
const SIDEBAR_GROUPS: { heading: string | null; items: { view: DemoView | null; icon: Icon; label: string }[] }[] = [
  {
    heading: null,
    items: [
      { view: 'dashboard', icon: LayoutGrid, label: 'Dashboard' },
      { view: null, icon: ListChecks, label: 'Backlog' },
      { view: 'proyectos', icon: Briefcase, label: 'Projects' },
    ],
  },
  {
    heading: 'Analytics',
    items: [
      { view: 'reportes', icon: BarChart3, label: 'Reports' },
      { view: 'alertas', icon: Bell, label: 'Alerts' },
    ],
  },
  {
    heading: 'User',
    items: [{ view: 'perfil', icon: CircleUser, label: 'Profile' }],
  },
];

type DemoProject = {
  id: number;
  name: string;
  status: string;        // workflow status label
  progress: number | null; // null = no tasks (shows "—")
  health: 'green' | 'yellow' | 'red';
  endDate: string;
  timeLeft: string;
  timeTone: 'destructive' | 'warning' | 'muted';
  completed: number;
  total: number;
  overdue: number;
};

const DEMO_PROJECTS: DemoProject[] = [
  { id: 1, name: 'Analytics Platform',    status: 'In Progress', progress: 88,   health: 'green',  endDate: '30 May 2026', timeLeft: '4d',  timeTone: 'warning', completed: 7, total: 8,  overdue: 0 },
  { id: 2, name: 'E-Commerce Redesign',   status: 'In Progress', progress: 72,   health: 'green',  endDate: '7 Jun 2026',  timeLeft: '12d', timeTone: 'muted',   completed: 8, total: 11, overdue: 0 },
  { id: 3, name: 'Mobile App v2',         status: 'In Progress', progress: 45,   health: 'yellow', endDate: '3 Jun 2026',  timeLeft: '6d',  timeTone: 'warning', completed: 4, total: 9,  overdue: 1 },
  { id: 4, name: 'Design System',         status: 'Review',      progress: 64,   health: 'green',  endDate: '19 Jun 2026', timeLeft: '16d', timeTone: 'muted',   completed: 9, total: 14, overdue: 0 },
  { id: 5, name: 'API Gateway Migration', status: 'Planning',    progress: 20,   health: 'red',    endDate: '16 Jun 2026', timeLeft: '21d', timeTone: 'muted',   completed: 2, total: 10, overdue: 2 },
  { id: 6, name: 'Admin Dashboard',       status: 'Planning',    progress: null, health: 'yellow', endDate: '25 Jun 2026', timeLeft: '30d', timeTone: 'muted',   completed: 0, total: 6,  overdue: 0 },
];

const DUE_SOON: { id: number; title: string; project: string; label: string; tone: 'red' | 'amber' | 'sky' | 'green' }[] = [
  { id: 1, title: 'Implement payment gateway', project: 'E-Commerce Redesign',  label: 'TODAY',          tone: 'amber' },
  { id: 2, title: 'Auth flow unit tests',       project: 'Mobile App v2',        label: 'tomorrow',       tone: 'sky' },
  { id: 3, title: 'Load balancer config',       project: 'API Gateway Migration', label: 'in 4d',         tone: 'green' },
  { id: 4, title: 'Security audit',             project: 'Analytics Platform',   label: 'overdue 2d ago', tone: 'red' },
];

const DUE_TONE: Record<string, { dot: string; pill: string }> = {
  red: { dot: 'bg-destructive', pill: 'bg-destructive/10 text-destructive' },
  amber: { dot: 'bg-warning', pill: 'bg-warning/15 text-warning' },
  sky: { dot: 'bg-sky-500', pill: 'bg-sky-500/15 text-sky-400' },
  green: { dot: 'bg-emerald-500', pill: 'bg-emerald-500/15 text-emerald-400' },
};

const PENDING_TASKS: { id: number; title: string; project: string; status: string; due: string; overdue: boolean }[] = [
  { id: 1, title: 'Implement payment gateway', project: 'E-Commerce Redesign', status: 'In progress', due: '6 Jun', overdue: false },
  { id: 2, title: 'Auth flow unit tests',       project: 'Mobile App v2',       status: 'To do',       due: '9 Jun', overdue: false },
  { id: 3, title: 'Security audit',             project: 'Analytics Platform',  status: 'In review',   due: '2 Jun', overdue: true },
];

const GIT_ACTIVITY: { id: number; av: string; pusher: string; branch: string; commits: string; date: string }[] = [
  { id: 1, av: 'A', pusher: 'alexdev',  branch: 'feat/payment',    commits: '3 commits', date: '2 Jun' },
  { id: 2, av: 'C', pusher: 'carlosr',  branch: 'fix/cart-state',  commits: '1 commit',  date: '1 Jun' },
  { id: 3, av: 'M', pusher: 'mariasf',  branch: 'chore/deps',      commits: '2 commits', date: '31 May' },
];

// Alerts — no severity tier; only status active/resolved, grouped by DATE.
type DemoAlert = {
  id: number;
  message: string;
  task: string;
  time: string;
  status: 'active' | 'resolved';
  resolvedAgo?: string;
  group: 'Today' | 'Yesterday' | 'This week';
};

const DEMO_ALERTS: DemoAlert[] = [
  { id: 1, message: 'Deprecated dependency detected in package.json',  task: 'Project scaffolding review', time: '2h ago', status: 'active',   group: 'Today' },
  { id: 2, message: 'Missing test coverage on checkout module',         task: 'Build checkout flow',        time: '5h ago', status: 'active',   group: 'Today' },
  { id: 3, message: 'Unused environment variable in production config',  task: 'Deploy staging environment', time: '1d ago', status: 'active',   group: 'Yesterday' },
  { id: 4, message: 'High memory usage in background worker',            task: 'Performance sprint',         time: '1d ago', status: 'resolved', resolvedAgo: '3h ago', group: 'Yesterday' },
  { id: 5, message: 'Endpoint missing rate limiting',                    task: 'API gateway setup',          time: '3d ago', status: 'resolved', resolvedAgo: '2d ago', group: 'This week' },
];

// ── Dashboard view ───────────────────────────────────────────────────────────

function DashboardView({ onNavigate }: { onNavigate: (v: DemoView) => void }) {
  const kpis: { label: string; value: string; sub: string; icon: Icon; bar: string; chip: string }[] = [
    { label: 'Projects',  value: '5',  sub: 'active',          icon: Briefcase,     bar: 'bg-primary',      chip: 'bg-primary/10 text-primary' },
    { label: 'Tasks',     value: '34', sub: 'in your projects', icon: ListChecks,    bar: 'bg-sky-500',      chip: 'bg-sky-500/10 text-sky-400' },
    { label: 'Completed', value: '21', sub: 'finished tasks',  icon: CheckCircle2,  bar: 'bg-emerald-500',  chip: 'bg-emerald-500/10 text-emerald-400' },
    { label: 'Open',      value: '13', sub: 'open tasks',      icon: Timer,         bar: 'bg-amber-500',    chip: 'bg-amber-500/10 text-amber-400' },
    { label: 'Overdue',   value: '3',  sub: 'need attention',  icon: AlertTriangle, bar: 'bg-red-500',      chip: 'bg-red-500/10 text-red-400' },
    { label: 'Warnings',  value: '2',  sub: 'active alerts',   icon: TrendingUp,    bar: 'bg-violet-500',   chip: 'bg-violet-500/10 text-violet-400' },
  ];

  const myProjects = DEMO_PROJECTS.slice(0, 4);

  return (
    <div className="p-2.5 space-y-2 overflow-y-auto h-full">
      {/* Command bar: greeting + refresh */}
      <div className="flex items-center justify-between">
        <button className="text-[8px] flex items-center gap-1 px-2 py-0.5 rounded-[3px] border border-border text-muted-foreground">
          <RefreshCw className="w-2 h-2" /> Refresh
        </button>
        <span className="text-[9px] text-muted-foreground">Hi, <span className="font-semibold text-foreground">Alex</span></span>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-1.5">
        {kpis.map((k) => (
          <div key={k.label} className="relative rounded-[3px] border border-border bg-background p-2 overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-[2px] ${k.bar}`} />
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <div className="text-[7px] text-muted-foreground uppercase tracking-[0.07em] mb-0.5 font-semibold">{k.label}</div>
                <div className="text-[16px] font-bold leading-none text-foreground tabular-nums">{k.value}</div>
                <div className="text-[7px] text-muted-foreground mt-0.5">{k.sub}</div>
              </div>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${k.chip}`}>
                <k.icon className="w-2.5 h-2.5" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Portfolio Health + Due Soon */}
      <div className="grid grid-cols-2 gap-1.5">
        {/* Portfolio Health */}
        <div className="rounded-[3px] border border-border bg-background p-2">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[8px] font-semibold text-foreground">Portfolio Health</div>
            <span className="text-[7px] text-muted-foreground">5 total</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-14 h-14 shrink-0">
              <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" strokeWidth="4" pathLength={100} style={{ stroke: 'rgba(255,255,255,0.08)' }} />
                <circle cx="18" cy="18" r="14" fill="none" strokeWidth="4" pathLength={100} strokeDasharray="60 40" strokeDashoffset="0" style={{ stroke: '#10b981' }} />
                <circle cx="18" cy="18" r="14" fill="none" strokeWidth="4" pathLength={100} strokeDasharray="20 80" strokeDashoffset="-60" style={{ stroke: '#f59e0b' }} />
                <circle cx="18" cy="18" r="14" fill="none" strokeWidth="4" pathLength={100} strokeDasharray="20 80" strokeDashoffset="-80" style={{ stroke: '#ef4444' }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[11px] font-bold text-foreground leading-none">5</span>
                <span className="text-[6px] text-muted-foreground uppercase tracking-wide">projects</span>
              </div>
            </div>
            <div className="space-y-0.5 flex-1 min-w-0">
              {([
                { label: 'Healthy', n: 3, pct: 60, dot: 'bg-emerald-500', bar: '#10b981' },
                { label: 'At risk', n: 1, pct: 20, dot: 'bg-amber-500',   bar: '#f59e0b' },
                { label: 'Critical', n: 1, pct: 20, dot: 'bg-red-500',    bar: '#ef4444' },
              ]).map((b) => (
                <div key={b.label}>
                  <div className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${b.dot}`} />
                    <span className="text-[7px] text-foreground">{b.label}</span>
                    <span className="text-[7px] text-muted-foreground ml-auto">{b.n} · {b.pct}%</span>
                  </div>
                  <div className="h-[2px] rounded-full mt-0.5 ml-2.5 overflow-hidden bg-border">
                    <div className="h-full rounded-full" style={{ width: `${b.pct}%`, background: b.bar }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Due Soon */}
        <div className="rounded-[3px] border border-border bg-background p-2 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1 text-[8px] font-semibold text-foreground">
              <Calendar className="w-2.5 h-2.5" /> Due Soon
            </div>
            <span className="text-[7px] text-muted-foreground">4 in 7 days</span>
          </div>
          <div className="space-y-1 flex-1 overflow-hidden">
            {DUE_SOON.map((t) => (
              <div key={t.id} className="flex items-start gap-1">
                <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${DUE_TONE[t.tone].dot}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] text-foreground truncate leading-tight">{t.title}</p>
                  <p className="text-[7px] text-muted-foreground truncate">{t.project}</p>
                </div>
                <span className={`text-[7px] px-1 py-0.5 rounded-[2px] shrink-0 ${DUE_TONE[t.tone].pill}`}>{t.label}</span>
              </div>
            ))}
          </div>
          <button onClick={() => onNavigate('proyectos')} className="text-[7px] text-primary hover:underline flex items-center gap-0.5 mt-1 self-start">
            View all <ArrowRight className="w-2 h-2" />
          </button>
        </div>
      </div>

      {/* My Projects */}
      <div className="rounded-[3px] border border-border bg-background p-2">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[8px] font-semibold text-foreground">My Projects</div>
          <button onClick={() => onNavigate('proyectos')} className="text-[7px] text-primary hover:underline flex items-center gap-0.5">
            View all <ArrowRight className="w-2 h-2" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {myProjects.map((p) => {
            const border = p.health === 'green' ? 'border-l-success' : p.health === 'yellow' ? 'border-l-warning' : 'border-l-destructive';
            const pct = p.progress ?? 0;
            return (
              <div key={p.id} className={`rounded-[3px] border border-border border-l-2 ${border} bg-card/50 px-2 py-1.5`}>
                <div className="flex items-center justify-between gap-1">
                  <p className="text-[8px] font-semibold text-foreground truncate">{p.name}</p>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${HEALTH_DOT[p.health]}`} title={HEALTH_LABEL[p.health]} />
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
                    <div className={`h-full rounded-full ${HEALTH_DOT[p.health]}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[7px] text-muted-foreground w-5 text-right">{p.progress == null ? '—' : `${p.progress}%`}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[7px] text-muted-foreground">{p.completed} of {p.total} tasks</span>
                  {p.overdue > 0 ? (
                    <span className="text-[7px] text-destructive flex items-center gap-0.5"><AlertTriangle className="w-2 h-2" />{p.overdue} overdue {p.overdue === 1 ? 'task' : 'tasks'}</span>
                  ) : (
                    <span className="text-[7px] text-success">Up to date</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* My Pending Tasks + Recent Activity (Git) */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-[3px] border border-border bg-background p-2 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1 text-[8px] font-semibold text-foreground">
              <Calendar className="w-2.5 h-2.5" /> My Pending Tasks
              <span className="text-[6px] font-bold px-1 rounded-full bg-primary/10 text-primary">3</span>
            </div>
            <button onClick={() => onNavigate('proyectos')} className="text-[7px] text-primary hover:underline flex items-center gap-0.5">
              View Backlog <ArrowRight className="w-2 h-2" />
            </button>
          </div>
          <div className="space-y-1">
            {PENDING_TASKS.map((t) => (
              <div key={t.id} className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${(TASK_STATUS_COLOR[t.status] ?? '').split(' ')[0].replace('/15', '')}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] text-foreground truncate leading-tight">{t.title}</p>
                  <p className="text-[7px] text-muted-foreground truncate">{t.project}</p>
                </div>
                <span className={`text-[6px] px-1 py-0.5 rounded-[2px] shrink-0 ${TASK_STATUS_COLOR[t.status]}`}>{t.status}</span>
                <span className={`text-[7px] shrink-0 w-7 text-right ${t.overdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>{t.due}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[3px] border border-border bg-background p-2 flex flex-col">
          <div className="flex items-center gap-1 text-[8px] font-semibold text-foreground mb-1">
            <GitCommit className="w-2.5 h-2.5" /> Recent Activity (Git)
          </div>
          <div className="space-y-1">
            {GIT_ACTIVITY.map((g) => (
              <div key={g.id} className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-[6px] font-bold text-primary">{g.av}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] text-foreground truncate">{g.pusher}</span>
                    <span className="text-[6px] font-mono px-1 rounded-[2px] bg-primary/10 text-primary truncate">{g.branch}</span>
                  </div>
                  <p className="text-[7px] text-muted-foreground">{g.commits} · {g.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Projects view ────────────────────────────────────────────────────────────

function ProyectosView() {
  const counts = {
    all: DEMO_PROJECTS.length,
    'In Progress': DEMO_PROJECTS.filter((p) => p.status === 'In Progress').length,
    'Planning': DEMO_PROJECTS.filter((p) => p.status === 'Planning').length,
    'Review': DEMO_PROJECTS.filter((p) => p.status === 'Review').length,
  };
  const timeClass: Record<string, string> = {
    destructive: 'text-destructive font-semibold',
    warning: 'text-warning font-semibold',
    muted: 'text-muted-foreground',
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header card */}
      <div className="px-3 py-2 border-b border-border bg-card/60 shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-foreground">Projects</div>
            <div className="text-[9px] text-muted-foreground">Search, filter and sort active projects by end date.</div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div className="hidden sm:flex items-center gap-1 text-[8px] text-muted-foreground bg-surface-secondary/60 border border-border/50 rounded-[3px] px-1.5 py-0.5">
              <Search className="w-2.5 h-2.5" /> Search…
            </div>
            <div className="flex items-center gap-0.5 text-[8px] text-muted-foreground bg-surface-secondary/60 border border-border/50 rounded-[3px] px-1.5 py-0.5">
              <ArrowUpDown className="w-2.5 h-2.5" /> Nearest due
            </div>
            <div className="flex items-center rounded-[3px] border border-border overflow-hidden">
              <span className="px-1 py-0.5 bg-primary text-primary-foreground"><List className="w-2.5 h-2.5" /></span>
              <span className="px-1 py-0.5 text-muted-foreground"><LayoutGrid className="w-2.5 h-2.5" /></span>
            </div>
            <button className="px-1 py-1 rounded-[3px] border border-border text-muted-foreground" title="Refresh"><RefreshCw className="w-2.5 h-2.5" /></button>
            <button className="text-[9px] px-2 py-1 rounded-[3px] bg-primary text-primary-foreground font-medium flex items-center gap-0.5"><Plus className="w-2.5 h-2.5" /> New Project</button>
          </div>
        </div>
        {/* Filter pills with count sub-badge */}
        <div className="flex items-center gap-1.5 mt-2">
          {[
            { label: 'All', n: counts.all, active: true },
            { label: 'Planning', n: counts['Planning'], active: false },
            { label: 'In Progress', n: counts['In Progress'], active: false },
            { label: 'Review', n: counts['Review'], active: false },
          ].map((f) => (
            <span key={f.label} className={`flex items-center gap-1 text-[8px] px-2 py-0.5 rounded-full ${f.active ? 'bg-primary text-primary-foreground' : 'bg-surface-secondary border border-border text-muted-foreground'}`}>
              {f.label}
              <span className={`text-[7px] px-1 rounded-full ${f.active ? 'bg-white/20 text-white' : 'bg-background text-muted-foreground'}`}>{f.n}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-y-auto flex-1">
        <table className="w-full text-[9px]">
          <thead>
            <tr className="border-b border-border bg-surface-secondary/40 text-left">
              <th className="px-3 py-1.5 text-muted-foreground font-medium uppercase tracking-[0.06em]">Project</th>
              <th className="px-2 py-1.5 text-muted-foreground font-medium uppercase tracking-[0.06em]">Status</th>
              <th className="px-2 py-1.5 text-muted-foreground font-medium uppercase tracking-[0.06em]">Progress</th>
              <th className="px-2 py-1.5 text-muted-foreground font-medium uppercase tracking-[0.06em]">Health</th>
              <th className="px-2 py-1.5 text-muted-foreground font-medium uppercase tracking-[0.06em]">End Date</th>
              <th className="px-3 py-1.5 text-muted-foreground font-medium uppercase tracking-[0.06em]">Time left</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {DEMO_PROJECTS.map((p) => (
              <tr key={p.id} className="hover:bg-surface-secondary/20 transition-colors">
                <td className="px-3 py-2 text-foreground font-medium truncate max-w-[110px]">{p.name}</td>
                <td className="px-2 py-2">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] border border-border text-muted-foreground">
                    <span className={`w-1.5 h-1.5 rounded-full ${PROJECT_STATUS_DOT[p.status] ?? 'bg-muted-foreground'}`} />
                    {p.status}
                  </span>
                </td>
                <td className="px-2 py-2">
                  {p.progress == null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <div className="w-10 h-1 rounded-full bg-muted/50 overflow-hidden">
                        <div className={`h-full rounded-full ${progressColor(p.progress)}`} style={{ width: `${p.progress}%` }} />
                      </div>
                      <span className="text-[9px] w-6 text-muted-foreground">{p.progress}%</span>
                    </div>
                  )}
                </td>
                <td className="px-2 py-2">
                  <span className={`w-2.5 h-2.5 rounded-full inline-block ${HEALTH_DOT[p.health]}`} title={HEALTH_LABEL[p.health]} />
                </td>
                <td className="px-2 py-2 text-muted-foreground">{p.endDate}</td>
                <td className={`px-3 py-2 ${timeClass[p.timeTone]}`}>{p.timeLeft}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Reports view ─────────────────────────────────────────────────────────────

function ReportesView() {
  const priority = [
    { name: 'API Gateway Migration', pct: '20%', overdue: '2 overdue', dot: 'bg-red-500' },
    { name: 'Admin Dashboard',       pct: '0%',  overdue: '0 overdue', dot: 'bg-amber-500' },
    { name: 'Mobile App v2',         pct: '45%', overdue: '1 overdue', dot: 'bg-amber-500' },
    { name: 'E-Commerce Redesign',   pct: '72%', overdue: '0 overdue', dot: 'bg-emerald-500' },
    { name: 'Analytics Platform',    pct: '88%', overdue: '0 overdue', dot: 'bg-emerald-500' },
  ];
  const kpis: { label: string; value: string; sub: string; icon: Icon; dot: string }[] = [
    { label: 'TOTAL TASKS', value: '34', sub: 'tasks recorded',    icon: ListChecks,    dot: 'bg-emerald-500' },
    { label: 'COMPLETED',   value: '21', sub: '62% of total',      icon: CheckCircle2,  dot: 'bg-amber-500' },
    { label: 'PENDING',     value: '13', sub: 'tasks to complete', icon: Clock,         dot: 'bg-red-500' },
    { label: 'OVERDUE',     value: '3',  sub: 'missed deadlines',  icon: AlertTriangle, dot: 'bg-amber-500' },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Command bar */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border bg-card/60 shrink-0">
        <button className="text-[8px] flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-primary text-primary-foreground font-medium"><FileDown className="w-2.5 h-2.5" /> Download report</button>
        <button className="text-[8px] flex items-center gap-1 px-2 py-0.5 rounded-[3px] border border-border text-muted-foreground"><Download className="w-2.5 h-2.5" /> Export CSV</button>
        <button className="text-[8px] flex items-center gap-1 px-2 py-0.5 rounded-[3px] border border-border text-muted-foreground"><RefreshCw className="w-2.5 h-2.5" /> Refresh</button>
        <div className="ml-auto flex items-center gap-1 text-[8px] text-muted-foreground border border-border rounded-[3px] px-2 py-0.5">All <ChevronDown className="w-2.5 h-2.5" /></div>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {/* Hero status card */}
        <div className="rounded-[3px] border border-border bg-card ring-1 ring-red-500/30 p-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1 text-[7px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 font-bold uppercase tracking-wider"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> At risk</span>
              <div className="text-[22px] font-bold text-foreground leading-none mt-1.5">48% <span className="text-[8px] font-normal text-muted-foreground uppercase tracking-wide">Portfolio health</span></div>
              <div className="space-y-0.5 mt-1.5">
                <div className="flex items-center gap-1 text-[8px] text-amber-400"><TrendingDown className="w-2.5 h-2.5 shrink-0" /> Velocity −18% vs prior period — 4 fewer tasks completed</div>
                <div className="flex items-center gap-1 text-[8px] text-amber-400"><TrendingDown className="w-2.5 h-2.5 shrink-0" /> Completion rate 62% below the target of 80%</div>
                <div className="flex items-center gap-1 text-[8px] text-red-400"><AlertTriangle className="w-2.5 h-2.5 shrink-0" /> &quot;API Gateway Migration&quot; requires attention: 2 overdue tasks</div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[20px] font-bold text-foreground leading-none">5</div>
              <div className="text-[7px] text-muted-foreground">projects</div>
              <div className="mt-1.5 space-y-0.5">
                <div className="flex items-center gap-1 justify-end text-[7px] text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 3 ok</div>
                <div className="flex items-center gap-1 justify-end text-[7px] text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> 1 attention</div>
                <div className="flex items-center gap-1 justify-end text-[7px] text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> 1 risk</div>
              </div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-1.5">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-[3px] border border-border bg-background p-1.5">
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1 min-w-0">
                  <k.icon className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                  <span className="text-[6px] text-muted-foreground uppercase tracking-[0.05em] truncate">{k.label}</span>
                </div>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${k.dot}`} />
              </div>
              <div className="text-[15px] font-bold text-foreground leading-none">{k.value}</div>
              <div className="text-[7px] text-muted-foreground mt-0.5">{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Trend + Priority */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="col-span-2 rounded-[3px] border border-border bg-background p-2 flex flex-col">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[7px] text-muted-foreground uppercase tracking-wider">Trend · 2 weeks</div>
                <div className="text-[9px] font-semibold text-foreground">Tasks completed per week</div>
              </div>
              <div className="text-right">
                <div className="text-[13px] font-bold text-foreground leading-none">9</div>
                <div className="text-[7px] text-red-400">−18% vs prior</div>
              </div>
            </div>
            <div className="flex-1 min-h-[56px] mt-1.5">
              <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full">
                <defs>
                  <linearGradient id="repTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D4192C" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#D4192C" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <line x1="0" y1="10" x2="100" y2="10" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                <line x1="0" y1="20" x2="100" y2="20" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                <line x1="0" y1="30" x2="100" y2="30" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                <path d="M0 40 L0 11 L33 16 L66 25 L100 31 L100 40 Z" fill="url(#repTrend)" />
                <path d="M0 11 L33 16 L66 25 L100 31" fill="none" stroke="#D4192C" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex justify-between text-[6px] text-muted-foreground mt-0.5">
              <span>12 May</span><span>19 May</span><span>26 May</span><span>02 Jun</span>
            </div>
          </div>
          <div className="rounded-[3px] border border-border bg-background p-2">
            <div className="text-[7px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Priority Attention</div>
            <div className="space-y-1 overflow-hidden">
              {priority.map((p) => (
                <div key={p.name} className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[8px] text-foreground truncate">{p.name}</p>
                    <p className="text-[7px] text-muted-foreground">{p.pct} · {p.overdue}</p>
                  </div>
                  <ArrowRight className="w-2.5 h-2.5 text-muted-foreground/40 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Alerts view ──────────────────────────────────────────────────────────────

function AlertasView() {
  const groups: DemoAlert['group'][] = ['Today', 'Yesterday', 'This week'];
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Command bar */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border bg-surface-secondary/50 shrink-0">
        <button className="text-[8px] flex items-center gap-1 px-2 py-0.5 rounded-[3px] border border-border text-muted-foreground"><RefreshCw className="w-2 h-2" /> Refresh</button>
        <span className="h-3 w-px bg-border" />
        <span className="flex items-center gap-1 text-[8px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground">All <span className="text-[7px] px-1 rounded-full bg-white/20">5</span></span>
        <span className="flex items-center gap-1 text-[8px] px-2 py-0.5 rounded-full bg-card border border-border text-muted-foreground">Active <span className="text-[7px] px-1 rounded-full bg-background">3</span></span>
        <span className="flex items-center gap-1 text-[8px] px-2 py-0.5 rounded-full bg-card border border-border text-muted-foreground">Resolved <span className="text-[7px] px-1 rounded-full bg-background">2</span></span>
        <div className="ml-auto flex items-center gap-1 text-[8px] text-muted-foreground bg-card border border-border rounded-[4px] px-1.5 py-0.5">
          <Search className="w-2.5 h-2.5" /> Search alerts…
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-4 px-3 py-1.5 border-b border-border bg-surface-secondary/50 shrink-0 text-[8px]">
        <span className="flex items-center gap-1 text-muted-foreground"><AlertTriangle className="w-2.5 h-2.5 text-warning" /> <span className="font-bold text-foreground">3</span> active</span>
        <span className="flex items-center gap-1 text-muted-foreground"><CheckCircle2 className="w-2.5 h-2.5 text-success" /> <span className="font-bold text-foreground">2</span> resolved</span>
        <span className="flex items-center gap-1 text-muted-foreground"><Clock className="w-2.5 h-2.5" /> <span className="font-bold text-foreground">5</span> total</span>
      </div>

      {/* Grouped list */}
      <div className="flex-1 overflow-y-auto">
        {groups.map((g) => (
          <div key={g}>
            <div className="px-3 py-1 bg-surface-secondary/80 sticky top-0">
              <span className="text-[8px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{g}</span>
            </div>
            <div className="divide-y divide-border">
              {DEMO_ALERTS.filter((a) => a.group === g).map((a) => (
                <div key={a.id} className="px-3 py-2 hover:bg-accent/50 transition-colors">
                  <div className="flex items-start gap-2">
                    <Square className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground/40" />
                    {a.status === 'active'
                      ? <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-warning" />
                      : <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0 text-success" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-1.5">
                        <p className="text-[9px] text-foreground leading-tight flex-1">{a.message}</p>
                        <span className={`text-[7px] px-1.5 py-0.5 rounded-full font-medium shrink-0 border ${a.status === 'active' ? 'bg-warning/10 text-warning border-warning/20' : 'bg-success/10 text-success border-success/20'}`}>
                          {a.status === 'active' ? 'Active' : 'Resolved'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[8px] text-muted-foreground">
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">Task: {a.task}</span>
                        <span>· {a.time}</span>
                        {a.resolvedAgo && <span className="text-success">· Resolved {a.resolvedAgo}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Profile view ─────────────────────────────────────────────────────────────

function PerfilView() {
  const projects = [
    { name: 'E-Commerce Redesign', status: 'In Progress', end: '7 Jun 2026',  days: '12d', tone: 'muted' },
    { name: 'Mobile App v2',        status: 'In Progress', end: '3 Jun 2026',  days: '6d',  tone: 'warning' },
    { name: 'Design System',        status: 'Review',      end: '19 Jun 2026', days: '16d', tone: 'muted' },
    { name: 'Admin Dashboard',      status: 'Planning',    end: '1 Jun 2026',  days: 'Vencido', tone: 'destructive' },
    { name: 'API Gateway Migration',status: 'Planning',    end: '16 Jun 2026', days: '21d', tone: 'muted' },
  ];
  const dayClass: Record<string, string> = {
    destructive: 'text-destructive font-semibold',
    warning: 'text-warning font-semibold',
    muted: 'text-muted-foreground',
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-2.5 space-y-2">
      <div className="text-[11px] font-semibold text-foreground">My Profile</div>

      <div className="grid grid-cols-3 gap-2">
        {/* LEFT (2/3): Personal Information + My Projects */}
        <div className="col-span-2 space-y-2">
          <div className="rounded-[3px] border border-border border-l-2 border-l-primary bg-background p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-semibold text-foreground">Personal Information</span>
              <button className="text-[7px] px-1.5 py-0.5 rounded-[3px] bg-primary text-primary-foreground">Edit</button>
            </div>
            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-[11px] font-bold text-primary">A</span>
              </div>
              <div>
                <p className="text-[9px] font-semibold text-foreground">Alex García</p>
                <p className="text-[7px] text-muted-foreground">Plan: Premium</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {[
                { icon: User, label: 'Name', val: 'Alex García' },
                { icon: Mail, label: 'Email', val: 'alex.garcia@techco.io' },
                { icon: Shield, label: 'Plan', val: 'Premium' },
              ].map(({ icon: Ico, label, val }) => (
                <div key={label}>
                  <div className="flex items-center gap-1 text-[7px] text-muted-foreground mb-0.5"><Ico className="w-2.5 h-2.5" /> {label}</div>
                  <div className="text-[8px] text-foreground bg-surface-secondary/40 border border-border/50 rounded-[3px] px-2 py-0.5">{val}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[3px] border border-border bg-background overflow-hidden">
            <div className="px-2.5 py-1.5 border-b border-border bg-card/40 text-[9px] font-semibold text-foreground">My Projects</div>
            <table className="w-full text-[8px]">
              <thead>
                <tr className="border-b border-border/50 text-left">
                  <th className="px-2.5 py-1 text-muted-foreground font-medium">Project</th>
                  <th className="px-2 py-1 text-muted-foreground font-medium">Status</th>
                  <th className="px-2 py-1 text-muted-foreground font-medium">End Date</th>
                  <th className="px-2.5 py-1 text-muted-foreground font-medium text-right">Days left</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {projects.map((p) => (
                  <tr key={p.name}>
                    <td className="px-2.5 py-1 text-foreground truncate max-w-[90px]">{p.name}</td>
                    <td className="px-2 py-1">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <span className={`w-1.5 h-1.5 rounded-full ${PROJECT_STATUS_DOT[p.status] ?? 'bg-muted-foreground'}`} /> {p.status}
                      </span>
                    </td>
                    <td className="px-2 py-1 text-muted-foreground">{p.end}</td>
                    <td className={`px-2.5 py-1 text-right ${dayClass[p.tone]}`}>{p.days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT (1/3): sidebar cards */}
        <div className="space-y-2">
          <div className="rounded-[3px] border border-border bg-background p-2">
            <div className="text-[8px] font-semibold text-foreground mb-1.5">Preferences</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Moon className="w-3 h-3 text-muted-foreground" />
                <div>
                  <p className="text-[8px] text-foreground leading-none">Theme</p>
                  <p className="text-[7px] text-muted-foreground">Dark</p>
                </div>
              </div>
              <div className="w-7 h-4 rounded-full bg-primary flex items-center justify-end px-0.5">
                <div className="w-3 h-3 rounded-full bg-white" />
              </div>
            </div>
          </div>

          <div className="rounded-[3px] border border-border bg-background p-2">
            <div className="text-[8px] font-semibold text-foreground mb-1.5">Security</div>
            <div className="flex items-center justify-between gap-1 rounded-[3px] border border-border/50 bg-surface-secondary/40 p-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[8px] text-foreground">Password</p>
                  <p className="text-[6px] text-muted-foreground truncate">Manage your credentials from a separate window.</p>
                </div>
              </div>
              <button className="text-[7px] px-1.5 py-0.5 rounded-[3px] bg-primary text-primary-foreground flex items-center gap-0.5 shrink-0"><KeyRound className="w-2 h-2" /> Change</button>
            </div>
          </div>

          <div className="rounded-[3px] border border-border bg-background p-2">
            <div className="text-[8px] font-semibold text-foreground mb-1.5">GitHub</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                <div>
                  <p className="text-[8px] text-foreground">Connected to GitHub</p>
                  <p className="text-[7px] text-muted-foreground font-mono">alexdev2024</p>
                </div>
              </div>
              <button className="text-[7px] px-1.5 py-0.5 rounded-[3px] bg-destructive/10 text-destructive">Disconnect</button>
            </div>
          </div>

          <div className="rounded-[3px] border border-border bg-background p-2">
            <div className="text-[8px] font-semibold text-foreground mb-1.5">Microsoft Azure</div>
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <Cloud className="w-3 h-3 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[8px] text-foreground">Connect Azure</p>
                  <p className="text-[6px] text-muted-foreground truncate">Access your Microsoft Azure information.</p>
                </div>
              </div>
              <button className="text-[7px] px-1.5 py-0.5 rounded-[3px] bg-primary text-primary-foreground flex items-center gap-0.5 shrink-0"><Cloud className="w-2 h-2" /> Access</button>
            </div>
          </div>

          <div className="rounded-[3px] border border-success/20 bg-success/10 p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Crown className="w-3 h-3 text-success" />
                <div>
                  <p className="text-[8px] font-semibold text-foreground">Premium active</p>
                  <p className="text-[6px] text-muted-foreground">You have access to premium features.</p>
                </div>
              </div>
              <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-success/15 text-success font-medium">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── DashboardShowcase ─────────────────────────────────────────────────────────

export function DashboardShowcase() {
  const [activeView, setActiveView] = useState<DemoView>('dashboard');

  return (
    <section className="container mx-auto px-6 py-24 max-w-6xl scroll-mt-16">
      <div className="flex flex-col items-center gap-10">
        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="space-y-5 text-center max-w-2xl w-full"
        >
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Interactive demo — explore the platform
          </div>

          <h2 className="text-[2rem] md:text-[2.35rem] font-semibold text-foreground leading-[1.15] tracking-tight">
            Everything your team needs,{' '}
            <span className="text-primary">in one place</span>
          </h2>

          <p className="text-[14px] text-muted-foreground leading-relaxed">
            Real-time dashboard, project management, automated reports, risk alerts, and a profile integrated with GitHub and Azure — all connected so your team moves forward, not backward.
          </p>

          <ul className="space-y-2 inline-flex flex-col text-left mx-auto">
            {[
              { icon: BarChart3, text: 'KPIs and portfolio health in real time' },
              { icon: AlertTriangle, text: 'AI-generated early risk alerts' },
              { icon: Users, text: 'Roles and permissions per project' },
            ].map(({ icon: Ico, text }) => (
              <li key={text} className="flex items-center gap-2.5 text-[13px] text-foreground">
                <div className="w-5 h-5 rounded-[3px] bg-primary/10 flex items-center justify-center shrink-0">
                  <Ico className="w-3 h-3 text-primary" />
                </div>
                {text}
              </li>
            ))}
          </ul>

          {/* Nav pills */}
          <div className="flex flex-wrap gap-2 justify-center">
            {NAV_VIEWS.map(({ view, label }) => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`text-[11px] px-3 py-1 rounded-[3px] border transition-colors ${
                  activeView === view
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex justify-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground rounded-[3px] text-[13px] font-medium transition-colors"
            >
              Get started for free
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>

        {/* App frame */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
          className="w-full space-y-3"
        >
          <AppFrame url={`yemoda.site/${activeView}`}>
            <div className="grid grid-cols-[156px_minmax(0,1fr)] h-[480px] overflow-hidden">
              {/* Sidebar */}
              <aside className="border-r border-sidebar-border bg-sidebar flex flex-col overflow-hidden shrink-0">
                {/* Brand */}
                <div className="flex items-center gap-2 px-2.5 h-9 border-b border-sidebar-border shrink-0">
                  <div className="w-6 h-6 rounded-[3px] bg-primary flex items-center justify-center shrink-0">
                    <Zap className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <div className="text-[9px] font-semibold text-sidebar-foreground">Yemoda</div>
                    <div className="text-[7px] text-sidebar-muted">Project Intelligence</div>
                  </div>
                </div>

                {/* Nav groups */}
                <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
                  {SIDEBAR_GROUPS.map((group, gi) => (
                    <div key={gi}>
                      {group.heading && (
                        <div className="flex items-center gap-1.5 px-2 pt-2 pb-1">
                          <span className="text-[7px] text-sidebar-muted uppercase tracking-[0.08em]">{group.heading}</span>
                          <span className="h-px flex-1 bg-sidebar-border" />
                        </div>
                      )}
                      {group.items.map((item) => {
                        const isActive = item.view != null && item.view === activeView;
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => item.view && setActiveView(item.view)}
                            className={`relative flex items-center gap-2 w-full px-2.5 py-1.5 rounded-[3px] transition-colors ${
                              isActive
                                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                : 'text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                            }`}
                          >
                            {isActive && <span className="absolute left-0 top-1 bottom-1 w-[2px] rounded-r bg-primary" />}
                            <item.icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-primary' : ''}`} />
                            <span className="text-[10px] truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* User chip + collapse */}
                <div className="border-t border-sidebar-border p-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/90 flex items-center justify-center shrink-0">
                      <span className="text-[9px] font-bold text-white">A</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-medium text-sidebar-foreground truncate">Alex García</p>
                      <p className="text-[7px] text-sidebar-muted truncate">Tech Lead</p>
                    </div>
                    <ChevronLeft className="w-3 h-3 text-sidebar-muted shrink-0" />
                  </div>
                </div>
              </aside>

              {/* Main content */}
              <div className="bg-background flex flex-col overflow-hidden">
                {/* Topbar */}
                <div className="flex items-center justify-between gap-3 px-3 h-9 border-b border-border bg-card shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-medium text-foreground">{VIEW_LABEL[activeView]}</span>
                    <span className="h-3 w-px bg-border" />
                    <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground bg-background border border-input rounded-[3px] px-2 py-0.5">
                      <Search className="w-2.5 h-2.5" /> Search...
                      <span className="ml-1 text-[7px] px-1 rounded border border-border bg-muted text-muted-foreground">Ctrl K</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="relative">
                      <Bell className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full text-[5px] text-white flex items-center justify-center font-bold">3</span>
                    </div>
                    <Sun className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="h-3 w-px bg-border" />
                    <div className="flex items-center gap-1">
                      <div className="w-5 h-5 rounded-full bg-primary/90 flex items-center justify-center shrink-0">
                        <span className="text-[7px] font-bold text-white">A</span>
                      </div>
                      <span className="text-[9px] text-foreground">Alex</span>
                      <ChevronDown className="w-2.5 h-2.5 text-muted-foreground" />
                    </div>
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
                      {activeView === 'dashboard' && <DashboardView onNavigate={setActiveView} />}
                      {activeView === 'proyectos' && <ProyectosView />}
                      {activeView === 'reportes' && <ReportesView />}
                      {activeView === 'alertas' && <AlertasView />}
                      {activeView === 'perfil' && <PerfilView />}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </AppFrame>

          <p className="text-center text-[11px] text-muted-foreground">
            Click{' '}
            {NAV_VIEWS.map(({ view, label }, i) => (
              <span key={view}>
                <button onClick={() => setActiveView(view)} className="font-medium text-foreground hover:text-primary transition-colors">{label}</button>
                {i < NAV_VIEWS.length - 1 ? ', ' : ''}
              </span>
            ))}{' '}
            to explore
          </p>
        </motion.div>
      </div>
    </section>
  );
}

// ── Project Detail Showcase ──────────────────────────────────────────────────

type ProjectTab =
  | 'resumen' | 'backlog' | 'timeline' | 'sprints' | 'boards'
  | 'milestones' | 'scrum-poker' | 'code-review' | 'repositorios'
  | 'equipo' | 'configuracion';

const PROJECT_TABS: { id: ProjectTab; label: string; count?: number; icon?: Icon }[] = [
  { id: 'resumen',      label: 'Overview' },
  { id: 'backlog',      label: 'Backlog' },
  { id: 'timeline',     label: 'Timeline' },
  { id: 'sprints',      label: 'Sprints' },
  { id: 'boards',       label: 'Boards' },
  { id: 'milestones',   label: 'Milestones' },
  { id: 'scrum-poker',  label: 'Scrum Poker' },
  { id: 'code-review',  label: 'Code Review' },
  { id: 'repositorios', label: 'Repositories' },
  { id: 'equipo',       label: 'Team', count: 4 },
  { id: 'configuracion',label: 'Settings', icon: Settings2 },
];

// Backlog: Title | Priority | Tags | Sprint. Priority is plain text (no color).
const PROJ_TASKS: { id: number; title: string; priority: string; tags: { label: string; color: string }[]; sprint: string | null }[] = [
  { id: 1,  title: 'Implement payment gateway',  priority: 'High',   tags: [{ label: 'backend', color: '#3b82f6' }, { label: 'payments', color: '#a855f7' }], sprint: 'Sprint 3' },
  { id: 2,  title: 'Shopping cart persistence',  priority: 'Medium', tags: [{ label: 'frontend', color: '#10b981' }], sprint: 'Sprint 3' },
  { id: 3,  title: 'Product search & filters',   priority: 'Medium', tags: [{ label: 'frontend', color: '#10b981' }], sprint: null },
  { id: 4,  title: 'Mobile responsive layout',   priority: 'High',   tags: [{ label: 'ui', color: '#f59e0b' }], sprint: 'Sprint 3' },
  { id: 5,  title: 'User checkout flow',         priority: 'Medium', tags: [{ label: 'frontend', color: '#10b981' }], sprint: null },
  { id: 6,  title: 'SEO meta tags setup',        priority: 'Low',    tags: [], sprint: null },
  { id: 7,  title: 'Email notifications',        priority: 'Medium', tags: [{ label: 'backend', color: '#3b82f6' }], sprint: null },
  { id: 8,  title: 'Analytics integration',      priority: 'High',   tags: [{ label: 'data', color: '#0ea5a4' }], sprint: null },
];

// Boards are user-defined: a list of boards, each with its own ordered columns.
// Only is_final (Done) columns get a green count badge; is_review columns use Bot/blue.
// The kanban view lives in the Sprints tab; the Boards tab is column configuration.
type BoardColumn = { id: string; name: string; isFinal?: boolean; isReview?: boolean; taskIds: number[] };
type Board = { id: string; name: string; columns: BoardColumn[] };

const PROJ_BOARDS: Board[] = [
  {
    id: 'sprint',
    name: 'Sprint Board',
    columns: [
      { id: 'todo',     name: 'To Do',     taskIds: [6, 8] },
      { id: 'building', name: 'Building',   taskIds: [1, 5] },
      { id: 'qa',       name: 'QA Review',  isReview: true, taskIds: [4] },
      { id: 'shipped',  name: 'Shipped',    isFinal: true,  taskIds: [2, 3, 7] },
    ],
  },
  {
    id: 'release',
    name: 'Release Flow',
    columns: [
      { id: 'triage', name: 'Triage',    taskIds: [6] },
      { id: 'dev',    name: 'In Dev',    taskIds: [1, 5, 8] },
      { id: 'review', name: 'AI Review', isReview: true, taskIds: [4] },
      { id: 'rel',    name: 'Released',  isFinal: true,  taskIds: [2, 3, 7] },
    ],
  },
];

// Timeline tasks in absolute day-offsets from 08 May 2026 (day 0). The visible
// window scales per zoom, so bars expand on Day and shrink on Month.
const PROJ_TIMELINE_ITEMS: { title: string; id: number; startDay: number; endDay: number; color: string; done: boolean; meta: string }[] = [
  { title: 'Payment gateway',   id: 1, startDay: 4,  endDay: 25, color: '#1D4ED8', done: false, meta: '12 May - 02 Jun - Alex G. - Building' },
  { title: 'Mobile responsive', id: 4, startDay: 0,  endDay: 20, color: '#9333EA', done: false, meta: '08 May - 28 May - Ana L. - QA Review' },
  { title: 'Checkout flow',     id: 5, startDay: 12, endDay: 33, color: '#D97706', done: false, meta: '20 May - 10 Jun - Alex G. - Building' },
  { title: 'Cart persistence',  id: 2, startDay: 2,  endDay: 16, color: '#0A5F38', done: true,  meta: '10 May - 24 May - Maria S. - Shipped' },
  { title: 'Analytics integ.',  id: 8, startDay: 16, endDay: 37, color: '#0EA5A4', done: false, meta: '24 May - 14 Jun - Carlos R. - To Do' },
];

const PROJ_SPRINTS: { id: number; name: string; status: 'active' | 'closed' | 'planned'; end: string }[] = [
  { id: 3, name: 'Sprint 3', status: 'active',  end: '9 Jun 2026' },
  { id: 2, name: 'Sprint 2', status: 'closed',  end: '26 May 2026' },
  { id: 1, name: 'Sprint 1', status: 'closed',  end: '12 May 2026' },
  { id: 4, name: 'Sprint 4', status: 'planned', end: '23 Jun 2026' },
];

const SPRINT_STATUS_PILL: Record<string, string> = {
  active: 'bg-success/20 text-success',
  closed: 'bg-muted text-muted-foreground',
  planned: 'bg-amber-500/20 text-amber-400',
};

const PROJ_MILESTONES: { title: string; due: string; completed: boolean }[] = [
  { title: 'Alpha Release',     due: '30 Apr 2026', completed: true },
  { title: 'Beta Launch',       due: '25 May 2026', completed: true },
  { title: 'Production Deploy', due: '7 Jun 2026',  completed: false },
];

const PROJ_MEMBERS = [
  { av: 'AG', name: 'Alex García',    role: 'Tech Lead',    bgColor: 'bg-primary/20',    tColor: 'text-primary' },
  { av: 'MS', name: 'Maria Santos',   role: 'Frontend Dev', bgColor: 'bg-success/20',    tColor: 'text-success' },
  { av: 'CR', name: 'Carlos Ramírez', role: 'Backend Dev',  bgColor: 'bg-warning/20',    tColor: 'text-warning' },
  { av: 'AL', name: 'Ana López',      role: 'UI/UX Design',  bgColor: 'bg-violet-500/20', tColor: 'text-violet-400' },
];

// ── Diff line type + mini diff viewer (mirrors CodeDiffViewer: 4 columns) ─────

type DiffLineType = 'header' | 'add' | 'remove' | 'context';
interface DiffLine { type: DiffLineType; content: string; }

const DIFF_ROW_STYLE: Record<DiffLineType, string> = {
  header:  'bg-primary/5 text-primary font-medium',
  add:     'bg-emerald-500/[0.06] text-emerald-300',
  remove:  'bg-red-500/10 text-red-400',
  context: 'text-muted-foreground',
};
const DIFF_GUTTER_STYLE: Record<DiffLineType, string> = {
  header:  'bg-primary/5 text-primary/40',
  add:     'bg-emerald-500/[0.04] text-emerald-400/45',
  remove:  'bg-red-500/[0.05] text-red-500/50',
  context: 'text-muted-foreground/40',
};

function MiniDiff({ file, lines, startOld = 1, startNew = 1 }: { file: string; lines: DiffLine[]; startOld?: number; startNew?: number }) {
  let oldN = startOld;
  let newN = startNew;
  return (
    <div className="rounded-[3px] border border-border overflow-hidden bg-background">
      <div className="flex items-center gap-1.5 px-2 py-1 bg-surface-secondary/50 border-b border-border">
        <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
        <span className="font-mono text-[9px] text-foreground truncate">{file}</span>
      </div>
      <table className="w-full font-mono text-[9px] leading-[15px]">
        <tbody>
          {lines.map((line, i) => {
            const isHeader = line.type === 'header';
            const showOld = line.type === 'context' || line.type === 'remove';
            const showNew = line.type === 'context' || line.type === 'add';
            const o = !isHeader && showOld ? oldN++ : '';
            const n = !isHeader && showNew ? newN++ : '';
            return (
              <tr key={i} className={DIFF_ROW_STYLE[line.type]}>
                <td className={`w-6 text-right pr-1 select-none border-r border-border/30 ${DIFF_GUTTER_STYLE[line.type]}`}>{o}</td>
                <td className={`w-6 text-right pr-1 select-none border-r border-border/30 ${DIFF_GUTTER_STYLE[line.type]}`}>{n}</td>
                <td className="w-3 text-center select-none text-muted-foreground/50">
                  {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ''}
                </td>
                <td className="px-2 whitespace-pre">{line.content}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Project tab sub-components ────────────────────────────────────────────────

function ProjOverviewTab() {
  return (
    <div className="p-2.5 space-y-2">
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { title: 'Tasks',          value: '11',  sub: 'in the project',  icon: List,          border: 'border-l-info' },
          { title: 'Completed',      value: '8',   sub: 'completed',       icon: CheckCircle2,  border: 'border-l-success' },
          { title: 'Overdue',        value: '1',   sub: 'require attention', icon: AlertTriangle, border: 'border-l-destructive' },
          { title: 'Time Remaining', value: '12d', sub: '07 jun 2026',     icon: Clock,         border: 'border-l-warning' },
        ].map((k) => (
          <div key={k.title} className={`rounded-[3px] border border-border border-l-2 ${k.border} bg-background p-2`}>
            <div className="flex items-center gap-1 text-[7px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">
              <k.icon className="w-2.5 h-2.5" /> {k.title}
            </div>
            <div className="text-[14px] font-bold text-foreground leading-none">{k.value}</div>
            <div className="text-[6px] text-muted-foreground mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>
      <div className="rounded-[3px] border border-border bg-background p-2.5">
        <div className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">General Information</div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
          {[
            { label: 'Status', val: 'In Progress' },
            { label: 'Created', val: '12 Apr 2026' },
            { label: 'End Date', val: '7 Jun 2026' },
            { label: 'Time remaining', val: '12 dias' },
            { label: 'Members', val: '4 members' },
          ].map(({ label, val }) => (
            <div key={label}>
              <div className="text-[7px] text-muted-foreground">{label}</div>
              <div className="text-[9px] font-semibold text-foreground">{val}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-[3px] border border-border bg-background p-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wide">Progress</div>
          <div className="text-[10px] font-bold text-foreground">72%</div>
        </div>
        <div className="h-2 bg-surface-secondary/60 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-warning" style={{ width: '72%' }} />
        </div>
        <div className="text-[7px] text-muted-foreground mt-1">8 of 11 tasks completed</div>
      </div>
    </div>
  );
}

function ProjBacklogTab() {
  return (
    <div className="p-2.5 space-y-2">
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1 text-[8px] text-muted-foreground bg-surface-secondary/60 border border-border/50 rounded-[3px] px-1.5 py-0.5 flex-1 max-w-[140px]">
          <Search className="w-2.5 h-2.5" /> Search task...
        </div>
        <button className="text-[8px] flex items-center gap-1 px-2 py-0.5 rounded-[3px] border border-border text-muted-foreground"><Filter className="w-2.5 h-2.5" /> Filter</button>
        <button className="ml-auto text-[8px] flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-primary text-primary-foreground font-medium"><Plus className="w-2.5 h-2.5" /> New task</button>
      </div>
      <div className="rounded-[3px] border border-border bg-background overflow-hidden">
        <table className="w-full text-[8px]">
          <thead>
            <tr className="border-b border-border bg-surface-secondary/40 text-left">
              <th className="px-2.5 py-1.5 text-muted-foreground font-medium w-[44%]">Title</th>
              <th className="px-2 py-1.5 text-muted-foreground font-medium">Priority</th>
              <th className="px-2 py-1.5 text-muted-foreground font-medium">Tags</th>
              <th className="px-2 py-1.5 text-muted-foreground font-medium">Sprint</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {PROJ_TASKS.map((t) => (
              <tr key={t.id} className="hover:bg-surface-secondary/20 transition-colors">
                <td className="px-2.5 py-1 text-foreground truncate max-w-0">{t.title}</td>
                <td className="px-2 py-1 text-foreground">{t.priority}</td>
                <td className="px-2 py-1">
                  {t.tags.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <div className="flex items-center gap-0.5">
                      {t.tags.map((tag) => (
                        <span key={tag.label} className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-[2px] border border-border/60 text-[6px] text-foreground">
                          <span className="w-1 h-1 rounded-full" style={{ background: tag.color }} /> {tag.label}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-2 py-1">
                  <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-[2px] border border-dashed border-border text-[6px] text-muted-foreground"><Plus className="w-2 h-2" /> Move</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Per-zoom visible window (in days). Smaller window = bars take more width
// (Day zooms in → wider bars); larger window = bars shrink (Month zooms out).
const TIMELINE_ZOOMS: Record<'Day' | 'Week' | 'Month', { window: number; today: number; ticks: { d: number; l: string }[] }> = {
  Day:   { window: 18, today: 14, ticks: [{ d: 0, l: '08 May' }, { d: 3, l: '11 May' }, { d: 6, l: '14 May' }, { d: 9, l: '17 May' }, { d: 12, l: '20 May' }, { d: 15, l: '23 May' }, { d: 18, l: '26 May' }] },
  Week:  { window: 35, today: 14, ticks: [{ d: 0, l: '08 May' }, { d: 7, l: '15 May' }, { d: 14, l: '22 May' }, { d: 21, l: '29 May' }, { d: 28, l: '05 Jun' }, { d: 35, l: '12 Jun' }] },
  Month: { window: 63, today: 14, ticks: [{ d: 0, l: 'May 2026' }, { d: 24, l: 'Jun 2026' }, { d: 54, l: 'Jul 2026' }] },
};

function ProjTimelineTab() {
  const [zoom, setZoom] = useState<'Day' | 'Week' | 'Month'>('Week');
  const { window: win, today, ticks } = TIMELINE_ZOOMS[zoom];
  const pos = (day: number) => (day / win) * 100;
  return (
    <div className="p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[9px] font-semibold text-foreground">Timeline</div>
          <div className="text-[7px] text-muted-foreground">Task history ordered by start and due dates.</div>
        </div>
        <div className="flex items-center rounded-[3px] border border-border overflow-hidden text-[7px]">
          {(['Day', 'Week', 'Month'] as const).map((z) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={`px-1.5 py-0.5 transition-colors ${zoom === z ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {z}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-[3px] border border-border bg-background p-2.5">
        {/* Axis labels (positioned at true day offsets) */}
        <div className="flex">
          <div className="w-24 shrink-0" />
          <div className="flex-1 relative h-3 border-b border-border/30">
            {ticks.map((t, i) => (
              <span
                key={t.d}
                className="absolute top-0 text-[6px] text-muted-foreground font-medium whitespace-nowrap"
                style={{ left: `${pos(t.d)}%`, transform: i === 0 ? 'translateX(0)' : i === ticks.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)' }}
              >
                {t.l}
              </span>
            ))}
          </div>
        </div>
        {/* Rows + overlays */}
        <div className="relative pt-2 space-y-1.5">
          {/* gridlines (behind the bars) */}
          <div className="absolute inset-y-0 left-24 right-0 pointer-events-none">
            <div className="relative h-full">
              {ticks.map((t) => <span key={t.d} className="absolute inset-y-0 w-px bg-white/[0.06]" style={{ left: `${pos(t.d)}%` }} />)}
            </div>
          </div>
          {PROJ_TIMELINE_ITEMS.map((t, i) => (
            <div key={i} className="flex items-center">
              <div className="w-24 shrink-0 pr-2 min-w-0">
                <div className="flex items-center gap-1">
                  {t.done
                    ? <CheckCircle2 className="w-2.5 h-2.5 text-violet-400 shrink-0" />
                    : <Circle className="w-2.5 h-2.5 text-emerald-400 shrink-0" />}
                  <span className="text-[7px] text-foreground truncate">{t.title}</span>
                  <span className="text-[6px] text-muted-foreground shrink-0">#{t.id}</span>
                </div>
                <div className="text-[5px] text-muted-foreground truncate pl-3.5">{t.meta}</div>
              </div>
              <div className="flex-1 relative h-3 overflow-hidden">
                <div
                  className="absolute top-0.5 h-2 rounded-[2px] transition-all duration-300 ease-out"
                  style={{ left: `${pos(t.startDay)}%`, width: `${pos(t.endDay - t.startDay)}%`, background: t.color }}
                />
              </div>
            </div>
          ))}
          {/* today line (rendered on top → continuous across bars) */}
          <div className="absolute inset-y-0 left-24 right-0 pointer-events-none">
            <div className="relative h-full">
              <div className="absolute inset-y-0 w-px bg-red-500 transition-all duration-300 ease-out" style={{ left: `${pos(today)}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjSprintsTab() {
  const [selected, setSelected] = useState(3);
  const [boardIdx, setBoardIdx] = useState(0);
  const board = PROJ_BOARDS[boardIdx];
  return (
    <div className="p-2.5">
      <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-2 rounded-[3px] border border-border bg-background overflow-hidden" style={{ minHeight: 220 }}>
        {/* Left: sprint list */}
        <div className="border-r border-border p-1.5 space-y-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-[7px] font-semibold uppercase tracking-wider text-muted-foreground">Sprints</span>
            <Plus className="w-2.5 h-2.5 text-muted-foreground" />
          </div>
          {PROJ_SPRINTS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelected(s.id)}
              className={`w-full text-left rounded-[3px] px-1.5 py-1 border transition-colors ${selected === s.id ? 'border-primary/40 bg-primary/5' : 'border-border'}`}
            >
              <div className="text-[8px] font-medium text-foreground">{s.name}</div>
              <div className="flex items-center justify-between mt-0.5">
                <span className={`text-[6px] px-1 py-0.5 rounded-full font-medium ${SPRINT_STATUS_PILL[s.status]}`}>
                  {s.status === 'active' ? 'Active' : s.status === 'closed' ? 'Closed' : 'Planned'}
                </span>
                <span className="text-[6px] text-muted-foreground">{s.end}</span>
              </div>
            </button>
          ))}
        </div>
        {/* Right: board toolbar + kanban */}
        <div className="p-1.5 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1.5">
            {/* Board selector — click to switch boards */}
            <button
              onClick={() => setBoardIdx((i) => (i + 1) % PROJ_BOARDS.length)}
              title="Switch board"
              className="flex items-center gap-1 text-[7px] text-foreground border border-border rounded-[3px] px-1.5 py-0.5 hover:border-primary/40 transition-colors"
            >
              <LayoutDashboard className="w-2.5 h-2.5 text-muted-foreground" /> {board.name} <ChevronDown className="w-2 h-2 text-muted-foreground" />
            </button>
            {/* view toggle */}
            <div className="flex items-center rounded-[3px] border border-border overflow-hidden">
              <span className="px-1 py-0.5 bg-primary text-primary-foreground"><LayoutDashboard className="w-2.5 h-2.5" /></span>
              <span className="px-1 py-0.5 text-muted-foreground"><LayoutList className="w-2.5 h-2.5" /></span>
            </div>
            <button className="ml-auto text-[7px] flex items-center gap-0.5 px-1.5 py-0.5 rounded-[3px] bg-primary text-primary-foreground"><Plus className="w-2 h-2" /> New task</button>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {board.columns.map((col) => {
              const tasks = col.taskIds.map((id) => PROJ_TASKS.find((t) => t.id === id)!).filter(Boolean);
              return (
                <div key={col.id} className="flex flex-col">
                  <div className="flex items-center justify-between mb-1 px-0.5">
                    <span className="text-[7px] font-semibold uppercase tracking-wide text-muted-foreground truncate">{col.name}</span>
                    <span className={`text-[6px] px-1 rounded-full shrink-0 ${col.isFinal ? 'bg-success/20 text-success' : 'bg-card text-muted-foreground'}`}>{col.taskIds.length}</span>
                  </div>
                  <div className="space-y-1">
                    {tasks.map((task) => (
                      <div key={task.id} className="rounded-[3px] border border-border bg-card p-1">
                        <div className="text-[6px] text-foreground leading-snug">{task.title}</div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[5px] text-muted-foreground">{task.priority}</span>
                          {task.tags[0] && <span className="w-1 h-1 rounded-full" style={{ background: task.tags[0].color }} />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjBoardsTab() {
  const [boardIdx, setBoardIdx] = useState(0);
  const board = PROJ_BOARDS[boardIdx];
  return (
    <div className="p-2.5 space-y-2">
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-1.5">
        <button className="text-[8px] flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-primary text-primary-foreground font-medium"><LayoutDashboard className="w-2.5 h-2.5" /> New board</button>
        <button className="text-[8px] flex items-center gap-1 px-2 py-0.5 rounded-[3px] border border-border text-muted-foreground"><Plus className="w-2.5 h-2.5" /> New column</button>
      </div>

      <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-2">
        {/* Left: boards list */}
        <div className="space-y-1">
          <div className="text-[7px] font-semibold uppercase tracking-wider text-muted-foreground px-1">Boards</div>
          {PROJ_BOARDS.map((b, i) => (
            <button
              key={b.id}
              onClick={() => setBoardIdx(i)}
              className={`w-full text-left rounded-[3px] px-1.5 py-1.5 border transition-colors ${boardIdx === i ? 'border-primary bg-primary/15' : 'border-border hover:border-primary/30'}`}
            >
              <div className="text-[8px] font-medium text-foreground truncate">{b.name}</div>
              <div className="text-[6px] text-muted-foreground">{b.columns.length} columns</div>
            </button>
          ))}
        </div>

        {/* Right: column config + Board AI settings */}
        <div className="space-y-2">
          <div className="rounded-[3px] border border-border bg-background p-2 space-y-1">
            <div className="text-[9px] font-semibold text-foreground mb-1">{board.name}</div>
            {board.columns.map((c, i) => (
              <div key={c.id} className="flex items-center gap-1 rounded-[3px] border border-border bg-card px-1.5 py-1">
                <GripVertical className="w-2.5 h-2.5 text-muted-foreground/50 shrink-0" />
                <span className="text-[7px] text-foreground flex-1 truncate">{i + 1}. {c.name}</span>
                {c.isFinal ? (
                  <span className="text-[6px] flex items-center gap-0.5 px-1 py-0.5 rounded-[2px] border border-success/30 bg-success/10 text-success"><Check className="w-2 h-2" /> Done</span>
                ) : (
                  <span className="text-[6px] px-1 py-0.5 rounded-[2px] border border-border text-muted-foreground">Mark as done</span>
                )}
                {c.isReview ? (
                  <span className="text-[6px] flex items-center gap-0.5 px-1 py-0.5 rounded-[2px] border border-info/30 bg-info/10 text-info"><Bot className="w-2 h-2" /> AI Review</span>
                ) : (
                  <span className="text-[6px] px-1 py-0.5 rounded-[2px] border border-border text-muted-foreground">Mark for AI review</span>
                )}
                <span className="text-[6px] px-1 py-0.5 rounded-[2px] text-destructive">Delete</span>
              </div>
            ))}
          </div>

          <div className="rounded-[3px] border border-border bg-background p-2">
            <div className="flex items-center gap-1 text-[7px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5"><Bot className="w-2.5 h-2.5" /> Board AI settings</div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: 'Code style', val: 'Standard' },
                { label: 'Review mode', val: 'Strict' },
                { label: 'Tech stack', val: 'Mixed / Full-Stack' },
                { label: 'Naming convention', val: 'Language defaults' },
              ].map((f) => (
                <div key={f.label}>
                  <div className="text-[6px] text-muted-foreground mb-0.5">{f.label}</div>
                  <div className="h-5 bg-surface-secondary border border-border rounded-[3px] px-1.5 flex items-center justify-between text-[7px] text-foreground">{f.val} <ChevronDown className="w-2 h-2 text-muted-foreground" /></div>
                </div>
              ))}
            </div>
            <div className="mt-1.5">
              <div className="text-[6px] text-muted-foreground mb-0.5">Response language</div>
              <div className="h-5 bg-surface-secondary border border-border rounded-[3px] px-1.5 flex items-center justify-between text-[7px] text-foreground">English <ChevronDown className="w-2 h-2 text-muted-foreground" /></div>
            </div>
            <div className="mt-1.5">
              <div className="text-[6px] text-muted-foreground mb-0.5">Custom instructions</div>
              <div className="h-8 bg-surface-secondary border border-border rounded-[3px] px-1.5 py-1 text-[6px] text-muted-foreground leading-snug">E.g. This project uses Flutter, ignore Dart null safety warnings…</div>
            </div>
            <div className="flex justify-end mt-1.5">
              <button className="text-[7px] px-2 py-0.5 rounded-[3px] bg-primary text-primary-foreground font-medium">Save settings</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjMilestonesTab() {
  return (
    <div className="p-2.5">
      <div className="rounded-[3px] border border-border bg-background overflow-hidden">
        <table className="w-full text-[8px]">
          <thead>
            <tr className="border-b border-border bg-surface-secondary/40 text-left">
              <th className="px-2.5 py-1.5 text-muted-foreground font-medium w-[50%]">Milestone</th>
              <th className="px-2 py-1.5 text-muted-foreground font-medium">Due Date</th>
              <th className="px-2.5 py-1.5 text-muted-foreground font-medium text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {PROJ_MILESTONES.map((m) => (
              <tr key={m.title} className="hover:bg-surface-secondary/20">
                <td className="px-2.5 py-1.5 text-foreground font-medium">{m.title}</td>
                <td className="px-2 py-1.5 text-muted-foreground">{m.due}</td>
                <td className="px-2.5 py-1.5 text-right">
                  {m.completed ? (
                    <span className="inline-flex items-center gap-0.5 text-[7px] px-1.5 py-0.5 rounded-[3px] border border-success/30 bg-success/10 text-success"><Check className="w-2 h-2" /> Completed</span>
                  ) : (
                    <span className="inline-flex items-center text-[7px] px-1.5 py-0.5 rounded-[3px] border border-border text-muted-foreground">Mark complete</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProjScrumPokerTab() {
  const FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
  const rows = [
    { id: 1, title: 'Implement payment gateway', points: 13, editing: false },
    { id: 4, title: 'Mobile responsive layout', points: 8, editing: true },
    { id: 5, title: 'User checkout flow', points: 5, editing: false },
    { id: 8, title: 'Analytics integration', points: 3, editing: false },
  ];
  return (
    <div className="p-2.5">
      <div className="rounded-[3px] border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface-secondary/50">
          <span className="text-[9px] font-semibold text-foreground">Scrum Poker — Story Points</span>
          <span className="text-[7px] text-muted-foreground italic">Only PM can assign points</span>
        </div>
        <div className="divide-y divide-border">
          {rows.map((r) => (
            <div key={r.id} className="flex items-start gap-3 px-3 py-2">
              <span className="text-[9px] text-foreground flex-1 min-w-0 truncate pt-1">{r.title}</span>
              {!r.editing && (
                <button className="text-[7px] px-1.5 py-0.5 rounded-[3px] border border-border text-muted-foreground shrink-0 mt-0.5">Edit</button>
              )}
              <div className="flex items-center gap-0.5 flex-wrap justify-end border-l border-border pl-2 shrink-0">
                {FIBONACCI.map((n) => (
                  <span
                    key={n}
                    className={`w-4 h-5 rounded-[2px] border text-[7px] font-semibold flex items-center justify-center ${
                      r.points === n
                        ? 'bg-primary border-primary text-primary-foreground'
                        : `border-border text-muted-foreground ${r.editing ? '' : 'opacity-40'}`
                    }`}
                  >
                    {n}
                  </span>
                ))}
                {r.editing && (
                  <>
                    <button className="text-[7px] px-1.5 h-5 rounded-[2px] bg-primary text-primary-foreground ml-0.5">Save</button>
                    <button className="text-[7px] px-1.5 h-5 rounded-[2px] border border-border text-muted-foreground">Cancel</button>
                  </>
                )}
                <span className="text-[7px] font-semibold text-primary px-1 py-0.5 rounded-[2px] bg-primary/10 border border-primary/30 ml-1">{r.points} pts</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const CR_TASKS: { id: number; title: string; pushes: number; expanded: boolean }[] = [
  { id: 1, title: 'Implement payment gateway', pushes: 3, expanded: true },
  { id: 4, title: 'Mobile responsive layout', pushes: 1, expanded: false },
  { id: 8, title: 'Analytics integration', pushes: 0, expanded: false },
];

const CR_DIFF: DiffLine[] = [
  { type: 'header',  content: '@@ -8,6 +8,11 @@ export function calculateHealth(' },
  { type: 'context', content: '   tasks: Task[],' },
  { type: 'context', content: ' ): ProjectHealth {' },
  { type: 'remove',  content: "  const done = tasks.filter(t => t.done).length;" },
  { type: 'add',     content: "  if (tasks.length === 0) return 'unknown';" },
  { type: 'add',     content: "  const done = tasks.filter(t => t.done).length;" },
  { type: 'add',     content: "  const blocked = tasks.filter(t => t.blocked).length;" },
  { type: 'context', content: '   return done / tasks.length;' },
];

function ProjCodeReviewTab() {
  return (
    <div className="p-2.5 space-y-2">
      {/* AI Model selector */}
      <div className="rounded-[3px] border border-border bg-background p-2">
        <div className="text-[7px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">AI Model</div>
        <div className="flex items-center justify-between text-[8px] text-foreground bg-surface-secondary/40 border border-border/50 rounded-[3px] px-2 py-1">
          yemoda-large <ChevronDown className="w-2.5 h-2.5 text-muted-foreground" />
        </div>
      </div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-[9px] font-semibold text-foreground"><GitCommit className="w-3 h-3 text-muted-foreground" /> 3 tasks</div>
        <RefreshCw className="w-3 h-3 text-muted-foreground" />
      </div>
      {/* Task list */}
      <div className="space-y-1.5">
        {CR_TASKS.map((task) => (
          <div key={task.id} className="rounded-[3px] border border-border bg-background overflow-hidden">
            <div className="flex items-center gap-1.5 px-2 py-1.5">
              {task.expanded ? <ChevronDown className="w-2.5 h-2.5 text-muted-foreground" /> : <ChevronRight className="w-2.5 h-2.5 text-muted-foreground" />}
              <span className="text-[8px] text-foreground truncate flex-1">{task.title}</span>
              <span className={`text-[6px] px-1.5 py-0.5 rounded-full font-medium ${task.pushes > 0 ? 'bg-primary/10 text-primary' : 'bg-surface-secondary text-muted-foreground/50'}`}>
                {task.pushes} {task.pushes === 1 ? 'push' : 'pushes'}
              </span>
            </div>
            {task.expanded && (
              <div className="border-t border-border/50 p-2 space-y-1.5">
                {/* Push match */}
                <div className="flex items-center gap-1.5">
                  <ChevronDown className="w-2.5 h-2.5 text-muted-foreground" />
                  <span className="text-[7px] font-mono px-1 rounded-[2px] bg-primary/10 text-primary">feat/payment</span>
                  <span className="text-[6px] px-1 py-0.5 rounded-[2px] bg-emerald-500/[0.08] text-emerald-300">Full</span>
                </div>
                <div className="flex items-center gap-2 text-[7px] text-muted-foreground pl-3.5">
                  <span className="flex items-center gap-0.5"><User className="w-2 h-2" /> alexdev</span>
                  <span className="flex items-center gap-0.5"><Clock className="w-2 h-2" /> 2 Jun</span>
                  <span>3 commits</span>
                  <span>6 files</span>
                </div>
                <MiniDiff file="src/utils/projectHealth.ts" lines={CR_DIFF} startOld={8} startNew={8} />
                {/* Chat */}
                <div className="rounded-[3px] border border-border bg-surface-secondary/30 p-1.5">
                  <div className="text-[7px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Code Review Chat</div>
                  <div className="flex items-center gap-1 text-[7px] text-muted-foreground bg-background border border-border/50 rounded-[3px] px-1.5 py-1">
                    <span className="flex-1">Ask about changes, risks, or improvements…</span>
                    <Send className="w-2.5 h-2.5 text-primary" />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjRepositoriosTab() {
  const repos = [
    { name: 'react-ecommerce-platform', full: 'alexdev2024/react-ecommerce-platform', private: true },
    { name: 'payments-service',          full: 'alexdev2024/payments-service',          private: true },
    { name: 'design-tokens',             full: 'alexdev2024/design-tokens',             private: false },
  ];
  return (
    <div className="p-2.5 space-y-2">
      {/* Connection header card */}
      <div className="rounded-[3px] border border-border bg-background p-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#24292e] flex items-center justify-center shrink-0">
            <Github className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <div className="text-[9px] font-semibold text-foreground">GitHub connected</div>
            <div className="text-[7px] text-muted-foreground font-mono">alexdev2024</div>
          </div>
        </div>
        <button className="text-[8px] flex items-center gap-1 px-2 py-1 rounded-[3px] bg-primary text-primary-foreground font-medium"><Plus className="w-2.5 h-2.5" /> New repo</button>
      </div>
      {/* Repos list card */}
      <div className="rounded-[3px] border border-border bg-background p-2.5">
        <div className="text-[9px] font-bold text-foreground pb-1.5 mb-2 border-b border-border">Created repositories</div>
        <div className="space-y-1.5">
          {repos.map((r) => (
            <div key={r.name} className="group flex items-center justify-between py-1.5 px-2 border border-border rounded-[3px] hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-1.5 min-w-0">
                {r.private ? <Lock className="w-3 h-3 text-muted-foreground shrink-0" /> : <Unlock className="w-3 h-3 text-muted-foreground shrink-0" />}
                <span className="text-[8px] font-medium text-foreground truncate">{r.name}</span>
                <span className="text-[7px] text-muted-foreground truncate hidden sm:inline">{r.full}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <ExternalLink className="w-3 h-3 text-muted-foreground" />
                <Trash2 className="w-3 h-3 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProjEquipoTab() {
  return (
    <div className="p-2.5 space-y-1.5">
      {PROJ_MEMBERS.map((m, i) => (
        <div key={i} className="flex items-center gap-2.5 px-2.5 py-2 rounded-[3px] border border-border bg-background hover:bg-surface-secondary/20 transition-colors">
          <div className={`w-7 h-7 rounded-full ${m.bgColor} flex items-center justify-center shrink-0`}>
            <span className={`text-[9px] font-bold ${m.tColor}`}>{m.av}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-semibold text-foreground">{m.name}</div>
            <div className="text-[7px] text-muted-foreground">{m.role}</div>
          </div>
          <span className="text-[7px] px-1.5 py-0.5 rounded-[3px] border border-border text-muted-foreground shrink-0">Edit</span>
        </div>
      ))}
      <div className="flex justify-end pt-1">
        <button className="text-[8px] flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-primary text-primary-foreground"><UserPlus className="w-2.5 h-2.5" /> Add Member</button>
      </div>
    </div>
  );
}

function ProjConfiguracionTab() {
  return (
    <div className="p-2.5">
      <div className="grid grid-cols-[minmax(0,1fr)_180px] gap-2">
        {/* Left: Project Settings */}
        <div className="rounded-[3px] border border-border bg-background p-2.5 space-y-2">
          <div className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wide">Project Settings</div>
          <div>
            <label className="block text-[7px] font-medium text-foreground mb-0.5">Project status</label>
            <div className="h-6 bg-surface-secondary border border-border rounded-[3px] px-2 flex items-center justify-between text-[8px] text-foreground">
              In Progress <ChevronDown className="w-2.5 h-2.5 text-muted-foreground" />
            </div>
          </div>
          <div>
            <label className="block text-[7px] font-medium text-foreground mb-0.5">End date</label>
            <div className="h-6 bg-surface-secondary border border-border rounded-[3px] px-2 flex items-center justify-between text-[8px] text-foreground">
              7 Jun 2026 <Calendar className="w-2.5 h-2.5 text-muted-foreground" />
            </div>
          </div>
          <div>
            <label className="block text-[7px] font-medium text-foreground mb-0.5">Branches monitored by AI agent</label>
            <div className="h-6 bg-surface-secondary border border-border rounded-[3px] px-2 flex items-center text-[7px] text-muted-foreground">main,develop  (empty = all branches)</div>
            <p className="text-[6px] text-muted-foreground mt-0.5 leading-tight">Enter the names separated by commas. Task branches ({'{id}'}-*) are always analyzed.</p>
          </div>
          <button className="h-6 px-3 bg-primary text-primary-foreground rounded-[3px] text-[8px] font-medium">Save changes</button>
        </div>
        {/* Right: Team restrictions + Danger Zone */}
        <div className="space-y-2">
          <div className="rounded-[3px] border border-border bg-background p-2">
            <div className="text-[8px] font-semibold text-foreground mb-1">Team restrictions</div>
            <p className="text-[6px] text-muted-foreground leading-tight mb-1.5">By default only users with a connected GitHub account can be added. You can disable this temporarily.</p>
            <button className="w-full flex items-center justify-between text-[7px] text-foreground border border-border rounded-[3px] px-1.5 py-1">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" /> Require GitHub when adding members</span>
            </button>
          </div>
          <div className="rounded-[3px] border border-destructive/30 bg-destructive/5 p-2">
            <div className="text-[8px] font-semibold text-destructive uppercase tracking-wide mb-1">Danger Zone</div>
            <p className="text-[6px] text-muted-foreground leading-tight mb-1.5">Deleting this project will also remove its access from the main view.</p>
            <button className="flex items-center gap-1 text-[7px] px-2 py-1 rounded-[3px] border border-destructive/30 bg-destructive/10 text-destructive"><Trash2 className="w-2.5 h-2.5" /> Delete project</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProjectDetailShowcase() {
  const [activeTab, setActiveTab] = useState<ProjectTab>('resumen');

  return (
    <section id="project-demo" className="container mx-auto px-6 py-24 max-w-6xl scroll-mt-16">
      <div className="flex flex-col items-center gap-10">
        {/* Marketing text */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="space-y-5 text-center max-w-2xl w-full"
        >
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Project workspace — all tools in one place
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground leading-snug">
            One project. <span className="text-primary">All your tools.</span>
          </h2>
          <p className="text-[13px] text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Backlog, timeline, sprints, boards, milestones, code review and your team — everything inside a single project workspace.
          </p>

          {/* Tab pills */}
          <div className="flex flex-wrap justify-center gap-1.5">
            {PROJECT_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-[4px] text-[11px] font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
                }`}
              >
                {tab.icon && <tab.icon className="w-3 h-3" />}
                {tab.label}{tab.count != null ? ` ${tab.count}` : ''}
              </button>
            ))}
          </div>
        </motion.div>

        {/* App frame */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55, ease: 'easeOut', delay: 0.1 }}
          className="w-full"
        >
          <AppFrame url={`yemoda.site/projects/e-commerce${activeTab !== 'resumen' ? `?tab=${activeTab}` : ''}`}>
            <div className="flex flex-col bg-background overflow-hidden" style={{ height: 520 }}>
              {/* Command bar */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border bg-surface-secondary/50 shrink-0">
                <button className="flex items-center gap-1 text-[8px] text-muted-foreground px-2 py-0.5 rounded-[3px] border border-border hover:text-foreground transition-colors">
                  <ArrowLeft className="w-2.5 h-2.5" /> Back
                </button>
                <button className="flex items-center gap-1 text-[8px] text-muted-foreground px-2 py-0.5 rounded-[3px] border border-border hover:text-foreground transition-colors">
                  <UserPlus className="w-2.5 h-2.5" /> Assign owner
                </button>
                <div className="ml-auto inline-flex items-center gap-1 text-[7px] px-2 py-0.5 rounded-[3px] border border-border text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-info" /> In Progress
                </div>
              </div>

              {/* Project header */}
              <div className="px-3 pb-2 pt-1.5 border-b border-border shrink-0">
                <h1 className="text-[11px] font-semibold text-foreground">E-Commerce Redesign</h1>
                <div className="flex items-center gap-3 mt-0.5 text-[8px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="w-2.5 h-2.5" />Start: 12 Apr 2026</span>
                  <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />End: 7 Jun 2026</span>
                  <span className="flex items-center gap-1"><Users className="w-2.5 h-2.5" />4 members</span>
                </div>
              </div>

              {/* Tab bar with right-pinned refresh */}
              <div className="flex items-center border-b border-border bg-card/40 shrink-0">
                <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                  {PROJECT_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1 px-2.5 py-2 text-[8px] font-medium whitespace-nowrap transition-colors shrink-0 border-b-2 ${
                        activeTab === tab.id
                          ? 'border-primary text-primary bg-primary/5'
                          : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-secondary/30'
                      }`}
                    >
                      {tab.icon && <tab.icon className="w-2.5 h-2.5" />}
                      {tab.label}
                      {tab.count != null && (
                        <span className={`text-[6px] px-1 rounded-full ${activeTab === tab.id ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>{tab.count}</span>
                      )}
                    </button>
                  ))}
                </div>
                <button className="ml-auto px-2 py-2 shrink-0 text-muted-foreground hover:text-foreground" title="Refresh current section">
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                  >
                    {activeTab === 'resumen'       && <ProjOverviewTab />}
                    {activeTab === 'backlog'        && <ProjBacklogTab />}
                    {activeTab === 'timeline'       && <ProjTimelineTab />}
                    {activeTab === 'sprints'        && <ProjSprintsTab />}
                    {activeTab === 'boards'         && <ProjBoardsTab />}
                    {activeTab === 'milestones'     && <ProjMilestonesTab />}
                    {activeTab === 'scrum-poker'    && <ProjScrumPokerTab />}
                    {activeTab === 'code-review'    && <ProjCodeReviewTab />}
                    {activeTab === 'repositorios'   && <ProjRepositoriosTab />}
                    {activeTab === 'equipo'         && <ProjEquipoTab />}
                    {activeTab === 'configuracion'  && <ProjConfiguracionTab />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </AppFrame>
        </motion.div>
      </div>
    </section>
  );
}

// ── Code Review Showcase (task → push → diff + chat) ─────────────────────────

const SHOWCASE_DIFF: DiffLine[] = [
  { type: 'header',  content: "@@ -8,7 +8,14 @@ import type { Project } from './types';" },
  { type: 'context', content: ' export function calculateProjectHealth(' },
  { type: 'context', content: '   tasks: Task[],' },
  { type: 'context', content: ' ): ProjectHealth {' },
  { type: 'remove',  content: "  const completion = done / tasks.length;" },
  { type: 'remove',  content: "  if (completion < 0.3) return 'at_risk';" },
  { type: 'add',     content: "  if (tasks.length === 0) return 'unknown';" },
  { type: 'add',     content: "  const blocked = tasks.filter(t => t.blocked).length;" },
  { type: 'add',     content: "  const completion = done / tasks.length;" },
  { type: 'add',     content: "  if (blocked > 2 || completion < 0.2) return 'at_risk';" },
  { type: 'context', content: "  return completion >= 0.8 ? 'on_track' : 'warning';" },
  { type: 'context', content: ' }' },
];

export function CodeReviewShowcase() {
  return (
    <section className="bg-card/30 border-y border-border">
      <div className="container mx-auto px-6 py-24 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="text-center mb-12"
        >
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground mb-4">
            Code review connected to your tasks
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-3">
            Every push, linked to the task it belongs to
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Pushes are matched to sprint tasks automatically. Expand a task to inspect each push&apos;s diff and ask the review assistant about risks.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
        >
          <AppFrame url="yemoda.site/projects/atlas/code-review">
            <div className="grid lg:grid-cols-[1.4fr_0.6fr] max-h-[480px]">
              {/* Left: task → push → diff */}
              <div className="border-r border-border bg-background overflow-y-auto p-3 space-y-2">
                {/* AI Model */}
                <div className="rounded-[3px] border border-border bg-card p-2">
                  <div className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">AI Model</div>
                  <div className="flex items-center justify-between text-[10px] text-foreground bg-surface-secondary/40 border border-border/50 rounded-[3px] px-2 py-1">
                    yemoda-large <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </div>
                </div>
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground"><GitCommit className="w-3.5 h-3.5 text-muted-foreground" /> 4 tasks</div>
                  <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                {/* Expanded task with a push */}
                <div className="rounded-[3px] border border-border bg-card overflow-hidden">
                  <div className="flex items-center gap-2 px-2.5 py-2">
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[11px] text-foreground truncate flex-1">Improve project health score</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">2 pushes</span>
                  </div>
                  <div className="border-t border-border px-2.5 py-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <ChevronDown className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-primary/10 text-primary">feat/health-score</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-[2px] bg-emerald-500/[0.08] text-emerald-300">Full</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground pl-5">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> a.bravo</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 3 hours ago</span>
                      <span>4 commits</span>
                      <span>6 files</span>
                    </div>
                    <MiniDiff file="src/utils/projectHealth.ts" lines={SHOWCASE_DIFF} startOld={8} startNew={8} />
                  </div>
                </div>
                {/* Collapsed tasks */}
                {[
                  { title: 'Mobile responsive layout', pushes: 1 },
                  { title: 'Analytics integration', pushes: 0 },
                ].map((t) => (
                  <div key={t.title} className="flex items-center gap-2 px-2.5 py-2 rounded-[3px] border border-border bg-card">
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[11px] text-foreground truncate flex-1">{t.title}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${t.pushes > 0 ? 'bg-primary/10 text-primary' : 'bg-surface-secondary text-muted-foreground/50'}`}>
                      {t.pushes} {t.pushes === 1 ? 'push' : 'pushes'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Right: Code Review Chat */}
              <div className="flex flex-col overflow-hidden bg-background">
                <div className="px-4 py-2.5 border-b border-border bg-card/60 shrink-0 text-[11px] font-semibold text-foreground">Code Review Chat</div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  <div className="max-w-[85%] ml-auto rounded-[6px] bg-primary/10 text-foreground text-[10px] px-2.5 py-1.5">
                    Any risks in the new health calc?
                  </div>
                  <div className="flex items-start gap-1.5 max-w-[90%]">
                    <span className="shrink-0 mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-[4px] bg-primary text-primary-foreground text-[8px] font-bold tracking-wide">AI</span>
                    <div className="rounded-[6px] bg-card border border-border text-muted-foreground text-[10px] px-2.5 py-1.5 leading-relaxed">
                      The early <span className="font-mono">return &apos;unknown&apos;</span> guards empty task lists. The blocked-count threshold looks safe; consider a test for the boundary at <span className="font-mono">completion === 0.2</span>.
                    </div>
                  </div>
                </div>
                <div className="px-3 py-2.5 border-t border-border bg-surface-secondary/30 shrink-0">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-background border border-border rounded-[3px] px-2 py-1.5">
                    <span className="flex-1">Ask about changes, risks, or improvements…</span>
                    <Send className="w-3.5 h-3.5 text-primary" />
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

// ── AI Fix Showcase ("AI change review" modal) ───────────────────────────────

interface AiFixFile {
  path: string;
  sourceCode: string[];
  aiDiff: DiffLine[];
  startOld: number;
  startNew: number;
}

const AI_FIX_FILES: AiFixFile[] = [
  {
    path: 'backend/api/auth.py',
    sourceCode: [
      'def login(request):',
      '    """Validate security-sensitive',
      '    configuration values.)',
      '    email = request.json.get("email")',
      '    password = request.json.get("password")',
      '    if not email or not password:',
      '        return {"message": "missing credentials"}',
      '    user = auth_service.find_user(email)',
      '    if not user:',
      '        return {"message": "invalid credentials"}',
    ],
    aiDiff: [
      { type: 'header', content: '@@ -1,10 +1,12 @@ def login(request):' },
      { type: 'remove', content: '    """Validate security-sensitive' },
      { type: 'remove', content: '    configuration values.)' },
      { type: 'add', content: '    """Authenticate a user and return a token."""' },
      { type: 'context', content: '    email = request.json.get("email")' },
      { type: 'remove', content: '    if not email or not password:' },
      { type: 'remove', content: '        return {"message": "missing credentials"}' },
      { type: 'add', content: '    if not email or not password:' },
      { type: 'add', content: '        return {"message": "Missing required fields"}, 400' },
    ],
    startOld: 1,
    startNew: 1,
  },
  {
    path: 'backend/api/routes.py',
    sourceCode: [
      'def list_admin_reports(request):',
      '    token = request.headers.get("Authorization")',
      '    user = auth_service.user_from_token(token)',
      '    return report_service.get_all_reports()',
    ],
    aiDiff: [
      { type: 'header', content: '@@ -1,4 +1,9 @@ def list_admin_reports(request):' },
      { type: 'context', content: '    token = request.headers.get("Authorization")' },
      { type: 'add', content: '    if not token:' },
      { type: 'add', content: '        return {"message": "Authorization required"}, 401' },
      { type: 'context', content: '    user = auth_service.user_from_token(token)' },
      { type: 'add', content: '    if not user or not user.is_admin:' },
      { type: 'add', content: '        return {"message": "Forbidden"}, 403' },
    ],
    startOld: 1,
    startNew: 1,
  },
];

export function AiFixShowcase() {
  const [fileIndex, setFileIndex] = useState(0);
  const file = AI_FIX_FILES[fileIndex];

  return (
    <section className="container mx-auto px-6 py-24 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="text-center mb-12"
      >
        <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground mb-4">
          AI change review
        </div>
        <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-3">
          Send a task to AI, inspect the diff, then commit
        </h2>
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          The same flow your team uses in product: send task context to AI, compare current code with the AI&apos;s proposed code side by side, and confirm the commit only when the changes are safe.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
      >
        <AppFrame url="yemoda.site/projects/atlas/tasks/51/ai-review">
          {/* Modal header */}
          <div className="px-4 py-2.5 border-b border-border bg-surface-secondary/50">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-foreground">AI change review — <span className="text-primary">Harden auth endpoints</span></div>
                <div className="text-[9px] text-muted-foreground">Current code on the left and the AI response on the right.</div>
              </div>
              <button className="text-[10px] px-2.5 py-1 rounded-[3px] border border-border text-muted-foreground shrink-0">Close</button>
            </div>
            {/* Control bar */}
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <div className="flex-1 text-[9px] text-muted-foreground bg-background border border-border rounded-[3px] px-2 py-1 truncate">Fix the active warnings on this task without changing business logic…</div>
                <div className="flex items-center gap-1 text-[9px] text-foreground bg-background border border-border rounded-[3px] px-2 py-1">yemoda-large <ChevronDown className="w-3 h-3 text-muted-foreground" /></div>
                <button className="text-[9px] px-2.5 py-1 rounded-[3px] bg-primary text-primary-foreground font-medium flex items-center gap-1"><Send className="w-3 h-3" /> Send to AI</button>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 text-[9px] text-foreground bg-background border border-border rounded-[3px] px-2 py-1">
                  <span className="text-primary font-mono">[CHANGED]</span> {file.path} <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </div>
                <div className="text-[9px] text-muted-foreground bg-background border border-border rounded-[3px] px-2 py-1">Branch: main</div>
                <button className="text-[9px] px-2.5 py-1 rounded-[3px] border border-border text-muted-foreground">List files</button>
              </div>
            </div>
          </div>

          {/* Two-column body */}
          <div className="grid lg:grid-cols-2 max-h-[440px]">
            {/* Left: current code */}
            <div className="border-r border-border overflow-y-auto bg-background">
              <div className="sticky top-0 z-10 px-3 py-2 border-b border-border bg-card/70">
                <span className="text-[11px] font-semibold text-foreground">Current code <span className="text-muted-foreground font-mono text-[9px]">({file.path})</span></span>
              </div>
              <table className="w-full font-mono text-[10px] leading-[17px]">
                <tbody>
                  {file.sourceCode.map((line, index) => (
                    <tr key={index} className="hover:bg-surface-secondary/30">
                      <td className="w-8 text-right pr-2 border-r border-border/50 text-muted-foreground/70 select-none">{index + 1}</td>
                      <td className="px-3 whitespace-pre text-foreground">{line}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Right: AI response */}
            <div className="overflow-y-auto bg-background flex flex-col">
              <div className="sticky top-0 z-10 px-3 py-2 border-b border-border bg-card/70">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-foreground">AI response <span className="text-muted-foreground text-[9px]">(proposed code)</span></span>
                  <span className="text-[9px] text-warning">{AI_FIX_FILES.length} file(s) with detected changes</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[8px] text-muted-foreground">Modified file</span>
                  {AI_FIX_FILES.map((f, index) => (
                    <button
                      key={f.path}
                      type="button"
                      onClick={() => setFileIndex(index)}
                      className={`text-[8px] px-1.5 py-0.5 rounded-[3px] border transition-colors ${
                        fileIndex === index ? 'bg-primary/10 border-primary/40 text-foreground' : 'border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {f.path.split('/').slice(-1)[0]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-2 flex-1">
                <MiniDiff file={file.path} lines={file.aiDiff} startOld={file.startOld} startNew={file.startNew} />
              </div>
              <div className="sticky bottom-0 px-3 py-2.5 border-t border-border bg-card/85 backdrop-blur-sm flex items-center justify-between gap-2">
                <div className="text-[9px] text-muted-foreground">If you like the proposal, confirm the commit/push. Only allowed when the AI returns applicable code.</div>
                <button className="text-[10px] px-2.5 py-1 rounded-[3px] bg-primary text-primary-foreground font-medium inline-flex items-center gap-1 shrink-0">
                  <GitCommit className="w-3 h-3" /> Commit / Push
                </button>
              </div>
            </div>
          </div>
        </AppFrame>

        <div className="mt-4 text-center text-[11px] text-muted-foreground">
          Interactive mock: switch the modified file to inspect each proposed diff, then commit the AI changes.
        </div>
      </motion.div>
    </section>
  );
}
