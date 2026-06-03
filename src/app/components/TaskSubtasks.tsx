import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Loader2, Check, Trash2, GitBranch, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { tasksService } from '../../services';
import { ApiRequestError } from '../../services/api';
import type { ApiTask, ApiBoardColumn } from '../../services';

interface TaskSubtasksProps {
  /** The task whose subtasks are shown. */
  parentTask: ApiTask;
  projectId?: number;
  canEdit?: boolean;
  /** Board columns grouped by board id — used to resolve the final/open column when toggling. */
  boardColumnsByBoard?: Map<number, ApiBoardColumn[]>;
  /** Called with the refreshed parent task after subtasks change (keeps subtask_progress in sync). */
  onParentRefreshed?: (updated: ApiTask) => void;
}

/**
 * Subtasks panel for a task. Subtasks are full tasks linked via `parent`, so completing
 * one means moving it to the board's final column (matching the backend's completion rule).
 */
export function TaskSubtasks({
  parentTask,
  projectId,
  canEdit = true,
  boardColumnsByBoard,
  onParentRefreshed,
}: TaskSubtasksProps) {
  const parentId = parentTask.id_task;

  const [subtasks, setSubtasks] = useState<ApiTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  // Set when completing the LAST open subtask → confirmation modal before triggering AI.
  const [confirmSub, setConfirmSub] = useState<ApiTask | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  // All column groups; used to locate the board a given column belongs to.
  const boardGroups = useMemo(
    () => (boardColumnsByBoard ? Array.from(boardColumnsByBoard.values()) : []),
    [boardColumnsByBoard],
  );

  const colsForColumnId = useCallback(
    (columnId: number | null | undefined): ApiBoardColumn[] => {
      if (columnId != null) {
        const match = boardGroups.find((cols) => cols.some((c) => c.id_column === columnId));
        if (match) return match;
      }
      return boardGroups[0] ?? [];
    },
    [boardGroups],
  );

  // Where new subtasks land: the first open (non-final) column of the parent's board.
  const firstOpenColumnId = useMemo(() => {
    const cols = colsForColumnId(parentTask.board_column);
    return cols.find((c) => !c.is_final)?.id_column ?? parentTask.board_column ?? null;
  }, [colsForColumnId, parentTask.board_column]);

  const load = useCallback(() => {
    setLoading(true);
    tasksService
      .list(undefined, projectId, { parentId })
      .then((rows) => setSubtasks(rows))
      .catch(() => setSubtasks([]))
      .finally(() => setLoading(false));
  }, [parentId, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const refreshParent = useCallback(() => {
    tasksService
      .get(parentId)
      .then((t) => onParentRefreshed?.(t))
      .catch(() => {});
  }, [parentId, onParentRefreshed]);

  const total = subtasks.length;
  const completed = subtasks.filter((s) => s.completed_at != null).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  const handleCreate = async () => {
    const title = newTitle.trim();
    if (!title || creating) return;
    setCreating(true);
    try {
      await tasksService.create({
        project: parentTask.project,
        parent: parentId,
        board_column: firstOpenColumnId,
        title,
      });
      setNewTitle('');
      load();
      refreshParent();
      toast.success('Subtask created.');
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Could not create the subtask.');
    } finally {
      setCreating(false);
    }
  };

  /** Move a subtask to the final (done) or first open (pending) column. Returns success. */
  const moveSubtask = async (sub: ApiTask, toFinal: boolean): Promise<boolean> => {
    const cols = colsForColumnId(sub.board_column);
    const target = toFinal ? cols.find((c) => c.is_final) : cols.find((c) => !c.is_final);
    if (!target) {
      toast.error(
        toFinal
          ? 'The board has no final column to complete the subtask.'
          : 'The board has no starting column configured.',
      );
      return false;
    }
    setBusyId(sub.id_task);
    try {
      await tasksService.update(sub.id_task, { board_column: target.id_column });
      return true;
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Could not update the subtask.');
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const handleToggle = async (sub: ApiTask) => {
    if (!canEdit || busyId != null) return;

    // Reopening a completed subtask: just move it back, no AI involved.
    if (sub.completed_at != null) {
      if (await moveSubtask(sub, false)) {
        load();
        refreshParent();
      }
      return;
    }

    // Completing: if this is the LAST open subtask, confirm before triggering the AI review.
    const openSubtasks = subtasks.filter((s) => s.completed_at == null);
    if (openSubtasks.length <= 1) {
      setConfirmSub(sub);
      return;
    }

    if (await moveSubtask(sub, true)) {
      load();
      refreshParent();
    }
  };

  /** Confirmed completion of the last subtask → complete it, then trigger the parent's AI review. */
  const handleConfirmComplete = async () => {
    if (!confirmSub) return;
    setConfirmBusy(true);
    const ok = await moveSubtask(confirmSub, true);
    if (ok) {
      load();
      refreshParent();
      try {
        await tasksService.requestAiReview(parentId);
        toast.success('Subtask completed. The AI will review the task in the background.');
      } catch (err) {
        toast.error(
          err instanceof ApiRequestError
            ? err.message
            : 'Subtask completed, but the AI review could not be started.',
        );
      }
    }
    setConfirmBusy(false);
    setConfirmSub(null);
  };

  const handleDelete = async (sub: ApiTask) => {
    if (!canEdit || busyId != null) return;
    setBusyId(sub.id_task);
    try {
      await tasksService.delete(sub.id_task);
      load();
      refreshParent();
      toast.success('Subtask deleted.');
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Could not delete the subtask.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.06em] mb-2 flex items-center gap-1.5">
        <GitBranch className="w-3 h-3" /> Subtasks ({completed}/{total})
      </p>

      {total > 0 && (
        <div className="h-1.5 w-full rounded-full bg-surface-secondary mb-2.5 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" /> Loading…
        </div>
      ) : total === 0 ? (
        <p className="text-[11px] text-muted-foreground">No subtasks yet.</p>
      ) : (
        <div className="space-y-1.5">
          {subtasks.map((sub) => {
            const done = sub.completed_at != null;
            const busy = busyId === sub.id_task;
            return (
              <div
                key={sub.id_task}
                className="flex items-center gap-2 p-2 bg-surface-secondary/50 rounded-[4px]"
              >
                <button
                  type="button"
                  onClick={() => void handleToggle(sub)}
                  disabled={!canEdit || busy}
                  title={done ? 'Mark as pending' : 'Mark as completed'}
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border transition-colors disabled:opacity-50 ${
                    done
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-border hover:border-foreground/40'
                  }`}
                >
                  {busy ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  ) : done ? (
                    <Check className="w-2.5 h-2.5" />
                  ) : null}
                </button>

                <span
                  className={`flex-1 text-[11px] truncate ${
                    done ? 'line-through text-muted-foreground' : 'text-foreground'
                  }`}
                  title={sub.title}
                >
                  {sub.title}
                </span>

                {typeof sub.story_points === 'number' && (
                  <span className="text-[9px] text-muted-foreground rounded-full border border-border px-1.5 py-0.5">
                    {sub.story_points} pts
                  </span>
                )}

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => void handleDelete(sub)}
                    disabled={busy}
                    title="Delete subtask"
                    className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {canEdit && (
        <div className="flex items-center gap-1.5 mt-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleCreate();
              }
            }}
            placeholder="New subtask…"
            disabled={creating}
            className="flex-1 h-7 bg-surface-secondary border border-border rounded-[3px] px-2.5 text-[11px] disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={creating || !newTitle.trim()}
            className="inline-flex items-center gap-1 rounded-[3px] border border-border bg-card px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Add
          </button>
        </div>
      )}

      {/* Last-subtask confirmation: remind to push, then trigger the parent's AI review. */}
      {confirmSub && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={() => { if (!confirmBusy) setConfirmSub(null); }}
        >
          <div
            className="w-full max-w-md rounded-[6px] border border-border bg-card p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
              <div>
                <p className="text-[13px] font-semibold text-foreground">Last pending subtask</p>
                <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                  Completing this subtask will automatically trigger an AI review of the task{' '}
                  <span className="font-medium text-foreground">"{parentTask.title}"</span>.
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
                  Make sure you have pushed your changes to git
                  (<span className="font-mono text-foreground">git push</span>) before continuing —
                  the AI reviews the code in the repository, not your local copy.
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmSub(null)}
                disabled={confirmBusy}
                className="h-7 px-3 rounded-[3px] border border-border bg-surface-secondary text-[11px] text-foreground hover:bg-accent disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmComplete()}
                disabled={confirmBusy}
                className="h-7 px-3 rounded-[3px] border border-primary bg-primary text-[11px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-1"
              >
                {confirmBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
