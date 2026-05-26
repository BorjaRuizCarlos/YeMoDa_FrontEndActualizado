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
  { view: 'proyectos',  icon: Briefcase, label: 'Proyectos' },
  { view: 'reportes',   icon: BarChart3, label: 'Reportes',  section: 'ANÁLISIS' },
  { view: 'alertas',    icon: Bell,      label: 'Alertas',   count: 3, danger: true },
  { view: 'perfil',     icon: User,      label: 'Perfil',    section: 'USUARIO' },
];

const DEMO_PROYECTOS = [
  { id: 1, nombre: 'E-Commerce Redesign',   estado: 'En progreso', progreso: 72, dias: '12d', tareas: '8 de 11' },
  { id: 2, nombre: 'Mobile App v2',          estado: 'En progreso', progreso: 45, dias: '8d',  tareas: '4 de 9'  },
  { id: 3, nombre: 'API Gateway Migration',  estado: 'Planeación',  progreso: 20, dias: '21d', tareas: '2 de 10' },
  { id: 4, nombre: 'Admin Dashboard',        estado: 'Planeación',  progreso: 0,  dias: '30d', tareas: '0 de 6'  },
  { id: 5, nombre: 'Analytics Platform',     estado: 'En progreso', progreso: 88, dias: '4d',  tareas: '7 de 8'  },
];

const DEMO_ALERTAS = [
  {
    id: 1, tipo: 'warning',
    titulo: 'Deprecated dependency detected in package.json',
    tarea: 'Project scaffolding review',
    tiempo: 'hace 1d',
    etiqueta: 'Activo',
  },
  {
    id: 2, tipo: 'danger',
    titulo: 'Critical: API endpoint exposed without authentication',
    tarea: 'API Gateway setup task',
    tiempo: 'hace 5h',
    etiqueta: 'Activo',
  },
  {
    id: 3, tipo: 'danger',
    titulo: 'Critical: Missing input validation on checkout form',
    tarea: 'Build checkout flow',
    tiempo: 'hace 2h',
    etiqueta: 'Activo',
  },
];

const PROXIMAS_VENCER = [
  { id: 1, titulo: 'Implement payment gateway',   proyecto: 'E-Commerce Redesign',  tag: 'mañana' },
  { id: 2, titulo: 'Auth flow unit tests',         proyecto: 'Mobile App v2',         tag: 'en 4d'  },
  { id: 3, titulo: 'Load balancer configuration',  proyecto: 'API Gateway Migration', tag: 'en 4d'  },
  { id: 4, titulo: 'User role permissions UI',     proyecto: 'Admin Dashboard',       tag: 'en 6d'  },
];

const TAG_COLOR: Record<string, string> = {
  'mañana': 'bg-warning/15 text-warning',
  'en 4d': 'bg-primary/15 text-primary',
  'en 6d': 'bg-info/15 text-info',
};

const ALERT_DOT: Record<string, string> = {
  danger: 'bg-destructive',
  warning: 'bg-warning',
  success: 'bg-success',
  info: 'bg-info',
};

const VIEW_LABEL: Record<DemoView, string> = {
  dashboard: 'Dashboard',
  proyectos: 'Proyectos',
  reportes:  'Reportes',
  alertas:   'Alertas',
  perfil:    'Perfil',
};

// ── Dashboard view ───────────────────────────────────────────────────────────

