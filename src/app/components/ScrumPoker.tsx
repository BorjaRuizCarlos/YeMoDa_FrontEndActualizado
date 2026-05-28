import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { tasksService } from '../../services';
import type { ApiTask } from '../../services';

const FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89] as const;

interface ScrumPokerProps {
  tasks: ApiTask[];
  canAssignPoints: boolean;
  onTaskUpdated: (task: ApiTask) => void;
}

export function ScrumPoker({ tasks, canAssignPoints, onTaskUpdated }: ScrumPokerProps) {
  const [savingId, setSavingId] = useState<number | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [draftPoints, setDraftPoints] = useState<number | null>(null);

  const handleSavePoints = async (taskId: number, points: number | null) => {
    if (!canAssignPoints) return;
    setSavingId(taskId);
    try {
      const updated = await tasksService.update(taskId, { story_points: points });
      onTaskUpdated(updated);
      toast.success(points != null ? `${points} puntos asignados.` : 'Puntos eliminados.');
      setEditingTaskId(null);
      setDraftPoints(null);
    } catch {
      toast.error('No se pudo actualizar los story points.');
    } finally {
      setSavingId(null);
    }
  };

  const startEditing = (task: ApiTask) => {
    if (!canAssignPoints) return;
    setEditingTaskId(task.id_task);
    setDraftPoints(task.story_points ?? null);
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
    setDraftPoints(null);
  };

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[13px] text-muted-foreground">No hay tareas en este proyecto.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[6px] border border-border bg-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-surface-secondary/50 flex items-center justify-between">
        <h3 className="text-[12px] font-semibold text-foreground">Scrum Poker — Story Points</h3>
        {!canAssignPoints && (
          <span className="text-[10px] text-muted-foreground italic">Solo PM puede asignar puntos</span>
        )}
      </div>
      <div className="divide-y divide-border">
        {tasks.map((task) => (
          <div key={task.id_task} className="px-4 py-3 flex items-start gap-4">
            <div className="flex-1 min-w-0 pr-4">
              <p className="text-[12px] font-medium text-foreground truncate">{task.title}</p>
            </div>
            <div className="shrink-0 pt-0.5">
              {canAssignPoints && editingTaskId !== task.id_task && savingId !== task.id_task && (
                <button
                  type="button"
                  onClick={() => startEditing(task)}
                  className="h-7 px-2.5 rounded-[3px] border border-border text-[10px] font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                >
                  Editar
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 flex-wrap justify-end shrink-0 border-l border-border pl-4">
              {savingId === task.id_task ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <>
                  {FIBONACCI.map((n) => {
                    const isEditingCurrent = editingTaskId === task.id_task;
                    const currentPoints = isEditingCurrent ? draftPoints : task.story_points;
                    const isSelected = currentPoints === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        disabled={!canAssignPoints || !isEditingCurrent}
                        onClick={() => {
                          if (!isEditingCurrent) return;
                          setDraftPoints(isSelected ? null : n);
                        }}
                        className={`h-7 w-8 rounded-[3px] border text-[11px] font-semibold transition-colors disabled:opacity-40 ${
                          isSelected
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground hover:bg-accent/30'
                        }`}
                        title={!isEditingCurrent ? 'Presiona Editar para cambiar puntos' : isSelected ? 'Click para quitar' : `Asignar ${n} puntos`}
                      >
                        {n}
                      </button>
                    );
                  })}
                  {editingTaskId === task.id_task ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleSavePoints(task.id_task, draftPoints)}
                        className="h-7 px-2.5 rounded-[3px] bg-primary text-primary-foreground text-[10px] font-medium"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="h-7 px-2.5 rounded-[3px] border border-border text-[10px] font-medium text-muted-foreground hover:text-foreground"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : null}
                  {(editingTaskId === task.id_task ? draftPoints : task.story_points) != null && (
                    <span className="ml-1 text-[10px] text-primary font-semibold px-1.5 py-0.5 bg-primary/10 border border-primary/30 rounded-[3px]">
                      {editingTaskId === task.id_task ? draftPoints : task.story_points} pts
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
