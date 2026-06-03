import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Briefcase,
  Calendar,
  ChevronRight,
  Code2,
  FileCode2,
  GitCommit,
  GitMerge,
  Home,
  Sparkles,
  User,
  Users,
  TrendingDown,
  Github,
  Cloud,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Link } from 'react-router';

// ── Browser chrome wrapper ───────────────────────────────────────────────────

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
    <div className={`rounded-[10px] border border-border bg-card overflow-hidden shadow-[0_32px_80px_-24px_rgba(0,0,0,0.45)] ${className}`}>
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

// ── Types & data ─────────────────────────────────────────────────────────────

type DemoView = 'dashboard' | 'proyectos' | 'reportes' | 'alertas' | 'perfil';

const NAV_ITEMS: Array<{
  view: DemoView;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  section?: string;
  count?: number;
  danger?: boolean;
}> = [
  { view: 'dashboard',  icon: Home,      label: 'Dashboard' },
  { view: 'proyectos',  icon: Briefcase, label: 'Projects' },
  { view: 'reportes',   icon: BarChart3, label: 'Reports',   section: 'ANALYTICS' },
  { view: 'alertas',    icon: Bell,      label: 'Alerts',    count: 3, danger: true },
  { view: 'perfil',     icon: User,      label: 'Profile',   section: 'USER' },
];

const DEMO_PROYECTOS = [
  { id: 1, nombre: 'E-Commerce Redesign',   estado: 'In Progress', progreso: 72, dias: '12d', tareas: '8 of 11', fecha: '7 Jun 2026'  },
  { id: 2, nombre: 'Mobile App v2',          estado: 'In Progress', progreso: 45, dias: '8d',  tareas: '4 of 9',  fecha: '3 Jun 2026'  },
  { id: 3, nombre: 'API Gateway Migration',  estado: 'Planning',     progreso: 20, dias: '21d', tareas: '2 of 10', fecha: '16 Jun 2026' },
  { id: 4, nombre: 'Admin Dashboard',        estado: 'Planning',     progreso: 0,  dias: '30d', tareas: '0 of 6',  fecha: '25 Jun 2026' },
  { id: 5, nombre: 'Analytics Platform',     estado: 'In Progress', progreso: 88, dias: '4d',  tareas: '7 of 8',  fecha: '30 May 2026' },
];

const DEMO_ALERTAS = [
  {
    id: 1, tipo: 'warning', activo: true,
    titulo: 'Deprecated dependency detected in package.json',
    tarea: 'Project scaffolding review',
    tiempo: '1d ago',
    etiqueta: 'Active',
  },
  {
    id: 2, tipo: 'danger', activo: true,
    titulo: 'Critical: API endpoint exposed without authentication',
    tarea: 'API Gateway setup task',
    tiempo: '5h ago',
    etiqueta: 'Active',
  },
  {
    id: 3, tipo: 'danger', activo: true,
    titulo: 'Critical: Missing input validation on checkout form',
    tarea: 'Build checkout flow',
    tiempo: '2h ago',
    etiqueta: 'Active',
  },
  {
    id: 4, tipo: 'warning', activo: false,
    titulo: 'Unused environment variable in production config',
    tarea: 'Deploy staging environment',
    tiempo: '3d ago',
    etiqueta: 'Resolved',
  },
  {
    id: 5, tipo: 'warning', activo: false,
    titulo: 'High memory usage detected in background worker',
    tarea: 'Performance optimization sprint',
    tiempo: '5d ago',
    etiqueta: 'Resolved',
  },
];

const PROXIMAS_VENCER = [
  { id: 1, titulo: 'Implement payment gateway',   proyecto: 'E-Commerce Redesign',  tag: 'tomorrow' },
  { id: 2, titulo: 'Auth flow unit tests',         proyecto: 'Mobile App v2',         tag: 'in 4d'     },
  { id: 3, titulo: 'Load balancer configuration',  proyecto: 'API Gateway Migration', tag: 'in 4d'     },
  { id: 4, titulo: 'User role permissions UI',     proyecto: 'Admin Dashboard',       tag: 'in 6d'     },
];

const TAG_COLOR: Record<string, string> = {
  'tomorrow': 'bg-warning/15 text-warning',
  'in 4d': 'bg-primary/15 text-primary',
  'in 6d': 'bg-info/15 text-info',
};

const ALERT_DOT: Record<string, string> = {
  danger: 'bg-destructive',
  warning: 'bg-warning',
  success: 'bg-success',
  info: 'bg-info',
};

const VIEW_LABEL: Record<DemoView, string> = {
  dashboard: 'Dashboard',
  proyectos: 'Projects',
  reportes:  'Reports',
  alertas:   'Alerts',
  perfil:    'Profile',
};

// ── Dashboard view ───────────────────────────────────────────────────────────

