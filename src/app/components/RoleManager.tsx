import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Loader2, Shield, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { projectRolesService, ApiRequestError } from '../../services';
import type { ApiProjectRole, ApiBoardColumn, ProjectPermissionFlags } from '../../services';

interface RoleManagerProps {
  projectId: number;
  /** Whether the current user can manage roles (project admin/creator). */
  canManage: boolean;
  /** Board columns across the project's boards (for the move-limit picker). */
  boardColumns: ApiBoardColumn[];
}

type PermKey = keyof ProjectPermissionFlags;

const AREA_GROUPS: Array<{ key: string; label: string; perms: PermKey[] }> = [
  { key: 'tasks', label: 'Tasks', perms: ['can_create_tasks', 'can_edit_tasks', 'can_delete_tasks', 'can_move_tasks'] },
  { key: 'sprints', label: 'Sprints', perms: ['can_manage_sprints'] },
  { key: 'board', label: 'Board & columns', perms: ['can_manage_board'] },
  { key: 'milestones', label: 'Milestones', perms: ['can_manage_milestones'] },
  { key: 'tags', label: 'Tags', perms: ['can_manage_tags'] },
  { key: 'comments', label: 'Comments', perms: ['can_comment'] },
  { key: 'members', label: 'Members', perms: ['can_manage_members'] },
  { key: 'project', label: 'Project settings', perms: ['can_manage_project'] },
  { key: 'ai', label: 'AI review', perms: ['can_trigger_ai'] },
];

const PERM_LABELS: Record<PermKey, string> = {
  can_create_tasks: 'Create tasks',
  can_edit_tasks: 'Edit tasks',
  can_delete_tasks: 'Delete tasks',
  can_move_tasks: 'Move tasks',
  can_manage_sprints: 'Manage sprints',
  can_manage_board: 'Manage board & columns',
  can_manage_milestones: 'Manage milestones',
  can_manage_tags: 'Manage tags',
  can_comment: 'Comment',
  can_manage_members: 'Manage members',
  can_manage_project: 'Manage project settings',
  can_trigger_ai: 'Trigger AI review',
};

const ALL_PERMS = AREA_GROUPS.flatMap((g) => g.perms);

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

