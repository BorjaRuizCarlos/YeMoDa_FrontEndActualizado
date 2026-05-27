import { useMemo, useState } from 'react';
import { differenceInCalendarDays, format, startOfMonth, addMonths, startOfWeek, addWeeks } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { CheckCircle2, Circle, Loader2, Target } from 'lucide-react';
import { useApiBoardColumns, useApiSprints, useApiTasks } from '../hooks/useProjectData';
import type { ApiTask } from '../../services';

type ZoomLevel = 'day' | 'week' | 'month';

function daysBetween(a: Date, b: Date) {
  return differenceInCalendarDays(b, a);
}

function parseTaskDate(value?: string | null): Date | null {
  if (!value) return null;
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getTaskStart(task: ApiTask): Date | null {
  return parseTaskDate(task.start_date) ?? parseTaskDate(task.created_at) ?? parseTaskDate(task.due_date);
}

function getTaskEnd(task: ApiTask): Date | null {
  return parseTaskDate(task.due_date) ?? getTaskStart(task);
}

function sortTasks(tasks: ApiTask[]) {
  return tasks
    .filter((task) => getTaskStart(task) && getTaskEnd(task))
    .slice()
    .sort((a, b) => {
      const aStart = (getTaskStart(a) as Date).getTime();
      const bStart = (getTaskStart(b) as Date).getTime();
      if (aStart !== bStart) return aStart - bStart;
      const aDue = (getTaskEnd(a) as Date).getTime();
      const bDue = (getTaskEnd(b) as Date).getTime();
      if (aDue !== bDue) return aDue - bDue;
      return a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
    });
}

const DEFAULT_BAR_COLOR = '#0A5F38';
const SPRINT_BAR_COLORS = ['#1D4ED8', '#9333EA', '#D97706', '#0EA5A4', '#DC2626', '#4D7C0F'];

export function Timeline({ projectId, projectEndDate }: { projectId: number; projectEndDate?: string | null }) {
  const { data: tasks, loading, statuses } = useApiTasks(undefined, projectId);
  const { data: sprints } = useApiSprints(projectId);
  const { data: boardColumns } = useApiBoardColumns();
  const [zoom, setZoom] = useState<ZoomLevel | null>(null);

  const timelineTasks = useMemo(() => sortTasks(tasks ?? []), [tasks]);

  const statusById = useMemo(() => {
    return new Map((statuses ?? []).map((status) => [status.id_status, status.name]));
  }, [statuses]);

  const sprintColorById = useMemo(() => {
    const sortedSprints = (sprints ?? []).slice().sort((a, b) => {
      const aDate = parseTaskDate(a.start_date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bDate = parseTaskDate(b.start_date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      if (aDate !== bDate) return aDate - bDate;
      return a.id_sprint - b.id_sprint;
    });

    return new Map(
      sortedSprints.map((sprint, index) => [
        sprint.id_sprint,
        SPRINT_BAR_COLORS[index % SPRINT_BAR_COLORS.length],
      ]),
    );
  }, [sprints]);

  const boardColumnNameById = useMemo(() => {
    return new Map((boardColumns ?? []).map((column) => [column.id_column, column.name]));
  }, [boardColumns]);

  const range = useMemo(() => {
    if (timelineTasks.length === 0) return null;
    const starts = timelineTasks.map((task) => getTaskStart(task) as Date);
    const ends = timelineTasks.map((task) => getTaskEnd(task) as Date);
    const min = new Date(Math.min(...starts.map((d) => d.getTime())));
    const max = new Date(Math.max(...ends.map((d) => d.getTime())));
    const projectLimit = parseTaskDate(projectEndDate);
    if (projectLimit && projectLimit.getTime() > max.getTime()) {
      max.setTime(projectLimit.getTime());
    }
    max.setDate(max.getDate() + 2);
    return { min, max, totalDays: Math.max(1, daysBetween(min, max) + 1) };
  }, [timelineTasks, projectEndDate]);

  const effectiveZoom: ZoomLevel = zoom ?? (
    range
      ? range.totalDays > 180 ? 'month'
        : range.totalDays > 60 ? 'week'
        : 'day'
      : 'day'
  );

  const headerBuckets = useMemo(() => {
    if (!range) return [];
    if (effectiveZoom === 'day') {
      return Array.from({ length: range.totalDays }, (_, i) => {
        const d = new Date(range.min);
        d.setDate(d.getDate() + i);
        return { date: d, label: format(d, 'dd'), sublabel: format(d, 'MMM', { locale: enUS }), width: 1 };
      });
    }
    if (effectiveZoom === 'week') {
      const buckets: { date: Date; label: string; sublabel: string; width: number }[] = [];
      let cur = startOfWeek(range.min, { locale: enUS });
      while (cur <= range.max) {
        const weekEnd = addWeeks(cur, 1);
        const effectiveStart = cur < range.min ? range.min : cur;
        const effectiveEnd = weekEnd > range.max ? range.max : weekEnd;
        const daysInRange = Math.max(1, daysBetween(effectiveStart, effectiveEnd));
        buckets.push({
          date: cur,
          label: `W${format(cur, 'w', { locale: enUS })}`,
          sublabel: format(cur, 'MMM', { locale: enUS }),
          width: daysInRange,
        });
        cur = addWeeks(cur, 1);
      }
      return buckets;
    }
    const buckets: { date: Date; label: string; sublabel: string; width: number }[] = [];
    let cur = startOfMonth(range.min);
    while (cur <= range.max) {
      const monthEnd = addMonths(cur, 1);
      const effectiveStart = cur < range.min ? range.min : cur;
      const effectiveEnd = monthEnd > range.max ? range.max : monthEnd;
      const daysInRange = Math.max(1, daysBetween(effectiveStart, effectiveEnd));
      buckets.push({
        date: cur,
        label: format(cur, 'MMM', { locale: enUS }),
        sublabel: format(cur, 'yyyy'),
        width: daysInRange,
      });
      cur = addMonths(cur, 1);
    }
    return buckets;
  }, [range, effectiveZoom]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIndex = range ? daysBetween(range.min, today) : -1;
  const showToday = range ? todayIndex >= 0 && todayIndex < range.totalDays : false;
  const todayPct = showToday && range ? ((todayIndex + 0.5) / range.totalDays) * 100 : 0;

  const pxPerDay = effectiveZoom === 'month' ? 8 : effectiveZoom === 'week' ? 16 : 24;
  const trackMinWidth = Math.max(range ? range.totalDays * pxPerDay : 720, 720);

  if (loading) {
    return (
      <div className="py-10 text-center text-[12px] text-muted-foreground inline-flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading timeline...
      </div>
    );
  }

  if (!range) {
    return (
      <div className="py-12 text-center">
        <Target className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-40" />
        <p className="text-[12px] text-muted-foreground">No dated tasks to display on the timeline.</p>
      </div>
    );
  }

  const ZOOM_LABELS: Record<ZoomLevel, string> = { day: 'Day', week: 'Week', month: 'Month' };
  const ZOOM_LEVELS: ZoomLevel[] = ['day', 'week', 'month'];

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-[6px] border border-border bg-card">
      <div className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-[13px] font-semibold text-foreground">Timeline</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Task history ordered by start and due dates.
          </p>
        </div>
        <div className="flex items-center gap-1">
          {ZOOM_LEVELS.map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => setZoom(zoom === z ? null : z)}
              className={`px-2 h-6 text-[11px] rounded-[3px] border transition-colors ${
                effectiveZoom === z
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40'
              }`}
            >
              {ZOOM_LABELS[z]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-4">
        <div className="min-w-max space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[360px_minmax(0,1fr)] md:items-start">
            <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Task</div>
            <div className="overflow-x-auto scrollbar-app">
              <div className="relative flex w-full" style={{ minWidth: `${trackMinWidth}px` }}>
                {showToday && (
                  <div
                    className="absolute inset-y-0 z-40"
                    style={{ left: `${Math.min(100, Math.max(0, todayPct))}%`, width: '2px', backgroundColor: 'rgba(239,68,68,0.95)' }}
                  />
                )}
                {headerBuckets.map((bucket, index) => {
                  const bucketPct = (bucket.width / range.totalDays) * 100;
                  return (
                    <div
                      key={`${bucket.date.toISOString()}-${index}`}
                      className="border-r border-border/40 py-1 text-center text-[10px] text-muted-foreground shrink-0"
                      style={{ width: `${bucketPct}%`, minWidth: `${bucket.width * pxPerDay}px` }}
                    >
                      <div className="font-medium">{bucket.label}</div>
                      <div className="text-[9px] uppercase">{bucket.sublabel}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {timelineTasks.map((task, index) => {
              const start = getTaskStart(task) as Date;
              const due = getTaskEnd(task) as Date;
              const firstAssignee = task.assigned_users?.[0]?.username ?? 'Unassigned';
              const assigneeExtraCount = Math.max(0, (task.assigned_users?.length ?? 0) - 1);
              const statusName = task.status ? (statusById.get(task.status) ?? `Status ${task.status}`) : 'No status';
              const boardColumnName = boardColumnNameById.get(task.board_column) ?? 'No board assigned';
              const normalizedStatus = statusName.toLowerCase();
              const isDone = Boolean(task.completed_at) || /(done|closed|complet|terminad|resuelt)/.test(normalizedStatus);
              const leftDays = daysBetween(range.min, start);
              const widthDays = Math.max(1, daysBetween(start, due) + 1);
              const leftPct = (leftDays / range.totalDays) * 100;
              const widthPct = (widthDays / range.totalDays) * 100;
              const barColor = task.sprint != null
                ? (sprintColorById.get(task.sprint) ?? DEFAULT_BAR_COLOR)
                : DEFAULT_BAR_COLOR;

              return (
                <div key={task.id_task} className="grid grid-cols-1 gap-2 md:grid-cols-[360px_minmax(0,1fr)] md:items-center md:gap-3">
                  <div className="min-w-0 pr-2 rounded-[4px] border border-border/60 bg-surface-secondary/20 px-2 py-1.5">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="w-5 shrink-0 text-center text-muted-foreground">{index + 1}</span>
                      {isDone ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground">{task.title}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">#{task.id_task}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>
                        {format(start, 'dd MMM yyyy', { locale: enUS })} - {format(due, 'dd MMM yyyy', { locale: enUS })}
                      </span>
                      <span>-</span>
                      <span className="truncate">{firstAssignee}{assigneeExtraCount > 0 ? ` +${assigneeExtraCount}` : ''}</span>
                      <span>-</span>
                      <span className="truncate">{boardColumnName}</span>
                    </div>
                  </div>

                  <div
                    className="relative h-9 overflow-hidden rounded-[4px] border border-border/50 bg-surface-secondary/30"
                    style={{ minWidth: `${trackMinWidth}px` }}
                  >
                    {showToday && (
                      <div
                        className="absolute top-0 bottom-0 z-40"
                        style={{ left: `${Math.min(100, Math.max(0, todayPct))}%`, width: '2px', backgroundColor: 'rgba(239,68,68,0.95)' }}
                      />
                    )}
                    <div
                      className="absolute top-1.5 h-6 rounded-[4px] shadow-sm transition-opacity hover:opacity-90"
                      style={{
                        left: `${Math.max(0, leftPct)}%`,
                        width: `max(18px, ${Math.max((100 / range.totalDays), widthPct)}%)`,
                        backgroundColor: barColor,
                      }}
                      title={task.description ? `${task.title}: ${task.description}` : task.title}
                    >
                      <div className="h-full px-2 text-[10px] leading-6 text-white truncate">
                        {task.title}
                      </div>
                    </div>
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

export default Timeline;
