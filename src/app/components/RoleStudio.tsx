import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Plus, Trash2, Loader2, Shield, ShieldCheck, Lock, CircleDot, ArrowRight,
  Copy, Layers, Settings2, ListChecks, FlaskConical, GitBranch, Flag, Tag,
  MessageSquare, Users, Sparkles, Pencil, Move, type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { projectRolesService, ApiRequestError } from '../../services';
import type { ApiProjectRole, ApiBoardColumn, ProjectPermissionFlags } from '../../services';
import { Switch } from './ui/switch';
import { EmptyState } from './EmptyState';
import { cn } from './ui/utils';

interface RoleStudioProps {
  projectId: number;
  /** Whether the current user can manage roles (project admin/creator). */
  canManage: boolean;
  /** Board columns across the project's boards (for the move-limit picker). */
  boardColumns: ApiBoardColumn[];
}

type PermKey = keyof ProjectPermissionFlags;

interface AreaGroup {
  key: string;
  label: string;
  icon: LucideIcon;
  perms: PermKey[];
  verb: string; // for the plain-English contract
  ai?: boolean;
}

const AREA_GROUPS: AreaGroup[] = [
  { key: 'tasks', label: 'Tasks', icon: ListChecks, perms: ['can_create_tasks', 'can_edit_tasks', 'can_delete_tasks', 'can_move_tasks'], verb: 'tasks' },
  { key: 'sprints', label: 'Sprints', icon: FlaskConical, perms: ['can_manage_sprints'], verb: 'manage sprints' },
  { key: 'board', label: 'Board', icon: GitBranch, perms: ['can_manage_board'], verb: 'manage the board' },
  { key: 'milestones', label: 'Milestones', icon: Flag, perms: ['can_manage_milestones'], verb: 'manage milestones' },
  { key: 'tags', label: 'Tags', icon: Tag, perms: ['can_manage_tags'], verb: 'manage tags' },
  { key: 'comments', label: 'Comments', icon: MessageSquare, perms: ['can_comment'], verb: 'comment' },
  { key: 'members', label: 'Members', icon: Users, perms: ['can_manage_members'], verb: 'manage members' },
  { key: 'project', label: 'Project', icon: Settings2, perms: ['can_manage_project'], verb: 'manage project settings' },
  { key: 'ai', label: 'AI review', icon: Sparkles, perms: ['can_trigger_ai'], verb: 'trigger AI review', ai: true },
];

const TASK_ACTIONS: Array<{ perm: PermKey; label: string; icon: LucideIcon }> = [
  { perm: 'can_create_tasks', label: 'Create', icon: Plus },
  { perm: 'can_edit_tasks', label: 'Edit', icon: Pencil },
  { perm: 'can_delete_tasks', label: 'Delete', icon: Trash2 },
  { perm: 'can_move_tasks', label: 'Move', icon: Move },
];

const ALL_PERMS = AREA_GROUPS.flatMap((g) => g.perms);
const SINGLE_AREAS = AREA_GROUPS.filter((g) => g.perms.length === 1);

function emptyFlags(value = false): ProjectPermissionFlags {
  return Object.fromEntries(ALL_PERMS.map((p) => [p, value])) as unknown as ProjectPermissionFlags;
}

type Draft = ProjectPermissionFlags & {
  name: string;
  description: string;
  max_move_column: number | null;
};

function roleToDraft(role: ApiProjectRole): Draft {
  const flags = emptyFlags();
  ALL_PERMS.forEach((p) => { flags[p] = role[p]; });
  return { ...flags, name: role.name, description: role.description ?? '', max_move_column: role.max_move_column };
}

