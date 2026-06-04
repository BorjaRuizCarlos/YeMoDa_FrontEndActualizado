import { useState, useMemo, useEffect } from 'react';
import {
  AlertTriangle, CheckCircle2, Clock, ExternalLink,
  RefreshCw, Loader2, Search, Trash2, CheckSquare, Square,
} from 'lucide-react';
import { toast } from 'sonner';
import { CommandBar } from '../components/CommandBar';
import { StatusBadge } from '../components/StatusBadge';
import { useApiBoards, useApiProjectMembers, useApiTaskWarnings, useApiTasks } from '../hooks/useProjectData';
import { useAuth } from '../context/AuthContext';
import { projectRolesService, tasksService } from '../../services';

type SeverityFilter = 'all' | 'active' | 'resolved';

export default function Alerts() {
  const { user } = useAuth();
  const { data: warnings, loading, refetch } = useApiTaskWarnings();
  const { data: tasks } = useApiTasks();
  const { data: boards } = useApiBoards();
  const currentUserId = useMemo(() => {
    const parsed = Number(user?.id ?? 0);
    return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
  }, [user]);
  const { data: myMemberships } = useApiProjectMembers(undefined, currentUserId ?? undefined);

  const [severity, setSeverity] = useState<SeverityFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWarning, setSelectedWarning] = useState<number | null>(null);
  const [deletingWarningId, setDeletingWarningId] = useState<number | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const boardProjectMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const board of boards ?? []) {
      map.set(board.id_board, board.project);
    }
    return map;
  }, [boards]);

  // Build task lookup
  const taskMap = useMemo(() => {
    const map = new Map<number, { title: string; board: number; project: number | null }>();
    for (const t of tasks ?? []) {
      const boardId = t.board ?? 0;
      map.set(t.id_task, {
        title: t.title,
        board: boardId,
        project: boardProjectMap.get(boardId) ?? null,
      });
    }
    return map;
  }, [tasks, boardProjectMap]);

  // Authoritative per-project delete permission, resolved from the backend my-permissions
  // endpoint (can_delete_tasks) for each project the current user belongs to.
  const [projectDeletePermissions, setProjectDeletePermissions] = useState<Map<number, boolean>>(new Map());

  const myProjectIds = useMemo(
    () => Array.from(new Set((myMemberships ?? []).map((membership) => membership.project))),
    [myMemberships],
  );

  useEffect(() => {
    if (myProjectIds.length === 0) {
      setProjectDeletePermissions(new Map());
      return;
    }
    let cancelled = false;
    Promise.all(
      myProjectIds.map((projectId) =>
        projectRolesService.myPermissions(projectId)
          .then((perms) => [projectId, perms.can_delete_tasks] as const)
          .catch(() => [projectId, false] as const),
      ),
    ).then((entries) => {
      if (!cancelled) setProjectDeletePermissions(new Map(entries));
    });
    return () => { cancelled = true; };
  }, [myProjectIds]);

  const canDeleteWarningInProject = (projectId: number | null) => {
    if (projectId == null) return false;
    return projectDeletePermissions.get(projectId) ?? false;
  };

  const handleDeleteWarning = async (warningId: number, projectId: number | null) => {
    if (!canDeleteWarningInProject(projectId)) {
      toast.error('Your role cannot delete task alerts in this project.');
      return;
    }

    try {
      setDeletingWarningId(warningId);
      await tasksService.deleteWarning(warningId);
      // Optimistic update — no full refetch
      setDeletedIds((prev) => new Set([...prev, warningId]));
      if (selectedWarning === warningId) setSelectedWarning(null);
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(warningId); return n; });
      toast.success('Alert deleted.');
    } catch {
      toast.error('Could not delete alert.');
    } finally {
      setDeletingWarningId(null);
    }
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBulkDeleting(true);
    try {
      await Promise.all(ids.map((id) => tasksService.deleteWarning(id)));
      setDeletedIds((prev) => new Set([...prev, ...ids]));
      setSelectedIds(new Set());
      if (selectedWarning != null && ids.includes(selectedWarning)) setSelectedWarning(null);
      toast.success(`${ids.length} alert${ids.length > 1 ? 's' : ''} deleted.`);
    } catch {
      toast.error('Could not delete some alerts.');
    } finally {
      setBulkDeleting(false);
    }
  };

  // Filtered warnings
  const filtered = useMemo(() => {
    let w = (warnings ?? []).filter((wr) => !deletedIds.has(wr.id_warning));
    if (severity !== 'all') {
      w = w.filter((wr) => wr.status === severity);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      w = w.filter((wr) => {
        const taskTitle = taskMap.get(wr.task)?.title ?? '';
        return wr.message.toLowerCase().includes(q) || taskTitle.toLowerCase().includes(q);
      });
    }
    return w.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [warnings, severity, searchQuery, taskMap, deletedIds]);

  // KPI counts
  const counts = useMemo(() => {
    const all = warnings ?? [];
    return {
      total: all.length,
      active: all.filter((w) => w.status === 'active').length,
      resolved: all.filter((w) => w.status === 'resolved').length,
    };
  }, [warnings]);

  // Format relative time
  const relativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Date grouping
  const dateGroup = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86_400_000);
    const weekAgo = new Date(today.getTime() - 7 * 86_400_000);
    if (d >= today) return 'Today';
    if (d >= yesterday) return 'Yesterday';
    if (d >= weekAgo) return 'This week';
    return 'Earlier';
  };

  const groupedWarnings = useMemo(() => {
    const groups: { label: string; items: typeof filtered }[] = [];
    const seen = new Map<string, typeof filtered>();
    for (const w of filtered) {
      const g = dateGroup(w.created_at);
      if (!seen.has(g)) { seen.set(g, []); groups.push({ label: g, items: seen.get(g)! }); }
      seen.get(g)!.push(w);
    }
    return groups;
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-[13px]">Loading alerts…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <CommandBar
        actions={[
          { label: 'Refresh', icon: <RefreshCw className="w-3.5 h-3.5" />, onClick: () => { setDeletedIds(new Set()); refetch(); } },
          ...(selectedIds.size > 0 ? [{
            label: bulkDeleting ? 'Deleting…' : `Delete ${selectedIds.size} selected`,
            icon: bulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />,
            onClick: () => void handleBulkDelete(),
            variant: 'destructive' as const,
          }] : []),
        ]}
        filters={[
          { label: 'All', active: severity === 'all', count: counts.total, onClick: () => setSeverity('all') },
          { label: 'Active', active: severity === 'active', count: counts.active, onClick: () => setSeverity('active') },
          { label: 'Resolved', active: severity === 'resolved', count: counts.resolved, onClick: () => setSeverity('resolved') },
        ]}
        rightSlot={
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search alerts…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 pl-7 pr-2 text-[12px] bg-card border border-border rounded-[4px] text-foreground placeholder:text-muted-foreground w-48 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto">
        {/* Summary bar */}
        <div className="flex items-center gap-4 px-6 py-3 border-b border-border bg-surface-secondary/50">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-warning" />
            <span className="text-[12px] font-medium text-foreground">{counts.active}</span>
            <span className="text-[11px] text-muted-foreground">active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
            <span className="text-[12px] font-medium text-foreground">{counts.resolved}</span>
            <span className="text-[11px] text-muted-foreground">resolved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[12px] font-medium text-foreground">{counts.total}</span>
            <span className="text-[11px] text-muted-foreground">total</span>
          </div>
        </div>

        {/* Warnings list */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mb-2 opacity-40" />
            <span className="text-[13px]">
              {searchQuery ? 'No results for search' : 'No alerts'}
            </span>
          </div>
        ) : (
          <div>
            {groupedWarnings.map((group) => (
              <div key={group.label}>
                <div className="sticky top-0 z-10 px-6 py-1.5 bg-surface-secondary/80 backdrop-blur-sm border-b border-border">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{group.label}</span>
                </div>
                <div className="divide-y divide-border">
                  {group.items.map((w) => {
              const taskInfo = taskMap.get(w.task);
              const isActive = w.status === 'active';
              const isSelected = selectedWarning === w.id_warning;
              const canDeleteWarning = canDeleteWarningInProject(taskInfo?.project ?? null);
              const isDeleting = deletingWarningId === w.id_warning;
              const isChecked = selectedIds.has(w.id_warning);

              return (
                <div
                  key={w.id_warning}
                  className={`group relative flex items-start gap-3 px-6 py-3 transition-colors hover:bg-accent/50 cursor-pointer ${isSelected ? 'bg-accent/30' : ''}`}
                >
                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedIds((prev) => {
                        const n = new Set(prev);
                        if (n.has(w.id_warning)) n.delete(w.id_warning); else n.add(w.id_warning);
                        return n;
                      });
                    }}
                    className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    {isChecked ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 opacity-40 group-hover:opacity-70" />}
                  </button>

                  {/* Status icon */}
                  <div className="mt-0.5 shrink-0" onClick={() => setSelectedWarning(isSelected ? null : w.id_warning)}>
                    {isActive ? (
                      <AlertTriangle className="w-4 h-4 text-warning" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0" onClick={() => setSelectedWarning(isSelected ? null : w.id_warning)}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[12px] font-medium text-foreground">{w.message}</span>
                        <StatusBadge
                          status={isActive ? 'warning' : 'success'}
                          text={isActive ? 'Active' : 'Resolved'}
                          size="sm"
                        />
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        {taskInfo && (
                          <span className="flex items-center gap-1 truncate max-w-[200px]">
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            Task: {taskInfo.title}
                          </span>
                        )}
                        <span>{relativeTime(w.created_at)}</span>
                        {w.resolved_at && (
                          <span className="text-success">
                            Resolved {relativeTime(w.resolved_at)}
                          </span>
                        )}
                      </div>
                      {/* Expanded detail */}
                      {isSelected && (
                        <div className="mt-2 p-3 bg-card border border-border rounded-[4px] text-[11px] space-y-1">
                          <div><span className="text-muted-foreground">ID:</span> {w.id_warning}</div>
                          <div><span className="text-muted-foreground">Task ID:</span> {w.task}</div>
                          <div><span className="text-muted-foreground">Created:</span> {new Date(w.created_at).toLocaleString('en-US')}</div>
                          {w.resolved_at && (
                            <div><span className="text-muted-foreground">Resolved:</span> {new Date(w.resolved_at).toLocaleString('en-US')}</div>
                          )}
                          {w.resolved_in_push && (
                            <div><span className="text-muted-foreground">Resolution push:</span> #{w.resolved_in_push}</div>
                          )}
                          {!canDeleteWarning && (
                            <div className="text-muted-foreground">Your role cannot delete this alert.</div>
                          )}
                        </div>
                      )}
                    </div>

                  {/* Hover delete button */}
                  {canDeleteWarning && (
                    <button
                      type="button"
                      title="Delete alert"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeleteWarning(w.id_warning, taskInfo?.project ?? null);
                      }}
                      disabled={isDeleting}
                      className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 h-7 px-2 rounded-[4px] border border-destructive/30 bg-destructive/10 text-destructive text-[10px] inline-flex items-center gap-1.5 transition-opacity disabled:opacity-50"
                    >
                      {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      Delete
                    </button>
                  )}
                </div>
              );
            })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
