import { useMemo, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Download, FileDown, RefreshCw, Loader2, TrendingUp, TrendingDown,
  CheckCircle2, AlertTriangle, Clock, ListChecks, ArrowRight, ChevronDown, Check,
} from 'lucide-react';
import { CommandBar } from '../components/CommandBar';
import { ReportExportDialog } from '../components/ReportExportDialog';
import {
  useApiProjects, useApiTasks, useApiTaskWarnings, useApiBoards, useApiProjectMembers,
} from '../hooks/useProjectData';
import { useAuth } from '../context/AuthContext';
import { computeProjectProgress, getProjectHealth, type ProjectHealth } from '../utils/projectHealth';

const COMPLETION_TARGET = 80;

type StatusLevel = 'healthy' | 'attention' | 'risk';
interface KpiCardData {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  status: StatusLevel;
  icon: React.ReactNode;
}
function statusFromHealthMix(reds: number, yellows: number): StatusLevel {
  if (reds > 0) return 'risk';
  if (yellows > 0) return 'attention';
  return 'healthy';
}

function statusBadge(level: StatusLevel) {
  if (level === 'risk') {
    return {
      dot: 'bg-red-500',
      ring: 'ring-red-500/30',
      pill: 'bg-red-500/10 text-red-600 border-red-500/30',
      label: 'AT RISK',
    };
  }
  if (level === 'attention') {
    return {
      dot: 'bg-amber-500',
      ring: 'ring-amber-500/30',
      pill: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
      label: 'REQUIRES ATTENTION',
    };
  }
  return {
    dot: 'bg-emerald-500',
    ring: 'ring-emerald-500/30',
    pill: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    label: 'HEALTHY',
  };
}

function statusLabelByLevel(l: StatusLevel) {
  if (l === 'risk') return 'critical';
  if (l === 'attention') return 'attention';
  return 'healthy';
}

function pctDelta(curr: number, prev: number): string {
  if (prev === 0 && curr === 0) return '0%';
  if (prev === 0) return '+∞';
  const diff = Math.round(((curr - prev) / prev) * 100);
  return `${diff >= 0 ? '+' : ''}${diff}%`;
}

