import { useState, useMemo, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Search, User, Loader2, UserPlus } from 'lucide-react';
import { usersService } from '../../services';
import type { ApiUserAccount, ApiRole } from '../../services';
import type { ProjectRoleIds } from '../utils/projectPermissions';
import { getAllowedProjectRoleIdsForUser, getUserGithubConnectionState, isStakeholderSystemUser } from '../utils/projectPermissions';
import { getSystemRoleLabel } from '../utils/roles';

interface AddMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: ApiUserAccount[];
  roles: ApiRole[];
  roleIds: ProjectRoleIds;
  memberIds?: Set<number>;
  bypassGithubCheck?: boolean;
  onSubmit: (userId: number, roleId: number | null) => Promise<void>;
}

export function AddMemberModal({
  open,
  onOpenChange,
  candidates,
  roles,
  roleIds,
  memberIds,
  bypassGithubCheck = false,
  onSubmit,
}: AddMemberModalProps) {
  const [query, setQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState<ApiUserAccount | null>(null);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);
  const [serverResults, setServerResults] = useState<ApiUserAccount[] | null>(null);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Server-side search when query ≥ 3 chars
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setServerResults(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      usersService.list(trimmed)
        .then((users) => {
          if (cancelled) return;
          // Exclude users who are already members
          const excludeIds = memberIds ?? new Set(candidates.map((c) => c.id_user));
          setServerResults(users.filter((u) => !excludeIds.has(u.id_user)));
        })
        .catch(() => {
          if (!cancelled) setServerResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, candidates, memberIds]);

  // Items to display: server results when query ≥ 3, otherwise local filter on candidates
  const displayList = useMemo(() => {
    const trimmed = query.trim();
    if (trimmed.length >= 3) {
      return serverResults ?? [];
    }
    if (!trimmed) return candidates;
    const q = trimmed.toLowerCase();
    return candidates.filter(
      (c) =>
        c.username.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q),
    );
  }, [candidates, query, serverResults]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedUserId(null);
      setSelectedRoleId(null);
      setSelectedUserDetails(null);
      setServerResults(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!selectedUserId) {
      setSelectedUserDetails(null);
      setLoadingUserDetails(false);
      return;
    }

    // If we already have full data from server search or the candidates list, skip the extra fetch
    const cached =
      serverResults?.find((u) => u.id_user === selectedUserId) ??
      candidates.find((c) => c.id_user === selectedUserId) ??
      null;
    if (cached) {
      setSelectedUserDetails(cached);
      setLoadingUserDetails(false);
      return;
    }

    let cancelled = false;
    setLoadingUserDetails(true);

    usersService.get(selectedUserId)
      .then((user) => {
        if (!cancelled) setSelectedUserDetails(user);
      })
      .catch(() => {
        if (!cancelled) setSelectedUserDetails(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingUserDetails(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedUserId, serverResults, candidates]);

  const selectedCandidate = useMemo(
    () =>
      candidates.find((candidate) => candidate.id_user === selectedUserId) ??
      serverResults?.find((u) => u.id_user === selectedUserId) ??
      null,
    [candidates, serverResults, selectedUserId],
  );
  const selectedUser = selectedUserDetails ?? selectedCandidate;
  const allowedRoleIds = useMemo(
    () => getAllowedProjectRoleIdsForUser(selectedUser, roleIds),
    [roleIds, selectedUser],
  );
  const allowedRoles = useMemo(
    () => roles.filter((role) => allowedRoleIds.includes(role.id_role)),
    [allowedRoleIds, roles],
  );
  const githubState = useMemo(
    () => getUserGithubConnectionState(selectedUser),
    [selectedUser],
  );
  const githubRequired = selectedUser ? !isStakeholderSystemUser(selectedUser) : false;
  const githubIsUnavailable = !bypassGithubCheck && githubRequired && githubState.connected !== true;

  useEffect(() => {
    if (!selectedUser) return;

    if (isStakeholderSystemUser(selectedUser)) {
      setSelectedRoleId(roleIds.stakeholderId ?? null);
      return;
    }

    setSelectedRoleId((current) => (current != null && allowedRoleIds.includes(current) ? current : null));
  }, [allowedRoleIds, roleIds.stakeholderId, selectedUser]);

  const handleSubmit = async () => {
    if (!selectedUserId) return;
    if (selectedRoleId == null) return;
    if (githubIsUnavailable) return;
    setSubmitting(true);
    try {
      await onSubmit(selectedUserId, selectedRoleId);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-0 gap-0 rounded-[4px] overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />
            Add member to project
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full h-8 pl-8 pr-3 text-[13px] bg-surface-secondary border border-border rounded-[3px] outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors placeholder:text-muted-foreground/60"
            />
            {searching && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-muted-foreground" />}
          </div>
          {query.trim().length > 0 && query.trim().length < 3 && (
            <p className="mt-1 text-[11px] text-muted-foreground">Type at least 3 characters to search.</p>
          )}
        </div>

        <div className="max-h-[240px] overflow-y-auto scrollbar-app px-1 pb-2">
          {displayList.length === 0 && !searching ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
              <User className="w-5 h-5 mb-1 opacity-40" />
              <span className="text-[12px]">
                {query.trim().length >= 3
                  ? 'No users found with that name or email.'
                  : candidates.length === 0
                    ? 'All users are already members.'
                    : 'No results'}
              </span>
            </div>
          ) : (
            displayList.map((u) => {
              const isSelected = u.id_user === selectedUserId;
              return (
                <button
                  key={u.id_user}
                  type="button"
                  onClick={() => setSelectedUserId(u.id_user)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-[3px] transition-colors ${
                    isSelected ? 'bg-primary/10 ring-1 ring-primary/40' : 'hover:bg-accent/40'
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {u.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate">{u.username}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                      {getSystemRoleLabel(u.system_role ?? 0, u.system_role_name)}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="border-t border-border px-4 py-3 space-y-2">
          {selectedUser && (
            <div className="rounded-[4px] border border-border bg-surface-secondary/40 px-3 py-2 text-[11px] text-muted-foreground space-y-1">
              <p>
                <span className="font-medium text-foreground">Rol del sistema:</span>{' '}
                {getSystemRoleLabel(selectedUser.system_role ?? 0, selectedUser.system_role_name)}
              </p>
              {isStakeholderSystemUser(selectedUser) ? (
                <p>Project role will be set to Stakeholder for this user.</p>
              ) : loadingUserDetails ? (
                <p>Checking GitHub connection…</p>
              ) : githubState.connected === true ? (
                <p>
                  GitHub connected{githubState.login ? ` as ${githubState.login}` : ''}.
                </p>
              ) : (
                <p className="text-destructive">
                  You cannot add them because GitHub is not connected or could not be verified locally.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.06em] block mb-1">
              Project role
            </label>
            <select
              value={selectedRoleId ?? ''}
              onChange={(e) => setSelectedRoleId(e.target.value ? Number(e.target.value) : null)}
              disabled={!selectedUser || isStakeholderSystemUser(selectedUser) || allowedRoles.length === 0}
              className="w-full h-8 px-2 text-[12px] bg-surface-secondary border border-border rounded-[3px] outline-none focus:border-primary/50"
            >
              <option value="">Select a role</option>
              {allowedRoles.map((r) => (
                <option key={r.id_role} value={r.id_role}>{r.name}</option>
              ))}
            </select>
            {selectedUser && selectedRoleId == null && (
              <p className="mt-1 text-[11px] text-destructive">You must select a role before adding the person.</p>
            )}
            {selectedUser && isStakeholderSystemUser(selectedUser) && roleIds.stakeholderId == null && (
              <p className="mt-1 text-[11px] text-destructive">No Stakeholder project role is configured.</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="h-8 px-3 text-[12px] rounded-[3px] border border-border hover:bg-accent/40 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedUserId || !selectedRoleId || submitting || githubIsUnavailable}
              className="h-8 px-3 text-[12px] font-medium rounded-[3px] bg-primary text-primary-foreground hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
              Add
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