function DashboardView({ onNavigate }: { onNavigate: (v: DemoView) => void }) {
  const kpis = [
    { label: 'PROYECTOS',   value: '5',  sub: 'activos',           tone: 'primary' },
    { label: 'TAREAS',      value: '34', sub: 'en tus proyectos',  tone: 'info'    },
    { label: 'COMPLETADAS', value: '21', sub: 'tareas terminadas',  tone: 'success' },
    { label: 'PENDIENTES',  value: '13', sub: 'tareas abiertas',   tone: 'warning' },
    { label: 'VENCIDAS',    value: '3',  sub: 'requieren atención', tone: 'muted'   },
    { label: 'WARNINGS',    value: '2',  sub: 'alertas activas',   tone: 'danger'  },
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
      {/* Hola */}
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground">Hola, <span className="font-semibold text-foreground">Alex</span></span>
        <button className="text-[8px] flex items-center gap-1 px-2 py-0.5 rounded-[3px] border border-border text-muted-foreground">
          ↻ Actualizar
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

      {/* Salud + Próximas */}
      <div className="grid grid-cols-2 gap-1.5">
        {/* Salud del Portafolio */}
        <div className="rounded-[3px] border border-border bg-background p-2">
          <div className="text-[8px] font-semibold text-foreground mb-1.5">Salud del Portafolio</div>
          <div className="flex items-center justify-center py-2">
            <div className="relative w-14 h-14">
              <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="hsl(var(--warning))" strokeWidth="4" strokeDasharray="88 100" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[11px] font-bold text-foreground">5</span>
                <span className="text-[7px] text-muted-foreground">proyectos</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[7px] text-warning mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
            En riesgo · 5 - 100%
          </div>
        </div>

        {/* Próximas a vencer */}
        <div className="rounded-[3px] border border-border bg-background p-2 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[8px] font-semibold text-foreground">Próximas a Vencer</div>
            <span className="text-[7px] text-muted-foreground">7 en 7 días</span>
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

      {/* Mis proyectos */}
      <div className="rounded-[3px] border border-border bg-background p-2">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[8px] font-semibold text-foreground">Mis Proyectos</div>
          <button onClick={() => onNavigate('proyectos')} className="text-[7px] text-primary hover:underline flex items-center gap-0.5">
            Ver todos <ChevronRight className="w-2 h-2" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {DEMO_PROYECTOS.slice(0, 4).map((p) => (
            <div key={p.id} className="rounded-[3px] border border-border bg-card/50 px-2 py-1.5">
              <p className="text-[8px] font-medium text-foreground truncate">{p.nombre}</p>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[7px] text-muted-foreground">{p.tareas} tareas</span>
                <span className="text-[7px] text-success font-medium">Al día</span>
              </div>
            </div>
          ))}
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
          <div className="text-[11px] font-semibold text-foreground">Proyectos</div>
          <div className="text-[9px] text-muted-foreground">Busca, filtra y ordena proyectos activos por fecha de entrega.</div>
        </div>
        <button className="text-[9px] px-2 py-1 rounded-[3px] bg-primary text-primary-foreground font-medium">+ Nuevo Proyecto</button>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border bg-card/30 shrink-0">
        <span className="text-[8px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">Todos 5</span>
        <span className="text-[8px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">Planeación 5</span>
      </div>
      <div className="overflow-y-auto flex-1">
        <table className="w-full text-[9px]">
          <thead>
            <tr className="border-b border-border bg-surface-secondary/30">
              <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">PROYECTO</th>
              <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">ESTADO</th>
              <th className="text-right px-2 py-1.5 text-muted-foreground font-medium">SALUD</th>
              <th className="text-right px-2 py-1.5 text-muted-foreground font-medium">FECHA FIN</th>
              <th className="text-right px-3 py-1.5 text-muted-foreground font-medium">TIEMPO REST.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {DEMO_PROYECTOS.map((p) => (
              <tr key={p.id} className="hover:bg-surface-secondary/20 transition-colors">
                <td className="px-3 py-2 text-foreground font-medium truncate max-w-[120px]">{p.nombre}</td>
                <td className="px-2 py-2">
                  <span className="px-1.5 py-0.5 rounded-[3px] border border-border/60 text-muted-foreground bg-surface-secondary/30">● {p.estado}</span>
                </td>
                <td className="px-2 py-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-muted-foreground">0%</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                  </div>
                </td>
                <td className="px-2 py-2 text-right text-muted-foreground">31 may 2026</td>
                <td className="px-3 py-2 text-right text-warning font-semibold">{p.dias}</td>
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
    { nombre: 'API Gateway Migration',  salud: '20%', vencidas: '2 vencidas' },
    { nombre: 'Admin Dashboard',        salud: '0%',  vencidas: '0 vencidas' },
    { nombre: 'Mobile App v2',          salud: '45%', vencidas: '1 vencida'  },
    { nombre: 'E-Commerce Redesign',    salud: '72%', vencidas: '1 vencida'  },
    { nombre: 'Analytics Platform',     salud: '88%', vencidas: '0 vencidas' },
  ];
  return (
    <div className="flex flex-col h-full overflow-y-auto p-2.5 space-y-2">
      {/* Cabecera salud */}
      <div className="rounded-[3px] border border-warning/30 bg-warning/5 p-2.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[7px] px-1.5 py-0.5 rounded-[3px] bg-warning/15 text-warning font-semibold uppercase tracking-wider">Requiere Atención</span>
          <span className="text-[8px] text-muted-foreground">5 proyectos</span>
        </div>
        <div className="text-[22px] font-bold text-foreground leading-none mb-1">48% <span className="text-[9px] font-normal text-muted-foreground">SALUD DEL PORTAFOLIO</span></div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-[8px] text-muted-foreground">
            <TrendingDown className="w-2.5 h-2.5 text-destructive shrink-0" />
            Velocidad −18% vs periodo anterior
          </div>
          <div className="flex items-center gap-1 text-[8px] text-muted-foreground">
            <TrendingDown className="w-2.5 h-2.5 text-warning shrink-0" />
            Tasa de completado 62% bajo la meta de 80%
          </div>
          <div className="flex items-center gap-1 text-[8px] text-muted-foreground">
            <AlertTriangle className="w-2.5 h-2.5 text-warning shrink-0" />
            Hay 2 warnings activos sin resolver
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: 'TOTAL TAREAS',  value: '7',  sub: 'tareas registradas', dot: 'bg-info'       },
          { label: 'COMPLETADAS',   value: '2',  sub: '29% del total',      dot: 'bg-destructive'},
          { label: 'PENDIENTES',    value: '5',  sub: 'tareas por completar',dot:'bg-warning'    },
          { label: 'VENCIDAS',      value: '0',  sub: 'pasaron su fecha',    dot: 'bg-success'   },
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

      {/* Tendencia + Atención */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-[3px] border border-border bg-background p-2">
          <div className="text-[8px] text-muted-foreground uppercase tracking-wider mb-0.5">Tendencia · 2 Semanas</div>
          <div className="text-[9px] font-semibold text-foreground mb-1.5">Tareas completadas por semana</div>
          {/* Mini sparkline */}
          <svg viewBox="0 0 120 40" className="w-full h-10">
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity="0.3" />
                <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path d="M0 8 L120 36" stroke="hsl(var(--destructive))" strokeWidth="1.5" fill="none" />
            <path d="M0 8 L120 36 L120 40 L0 40 Z" fill="url(#grad)" />
            <text x="0" y="38" className="text-[7px]" fill="hsl(var(--muted-foreground))" fontSize="7">24 may</text>
            <text x="90" y="38" fill="hsl(var(--muted-foreground))" fontSize="7">31 may</text>
            <text x="45" y="6" fill="hsl(var(--destructive))" fontSize="7" fontWeight="bold">−100%</text>
          </svg>
        </div>
        <div className="rounded-[3px] border border-border bg-background p-2">
          <div className="text-[8px] font-semibold text-foreground mb-1.5">Atención Prioritaria</div>
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
        <button className="text-[8px] flex items-center gap-1 px-2 py-0.5 rounded-[3px] border border-border text-muted-foreground">↻ Refrescar</button>
        <span className="text-[8px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">Todos 3</span>
        <span className="text-[8px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">Activos 3</span>
        <span className="text-[8px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">Resueltos 0</span>
      </div>
      <div className="flex items-center gap-4 px-3 py-1.5 border-b border-border/50 bg-background/30 shrink-0 text-[8px] text-muted-foreground">
        <span className="text-warning font-medium">▲ 3 activos</span>
        <span>○ 0 resueltos</span>
        <span>◎ 3 total</span>
      </div>
      <div className="px-3 py-1.5 border-b border-border/30 shrink-0">
        <span className="text-[8px] text-muted-foreground font-medium uppercase tracking-wider">Ayer</span>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-border/50">
        {DEMO_ALERTAS.map((a) => (
          <div key={a.id} className="px-3 py-2.5 hover:bg-surface-secondary/20 transition-colors">
            <div className="flex items-start gap-2">
              <input type="checkbox" className="mt-0.5 w-3 h-3 shrink-0 accent-primary" readOnly />
              <AlertTriangle className={`w-3 h-3 mt-0.5 shrink-0 ${a.tipo === 'danger' ? 'text-destructive' : 'text-warning'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-foreground leading-tight line-clamp-2">{a.titulo}</p>
                <p className="text-[8px] text-muted-foreground mt-0.5 truncate">↗ Tarea: {a.tarea} · {a.tiempo}</p>
              </div>
              <span className="text-[7px] px-1.5 py-0.5 rounded-[3px] bg-primary/15 text-primary font-medium shrink-0">● {a.etiqueta}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Perfil view ──────────────────────────────────────────────────────────────

function PerfilView() {
  return (
    <div className="flex flex-col h-full overflow-y-auto p-2.5 space-y-2">
      <div className="text-[11px] font-semibold text-foreground">Mi Perfil</div>

      <div className="grid grid-cols-2 gap-2">
        {/* Info personal */}
        <div className="rounded-[3px] border border-border bg-background p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-semibold text-foreground">Información Personal</span>
            <button className="text-[7px] px-1.5 py-0.5 rounded-[3px] bg-primary text-primary-foreground">Editar</button>
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
              { icon: User, label: 'Nombre',  val: 'Alex García' },
              { icon: Activity, label: 'Correo', val: 'alex.garcia@techco.io' },
              { icon: CheckCircle2, label: 'Rol', val: 'Tech Lead' },
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

        {/* Preferencias + integraciones */}
        <div className="space-y-2">
          <div className="rounded-[3px] border border-border bg-background p-2">
            <div className="text-[9px] font-semibold text-foreground mb-1.5">Preferencias</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-[8px] text-foreground">Tema — Oscuro</span>
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
                  <p className="text-[8px] text-success font-medium">● Ya estás conectado</p>
                  <p className="text-[7px] text-muted-foreground">alexdev2024</p>
                </div>
              </div>
              <button className="text-[7px] px-1.5 py-0.5 rounded-[3px] border border-destructive/40 text-destructive">Desconectar</button>
            </div>
          </div>

          <div className="rounded-[3px] border border-border bg-background p-2">
            <div className="text-[9px] font-semibold text-foreground mb-1.5">Microsoft Azure</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Cloud className="w-3 h-3 text-muted-foreground" />
                <span className="text-[8px] text-muted-foreground">Conectar Azure</span>
              </div>
              <button className="text-[7px] px-1.5 py-0.5 rounded-[3px] bg-primary text-primary-foreground">Acceder</button>
            </div>
          </div>
        </div>
      </div>

      {/* Mis proyectos table */}
      <div className="rounded-[3px] border border-border bg-background p-2">
        <div className="text-[9px] font-semibold text-foreground mb-1.5">Mis Proyectos</div>
        <table className="w-full text-[8px]">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left pb-1 text-muted-foreground font-medium">PROYECTO</th>
              <th className="text-left pb-1 text-muted-foreground font-medium">ESTADO</th>
              <th className="text-right pb-1 text-muted-foreground font-medium">FECHA FIN</th>
              <th className="text-right pb-1 text-muted-foreground font-medium">DÍAS REST.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {DEMO_PROYECTOS.slice(0, 3).map((p) => (
              <tr key={p.id}>
                <td className="py-1 text-foreground truncate max-w-[90px]">{p.nombre}</td>
                <td className="py-1 text-muted-foreground">● {p.estado}</td>
                <td className="py-1 text-right text-muted-foreground">31 may 2026</td>
                <td className="py-1 text-right text-warning font-semibold">{p.dias}</td>
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

        {/* Texto */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="space-y-5 text-center max-w-2xl w-full"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[3px] border border-primary/20 bg-primary/10 text-primary text-[11px] font-medium">
            <Sparkles className="w-3 h-3" />
            Demo interactiva — explore the platform
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
                    Buscar... Ctrl K
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
  { id: 2, tipo: 'warning', titulo: 'Sprint retrasado',       proyecto: 'Dashboard Analytics', tiempo: '1h ago',  detalle: '4 tareas vencidas'        },
  { id: 3, tipo: 'success', titulo: 'PR merged exitosamente', proyecto: 'Mobile App v2',       tiempo: '2h ago',  detalle: 'feat: health score · 6 archivos' },
  { id: 4, tipo: 'warning', titulo: 'Presupuesto al 87%',     proyecto: 'Client Portal',       tiempo: '3h ago',  detalle: 'Proyección de desvío'     },
  { id: 5, tipo: 'info',    titulo: 'Nuevo miembro agregado', proyecto: 'Core Platform',       tiempo: '4h ago',  detalle: 'Maria G. → Developer'     },
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
                <div className="text-[10px] text-muted-foreground border-l border-border pl-3">hace 3 horas</div>
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
                  <div className="text-[11px] font-semibold text-foreground">Alertas del proyecto</div>
                  <div className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-warning/15 text-warning">{MOCK_ALERTS_CR.length} activas</div>
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
                    2 alertas críticas requieren acción
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