function DashboardView({ onNavigate }: { onNavigate: (v: DemoView) => void }) {
  const kpis = [
    { label: 'PROJECTS',    value: '5',  sub: 'active',            tone: 'primary' },
    { label: 'TASKS',       value: '34', sub: 'in your projects',  tone: 'info'    },
    { label: 'COMPLETED',   value: '21', sub: 'tasks finished',    tone: 'success' },
    { label: 'PENDING',     value: '13', sub: 'open tasks',        tone: 'warning' },
    { label: 'OVERDUE',     value: '3',  sub: 'need attention',    tone: 'muted'   },
    { label: 'WARNINGS',    value: '2',  sub: 'active alerts',     tone: 'danger'  },
  ];
  const toneClass: Record<string, string> = {
    primary: 'text-primary',
    info:    'text-info',
    success: 'text-success',
    warning: 'text-warning',
    danger:  'text-destructive',
    muted:   'text-muted-foreground',
  };

  return (
    <div className="p-2.5 space-y-2 overflow-y-auto h-full">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground">Hi, <span className="font-semibold text-foreground">Alex</span></span>
        <button className="text-[8px] flex items-center gap-1 px-2 py-0.5 rounded-[3px] border border-border text-muted-foreground">
          ↻ Refresh
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-1.5">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-[3px] border border-border bg-background p-2">
            <div className="text-[7px] text-muted-foreground uppercase tracking-[0.07em] mb-0.5">{k.label}</div>
            <div className={`text-[16px] font-bold leading-none ${toneClass[k.tone]}`}>{k.value}</div>
            <div className="text-[7px] text-muted-foreground mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Health + Upcoming */}
      <div className="grid grid-cols-2 gap-1.5">
        {/* Portfolio Health */}
        <div className="rounded-[3px] border border-border bg-background p-2">
          <div className="text-[8px] font-semibold text-foreground mb-1.5">Portfolio Health</div>
          <div className="flex items-center justify-center py-1">
            <div className="relative w-16 h-16">
              <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                {/* track */}
                <circle cx="18" cy="18" r="14" fill="none" strokeWidth="3.5" style={{ stroke: 'rgba(255,255,255,0.1)' }} />
                {/* on track 40% — green */}
                <circle cx="18" cy="18" r="14" fill="none" strokeWidth="3.5" strokeLinecap="butt"
                  strokeDasharray="35.2 52.8" strokeDashoffset="0"
                  style={{ stroke: '#22c55e' }} />
                {/* warning 20% — amber */}
                <circle cx="18" cy="18" r="14" fill="none" strokeWidth="3.5" strokeLinecap="butt"
                  strokeDasharray="17.6 70.4" strokeDashoffset="52.8"
                  style={{ stroke: '#f59e0b' }} />
                {/* at risk 40% — red */}
                <circle cx="18" cy="18" r="14" fill="none" strokeWidth="3.5" strokeLinecap="butt"
                  strokeDasharray="35.2 52.8" strokeDashoffset="35.2"
                  style={{ stroke: '#ef4444' }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[11px] font-bold text-foreground">5</span>
                <span className="text-[7px] text-muted-foreground">projects</span>
              </div>
            </div>
          </div>
          <div className="space-y-0.5 mt-1">
            {([
              { label: 'On track · 2', dot: 'bg-success',     col: 'text-success'     },
              { label: 'Warning · 1',  dot: 'bg-warning',     col: 'text-warning'     },
              { label: 'At risk · 2',  dot: 'bg-destructive', col: 'text-destructive' },
            ] as const).map((item) => (
              <div key={item.label} className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.dot}`} />
                <span className={`text-[7px] ${item.col}`}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming due */}
        <div className="rounded-[3px] border border-border bg-background p-2 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[8px] font-semibold text-foreground">Upcoming Due</div>
            <span className="text-[7px] text-muted-foreground">7 in 7 days</span>
          </div>
          <div className="space-y-1 flex-1 overflow-hidden">
            {PROXIMAS_VENCER.map((t) => (
              <div key={t.id} className="flex items-start gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-warning mt-1 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] text-foreground truncate leading-tight">{t.titulo}</p>
                  <p className="text-[7px] text-muted-foreground truncate">{t.proyecto}</p>
                </div>
                <span className={`text-[7px] px-1 py-0.5 rounded-[2px] shrink-0 ${TAG_COLOR[t.tag] ?? 'bg-muted text-muted-foreground'}`}>{t.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* My projects */}
      <div className="rounded-[3px] border border-border bg-background p-2">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[8px] font-semibold text-foreground">My Projects</div>
          <button onClick={() => onNavigate('proyectos')} className="text-[7px] text-primary hover:underline flex items-center gap-0.5">
            View all <ChevronRight className="w-2 h-2" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {DEMO_PROYECTOS.slice(0, 4).map((p) => {
            const days = parseInt(p.dias);
            const atRisk = days <= 10 && p.progreso < 60;
            const onTrack = !atRisk;
            return (
              <div key={p.id} className="rounded-[3px] border border-border bg-card/50 px-2 py-1.5">
                <p className="text-[8px] font-medium text-foreground truncate">{p.nombre}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[7px] text-muted-foreground">{p.tareas} tasks</span>
                  <span className={`text-[7px] font-medium ${onTrack ? 'text-success' : 'text-warning'}`}>
                    {onTrack ? 'On track' : 'At risk'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Proyectos view ───────────────────────────────────────────────────────────

function ProyectosView() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-border bg-card/60 shrink-0 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold text-foreground">Projects</div>
          <div className="text-[9px] text-muted-foreground">Search, filter and sort active projects by delivery date.</div>
        </div>
        <button className="text-[9px] px-2 py-1 rounded-[3px] bg-primary text-primary-foreground font-medium">+ New Project</button>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border bg-card/30 shrink-0">
        <span className="text-[8px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">All 5</span>
        <span className="text-[8px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">In Progress 3</span>
        <span className="text-[8px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">Planning 2</span>
      </div>
      <div className="overflow-y-auto flex-1">
        <table className="w-full text-[9px]">
          <thead>
            <tr className="border-b border-border bg-surface-secondary/30">
              <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">PROJECT</th>
              <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">STATUS</th>
              <th className="text-right px-2 py-1.5 text-muted-foreground font-medium">HEALTH</th>
              <th className="text-right px-2 py-1.5 text-muted-foreground font-medium">END DATE</th>
              <th className="text-right px-3 py-1.5 text-muted-foreground font-medium">TIME LEFT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {DEMO_PROYECTOS.map((p) => (
              <tr key={p.id} className="hover:bg-surface-secondary/20 transition-colors">
                <td className="px-3 py-2 text-foreground font-medium truncate max-w-[120px]">{p.nombre}</td>
                <td className="px-2 py-2">
                  <span className="px-1.5 py-0.5 rounded-[3px] border border-border/60 text-muted-foreground bg-surface-secondary/30">● {p.estado}</span>
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center justify-end gap-1.5">
                    <div className="w-10 h-1 rounded-full bg-border overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          p.progreso >= 70 ? 'bg-success' : p.progreso >= 40 ? 'bg-warning' : 'bg-destructive'
                        }`}
                        style={{ width: `${p.progreso}%` }}
                      />
                    </div>
                    <span className={`text-[9px] w-6 text-right ${
                      p.progreso >= 70 ? 'text-success' : p.progreso >= 40 ? 'text-warning' : 'text-destructive'
                    }`}>{p.progreso}%</span>
                  </div>
                </td>
                <td className="px-2 py-2 text-right text-muted-foreground">{p.fecha}</td>
                <td className={`px-3 py-2 text-right font-semibold ${
                  p.dias === '4d' ? 'text-destructive' : p.dias === '8d' || p.dias === '12d' ? 'text-warning' : 'text-muted-foreground'
                }`}>{p.dias}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Reportes view ────────────────────────────────────────────────────────────

function ReportesView() {
  const attProyectos = [
    { nombre: 'API Gateway Migration',  salud: '20%', vencidas: '2 overdue' },
    { nombre: 'Admin Dashboard',        salud: '0%',  vencidas: '0 overdue' },
    { nombre: 'Mobile App v2',          salud: '45%', vencidas: '1 overdue'  },
    { nombre: 'E-Commerce Redesign',    salud: '72%', vencidas: '1 overdue'  },
    { nombre: 'Analytics Platform',     salud: '88%', vencidas: '0 overdue' },
  ];
  return (
    <div className="flex flex-col h-full overflow-y-auto p-2.5 space-y-2">
      {/* Health header */}
      <div className="rounded-[3px] border border-warning/30 bg-warning/5 p-2.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[7px] px-1.5 py-0.5 rounded-[3px] bg-warning/15 text-warning font-semibold uppercase tracking-wider">Requires Attention</span>
          <span className="text-[8px] text-muted-foreground">5 projects</span>
        </div>
        <div className="text-[22px] font-bold text-foreground leading-none mb-1">48% <span className="text-[9px] font-normal text-muted-foreground">PORTFOLIO HEALTH</span></div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-[8px] text-muted-foreground">
            <TrendingDown className="w-2.5 h-2.5 text-destructive shrink-0" />
            Velocity −18% vs previous period
          </div>
          <div className="flex items-center gap-1 text-[8px] text-muted-foreground">
            <TrendingDown className="w-2.5 h-2.5 text-warning shrink-0" />
            Completion rate 62% below 80% target
          </div>
          <div className="flex items-center gap-1 text-[8px] text-muted-foreground">
            <AlertTriangle className="w-2.5 h-2.5 text-warning shrink-0" />
            2 active warnings remain unresolved
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: 'TOTAL TASKS',   value: '34', sub: 'tasks registered',     dot: 'bg-info'       },
          { label: 'COMPLETED',     value: '21', sub: '62% of total',         dot: 'bg-success'    },
          { label: 'PENDING',       value: '13', sub: 'tasks to complete',    dot: 'bg-warning'    },
          { label: 'OVERDUE',       value: '3',  sub: 'past their due date',  dot: 'bg-destructive'},
        ].map((k) => (
          <div key={k.label} className="rounded-[3px] border border-border bg-background p-1.5">
            <div className="flex items-center gap-1 mb-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${k.dot}`} />
              <span className="text-[7px] text-muted-foreground uppercase tracking-[0.06em]">{k.label}</span>
            </div>
            <div className="text-[16px] font-bold text-foreground leading-none">{k.value}</div>
            <div className="text-[7px] text-muted-foreground mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Trend + Attention */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-[3px] border border-border bg-background p-2">
          <div className="text-[8px] text-muted-foreground uppercase tracking-wider mb-0.5">Trend · 2 Weeks</div>
          <div className="text-[9px] font-semibold text-foreground mb-1.5">Tasks completed per week</div>
          {/* Sparkline */}
          <svg viewBox="0 0 120 50" className="w-full h-14">
            <defs>
              <linearGradient id="demoSparkGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {/* Grid lines */}
            <line x1="12" y1="6"  x2="116" y2="6"  stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" strokeDasharray="2 2" />
            <line x1="12" y1="16" x2="116" y2="16" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" strokeDasharray="2 2" />
            <line x1="12" y1="26" x2="116" y2="26" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" strokeDasharray="2 2" />
            <line x1="12" y1="36" x2="116" y2="36" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" strokeDasharray="2 2" />
            {/* Y labels */}
            <text x="10" y="9"  fill="rgba(255,255,255,0.3)" fontSize="5" textAnchor="end">8</text>
            <text x="10" y="19" fill="rgba(255,255,255,0.3)" fontSize="5" textAnchor="end">6</text>
            <text x="10" y="29" fill="rgba(255,255,255,0.3)" fontSize="5" textAnchor="end">4</text>
            <text x="10" y="39" fill="rgba(255,255,255,0.3)" fontSize="5" textAnchor="end">2</text>
            {/* Line — declining trend */}
            <path d="M12 8 L46 12 L80 21 L116 34" stroke="#f59e0b" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {/* Area fill */}
            <path d="M12 8 L46 12 L80 21 L116 34 L116 43 L12 43 Z" fill="url(#demoSparkGrad)" />
            {/* X labels */}
            <text x="12" y="49" fill="rgba(255,255,255,0.3)" fontSize="5">12 May</text>
            <text x="88" y="49" fill="rgba(255,255,255,0.3)" fontSize="5">26 May</text>
          </svg>
        </div>
        <div className="rounded-[3px] border border-border bg-background p-2">
          <div className="text-[8px] font-semibold text-foreground mb-1.5">Priority Attention</div>
          <div className="space-y-1 overflow-hidden">
            {attProyectos.map((p) => (
              <div key={p.nombre} className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] text-foreground truncate">{p.nombre}</p>
                  <p className="text-[7px] text-muted-foreground">{p.salud} · {p.vencidas}</p>
                </div>
                <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/40 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Alertas view ─────────────────────────────────────────────────────────────

function AlertasView() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card/60 shrink-0">
        <button className="text-[8px] flex items-center gap-1 px-2 py-0.5 rounded-[3px] border border-border text-muted-foreground">↻ Refresh</button>
        <span className="text-[8px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">All 5</span>
        <span className="text-[8px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">Active 3</span>
        <span className="text-[8px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">Resolved 2</span>
      </div>
      <div className="flex items-center gap-4 px-3 py-1.5 border-b border-border/50 bg-background/30 shrink-0 text-[8px] text-muted-foreground">
        <span className="text-warning font-medium">▲ 3 active</span>
        <span className="text-success font-medium">○ 2 resolved</span>
        <span>◎ 5 total</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-1.5 border-b border-border/30 bg-surface-secondary/20">
          <span className="text-[8px] text-muted-foreground font-medium uppercase tracking-wider">Yesterday</span>
        </div>
        <div className="divide-y divide-border/50">
          {DEMO_ALERTAS.filter(a => a.activo).map((a) => (
            <div key={a.id} className="px-3 py-2.5 hover:bg-surface-secondary/20 transition-colors">
              <div className="flex items-start gap-2">
                <input type="checkbox" className="mt-0.5 w-3 h-3 shrink-0 accent-primary" readOnly />
                <AlertTriangle className={`w-3 h-3 mt-0.5 shrink-0 ${a.tipo === 'danger' ? 'text-destructive' : 'text-warning'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-foreground leading-tight line-clamp-2">{a.titulo}</p>
                  <p className="text-[8px] text-muted-foreground mt-0.5 truncate">↗ Task: {a.tarea} · {a.tiempo}</p>
                </div>
                <span className="text-[7px] px-1.5 py-0.5 rounded-[3px] bg-destructive/15 text-destructive font-medium shrink-0">● {a.etiqueta}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="px-3 py-1.5 border-b border-border/30 border-t border-t-border/50 bg-surface-secondary/20 mt-1">
          <span className="text-[8px] text-muted-foreground font-medium uppercase tracking-wider">This Week</span>
        </div>
        <div className="divide-y divide-border/50">
          {DEMO_ALERTAS.filter(a => !a.activo).map((a) => (
            <div key={a.id} className="px-3 py-2.5 opacity-60 hover:opacity-80 transition-opacity">
              <div className="flex items-start gap-2">
                <input type="checkbox" checked className="mt-0.5 w-3 h-3 shrink-0 accent-primary" readOnly />
                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-muted-foreground leading-tight line-clamp-2 line-through">{a.titulo}</p>
                  <p className="text-[8px] text-muted-foreground/60 mt-0.5 truncate">↗ Task: {a.tarea} · {a.tiempo}</p>
                </div>
                <span className="text-[7px] px-1.5 py-0.5 rounded-[3px] bg-success/15 text-success font-medium shrink-0">✓ {a.etiqueta}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Perfil view ──────────────────────────────────────────────────────────────

function PerfilView() {
  return (
    <div className="flex flex-col h-full overflow-y-auto p-2.5 space-y-2">
      <div className="text-[11px] font-semibold text-foreground">My Profile</div>

      <div className="grid grid-cols-2 gap-2">
        {/* Personal info */}
        <div className="rounded-[3px] border border-border bg-background p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-semibold text-foreground">Personal Info</span>
            <button className="text-[7px] px-1.5 py-0.5 rounded-[3px] bg-primary text-primary-foreground">Edit</button>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-primary">A</span>
            </div>
            <div>
              <p className="text-[9px] font-semibold text-foreground">Alex García</p>
              <p className="text-[7px] text-muted-foreground">Tech Lead</p>
            </div>
          </div>
          <div className="space-y-1">
            {[
              { icon: User, label: 'Name',  val: 'Alex García' },
              { icon: Activity, label: 'Email', val: 'alex.garcia@techco.io' },
              { icon: CheckCircle2, label: 'Role', val: 'Tech Lead' },
            ].map(({ icon: Icon, label, val }) => (
              <div key={label}>
                <div className="flex items-center gap-1 text-[7px] text-muted-foreground mb-0.5">
                  <Icon className="w-2.5 h-2.5" /> {label}
                </div>
                <div className="text-[8px] text-foreground bg-surface-secondary/40 border border-border/50 rounded-[3px] px-2 py-0.5">{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Preferences + integrations */}
        <div className="space-y-2">
          <div className="rounded-[3px] border border-border bg-background p-2">
            <div className="text-[9px] font-semibold text-foreground mb-1.5">Preferences</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-[8px] text-foreground">Theme — Dark</span>
              </div>
              <div className="w-7 h-4 rounded-full bg-primary flex items-center justify-end px-0.5">
                <div className="w-3 h-3 rounded-full bg-white" />
              </div>
            </div>
          </div>

          <div className="rounded-[3px] border border-border bg-background p-2">
            <div className="text-[9px] font-semibold text-foreground mb-1.5">GitHub</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Github className="w-3 h-3 text-foreground" />
                <div>
                  <p className="text-[8px] text-success font-medium">● Connected</p>
                  <p className="text-[7px] text-muted-foreground">alexdev2024</p>
                </div>
              </div>
              <button className="text-[7px] px-1.5 py-0.5 rounded-[3px] border border-destructive/40 text-destructive">Disconnect</button>
            </div>
          </div>

          <div className="rounded-[3px] border border-border bg-background p-2">
            <div className="text-[9px] font-semibold text-foreground mb-1.5">Microsoft Azure</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Cloud className="w-3 h-3 text-muted-foreground" />
                <span className="text-[8px] text-muted-foreground">Connect Azure</span>
              </div>
              <button className="text-[7px] px-1.5 py-0.5 rounded-[3px] bg-primary text-primary-foreground">Sign in</button>
            </div>
          </div>
        </div>
      </div>

      {/* My projects table */}
      <div className="rounded-[3px] border border-border bg-background p-2">
        <div className="text-[9px] font-semibold text-foreground mb-1.5">My Projects</div>
        <table className="w-full text-[8px]">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left pb-1 text-muted-foreground font-medium">PROJECT</th>
              <th className="text-left pb-1 text-muted-foreground font-medium">STATUS</th>
              <th className="text-right pb-1 text-muted-foreground font-medium">END DATE</th>
              <th className="text-right pb-1 text-muted-foreground font-medium">DAYS LEFT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {DEMO_PROYECTOS.slice(0, 3).map((p) => (
              <tr key={p.id}>
                <td className="py-1 text-foreground truncate max-w-[90px]">{p.nombre}</td>
                <td className="py-1 text-muted-foreground">● {p.estado}</td>
                <td className="py-1 text-right text-muted-foreground">{p.fecha}</td>
                <td className={`py-1 text-right font-semibold ${
                  parseInt(p.dias) <= 5 ? 'text-destructive' : parseInt(p.dias) <= 14 ? 'text-warning' : 'text-muted-foreground'
                }`}>{p.dias}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── DashboardShowcase ─────────────────────────────────────────────────────────

export function DashboardShowcase() {
  const [activeView, setActiveView] = useState<DemoView>('dashboard');

  return (
    <section id="demo" className="container mx-auto px-6 py-24 max-w-6xl scroll-mt-16">
      <div className="flex flex-col items-center gap-10">

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="space-y-5 text-center max-w-2xl w-full"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[3px] border border-primary/20 bg-primary/10 text-primary text-[11px] font-medium">
            <Sparkles className="w-3 h-3" />
            Interactive Demo — explore the platform
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
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2.5 text-[13px] text-foreground">
                <div className="w-5 h-5 rounded-[3px] bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-3 h-3 text-primary" />
                </div>
                {text}
              </li>
            ))}
          </ul>

          {/* Nav pills */}
          <div className="flex flex-wrap gap-2 justify-center">
            {NAV_ITEMS.map(({ view, label }) => (
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
          <AppFrame url={`app.yemoda.io/${activeView}`}>
            <div className="grid grid-cols-[148px_minmax(0,1fr)] h-[480px] overflow-hidden">

              {/* Sidebar */}
              <aside className="border-r border-border bg-surface-secondary/40 flex flex-col p-2.5 gap-0.5 overflow-hidden shrink-0">
                <div className="flex items-center gap-2 px-2 py-2 mb-1">
                  <div className="w-6 h-6 rounded-[3px] bg-primary flex items-center justify-center shrink-0">
                    <span className="text-primary-foreground font-bold text-[9px]">YM</span>
                  </div>
                  <div>
                    <div className="text-[9px] font-semibold text-foreground">Yemoda</div>
                    <div className="text-[7px] text-muted-foreground">Project Intelligence</div>
                  </div>
                </div>

                {NAV_ITEMS.map(({ view, icon: Icon, label, section, count, danger }) => {
                  const isActive = view === activeView;
                  return (
                    <div key={label}>
                      {section && (
                        <div className="text-[7px] text-muted-foreground/50 uppercase tracking-[0.1em] px-2 pt-2 pb-1">{section}</div>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveView(view)}
                        className={`flex items-center justify-between gap-2 w-full px-2.5 py-1.5 rounded-[3px] transition-colors ${
                          isActive
                            ? 'bg-primary/10 text-foreground'
                            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-primary' : ''}`} />
                          <span className="text-[10px] truncate">{label}</span>
                        </div>
                        {count != null && (
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${danger ? 'bg-destructive/15 text-destructive' : 'bg-primary/10 text-primary'}`}>
                            {count}
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}

                {/* User chip at bottom */}
                <div className="mt-auto pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-[9px] font-bold text-primary">A</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-medium text-foreground truncate">Alex G.</p>
                    </div>
                  </div>
                </div>
              </aside>

              {/* Main content */}
              <div className="bg-background flex flex-col overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-border bg-card/80 shrink-0">
                  <div className="text-[11px] font-semibold text-foreground">{VIEW_LABEL[activeView]}</div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-surface-secondary/60 border border-border/50 rounded-[3px] px-2.5 py-1">
                    <Activity className="w-3 h-3" />
                    Search... Ctrl K
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
                      {activeView === 'dashboard'  && <DashboardView onNavigate={setActiveView} />}
                      {activeView === 'proyectos'  && <ProyectosView />}
                      {activeView === 'reportes'   && <ReportesView />}
                      {activeView === 'alertas'    && <AlertasView />}
                      {activeView === 'perfil'     && <PerfilView />}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </AppFrame>

          <p className="text-center text-[11px] text-muted-foreground">
            Click{' '}
            {NAV_ITEMS.map(({ view, label }, i) => (
              <span key={view}>
                <button onClick={() => setActiveView(view)} className="font-medium text-foreground hover:text-primary transition-colors">{label}</button>
                {i < NAV_ITEMS.length - 1 ? ', ' : ''}
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

const PROJECT_TABS: { id: ProjectTab; label: string; count?: number }[] = [
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
  { id: 'configuracion',label: '⚙ Settings' },
];

const PROJ_TASKS = [
  { id:1,  titulo:'Implement payment gateway',    prioridad:'High',  pColor:'text-destructive',      estado:'In progress', eColor:'text-warning',         av:'AG' },
  { id:2,  titulo:'Shopping cart persistence',    prioridad:'Medium', pColor:'text-warning',          estado:'Completed',   eColor:'text-success',         av:'MS' },
  { id:3,  titulo:'Product search & filters',     prioridad:'Medium', pColor:'text-warning',          estado:'Completed',   eColor:'text-success',         av:'CR' },
  { id:4,  titulo:'Mobile responsive layout',     prioridad:'High',  pColor:'text-destructive',      estado:'In review',   eColor:'text-primary',         av:'AL' },
  { id:5,  titulo:'User checkout flow',           prioridad:'Medium', pColor:'text-warning',          estado:'In progress', eColor:'text-warning',         av:'AG' },
  { id:6,  titulo:'SEO meta tags setup',          prioridad:'Low',   pColor:'text-muted-foreground', estado:'Pending',     eColor:'text-muted-foreground',av:'—'  },
  { id:7,  titulo:'Email notifications',          prioridad:'Medium', pColor:'text-warning',          estado:'Completed',   eColor:'text-success',         av:'MS' },
  { id:8,  titulo:'Analytics integration',        prioridad:'High',  pColor:'text-destructive',      estado:'Completed',   eColor:'text-success',         av:'CR' },
  { id:9,  titulo:'Performance optimization',     prioridad:'Medium', pColor:'text-warning',          estado:'Pending',     eColor:'text-muted-foreground',av:'—'  },
  { id:10, titulo:'Security audit',               prioridad:'High',  pColor:'text-destructive',      estado:'In progress', eColor:'text-warning',         av:'AG' },
  { id:11, titulo:'Developer documentation',      prioridad:'Low',   pColor:'text-muted-foreground', estado:'Pending',     eColor:'text-muted-foreground',av:'—'  },
];

const PROJ_BOARD_COLS = [
  { id:'todo',     label:'To do',       lColor:'text-muted-foreground', taskIds:[6,9,11] },
  { id:'progress', label:'In progress', lColor:'text-warning',          taskIds:[1,5,10] },
  { id:'review',   label:'In review',   lColor:'text-primary',          taskIds:[4] },
  { id:'done',     label:'Completed',   lColor:'text-success',          taskIds:[2,3,7,8] },
];

const PROJ_TIMELINE_ITEMS = [
  { titulo:'Payment gateway',    inicio:35, ancho:48, progreso:70 },
  { titulo:'Mobile responsive',  inicio:15, ancho:42, progreso:82 },
  { titulo:'Checkout flow',      inicio:50, ancho:50, progreso:55 },
  { titulo:'Performance optim.', inicio:65, ancho:40, progreso:18 },
  { titulo:'Security audit',     inicio:42, ancho:38, progreso:62 },
];

const PROJ_SPRINT = [
  { id:1,  titulo:'Implement payment gateway', estado:'In progress', av:'AG', eColor:'text-warning' },
  { id:4,  titulo:'Mobile responsive layout',  estado:'In review',   av:'AL', eColor:'text-primary' },
  { id:5,  titulo:'User checkout flow',        estado:'In progress', av:'AG', eColor:'text-warning' },
  { id:10, titulo:'Security audit',            estado:'In progress', av:'AG', eColor:'text-warning' },
  { id:9,  titulo:'Performance optimization',  estado:'Pending',     av:'—',  eColor:'text-muted-foreground' },
  { id:11, titulo:'Developer documentation',   estado:'Pending',     av:'—',  eColor:'text-muted-foreground' },
];

const PROJ_MILESTONES = [
  { titulo:'Alpha Release',     fecha:'30 Apr 2026', progreso:100, mColor:'text-success',          bColor:'bg-success' },
  { titulo:'Beta Launch',       fecha:'25 May 2026', progreso:75,  mColor:'text-warning',          bColor:'bg-warning' },
  { titulo:'Production Deploy', fecha:'7 Jun 2026',  progreso:20,  mColor:'text-muted-foreground', bColor:'bg-primary/50' },
];

const PROJ_PRS = [
  { id:'#44', titulo:'feat: payment gateway integration',    estado:'In review', av:'AG', rama:'feat/payment',    hace:'2h ago',  merged:false },
  { id:'#43', titulo:'fix: cart persistence on page reload', estado:'Merged',    av:'CR', rama:'fix/cart-state',  hace:'1d ago',  merged:true  },
  { id:'#42', titulo:'feat: mobile responsive redesign',     estado:'In review', av:'AL', rama:'feat/responsive', hace:'5h ago',  merged:false },
  { id:'#41', titulo:'chore: update package dependencies',   estado:'Merged',    av:'MS', rama:'chore/deps',      hace:'2d ago',  merged:true  },
];

const PROJ_MEMBERS = [
  { av:'AG', name:'Alex García',    role:'Tech Lead',    bgColor:'bg-primary/20',    tColor:'text-primary' },
  { av:'MS', name:'Maria Santos',   role:'Frontend Dev', bgColor:'bg-success/20',    tColor:'text-success' },
  { av:'CR', name:'Carlos Ramírez', role:'Backend Dev',  bgColor:'bg-warning/20',    tColor:'text-warning' },
  { av:'AL', name:'Ana López',      role:'UI/UX Design', bgColor:'bg-purple-500/20', tColor:'text-purple-400' },
];

// ── Tab sub-components ────────────────────────────────────────────────────────

function ProjOverviewTab() {
  return (
    <div className="p-2.5 space-y-2">
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { title:'TASKS',        value:'11', sub:'in the project',    border:'border-l-2 border-l-sky-500/60' },
          { title:'COMPLETED',    value:'8',  sub:'finished',          border:'border-l-2 border-l-success/60' },
          { title:'OVERDUE',      value:'1',  sub:'need attention',    border:'border-l-2 border-l-destructive/60' },
          { title:'TIME LEFT',    value:'12d',sub:'7 Jun 2026',        border:'border-l-2 border-l-warning/60' },
        ].map(k => (
          <div key={k.title} className={`rounded-[3px] border border-border bg-background p-2 ${k.border}`}>
            <div className="text-[7px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">{k.title}</div>
            <div className="text-[14px] font-bold text-foreground leading-none">{k.value}</div>
            <div className="text-[6px] text-muted-foreground mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>
      <div className="rounded-[3px] border border-border bg-background p-2.5">
        <div className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">General Information</div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
          {[
            { label:'Status',           val:'In progress' },
            { label:'Created',          val:'12 Apr 2026' },
            { label:'End date',         val:'7 Jun 2026' },
            { label:'Time remaining',   val:'12 days' },
            { label:'Members',          val:'4 people' },
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
    <div className="p-2.5">
      <div className="rounded-[3px] border border-border bg-background overflow-hidden">
        <table className="w-full text-[8px]">
          <thead>
            <tr className="border-b border-border bg-surface-secondary/40">
              <th className="text-left px-2.5 py-1.5 text-muted-foreground font-medium w-[42%]">TITLE</th>
              <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">PRIORITY</th>
              <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">STATUS</th>
              <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">ASSIGNED</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {PROJ_TASKS.map(t => (
              <tr key={t.id} className="hover:bg-surface-secondary/20 transition-colors">
                <td className="px-2.5 py-1 text-foreground truncate max-w-0">{t.titulo}</td>
                <td className={`px-2 py-1 font-medium ${t.pColor}`}>{t.prioridad}</td>
                <td className={`px-2 py-1 ${t.eColor}`}>{t.estado}</td>
                <td className="px-2 py-1">
                  {t.av !== '—'
                    ? <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center"><span className="text-[7px] font-bold text-primary">{t.av}</span></div>
                    : <span className="text-muted-foreground">—</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProjTimelineTab() {
  return (
    <div className="p-2.5">
      <div className="rounded-[3px] border border-border bg-background p-2.5">
        <div className="flex items-center justify-between mb-2 text-[7px] text-muted-foreground font-medium">
          <span>May 2026</span><span>Jun 2026</span>
        </div>
        <div className="border-t border-border/30 space-y-2 pt-2">
          {PROJ_TIMELINE_ITEMS.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-24 text-[7px] text-muted-foreground truncate shrink-0">{t.titulo}</div>
              <div className="flex-1 relative h-5 bg-surface-secondary/40 rounded-[2px] overflow-hidden">
                <div
                  className="absolute top-0 h-full rounded-[2px] bg-primary/25 border border-primary/30"
                  style={{ left: `${t.inicio}%`, width: `${t.ancho}%` }}
                />
                <div
                  className="absolute top-0 h-full rounded-[2px] bg-primary/75"
                  style={{ left: `${t.inicio}%`, width: `${t.ancho * t.progreso / 100}%` }}
                />
                <div
                  className="absolute inset-0 flex items-center"
                  style={{ left: `${t.inicio + t.ancho / 2 - 5}%` }}
                >
                  <span className="text-[6px] text-white font-semibold">{t.progreso}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2.5 flex justify-center gap-4 text-[7px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-[1px] bg-primary/25 border border-primary/30 inline-block" />Planned</span>
          <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-[1px] bg-primary/75 inline-block" />Completed</span>
        </div>
      </div>
    </div>
  );
}

function ProjSprintsTab() {
  return (
    <div className="p-2.5 space-y-2">
      <div className="rounded-[3px] border border-primary/30 bg-primary/5 p-2.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] font-semibold text-foreground">Sprint 3</span>
          <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">Active</span>
        </div>
        <div className="text-[7px] text-muted-foreground mb-2">26 May – 9 Jun 2026 · 6 tasks</div>
        <div className="space-y-0.5">
          {PROJ_SPRINT.map(t => (
            <div key={t.id} className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
              <span className="text-[8px] text-foreground truncate flex-1">{t.titulo}</span>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <span className={`text-[7px] ${t.eColor}`}>{t.estado}</span>
                <div className="w-4 h-4 rounded-full bg-surface-secondary border border-border flex items-center justify-center">
                  <span className="text-[6px] text-muted-foreground">{t.av}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="text-[7px] text-center text-muted-foreground">Sprint 1 (closed · 100%) · Sprint 2 (closed · 100%)</div>
    </div>
  );
}

function ProjBoardsTab() {
  return (
    <div className="p-2.5">
      <div className="grid grid-cols-4 gap-1.5">
        {PROJ_BOARD_COLS.map(col => {
          const tasks = col.taskIds.map(id => PROJ_TASKS.find(t => t.id === id)!);
          return (
            <div key={col.id} className="flex flex-col">
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <span className={`text-[8px] font-semibold ${col.lColor}`}>{col.label}</span>
                <span className="text-[7px] text-muted-foreground">{col.taskIds.length}</span>
              </div>
              <div className="space-y-1">
                {tasks.map(task => (
                  <div key={task.id} className="rounded-[3px] border border-border bg-card p-1.5">
                    <div className="text-[7px] text-foreground leading-snug">{task.titulo}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-[6px] font-medium ${task.pColor}`}>{task.prioridad}</span>
                      {task.av !== '—' && (
                        <div className="w-3.5 h-3.5 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-[5px] font-bold text-primary">{task.av[0]}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProjMilestonesTab() {
  return (
    <div className="p-2.5 space-y-2">
      {PROJ_MILESTONES.map((m, i) => (
        <div key={i} className="rounded-[3px] border border-border bg-background p-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-semibold text-foreground">{m.titulo}</span>
            <span className={`text-[7px] font-medium ${m.mColor}`}>
              {m.progreso === 100 ? '✓ Completed' : m.progreso >= 50 ? '↻ In progress' : '○ Pending'}
            </span>
          </div>
          <div className="text-[7px] text-muted-foreground mb-1.5">{m.fecha}</div>
          <div className="h-1.5 bg-surface-secondary/60 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${m.bColor}`} style={{ width: `${m.progreso}%` }} />
          </div>
          <div className="text-[7px] text-muted-foreground mt-0.5">{m.progreso}% completed</div>
        </div>
      ))}
    </div>
  );
}

function ProjScrumPokerTab() {
  const [selected, setSelected] = useState<number | null>(null);
  const cards = [1, 2, 3, 5, 8, 13, 21];
  return (
    <div className="p-2.5 space-y-2">
      <div className="rounded-[3px] border border-border bg-background p-2.5">
        <div className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Story to estimate</div>
        <div className="text-[9px] text-foreground">Implement payment gateway integration</div>
        <div className="text-[7px] text-muted-foreground mt-0.5">4 participants · 2 have voted</div>
      </div>
      <div className="rounded-[3px] border border-border bg-background p-2.5">
        <div className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Your estimate</div>
        <div className="flex gap-1.5 flex-wrap">
          {cards.map(n => (
            <button
              key={n}
              onClick={() => setSelected(n)}
              className={`w-8 h-10 rounded-[3px] border text-[10px] font-bold transition-all ${
                selected === n
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'border-border text-foreground bg-card hover:border-primary/50'
              }`}
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => setSelected(-1)}
            className={`w-8 h-10 rounded-[3px] border text-[9px] font-bold transition-all ${
              selected === -1
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'border-border text-muted-foreground bg-card hover:border-primary/50'
            }`}
          >
            ?
          </button>
        </div>
        {selected !== null && (
          <div className="mt-2 text-[8px] text-success font-medium">
            ✓ Vote recorded: {selected === -1 ? '?' : selected} points
          </div>
        )}
      </div>
      <div className="rounded-[3px] border border-border bg-background p-2">
        <div className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Participants</div>
        <div className="space-y-1">
          {[
            { av:'AG', name:'Alex García',    voted:true  },
            { av:'MS', name:'Maria Santos',   voted:true  },
            { av:'CR', name:'Carlos Ramírez', voted:false },
            { av:'AL', name:'Ana López',      voted:false },
          ].map(p => (
            <div key={p.av} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-[6px] font-bold text-primary">{p.av}</span>
                </div>
                <span className="text-[8px] text-foreground">{p.name}</span>
              </div>
              <span className={`text-[7px] ${p.voted ? 'text-success' : 'text-muted-foreground'}`}>
                {p.voted ? '✓ Voted' : '⏳ Waiting'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProjCodeReviewTab() {
  return (
    <div className="p-2.5 space-y-1.5">
      {PROJ_PRS.map(pr => (
        <div key={pr.id} className="rounded-[3px] border border-border bg-background p-2 hover:bg-surface-secondary/20 transition-colors">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[7px] text-muted-foreground font-mono">{pr.id}</span>
                <span className="text-[8px] font-medium text-foreground truncate">{pr.titulo}</span>
              </div>
              <div className="text-[7px] text-muted-foreground font-mono">{pr.rama} → main · {pr.hace}</div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-[7px] font-bold text-primary">{pr.av}</span>
              </div>
              <span className={`text-[7px] px-1.5 py-0.5 rounded-[3px] font-medium ${
                pr.merged ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
              }`}>
                {pr.estado}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProjRepositoriosTab() {
  return (
    <div className="p-2.5 space-y-2">
      <div className="rounded-[3px] border border-border bg-background p-2.5">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[9px] font-semibold text-foreground">GitHub</div>
          <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-success/15 text-success font-medium">● Connected</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-[3px] bg-surface-secondary/40 border border-border/50">
          <Github className="w-4 h-4 text-foreground shrink-0" />
          <div className="min-w-0">
            <div className="text-[9px] font-medium text-foreground">react-ecommerce-platform</div>
            <div className="text-[7px] text-muted-foreground">alexdev2024 / react-ecommerce-platform · main</div>
          </div>
        </div>
        <div className="mt-2 space-y-0.5">
          <div className="text-[7px] text-muted-foreground font-semibold uppercase tracking-wide mb-1.5">Recent commits</div>
          {[
            { hash:'a3f8c2', msg:'feat: add payment gateway middleware',   time:'2h ago', av:'AG' },
            { hash:'9b2d14', msg:'fix: cart state reset on navigation',    time:'1d ago', av:'CR' },
            { hash:'7e5f31', msg:'style: responsive breakpoints mobile',   time:'2d ago', av:'AL' },
          ].map(c => (
            <div key={c.hash} className="flex items-center gap-2 py-0.5 border-b border-border/30 last:border-0">
              <span className="text-[7px] font-mono text-primary">{c.hash}</span>
              <span className="text-[7px] text-foreground truncate flex-1">{c.msg}</span>
              <span className="text-[6px] text-muted-foreground shrink-0">{c.time}</span>
              <div className="w-3.5 h-3.5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-[5px] font-bold text-primary">{c.av}</span>
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
      <div className="text-center pt-1">
        <button className="text-[8px] text-primary hover:underline">+ Add member</button>
      </div>
    </div>
  );
}

function ProjConfiguracionTab() {
  return (
    <div className="p-2.5">
      <div className="rounded-[3px] border border-border bg-background p-2.5 space-y-2.5 max-w-sm">
        <div>
          <label className="block text-[8px] font-semibold text-foreground mb-1">Project stage</label>
          <div className="h-7 bg-surface-secondary border border-border rounded-[3px] px-2.5 flex items-center justify-between text-[8px] text-foreground">
            In progress<span className="text-muted-foreground">▾</span>
          </div>
        </div>
        <div>
          <label className="block text-[8px] font-semibold text-foreground mb-1">Delivery date</label>
          <div className="h-7 bg-surface-secondary border border-border rounded-[3px] px-2.5 flex items-center justify-between text-[8px] text-foreground">
            7 Jun 2026<Calendar className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>
        <div>
          <label className="block text-[8px] font-semibold text-foreground mb-1">Description</label>
          <div className="h-14 bg-surface-secondary border border-border rounded-[3px] px-2.5 py-1.5 text-[7px] text-muted-foreground leading-relaxed overflow-hidden">
            Full redesign of the e-commerce platform including new checkout flow, mobile optimization and payment gateway integration.
          </div>
        </div>
        <div className="flex items-center justify-between pt-1">
          <button className="text-[8px] text-destructive/70 hover:text-destructive transition-colors">Delete project</button>
          <button className="h-7 px-3 bg-primary text-primary-foreground rounded-[3px] text-[8px] font-medium">Save changes</button>
        </div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[3px] border border-primary/20 bg-primary/10 text-primary text-[11px] font-medium">
            <Briefcase className="w-3 h-3" />
            Project workspace — all tools in one place
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground leading-snug">
            One project.{' '}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              All your tools.
            </span>
          </h2>
          <p className="text-[13px] text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Backlog, timeline, sprints, boards, milestones, code review and your team — everything inside a single project workspace.
          </p>

          {/* Tab pills */}
          <div className="flex flex-wrap justify-center gap-1.5">
            {PROJECT_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-[4px] text-[11px] font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
                }`}
              >
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
          <AppFrame url={`app.yemoda.io/proyectos/e-commerce${activeTab !== 'resumen' ? `?tab=${activeTab}` : ''}`}>
            <div className="flex flex-col bg-background overflow-hidden" style={{ height: 520 }}>

              {/* App topbar */}
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-card/80 shrink-0">
                <div className="flex items-center gap-1 text-[8px] text-muted-foreground min-w-0">
                  <span className="hover:text-foreground cursor-pointer transition-colors">Projects</span>
                  <ChevronRight className="w-2.5 h-2.5 shrink-0" />
                  <span className="text-foreground font-medium truncate">E-Commerce Redesign</span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="flex items-center gap-1 text-[8px] text-muted-foreground bg-surface-secondary/60 border border-border/50 rounded-[3px] px-2 py-0.5">
                    <Activity className="w-2.5 h-2.5" /> Search...
                  </div>
                  <div className="relative">
                    <Bell className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full text-[5px] text-white flex items-center justify-center font-bold">3</span>
                  </div>
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <span className="text-[7px] font-bold text-primary-foreground">C</span>
                  </div>
                </div>
              </div>

              {/* CommandBar */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border bg-card/60 shrink-0">
                <button className="flex items-center gap-1 text-[8px] text-muted-foreground px-2 py-0.5 rounded-[3px] border border-border hover:text-foreground transition-colors">
                  ← Back
                </button>
                <button className="flex items-center gap-1 text-[8px] text-muted-foreground px-2 py-0.5 rounded-[3px] border border-border hover:text-foreground transition-colors">
                  ↺ Refresh
                </button>
                <button className="flex items-center gap-1 text-[8px] text-muted-foreground px-2 py-0.5 rounded-[3px] border border-border hover:text-foreground transition-colors">
                  <Users className="w-2.5 h-2.5" /> Assign owner
                </button>
                <div className="ml-auto text-[7px] px-2 py-0.5 rounded-[3px] bg-warning/15 text-warning font-semibold border border-warning/30">
                  ● In progress
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

              {/* ADO tab bar */}
              <div className="flex border-b border-border bg-card/40 shrink-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {PROJECT_TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-2.5 py-2 text-[8px] font-medium whitespace-nowrap transition-colors shrink-0 border-b-2 ${
                      activeTab === tab.id
                        ? 'border-primary text-primary bg-primary/5'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-secondary/30'
                    }`}
                  >
                    {tab.label}{tab.count != null ? ` ${tab.count}` : ''}
                  </button>
                ))}
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

// ── Code Review Showcase ─────────────────────────────────────────────────────

type DiffLineType = 'header' | 'add' | 'remove' | 'context';
interface MockDiffLine { type: DiffLineType; content: string; }

const MOCK_DIFF: MockDiffLine[] = [
  { type: 'header',  content: "@@ -8,7 +8,14 @@ import type { Project } from './types';" },
  { type: 'context', content: ' export function calculateProjectHealth(' },
  { type: 'context', content: '   project: Project,' },
  { type: 'context', content: '   tasks: Task[],' },
  { type: 'context', content: ' ): ProjectHealth {' },
  { type: 'remove',  content: "-  const completion = tasks.filter(t => t.status === 'done').length / tasks.length;" },
  { type: 'remove',  content: "-  if (completion < 0.3) return 'at_risk';" },
  { type: 'add',     content: "+  if (tasks.length === 0) return 'unknown';" },
  { type: 'add',     content: "+  const done = tasks.filter(t => t.status === 'done').length;" },
  { type: 'add',     content: "+  const blocked = tasks.filter(t => t.status === 'blocked').length;" },
  { type: 'add',     content: '+  const completion = done / tasks.length;' },
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

const MOCK_ALERTS_CR = [
  { id: 1, tipo: 'danger',  titulo: 'API Gateway timeout',    proyecto: 'Phoenix Backend',     tiempo: '5m ago',  detalle: 'Avg latency 2.3s in prod' },
  { id: 2, tipo: 'warning', titulo: 'Sprint behind schedule', proyecto: 'Dashboard Analytics', tiempo: '1h ago',  detalle: '4 overdue tasks'          },
  { id: 3, tipo: 'success', titulo: 'PR merged successfully', proyecto: 'Mobile App v2',       tiempo: '2h ago',  detalle: 'feat: health score · 6 files' },
  { id: 4, tipo: 'warning', titulo: 'Budget at 87%',          proyecto: 'Client Portal',       tiempo: '3h ago',  detalle: 'Overrun projected'        },
  { id: 5, tipo: 'info',    titulo: 'New member added',       proyecto: 'Core Platform',       tiempo: '4h ago',  detalle: 'Maria G. → Developer'     },
];

interface AiFixDemoFile {
  path: string;
  warnings: string[];
  sourceCode: string[];
  aiDiff: MockDiffLine[];
  summary: string;
}

const AI_FIX_DEMO_FILES: AiFixDemoFile[] = [
  {
    path: 'backend/api/auth.py',
    warnings: [
      'CRITICAL: incomplete docstring between lines 76-83',
      'WARNING: payload validation mixed with documentation comment',
      'WARNING: inconsistent error responses for missing fields',
    ],
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
      '    return {"token": auth_service.issue_token(user)}',
    ],
    aiDiff: [
      { type: 'header', content: '@@ -1,11 +1,20 @@ def login(request):' },
      { type: 'remove', content: '-    """Validate security-sensitive' },
      { type: 'remove', content: '-    configuration values.)' },
      { type: 'add', content: '+    """Authenticate a user and return an auth token."""' },
      { type: 'context', content: '     email = request.json.get("email")' },
      { type: 'context', content: '     password = request.json.get("password")' },
      { type: 'remove', content: '-    if not email or not password:' },
      { type: 'remove', content: '-        return {"message": "missing credentials"}' },
      { type: 'add', content: '+    if not email or not password:' },
      { type: 'add', content: '+        return {"message": "Missing required fields"}, 400' },
      { type: 'context', content: '     user = auth_service.find_user(email)' },
      { type: 'context', content: '     if not user:' },
      { type: 'remove', content: '-        return {"message": "invalid credentials"}' },
      { type: 'add', content: '+        return {"message": "Invalid credentials"}, 401' },
    ],
    summary: 'The AI fixes the docstring syntax and normalizes 400 and 401 responses without touching business logic.',
  },
  {
    path: 'backend/api/routes.py',
    warnings: [
      'CRITICAL: admin endpoint without role verification',
      'WARNING: missing Authorization header validation',
    ],
    sourceCode: [
      'def list_admin_reports(request):',
      '    token = request.headers.get("Authorization")',
      '    user = auth_service.user_from_token(token)',
      '    return report_service.get_all_reports()',
    ],
    aiDiff: [
      { type: 'header', content: '@@ -1,4 +1,11 @@ def list_admin_reports(request):' },
      { type: 'context', content: ' def list_admin_reports(request):' },
      { type: 'context', content: '     token = request.headers.get("Authorization")' },
      { type: 'add', content: '+    if not token:' },
      { type: 'add', content: '+        return {"message": "Authorization header is required"}, 401' },
      { type: 'context', content: '     user = auth_service.user_from_token(token)' },
      { type: 'add', content: '+    if not user or not user.is_admin:' },
      { type: 'add', content: '+        return {"message": "Forbidden"}, 403' },
      { type: 'context', content: '     return report_service.get_all_reports()' },
    ],
    summary: 'The AI adds authorization and admin-role guards so the endpoint no longer exposes sensitive reports.',
  },
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[3px] border border-primary/20 bg-primary/10 text-primary text-[11px] font-medium mb-4">
            <Code2 className="w-3 h-3" />
            Code review integrated with your project
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-3">
            Your commits connected to sprint tasks
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Link pull requests and commits directly to tasks. See project alerts while reviewing every code change.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
        >
          <AppFrame url="app.yemoda.io/proyectos/atlas/code-review">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 bg-surface-secondary/50 border-b border-border">
              <div className="flex items-center gap-2 text-[11px] text-foreground min-w-0 flex-1">
                <GitCommit className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="font-mono font-medium truncate">feat: improve project health score calculation</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">AB</div>
                  a.bravo
                </div>
                <div className="text-[10px] text-muted-foreground border-l border-border pl-3">3 hours ago</div>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-success/10 text-success text-[10px] font-medium">
                  <GitMerge className="w-3 h-3" /> Merged
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-[1.35fr_0.65fr] max-h-[480px]">
              <div className="border-r border-border overflow-y-auto bg-background">
                <div className="sticky top-0 z-10 px-3 py-2 border-b border-border bg-surface-secondary/50 flex items-center gap-2">
                  <FileCode2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="font-mono text-[10px] text-foreground truncate">src/utils/projectHealth.ts</span>
                  <div className="ml-auto flex gap-1.5 text-[9px] shrink-0">
                    <span className="text-success bg-success/10 px-1.5 py-0.5 rounded-[2px] font-medium">+8</span>
                    <span className="text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-[2px] font-medium">−2</span>
                  </div>
                </div>
                <table className="w-full font-mono text-[10px] leading-[18px]">
                  <tbody>
                    {MOCK_DIFF.map((line, i) => (
                      <tr key={i} className={DIFF_ROW_STYLE[line.type]}>
                        <td className="w-5 text-center select-none text-[9px] border-r border-border/30 text-muted-foreground/50 px-1 shrink-0">
                          {line.type === 'add' ? '+' : line.type === 'remove' ? '−' : ''}
                        </td>
                        <td className="px-3 whitespace-pre">{line.content}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col overflow-hidden bg-background">
                <div className="px-4 py-2.5 border-b border-border bg-card/60 shrink-0 flex items-center justify-between">
                  <div className="text-[11px] font-semibold text-foreground">Project alerts</div>
                  <div className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-warning/15 text-warning">{MOCK_ALERTS_CR.length} active</div>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-border">
                  {MOCK_ALERTS_CR.map((a) => (
                    <div key={a.id} className="px-4 py-3 hover:bg-surface-secondary/30 transition-colors">
                      <div className="flex items-start gap-2.5">
                        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${ALERT_DOT[a.tipo]}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="text-[11px] font-medium text-foreground leading-tight truncate">{a.titulo}</div>
                            <div className="text-[9px] text-muted-foreground shrink-0">{a.tiempo}</div>
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{a.proyecto}</div>
                          <div className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">{a.detalle}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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

export function AiFixShowcase() {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const selectedFile = AI_FIX_DEMO_FILES[selectedFileIndex];

  return (
    <section className="container mx-auto px-6 py-24 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[3px] border border-primary/20 bg-primary/10 text-primary text-[11px] font-medium mb-4">
          <Sparkles className="w-3 h-3" />
          AI Fix workflow demo
        </div>
        <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-3">
          Resolve warnings with AI, then approve and push
        </h2>
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          The same flow your team uses in product: select warnings, send context to AI, inspect unified diff output, and approve only when changes are safe.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
      >
        <AppFrame url="app.yemoda.io/proyectos/atlas/tasks/51/ai-fix">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border bg-surface-secondary/50">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Task branch</div>
              <div className="text-[12px] font-semibold text-foreground truncate">51-auth-hardening</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button className="text-[10px] px-2.5 py-1 rounded-[3px] border border-border text-muted-foreground">Copy prompt</button>
              <button className="text-[10px] px-2.5 py-1 rounded-[3px] bg-primary text-primary-foreground font-medium">Send to AI</button>
            </div>
          </div>

          <div className="grid lg:grid-cols-[0.85fr_1.2fr_1fr] max-h-[520px]">
            <div className="border-r border-border bg-card/40 overflow-y-auto">
              <div className="sticky top-0 z-10 px-3 py-2 border-b border-border bg-card/80">
                <div className="text-[11px] font-semibold text-foreground">Warnings and links</div>
                <div className="text-[9px] text-muted-foreground">{selectedFile.warnings.length} selected for this iteration</div>
              </div>
              <div className="p-3 space-y-1.5">
                {selectedFile.warnings.map((warning, index) => (
                  <label key={index} className="flex items-start gap-2 p-2 rounded-[3px] border border-border bg-background">
                    <input type="checkbox" checked readOnly className="mt-0.5 w-3.5 h-3.5 accent-primary shrink-0" />
                    <span className="text-[10px] text-foreground leading-snug">{warning}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="border-r border-border overflow-y-auto bg-background">
              <div className="sticky top-0 z-10 px-3 py-2 border-b border-border bg-card/70">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-foreground">Current code</span>
                  <div className="flex items-center gap-1.5">
                    {AI_FIX_DEMO_FILES.map((file, index) => (
                      <button
                        key={file.path}
                        type="button"
                        onClick={() => setSelectedFileIndex(index)}
                        className={`text-[9px] px-2 py-0.5 rounded-[3px] border transition-colors ${
                          selectedFileIndex === index
                            ? 'bg-primary/10 border-primary/40 text-foreground'
                            : 'border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {file.path.split('/').slice(-1)[0]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="text-[9px] text-muted-foreground font-mono mt-1 truncate">{selectedFile.path}</div>
              </div>

              <table className="w-full font-mono text-[10px] leading-[18px]">
                <tbody>
                  {selectedFile.sourceCode.map((line, index) => (
                    <tr key={index} className="hover:bg-surface-secondary/30">
                      <td className="w-9 text-right pr-2 border-r border-border/50 text-muted-foreground/70 select-none">{index + 1}</td>
                      <td className="px-3 whitespace-pre text-foreground">{line}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="overflow-y-auto bg-background">
              <div className="sticky top-0 z-10 px-3 py-2 border-b border-border bg-card/70">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-foreground">AI response</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-[3px] bg-success/10 text-success">Diff ready</span>
                </div>
                <div className="text-[9px] text-muted-foreground mt-1 leading-relaxed">{selectedFile.summary}</div>
              </div>

              <table className="w-full font-mono text-[10px] leading-[18px]">
                <tbody>
                  {selectedFile.aiDiff.map((line, index) => (
                    <tr key={index} className={DIFF_ROW_STYLE[line.type]}>
                      <td className="w-5 text-center select-none text-[9px] border-r border-border/30 text-muted-foreground/50 px-1">
                        {line.type === 'add' ? '+' : line.type === 'remove' ? '−' : ''}
                      </td>
                      <td className="px-3 whitespace-pre">{line.content}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="sticky bottom-0 px-3 py-2.5 border-t border-border bg-card/85 backdrop-blur-sm flex items-center justify-between gap-2">
                <div className="text-[9px] text-muted-foreground">Persistence is non-blocking. Commit only after approval.</div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button className="text-[10px] px-2.5 py-1 rounded-[3px] border border-border text-muted-foreground">Reject</button>
                  <button className="text-[10px] px-2.5 py-1 rounded-[3px] bg-primary text-primary-foreground font-medium inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Approve and push
                  </button>
                </div>
              </div>
            </div>
          </div>
        </AppFrame>

        <div className="mt-4 text-center text-[11px] text-muted-foreground">
          Interactive mock: switch files, inspect line-numbered source and AI diff, then approve the push.
        </div>
      </motion.div>
    </section>
  );
}