export default function Reports() {
  const { user } = useAuth();
  const currentUserId = Number(user?.id ?? 0);
  const { data: projects, loading: loadingProjects, refetch: refetchProjects } = useApiProjects();
  const { data: tasks, loading: loadingTasks, statuses, priorities, refetch: refetchTasks } = useApiTasks();
  const { data: warnings, refetch: refetchWarnings } = useApiTaskWarnings();
  const { data: boards } = useApiBoards();
  const { data: myMemberships } = useApiProjectMembers(
    undefined,
    Number.isNaN(currentUserId) || currentUserId <= 0 ? undefined : currentUserId,
  );
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const loading = loadingProjects || loadingTasks;
  const refetchAll = () => { refetchProjects(); refetchTasks(); refetchWarnings(); };

  const projectList = projects ?? [];
  const taskList = tasks ?? [];
  const boardList = boards ?? [];
  const warningList = warnings ?? [];

  const accessibleProjectIds = useMemo(() => {
    if (user?.role === 'admin') return new Set(projectList.map((p) => p.id_project));
    const ids = new Set<number>();
    (myMemberships ?? []).forEach((membership) => ids.add(membership.project));
    return ids;
  }, [myMemberships, projectList, user?.role]);

  const accessibleProjects = useMemo(
    () => projectList.filter((project) => accessibleProjectIds.has(project.id_project)),
    [projectList, accessibleProjectIds],
  );

  // Build board→project map for task filtering
  const boardProjectMap = useMemo(() => {
    const m = new Map<number, number>();
    boardList.forEach((b) => m.set(b.id_board, b.project));
    return m;
  }, [boardList]);

  const isTaskAccessible = (task: (typeof taskList)[number]) => {
    if (task.project != null && accessibleProjectIds.has(task.project)) return true;
    const projectId = boardProjectMap.get(task.board ?? 0);
    return projectId != null && accessibleProjectIds.has(projectId);
  };

  const selectedProjectName = useMemo(
    () => accessibleProjects.find((project) => project.id_project === selectedProject)?.name ?? 'All',
    [accessibleProjects, selectedProject],
  );

  // Filter context (single project selection from CommandBar pills)
  const inScopeProjects = useMemo(
    () => (selectedProject ? accessibleProjects.filter((p) => p.id_project === selectedProject) : accessibleProjects),
    [accessibleProjects, selectedProject],
  );

  const filteredTasks = useMemo(() => {
    if (!selectedProject) return taskList.filter(isTaskAccessible);
    return taskList.filter((t) => {
      if (t.project === selectedProject) return true;
      return boardProjectMap.get(t.board ?? 0) === selectedProject;
    });
  }, [taskList, selectedProject, boardProjectMap, accessibleProjectIds]);

  const filteredWarnings = useMemo(() => {
    if (!selectedProject) return warningList.filter((w) => filteredTasks.some((task) => task.id_task === w.task));
    const ids = new Set(filteredTasks.map((t) => t.id_task));
    return warningList.filter((w) => ids.has(w.task));
  }, [warningList, selectedProject, filteredTasks]);

  // ── Per-project health (for hero + ranking) ──
  const projectHealthList = useMemo(() => {
    return inScopeProjects.map((p) => {
      const accessibleTasks = taskList.filter(isTaskAccessible);
      const progress = computeProjectProgress(p.id_project, accessibleTasks, boardList);
      const health = getProjectHealth(p, progress);
      const overdue = accessibleTasks.filter((t) => {
        const belongs = t.project === p.id_project
          || boardProjectMap.get(t.board ?? 0) === p.id_project;
        if (!belongs) return false;
        return !t.completed_at && t.due_date && new Date(t.due_date) < new Date();
      }).length;
      return { project: p, progress, health, overdue };
    });
  }, [inScopeProjects, taskList, boardList, boardProjectMap, accessibleProjectIds]);

  // ── Aggregate KPIs ──
  const kpis = useMemo(() => {
    const now = new Date();
    const total = filteredTasks.length;
    const completed = filteredTasks.filter((t) => t.completed_at != null).length;
    const overdue = filteredTasks.filter((t) => !t.completed_at && t.due_date && new Date(t.due_date) < now).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const completedWithDates = filteredTasks.filter((t) => t.completed_at && t.created_at);
    const avgDays = completedWithDates.length > 0
      ? Math.round(
          completedWithDates.reduce((sum, t) => {
            const c = new Date(t.created_at).getTime();
            const d = new Date(t.completed_at!).getTime();
            return sum + (d - c) / (1000 * 60 * 60 * 24);
          }, 0) / completedWithDates.length,
        )
      : 0;

    const activeWarnings = filteredWarnings.filter((w) => w.status === 'active').length;

    // Distinct active assignees
    const assigneeSet = new Set<number>();
    for (const t of filteredTasks) {
      if (t.completed_at) continue;
      (t.assigned_users ?? []).forEach((u) => assigneeSet.add(u.id_user));
      if (t.assigned_to != null) assigneeSet.add(t.assigned_to);
    }

    return {
      total,
      completed,
      overdue,
      completionRate,
      avgDays,
      activeWarnings,
      activeAssignees: assigneeSet.size,
    };
  }, [filteredTasks, filteredWarnings]);

  // ── Trend: completions per week (from project start) ──
  const MAX_TREND_WEEKS = 26;
  const trendData = useMemo(() => {
    const now = new Date();
    // Earliest start across in-scope projects
    const earliestStart = inScopeProjects.reduce<number | null>((min, p) => {
      if (!p.created_at) return min;
      const t = new Date(p.created_at).getTime();
      return min == null ? t : Math.min(min, t);
    }, null);

    // Anchor to the Monday of the start week (or 8 weeks ago if no project start)
    const startDate = earliestStart != null ? new Date(earliestStart) : new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);
    const dow = startDate.getDay();
    startDate.setDate(startDate.getDate() - dow);

    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const totalWeeks = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / msPerWeek) + 1);
    // Cap to keep chart readable: drop oldest weeks if exceeds max
    const skip = Math.max(0, totalWeeks - MAX_TREND_WEEKS);
    const weeksToShow = totalWeeks - skip;

    const weeks: { label: string; count: number; sortIndex: number }[] = [];
    for (let i = 0; i < weeksToShow; i++) {
      const wStart = new Date(startDate.getTime() + (skip + i) * msPerWeek);
      const wEnd = new Date(wStart.getTime() + msPerWeek);
      const count = filteredTasks.filter((t) => {
        if (!t.completed_at) return false;
        const d = new Date(t.completed_at);
        return d >= wStart && d < wEnd;
      }).length;
      const label = wStart.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
      weeks.push({ label, count, sortIndex: i });
    }
    return weeks;
  }, [filteredTasks, inScopeProjects]);

  // ── Period comparison: second half vs first half of trend range ──
  const periodComparison = useMemo(() => {
    const n = trendData.length;
    if (n === 0) return { recent: 0, prior: 0, delta: '0%' };
    const half = Math.max(1, Math.floor(n / 2));
    const recent = trendData.slice(n - half).reduce((s, w) => s + w.count, 0);
    const prior = trendData.slice(0, n - half).reduce((s, w) => s + w.count, 0);
    return { recent, prior, delta: pctDelta(recent, prior) };
  }, [trendData]);

  // ── Portfolio aggregate stats ──
  const portfolioStats = useMemo(() => {
    const reds = projectHealthList.filter((p) => p.health === 'red').length;
    const yellows = projectHealthList.filter((p) => p.health === 'yellow').length;
    const greens = projectHealthList.filter((p) => p.health === 'green').length;
    const totalProgress = projectHealthList.reduce((sum, p) => sum + p.progress.percentage, 0);
    const healthScore = projectHealthList.length > 0
      ? Math.round(totalProgress / projectHealthList.length)
      : 0;
    const overallStatus: StatusLevel = statusFromHealthMix(reds, yellows);
    return { reds, yellows, greens, healthScore, overallStatus, count: projectHealthList.length };
  }, [projectHealthList]);

  // ── Insights ──
  const insights = useMemo(() => {
    const out: { tone: 'good' | 'warn' | 'bad'; text: string }[] = [];

    // Velocity insight
    if (periodComparison.prior > 0 || periodComparison.recent > 0) {
      const diffNum = periodComparison.recent - periodComparison.prior;
      if (diffNum > 0) {
        out.push({
          tone: 'good',
          text: `Velocity ${periodComparison.delta} vs prior period (${periodComparison.recent} completed in the later half of the range).`,
        });
      } else if (diffNum < 0) {
        out.push({
          tone: 'warn',
          text: `Velocity ${periodComparison.delta} vs prior period — ${Math.abs(diffNum)} fewer tasks completed.`,
        });
      }
    }

    // Completion rate vs target
    if (kpis.total > 0) {
      if (kpis.completionRate >= COMPLETION_TARGET) {
        out.push({
          tone: 'good',
          text: `Completion rate ${kpis.completionRate}% above target (${COMPLETION_TARGET}%).`,
        });
      } else {
        out.push({
          tone: 'warn',
          text: `Completion rate ${kpis.completionRate}% below the target of ${COMPLETION_TARGET}%.`,
        });
      }
    }

    // At-risk projects
    const worst = [...projectHealthList]
      .filter((p) => p.overdue > 0 || p.health === 'red')
      .sort((a, b) => b.overdue - a.overdue)[0];
    if (worst) {
      out.push({
        tone: 'bad',
        text: `"${worst.project.name}" requires attention: ${worst.overdue} ${worst.overdue === 1 ? 'overdue task' : 'overdue tasks'}.`,
      });
    } else if (kpis.activeWarnings > 0) {
      out.push({
        tone: 'warn',
        text: `There are ${kpis.activeWarnings} ${kpis.activeWarnings === 1 ? 'active warning' : 'active warnings'} unresolved.`,
      });
    } else if (projectHealthList.length > 0) {
      out.push({
        tone: 'good',
        text: 'All projects are within schedule and have no critical warnings.',
      });
    }

    return out.slice(0, 3);
  }, [periodComparison, kpis, projectHealthList]);

  // ── KPI cards ──
  const kpiCards: KpiCardData[] = useMemo(() => {
    const pending = Math.max(0, kpis.total - kpis.completed);
    const completedStatus: StatusLevel =
      kpis.total === 0 ? 'attention'
      : kpis.completionRate >= COMPLETION_TARGET ? 'healthy'
      : kpis.completionRate >= 50 ? 'attention'
      : 'risk';
    const pendingStatus: StatusLevel =
      pending === 0 ? 'healthy' : pending <= 10 ? 'attention' : 'risk';
    const overdueStatus: StatusLevel =
      kpis.overdue === 0 ? 'healthy' : kpis.overdue <= 3 ? 'attention' : 'risk';

    return [
      {
        label: 'TOTAL TASKS',
        value: String(kpis.total),
        delta: kpis.total === 1 ? 'task recorded' : 'tasks recorded',
        status: 'healthy',
        icon: <ListChecks className="w-4 h-4" />,
      },
      {
        label: 'COMPLETED',
        value: String(kpis.completed),
        delta: kpis.total > 0 ? `${kpis.completionRate}% of total` : 'no tasks',
        status: completedStatus,
        icon: <CheckCircle2 className="w-4 h-4" />,
      },
      {
        label: 'PENDING',
        value: String(pending),
        delta: pending === 1 ? 'task to complete' : 'tasks to complete',
        status: pendingStatus,
        icon: <Clock className="w-4 h-4" />,
      },
      {
        label: 'OVERDUE',
        value: String(kpis.overdue),
        delta: kpis.overdue === 1 ? 'missed deadline' : 'missed deadlines',
        status: overdueStatus,
        icon: <AlertTriangle className="w-4 h-4" />,
      },
    ];
  }, [kpis]);

  // ── Ranking de proyectos por salud (worst first) ──
  const projectRanking = useMemo(() => {
    const healthOrder: Record<ProjectHealth, number> = { red: 0, yellow: 1, green: 2 };
    return accessibleProjects.map((project) => {
      const accessibleTasks = taskList.filter(isTaskAccessible);
      const progress = computeProjectProgress(project.id_project, accessibleTasks, boardList);
      const health = getProjectHealth(project, progress);
      const overdue = accessibleTasks.filter((task) => {
        const belongs = task.project === project.id_project
          || boardProjectMap.get(task.board ?? 0) === project.id_project;
        if (!belongs) return false;
        return !task.completed_at && task.due_date && new Date(task.due_date) < new Date();
      }).length;
      return { project, progress, health, overdue };
    })
      .sort((a, b) => {
        const h = healthOrder[a.health] - healthOrder[b.health];
        if (h !== 0) return h;
        return a.progress.percentage - b.progress.percentage;
      })
      .slice(0, 5);
  }, [accessibleProjects, taskList, boardList, boardProjectMap, accessibleProjectIds]);

  // ── Project filter pills ──
  const projectDropdown = (
    <div className="relative">
      <button
        type="button"
        onClick={() => setProjectMenuOpen((open) => !open)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] text-[12px] font-medium transition-colors bg-card border border-border text-foreground hover:bg-accent"
      >
        {selectedProjectName}
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      {projectMenuOpen && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-64 max-h-72 overflow-y-auto rounded-[6px] border border-border bg-card shadow-lg py-1">
          <button
            type="button"
            onClick={() => { setSelectedProject(null); setProjectMenuOpen(false); }}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-[12px] hover:bg-accent/40"
          >
            <span>All</span>
            {selectedProject === null && <Check className="w-3.5 h-3.5 text-primary" />}
          </button>
          <div className="my-1 h-px bg-border" />
          {accessibleProjects.length === 0 ? (
            <div className="px-3 py-2 text-[11px] text-muted-foreground">No projects available</div>
          ) : (
            accessibleProjects.map((project) => (
              <button
                key={project.id_project}
                type="button"
                onClick={() => { setSelectedProject(project.id_project); setProjectMenuOpen(false); }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-[12px] hover:bg-accent/40"
              >
                <span className="truncate pr-3">{project.name}</span>
                {selectedProject === project.id_project && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );

  // ── Export CSV (kept as quick action) ──
  const exportCSV = () => {
    // Neutralize spreadsheet formula injection from user-controllable fields.
    const neutralizeCell = (value: string) =>
      /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    const rows = filteredTasks.map((t) => ({
      id: t.id_task,
      title: t.title,
      assigned_to: t.assigned_to ?? '',
      due_date: t.due_date ?? '',
      completed_at: t.completed_at ?? '',
      created_at: t.created_at,
    }));
    const headers = Object.keys(rows[0] ?? {});
    const csv = [
      headers.join(','),
      ...rows.map((r) =>
        headers
          .map((h) => `"${neutralizeCell(String(r[h as keyof typeof r])).replace(/"/g, '""')}"`)
          .join(','),
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `task-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-[13px]">Loading reports…</span>
      </div>
    );
  }

  const hero = statusBadge(portfolioStats.overallStatus);

  return (
    <div className="flex flex-col h-full">
      <CommandBar
        dataTour="reports-toolbar"
        actions={[
          {
            label: 'Download report',
            icon: <FileDown className="w-3.5 h-3.5" />,
            onClick: () => setExportDialogOpen(true),
            variant: 'primary',
          },
          { label: 'Export CSV', icon: <Download className="w-3.5 h-3.5" />, onClick: exportCSV },
          { label: 'Refresh', icon: <RefreshCw className="w-3.5 h-3.5" />, onClick: refetchAll },
        ]}
        afterActionsSlot={projectDropdown}
      />

      <ReportExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        projects={accessibleProjects}
        tasks={filteredTasks}
        statuses={statuses}
        priorities={priorities}
        boards={boardList}
        warnings={warningList}
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* HERO STATUS CARD */}
        <div className={`relative bg-card border border-border rounded-[6px] p-6 ring-1 ${hero.ring}`}>
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex-1 min-w-[260px]">
              <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-[10px] font-bold tracking-wider ${hero.pill}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${hero.dot}`} />
                {hero.label}
              </div>
              <div className="mt-3 flex items-baseline gap-3">
                <div className="text-[44px] leading-none font-bold text-foreground">
                  {portfolioStats.healthScore}%
                </div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wide">
                    Portfolio health
                  </div>
              </div>

              {/* Insights */}
              <div className="mt-4 space-y-1.5">
                {insights.length === 0 ? (
                  <div className="text-[12px] text-muted-foreground">No insights available.</div>
                ) : (
                  insights.map((ins, i) => {
                    const toneColor =
                      ins.tone === 'bad'
                        ? 'text-red-600'
                        : ins.tone === 'warn'
                        ? 'text-amber-600'
                        : 'text-emerald-600';
                    const Icon =
                      ins.tone === 'bad' ? AlertTriangle : ins.tone === 'warn' ? TrendingDown : TrendingUp;
                    return (
                      <div key={i} className="flex items-start gap-2 text-[12px]">
                        <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${toneColor}`} />
                        <span className="text-foreground">{ins.text}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right side stats */}
            <div className="flex flex-col items-end gap-3 text-right min-w-[180px]">
              <div>
                <div className="text-[28px] leading-none font-semibold text-foreground">
                  {portfolioStats.count}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {portfolioStats.count === 1 ? 'project' : 'projects'}
                </div>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-muted-foreground">{portfolioStats.greens} ok</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-muted-foreground">{portfolioStats.yellows} attention</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-muted-foreground">{portfolioStats.reds} risk</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KPI CATEGORY CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpiCards.map((c) => {
            const s = statusBadge(c.status);
            return (
              <div key={c.label} className="bg-card border border-border rounded-[6px] p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-muted-foreground">
                    {c.icon}
                    {c.label}
                  </div>
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} title={statusLabelByLevel(c.status)} />
                </div>
                <div className="text-[26px] font-bold text-foreground leading-tight">{c.value}</div>
                {c.delta && (
                  <div className="text-[11px] text-muted-foreground mt-1">{c.delta}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* TREND CHART + PROJECT RANKING */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 bg-card border border-border rounded-[6px] p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[10px] font-bold tracking-wider text-muted-foreground">
                  TREND · {trendData.length} {trendData.length === 1 ? 'WEEK' : 'WEEKS'}
                </div>
                <div className="text-[14px] font-semibold text-foreground mt-0.5">
                  Tasks completed per week
                </div>
              </div>
              <div className="text-right">
                <div className="text-[20px] font-bold text-foreground leading-none">
                  {periodComparison.recent}
                </div>
                <div className={`text-[11px] font-medium ${
                  periodComparison.recent >= periodComparison.prior ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {periodComparison.delta} vs prior
                </div>
              </div>
            </div>
            {trendData.some((d) => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trendData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <defs>
                    <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D4192C" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#D4192C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      fontSize: '11px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Completed"
                    stroke="#D4192C"
                    strokeWidth={2}
                    fill="url(#trendFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-[12px] text-muted-foreground">
                No tasks completed in this period
              </div>
            )}
          </div>

          {/* Project ranking */}
          <div className="bg-card border border-border rounded-[6px] p-4">
            <div className="text-[10px] font-bold tracking-wider text-muted-foreground mb-3">
                PRIORITY ATTENTION
              </div>
            {projectRanking.length === 0 ? (
              <div className="text-[12px] text-muted-foreground py-4 text-center">
                No projects.
              </div>
            ) : (
              <div className="space-y-2">
                {projectRanking.map(({ project, progress, health, overdue }) => {
                  const dotColor =
                    health === 'red' ? 'bg-red-500' : health === 'yellow' ? 'bg-amber-500' : 'bg-emerald-500';
                  return (
                    <div
                      key={project.id_project}
                      className="flex items-center gap-2.5 py-1.5 border-b border-border last:border-b-0"
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-medium text-foreground truncate">
                          {project.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {progress.percentage}% · {overdue} {overdue === 1 ? 'overdue' : 'overdue'}
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