export function RoleManager({ projectId, canManage, boardColumns }: RoleManagerProps) {
  const [roles, setRoles] = useState<ApiProjectRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    projectRolesService.list(projectId)
      .then((data) => {
        setRoles(data);
        setSelectedId((cur) => cur ?? data[0]?.id_project_role ?? null);
      })
      .catch(() => setRoles([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [projectId]);

  const selectedRole = useMemo(
    () => roles.find((r) => r.id_project_role === selectedId) ?? null,
    [roles, selectedId],
  );

  useEffect(() => {
    setDraft(selectedRole ? roleToDraft(selectedRole) : null);
  }, [selectedRole]);

  const isAdminRole = selectedRole?.is_admin_role ?? false;
  const readOnly = !canManage || isAdminRole;

  const setPerm = (perm: PermKey, value: boolean) => {
    setDraft((d) => (d ? { ...d, [perm]: value } : d));
  };

  const setArea = (perms: PermKey[], value: boolean) => {
    setDraft((d) => {
      if (!d) return d;
      const next = { ...d };
      perms.forEach((p) => { next[p] = value; });
      return next;
    });
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
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Could not create the role.');
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

  const handleDelete = async (role: ApiProjectRole) => {
    if (!canManage || role.is_admin_role || busy) return;
    if (!window.confirm(`Delete the role "${role.name}"? Members with this role will lose its permissions.`)) return;
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
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground p-3">
        <Loader2 className="w-3 h-3 animate-spin" /> Loading roles…
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[200px_minmax(0,1fr)] gap-3">
      {/* Role list */}
      <div className="rounded-[4px] border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">Roles</p>
          {canManage && (
            <button type="button" onClick={() => void handleCreate()} disabled={busy} title="New role"
              className="text-muted-foreground hover:text-foreground disabled:opacity-50">
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="p-1.5 space-y-0.5">
          {roles.map((role) => (
            <button
              key={role.id_project_role}
              type="button"
              onClick={() => setSelectedId(role.id_project_role)}
              className={`group w-full text-left rounded-[3px] px-2.5 py-1.5 text-[11px] flex items-center justify-between gap-2 transition-colors ${
                selectedId === role.id_project_role ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-accent/30'
              }`}
            >
              <span className="inline-flex items-center gap-1.5 truncate">
                {role.is_admin_role && <Shield className="w-3 h-3 shrink-0" />}
                <span className="truncate">{role.name}</span>
              </span>
              {canManage && !role.is_admin_role && (
                <Trash2
                  className="w-3 h-3 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={(e) => { e.stopPropagation(); void handleDelete(role); }}
                />
              )}
            </button>
          ))}
          {roles.length === 0 && <p className="px-2.5 py-2 text-[11px] text-muted-foreground">No roles.</p>}
        </div>
      </div>

      {/* Role editor */}
      {draft ? (
        <div className="rounded-[4px] border border-border bg-card p-3 space-y-3">
          {isAdminRole && (
            <p className="text-[10px] text-muted-foreground bg-surface-secondary/50 rounded-[3px] px-2 py-1.5">
              The Admin role always has full access and can't be edited or deleted.
            </p>
          )}

          <div className="grid sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-muted-foreground mb-1">Name</label>
              <input
                type="text"
                value={draft.name}
                disabled={readOnly}
                onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))}
                className="w-full h-7 bg-surface-secondary border border-border rounded-[3px] px-2 text-[11px] disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-[10px] text-muted-foreground mb-1">Description</label>
              <input
                type="text"
                value={draft.description}
                disabled={readOnly}
                onChange={(e) => setDraft((d) => (d ? { ...d, description: e.target.value } : d))}
                className="w-full h-7 bg-surface-secondary border border-border rounded-[3px] px-2 text-[11px] disabled:opacity-60"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">Permissions</p>
            <button
              type="button"
              onClick={() => setAdvanced((a) => !a)}
              className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
            >
              {advanced ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              {advanced ? 'Advanced' : 'Simple'}
            </button>
          </div>

          {/* Permission checkboxes */}
          <div className="space-y-1.5">
            {AREA_GROUPS.map((group) => {
              const allOn = group.perms.every((p) => draft[p]);
              const someOn = group.perms.some((p) => draft[p]);
              return (
                <div key={group.key} className="rounded-[3px] border border-border/60 bg-surface-secondary/30 p-2">
                  <label className="flex items-center gap-2 text-[11px] font-medium text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={readOnly}
                      checked={allOn}
                      ref={(el) => { if (el) el.indeterminate = !allOn && someOn; }}
                      onChange={(e) => setArea(group.perms, e.target.checked)}
                      className="accent-[var(--primary)] disabled:opacity-60"
                    />
                    {group.label}
                  </label>

                  {/* Advanced: per-action checkboxes for multi-perm groups */}
                  {advanced && group.perms.length > 1 && (
                    <div className="mt-1.5 ml-5 grid grid-cols-2 gap-1">
                      {group.perms.map((perm) => (
                        <label key={perm} className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={readOnly}
                            checked={draft[perm]}
                            onChange={(e) => setPerm(perm, e.target.checked)}
                            className="accent-[var(--primary)] disabled:opacity-60"
                          />
                          {PERM_LABELS[perm]}
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Move-task column cap */}
                  {group.key === 'tasks' && draft.can_move_tasks && (
                    <div className="mt-1.5 ml-5 flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">Can move tasks up to:</span>
                      <select
                        disabled={readOnly}
                        value={draft.max_move_column ?? ''}
                        onChange={(e) => setDraft((d) => (d ? { ...d, max_move_column: e.target.value ? Number(e.target.value) : null } : d))}
                        className="h-6 rounded-[3px] border border-border bg-card px-1.5 text-[10px] disabled:opacity-60"
                      >
                        <option value="">No limit (any column)</option>
                        {boardColumns.map((col) => (
                          <option key={col.id_column} value={col.id_column}>{col.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!readOnly && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="h-7 px-3 rounded-[3px] border border-primary bg-primary text-[11px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-1"
              >
                {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                Save role
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-[4px] border border-border bg-card p-6 text-center text-[11px] text-muted-foreground">
          Select a role to view its permissions.
        </div>
      )}
    </div>
  );
}
