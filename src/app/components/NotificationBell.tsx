import { useState, useRef, useEffect } from 'react';
import { Bell, AlertTriangle, CheckCircle2, X, Trash2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useApiTaskWarnings } from '../hooks/useProjectData';
import { tasksService } from '../../services';

export function NotificationBell() {
  const { data: warnings, refetch } = useApiTaskWarnings();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());

  // Poll every 30 seconds
  useEffect(() => {
    const id = setInterval(() => refetch(), 30_000);
    return () => clearInterval(id);
  }, [refetch]);

  const allWarnings = (warnings ?? []).filter((w) => !deletedIds.has(w.id_warning));
  const activeWarnings = allWarnings.filter((w) => w.status === 'active');
  const recent = allWarnings
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const relativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await tasksService.deleteWarning(id);
      setDeletedIds((prev) => new Set([...prev, id]));
      toast.success('Alerta eliminada.');
    } catch {
      toast.error('No se pudo eliminar la alerta.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Notificaciones"
        className="relative p-1.5 rounded-[3px] hover:bg-accent transition-colors"
      >
        <Bell className="w-4 h-4 text-muted-foreground" />
        {activeWarnings.length > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] leading-none font-bold text-white text-center">
            {activeWarnings.length > 99 ? '99+' : activeWarnings.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-card border border-border rounded-[4px] shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-[12px] font-semibold text-foreground">Alertas</span>
            <div className="flex items-center gap-2">
              {activeWarnings.length > 0 && (
                <span className="text-[10px] font-medium text-warning bg-warning/10 px-1.5 py-0.5 rounded">
                  {activeWarnings.length} activas
                </span>
              )}
              <button onClick={() => setOpen(false)} className="p-0.5 hover:bg-accent rounded">
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[320px] overflow-y-auto scrollbar-app">
            {recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Bell className="w-6 h-6 mb-1.5 opacity-40" />
                <span className="text-[12px]">Sin alertas recientes</span>
              </div>
            ) : (
              recent.map((w) => (
                <div
                  key={w.id_warning}
                  className="group flex items-start gap-2.5 px-3 py-2.5 hover:bg-accent/50 transition-colors border-b border-border last:border-b-0"
                >
                  <div className="mt-0.5 shrink-0">
                    {w.status === 'active' ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-foreground line-clamp-2">
                      {w.message}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {relativeTime(w.created_at)}
                    </span>
                  </div>
                  <button
                    type="button"
                    title="Eliminar alerta"
                    onClick={(e) => void handleDelete(w.id_warning, e)}
                    disabled={deletingId === w.id_warning}
                    className="mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 h-5 w-5 rounded-[3px] bg-destructive/10 border border-destructive/30 text-destructive inline-flex items-center justify-center transition-opacity disabled:opacity-50"
                  >
                    {deletingId === w.id_warning ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <button
            onClick={() => { setOpen(false); navigate('/alerts'); }}
            className="w-full px-3 py-2 text-[11px] font-medium text-primary hover:bg-accent/50 transition-colors border-t border-border text-center"
          >
            Ver todas las alertas
          </button>
        </div>
      )}
    </div>
  );
}

  // Poll every 30 seconds
  useEffect(() => {
    const id = setInterval(() => refetch(), 30_000);
    return () => clearInterval(id);
  }, [refetch]);

  const activeWarnings = (warnings ?? []).filter((w) => w.status === 'active');
  const recent = (warnings ?? [])
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const relativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Notificaciones"
        className="relative p-1.5 rounded-[3px] hover:bg-accent transition-colors"
      >
        <Bell className="w-4 h-4 text-muted-foreground" />
        {activeWarnings.length > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] leading-none font-bold text-white text-center">
            {activeWarnings.length > 99 ? '99+' : activeWarnings.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-card border border-border rounded-[4px] shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-[12px] font-semibold text-foreground">Alertas</span>
            <div className="flex items-center gap-2">
              {activeWarnings.length > 0 && (
                <span className="text-[10px] font-medium text-warning bg-warning/10 px-1.5 py-0.5 rounded">
                  {activeWarnings.length} activas
                </span>
              )}
              <button onClick={() => setOpen(false)} className="p-0.5 hover:bg-accent rounded">
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[320px] overflow-y-auto scrollbar-app">
            {recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Bell className="w-6 h-6 mb-1.5 opacity-40" />
                <span className="text-[12px]">Sin alertas recientes</span>
              </div>
            ) : (
              recent.map((w) => (
                <div
                  key={w.id_warning}
                  className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-accent/50 transition-colors border-b border-border last:border-b-0"
                >
                  <div className="mt-0.5 shrink-0">
                    {w.status === 'active' ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-foreground line-clamp-2">
                      {w.message}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {relativeTime(w.created_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <button
            onClick={() => { setOpen(false); navigate('/alerts'); }}
            className="w-full px-3 py-2 text-[11px] font-medium text-primary hover:bg-accent/50 transition-colors border-t border-border text-center"
          >
            Ver todas las alertas
          </button>
        </div>
      )}
    </div>
  );
}