/** Oxford-style natural list: ["a","b","c"] → "a, b and c". */
function naturalList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export function RoleStudio({ projectId, canManage, boardColumns }: RoleStudioProps) {
  const [roles, setRoles] = useState<ApiProjectRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [advanced, setAdvancedState] = useState<boolean>(() => {
    try { return localStorage.getItem('roleStudio.advanced') === '1'; } catch { return false; }
  });
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmState, setConfirmState] = useState<
    { title: string; body: string; confirmLabel: string; danger?: boolean; onConfirm: () => void } | null
  >(null);
  const nameRef = useRef<HTMLInputElement | null>(null);

  const setAdvanced = (v: boolean) => {
    setAdvancedState(v);
    try { localStorage.setItem('roleStudio.advanced', v ? '1' : '0'); } catch { /* ignore */ }
  };

  const sortedCols = useMemo(
    () => [...boardColumns].sort((a, b) => a.order - b.order),
    [boardColumns],
  );
  const colById = useMemo(() => new Map(sortedCols.map((c) => [c.id_column, c])), [sortedCols]);

  const load = () => {
    setLoading(true);
    setError(false);
    projectRolesService.list(projectId)
      .then((data) => {
        setRoles(data);
        setSelectedId((cur) => (cur && data.some((r) => r.id_project_role === cur) ? cur : data[0]?.id_project_role ?? null));
      })
      .catch(() => { setRoles([]); setError(true); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [projectId]);

  const selectedRole = useMemo(
    () => roles.find((r) => r.id_project_role === selectedId) ?? null,
    [roles, selectedId],
  );

  useEffect(() => { setDraft(selectedRole ? roleToDraft(selectedRole) : null); }, [selectedRole]);

  const isAdminRole = selectedRole?.is_admin_role ?? false;
  const readOnly = !canManage || isAdminRole;

  const isDirty = useMemo(() => {
    if (!selectedRole || !draft) return false;
    const base = roleToDraft(selectedRole);
    if (draft.name !== base.name || draft.description !== base.description || draft.max_move_column !== base.max_move_column) return true;
    return ALL_PERMS.some((p) => draft[p] !== base[p]);
  }, [draft, selectedRole]);

  // ── Mutators ──────────────────────────────────────────────────────────────
  const setPerm = (perm: PermKey, value: boolean) => setDraft((d) => (d ? { ...d, [perm]: value } : d));
  const setArea = (perms: PermKey[], value: boolean) =>
    setDraft((d) => {
      if (!d) return d;
      const next = { ...d };
      perms.forEach((p) => { next[p] = value; });
      return next;
    });
  const setMaxMoveColumn = (id: number | null) => setDraft((d) => (d ? { ...d, max_move_column: id } : d));

  const requestSelect = (id: number) => {
    if (id === selectedId) return;
    if (isDirty && draft) {
      setConfirmState({
        title: 'Discard changes?',
        body: `You have unsaved changes to "${draft.name}". Discard them?`,
        confirmLabel: 'Discard',
        onConfirm: () => setSelectedId(id),
      });
      return;
    }
    setSelectedId(id);
  };

  const handleCreate = async () => {
    if (!canManage || busy) return;
    setBusy(true);
    try {
      const created = await projectRolesService.create({
        project: projectId,
        name: `New role ${roles.length + 1}`,
        ...emptyFlags(),
      });
      toast.success('Role created.');
      setRoles((prev) => [...prev, created]);
      setSelectedId(created.id_project_role);
      requestAnimationFrame(() => nameRef.current?.focus());
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Could not create the role.');
    } finally {
      setBusy(false);
    }
  };

  const handleDuplicate = async (role: ApiProjectRole) => {
    if (!canManage || busy) return;
    setBusy(true);
    try {
      const perms = ALL_PERMS.reduce((acc, p) => ({ ...acc, [p]: role[p] }), {} as Partial<ProjectPermissionFlags>);
      const created = await projectRolesService.create({
        project: projectId,
        name: `${role.name} copy`,
        description: role.description ?? '',
        max_move_column: role.max_move_column,
        ...perms,
      });
      toast.success('Role duplicated.');
      setRoles((prev) => [...prev, created]);
      setSelectedId(created.id_project_role);
      requestAnimationFrame(() => nameRef.current?.focus());
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Could not duplicate the role.');
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!draft || readOnly || saving) return;
    if (!draft.name.trim()) { toast.error('Role name is required.'); return; }
    setSaving(true);
    try {
      const updated = await projectRolesService.update(selectedId as number, {
        name: draft.name.trim(),
        description: draft.description,
        max_move_column: draft.can_move_tasks ? draft.max_move_column : null,
        ...ALL_PERMS.reduce((acc, p) => ({ ...acc, [p]: draft[p] }), {}),
      });
      setRoles((prev) => prev.map((r) => (r.id_project_role === updated.id_project_role ? updated : r)));
      toast.success('Role saved.');
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Could not save the role.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (role: ApiProjectRole) => {
    if (!canManage || role.is_admin_role || busy) return;
    setConfirmState({
      title: `Delete "${role.name}"?`,
      body: 'Members with this role will lose its permissions until reassigned.',
      confirmLabel: 'Delete role',
      danger: true,
      onConfirm: async () => {
        setBusy(true);
        try {
          await projectRolesService.delete(role.id_project_role);
          toast.success('Role deleted.');
          setRoles((prev) => prev.filter((r) => r.id_project_role !== role.id_project_role));
          if (selectedId === role.id_project_role) setSelectedId(null);
        } catch (err) {
          toast.error(err instanceof ApiRequestError ? err.message : 'Could not delete the role.');
        } finally {
          setBusy(false);
        }
      },
    });
  };

  // ⌘/Ctrl+S to save while editing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's' && !readOnly && isDirty) {
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, isDirty, draft, selectedId]);

  // ── The Contract (live plain-English summary) ───────────────────────────────
  const contract = useMemo(() => {
    if (isAdminRole) {
      return { admin: true, can: null as ReactNode, cannot: '' };
    }
    if (!draft) return { admin: false, can: null as ReactNode, cannot: '' };

    const capName = draft.max_move_column != null ? colById.get(draft.max_move_column)?.name ?? null : null;
    const clauses: ReactNode[] = [];

    // Tasks clause (verbs merged + move cap woven in).
    const taskVerbs: string[] = [];
    if (draft.can_create_tasks) taskVerbs.push('create');
    if (draft.can_edit_tasks) taskVerbs.push('edit');
    if (draft.can_delete_tasks) taskVerbs.push('delete');
    if (draft.can_move_tasks) taskVerbs.push('move');
    if (taskVerbs.length) {
      const moveSuffix: ReactNode = draft.can_move_tasks
        ? (capName
            ? <> up to <span className="text-primary font-medium">{capName}</span></>
            : <> anywhere</>)
        : null;
      clauses.push(<span key="tasks">{naturalList(taskVerbs)} tasks{moveSuffix}</span>);
    }

    // Single-area verbs.
    SINGLE_AREAS.forEach((area) => {
      if (draft[area.perms[0]]) clauses.push(<span key={area.key}>{area.verb}</span>);
    });

    const deniedAreas = AREA_GROUPS.filter((g) => !g.perms.some((p) => draft[p])).map((g) => g.label.toLowerCase());
    const shownDenied = deniedAreas.slice(0, 3);
    const moreDenied = deniedAreas.length - shownDenied.length;
    const cannot = deniedAreas.length
      ? `Cannot ${naturalList(shownDenied)}${moreDenied > 0 ? ` (+${moreDenied} more)` : ''}.`
      : '';

    return { admin: false, can: clauses.length ? clauses : null, cannot };
  }, [draft, isAdminRole, colById]);

  // ── Rail fingerprint helpers ────────────────────────────────────────────────
  const renderConstellation = (role: ApiProjectRole) => (
    <div className="flex items-center gap-[3px]" aria-hidden>
      {ALL_PERMS.map((p) => (
        <span key={p} className={cn('w-1.5 h-1.5 rounded-full', role[p] ? 'bg-primary' : 'bg-border')} />
      ))}
    </div>
  );

  const renderMiniTrack = (role: ApiProjectRole) => {
    if (!role.can_move_tasks) {
      return <span className="text-[10px] text-muted-foreground">Can't move</span>;
    }
    const capId = role.max_move_column;
    const capOrder = capId == null ? Infinity : (colById.get(capId)?.order ?? Infinity);
    const capName = capId == null ? '∞' : colById.get(capId)?.name ?? '';
    return (
      <div className="flex items-center gap-[2px]" aria-hidden>
        {sortedCols.map((c) => {
          const reach = capId == null || c.order <= capOrder;
          const isCap = c.id_column === capId;
          return (
            <span
              key={c.id_column}
              title={c.name}
              className={cn('h-1.5 w-2.5 rounded-[2px]', reach ? 'bg-primary' : 'bg-surface-secondary', isCap && 'ring-1 ring-primary/40')}
            />
          );
        })}
        <span className="text-[9px] text-muted-foreground ml-1 truncate max-w-[64px]">{capName}</span>
      </div>
    );
  };

  // ── Move-track (editor, interactive) ────────────────────────────────────────
  const renderMoveTrack = () => {
    if (!draft) return null;
    const capId = draft.max_move_column;
    const capOrder = capId == null ? Infinity : (colById.get(capId)?.order ?? Infinity);
    const capName = capId == null ? null : colById.get(capId)?.name ?? null;

    return (
      <div className={cn('mt-2 rounded-[3px] border border-border/60 bg-surface-secondary/20 p-2.5', !draft.can_move_tasks && 'opacity-60')}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium inline-flex items-center gap-1">
            <Move className="w-3 h-3" /> Move limit
          </span>
        </div>

        {!draft.can_move_tasks ? (
          <p className="text-[11px] text-muted-foreground">
            Enable <span className="text-foreground font-medium">Move tasks</span> to set how far this role can push work.
          </p>
        ) : sortedCols.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">This project has no board columns yet.</p>
        ) : (
          <>
            {/* Synced, screen-reader-friendly native control */}
            <select
              className="sr-only"
              aria-label="Move tasks up to which column"
              value={draft.max_move_column ?? ''}
              disabled={readOnly}
              onChange={(e) => setMaxMoveColumn(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">No limit (any column)</option>
              {sortedCols.map((c) => <option key={c.id_column} value={c.id_column}>{c.name}</option>)}
            </select>

            <div className="flex items-center gap-1 overflow-x-auto pb-1" role="group" aria-label="Board reach">
              {sortedCols.map((c, i) => {
                const reach = capId == null || c.order <= capOrder;
                const isCap = c.id_column === capId;
                const beyond = !reach;
                return (
                  <div key={c.id_column} className="flex items-center gap-1 shrink-0">
                    {i > 0 && <ArrowRight className={cn('w-3 h-3', beyond ? 'text-muted-foreground/40' : 'text-muted-foreground')} />}
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => setMaxMoveColumn(c.id_column)}
                      aria-pressed={isCap}
                      title={`Move tasks up to ${c.name}`}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-[3px] px-2 py-1 text-[11px] transition-all duration-300 disabled:cursor-not-allowed',
                        isCap
                          ? (c.is_review ? 'bg-warning text-warning-foreground' : 'bg-primary text-primary-foreground')
                          : reach
                            ? (c.is_final ? 'border border-success/40 bg-success/10 text-success' : 'border border-primary/40 bg-primary/10 text-primary')
                            : 'border border-dashed border-border/60 bg-surface-secondary/30 text-muted-foreground/60',
                      )}
                    >
                      {c.is_final && <Lock className="w-3 h-3" />}
                      {isCap && <CircleDot className="w-3 h-3" />}
                      <span className="truncate max-w-[90px]">{c.name}</span>
                    </button>
                  </div>
                );
              })}
              {/* No-limit node */}
              <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
              <button
                type="button"
                disabled={readOnly}
                onClick={() => setMaxMoveColumn(null)}
                aria-pressed={capId == null}
                title="No limit — move tasks into any column"
                className={cn(
                  'inline-flex items-center gap-1 rounded-[3px] px-2 py-1 text-[11px] transition-all shrink-0 disabled:cursor-not-allowed',
                  capId == null ? 'bg-primary text-primary-foreground' : 'border border-border/60 bg-surface-secondary/30 text-muted-foreground',
                )}
              >
                ∞ No limit
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground mt-1.5">
              {capName
                ? <>Can move tasks up to <span className="text-primary font-medium">{capName}</span>.</>
                : <>Can move tasks into <span className="text-foreground font-medium">any column</span>.</>}
            </p>
          </>
        )}
      </div>
    );
  };

  // ── Permission editor body ──────────────────────────────────────────────────
  const taskPerms = AREA_GROUPS[0].perms;
  const tasksAllOn = !!draft && taskPerms.every((p) => draft[p]);
  const tasksSomeOn = !!draft && taskPerms.some((p) => draft[p]);

  const renderEditor = (role: ApiProjectRole) => {
    if (!draft) return null;
    const enabledAreas = AREA_GROUPS.filter((g) => g.perms.some((p) => draft[p])).length;

    return (
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex items-center gap-2">
            {isAdminRole ? <ShieldCheck className="w-4 h-4 text-primary shrink-0" /> : <CircleDot className="w-4 h-4 text-muted-foreground shrink-0" />}
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-foreground truncate">{role.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isAdminRole && (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-surface-secondary text-muted-foreground rounded-[3px] px-1.5 py-0.5"><Lock className="w-3 h-3" /> Locked</span>
                )}
                {role.is_system && !isAdminRole && (
                  <span className="text-[10px] text-info bg-info/10 rounded-[3px] px-1.5 py-0.5">Seeded</span>
                )}
              </div>
            </div>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={() => void handleDuplicate(role)}
              disabled={busy}
              title="Duplicate role"
              className="inline-flex items-center gap-1 h-6 px-2 rounded-[3px] border border-border text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-50 shrink-0"
            >
              <Copy className="w-3 h-3" /> Duplicate
            </button>
          )}
        </div>

        {/* THE CONTRACT */}
        <div
          aria-live="polite"
          className="rounded-[4px] border border-border/60 bg-surface-secondary/30 px-3 py-2 text-[12px] leading-relaxed mb-3"
        >
          <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.06em] text-ai-accent font-medium mr-1.5 align-middle">
            <Sparkles className="w-3 h-3" /> Live
          </span>
          {contract.admin ? (
            <span className="text-foreground">Full access to everything in this project.</span>
          ) : contract.can ? (
            <>
              <span className="text-foreground">Can </span>
              {(contract.can as ReactNode[]).map((c, i) => (
                <span key={i} className="text-foreground">
                  {i > 0 && <span className="text-muted-foreground"> · </span>}
                  {c}
                </span>
              ))}
              {contract.cannot && <span className="text-muted-foreground">. {contract.cannot}</span>}
            </>
          ) : (
            <span className="text-muted-foreground">This role can't do anything yet.</span>
          )}
        </div>

        {/* Identity */}
        <div className="grid sm:grid-cols-2 gap-2 mb-3">
          <div>
            <label className="block text-[10px] text-muted-foreground mb-1">Name</label>
            <input
              ref={nameRef}
              type="text"
              value={draft.name}
              disabled={readOnly}
              onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))}
              className="w-full h-7 bg-surface-secondary border border-border rounded-[3px] px-2 text-[11px] focus:ring-1 focus:ring-primary/30 focus:border-primary outline-none disabled:opacity-60"
            />
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-1">Description</label>
            <input
              type="text"
              value={draft.description}
              disabled={readOnly}
              onChange={(e) => setDraft((d) => (d ? { ...d, description: e.target.value } : d))}
              className="w-full h-7 bg-surface-secondary border border-border rounded-[3px] px-2 text-[11px] focus:ring-1 focus:ring-primary/30 focus:border-primary outline-none disabled:opacity-60"
            />
          </div>
        </div>

        {/* Permissions header + mirrored mode control */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
            Permissions · <span className="text-foreground">{enabledAreas}</span>/{AREA_GROUPS.length} areas
          </span>
          <ModeToggle advanced={advanced} onChange={setAdvanced} />
        </div>

        {/* Tasks tile (master + advanced actions + move track) */}
        <div className={cn('rounded-[4px] border p-2.5 mb-2 transition-colors', tasksSomeOn ? 'border-primary/40 bg-primary/10' : 'border-border/60 bg-surface-secondary/30')}>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-foreground">
              <ListChecks className={cn('w-3.5 h-3.5', tasksSomeOn ? 'text-primary' : 'text-muted-foreground')} /> Tasks
              <span className={cn('ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-[8px] font-semibold',
                tasksAllOn ? 'bg-primary text-primary-foreground' : tasksSomeOn ? 'bg-primary/30 text-primary' : 'bg-surface-secondary text-muted-foreground border border-border')}>
                {taskPerms.filter((p) => draft[p]).length}
              </span>
            </span>
            <Switch
              checked={tasksAllOn}
              disabled={readOnly}
              aria-label="Toggle all task permissions"
              onCheckedChange={(v: boolean) => setArea(taskPerms, v)}
            />
          </div>

          {advanced ? (
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {TASK_ACTIONS.map(({ perm, label, icon: Icon }) => (
                <label key={perm} className="flex items-center justify-between gap-2 rounded-[3px] border border-border/60 bg-card/50 px-2 py-1.5 cursor-pointer">
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-foreground"><Icon className="w-3 h-3 text-muted-foreground" /> {label}</span>
                  <Switch checked={draft[perm]} disabled={readOnly} aria-label={label} onCheckedChange={(v: boolean) => setPerm(perm, v)} />
                </label>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-[10px] text-muted-foreground">create · edit · delete · move — switch to Advanced to set each</p>
          )}

          {renderMoveTrack()}
        </div>

        {/* Single-perm areas as chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {SINGLE_AREAS.map((area) => {
            const Icon = area.icon;
            const on = draft[area.perms[0]];
            return (
              <button
                key={area.key}
                type="button"
                disabled={readOnly}
                aria-pressed={on}
                onClick={() => setPerm(area.perms[0], !on)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-[4px] border px-2 py-1.5 text-[11px] transition-colors active:scale-[0.98] disabled:cursor-not-allowed',
                  on
                    ? area.ai ? 'bg-ai-accent/10 border-ai-accent/40 text-ai-accent' : 'bg-primary/10 border-primary/40 text-primary'
                    : 'bg-surface-secondary/30 border-border/60 text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="w-3 h-3 shrink-0" />
                <span className="truncate">{area.label}</span>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        {!readOnly && (
          <div className="sticky bottom-0 -mx-3 mt-3 flex items-center justify-end gap-2 border-t border-border bg-card/95 backdrop-blur px-3 py-2">
            {isDirty && <span className="mr-auto inline-flex items-center gap-1.5 text-[10px] text-warning"><span className="w-1.5 h-1.5 rounded-full bg-warning" /> Unsaved changes</span>}
            <button
              type="button"
              onClick={() => setDraft(roleToDraft(role))}
              disabled={!isDirty || saving}
              className="h-7 px-3 rounded-[3px] border border-border text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!isDirty || saving}
              className={cn(
                'h-7 px-3 rounded-[3px] text-[11px] font-medium inline-flex items-center gap-1 transition-colors',
                isDirty && !saving ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-surface-secondary text-muted-foreground border border-border',
              )}
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              {saving ? 'Saving…' : 'Save role'}
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-[4px] border border-border bg-background">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground p-3">
          <Loader2 className="w-3 h-3 animate-spin" /> Loading roles…
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[4px] border border-border bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground inline-flex items-center gap-1.5">
          <Shield className="w-3 h-3" /> Roles &amp; Permissions
        </span>
        {canManage ? (
          <div className="flex items-center gap-2">
            <ModeToggle advanced={advanced} onChange={setAdvanced} />
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={busy}
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-[3px] bg-primary text-primary-foreground text-[11px] font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" /> New role
            </button>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-surface-secondary rounded-[3px] px-1.5 py-0.5"><Lock className="w-3 h-3" /> View only</span>
        )}
      </div>

      {error ? (
        <EmptyState icon="file" title="Couldn't load roles" description="Something went wrong fetching this project's roles." action={{ label: 'Retry', onClick: load }} />
      ) : roles.length === 0 ? (
        <EmptyState icon="inbox" title="No roles yet" description="Create a role to define what members can do." action={canManage ? { label: 'New role', onClick: () => void handleCreate() } : undefined} />
      ) : (
        <div className="grid lg:grid-cols-[260px_minmax(0,1fr)] gap-3 p-3">
          {/* Left rail */}
          <div className="flex flex-col gap-2 lg:max-h-[60vh] lg:overflow-y-auto" role="listbox" aria-label="Project roles">
            {roles.map((role) => {
              const selected = role.id_project_role === selectedId;
              const dirtyHere = selected && isDirty;
              return (
                <div
                  key={role.id_project_role}
                  role="option"
                  aria-selected={selected}
                  tabIndex={0}
                  onClick={() => requestSelect(role.id_project_role)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); requestSelect(role.id_project_role); } }}
                  className={cn(
                    'group bg-card border rounded-[4px] px-3 py-2.5 cursor-pointer transition-colors outline-none',
                    role.is_admin_role && 'border-l-[3px] border-l-primary',
                    selected ? 'border-primary/40 ring-1 ring-primary/20 bg-primary/5' : 'border-border hover:border-foreground/20',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 min-w-0">
                      {role.is_admin_role ? <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" /> : <CircleDot className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                      <span className="text-[12px] font-medium text-foreground truncate">{role.name}</span>
                      {dirtyHere && <CircleDot className="w-2.5 h-2.5 text-warning shrink-0" />}
                    </span>
                    {canManage && !role.is_admin_role ? (
                      <Trash2
                        className="w-3 h-3 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); handleDelete(role); }}
                      />
                    ) : role.is_admin_role ? (
                      <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
                    ) : null}
                  </div>
                  <div className="mt-1.5">{renderConstellation(role)}</div>
                  <div className="mt-1.5">{renderMiniTrack(role)}</div>
                </div>
              );
            })}
            {canManage && (
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={busy}
                className="inline-flex items-center justify-center gap-1 rounded-[4px] border border-dashed border-border px-2 py-2 text-[11px] text-muted-foreground hover:text-foreground hover:border-foreground/30 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" /> New role
              </button>
            )}
          </div>

          {/* Right editor */}
          <div className="min-w-0">
            {selectedRole && draft ? (
              <div className="rounded-[4px] border border-border bg-card p-3">
                {isAdminRole && (
                  <p className="text-[10px] text-muted-foreground bg-surface-secondary/50 rounded-[3px] px-2 py-1.5 mb-3 inline-flex items-center gap-1.5">
                    <Lock className="w-3 h-3" /> The Admin role always has full access and can't be edited or deleted.
                  </p>
                )}
                {!canManage && (
                  <p className="text-[10px] text-muted-foreground bg-surface-secondary/50 rounded-[3px] px-2 py-1.5 mb-3 inline-flex items-center gap-1.5">
                    <Lock className="w-3 h-3" /> You're viewing roles — only the project admin can change them.
                  </p>
                )}
                {renderEditor(selectedRole)}
              </div>
            ) : (
              <div className="rounded-[4px] border border-border bg-card">
                <EmptyState icon="search" title="Select a role" description="Pick a role on the left to view and edit its permissions." />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm modal (discard / delete) */}
      {confirmState && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={() => { if (!busy) setConfirmState(null); }}
        >
          <div className="w-full max-w-sm rounded-[6px] border border-border bg-card p-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <p className="text-[13px] font-semibold text-foreground">{confirmState.title}</p>
            <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">{confirmState.body}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmState(null)}
                disabled={busy}
                className="h-7 px-3 rounded-[3px] border border-border bg-surface-secondary text-[11px] text-foreground hover:bg-accent disabled:opacity-50"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={() => { const fn = confirmState.onConfirm; setConfirmState(null); fn(); }}
                disabled={busy}
                className={cn(
                  'h-7 px-3 rounded-[3px] text-[11px] font-medium text-primary-foreground disabled:opacity-50',
                  confirmState.danger ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90',
                )}
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Simple / Advanced segmented control ───────────────────────────────────────
function ModeToggle({ advanced, onChange }: { advanced: boolean; onChange: (v: boolean) => void }) {
  return (
    <div role="tablist" aria-label="Permission detail level" className="inline-flex p-0.5 rounded-[4px] border border-border bg-surface-secondary/50 text-[11px]">
      <button
        role="tab"
        aria-selected={!advanced}
        onClick={() => onChange(false)}
        className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-[3px] transition-colors', !advanced ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
      >
        <Layers className="w-3.5 h-3.5" /> Simple
      </button>
      <button
        role="tab"
        aria-selected={advanced}
        onClick={() => onChange(true)}
        className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-[3px] transition-colors', advanced ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
      >
        <Settings2 className="w-3.5 h-3.5" /> Advanced
      </button>
    </div>
  );
}
