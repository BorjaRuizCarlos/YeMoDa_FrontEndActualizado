import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import {
  ArrowLeft, Calendar, Users, Clock, CheckCircle2,
  AlertTriangle, UserPlus, List, Trash2, Settings2, RefreshCw,
} from 'lucide-react';
import { motion } from 'motion/react';
import { StatusBadge } from '../components/StatusBadge';
import { DatePickerField } from '../components/DatePickerField';
import { KPICard } from '../components/KPICard';
import { CommandBar } from '../components/CommandBar';
import { ADOTabs } from '../components/ADOTabs';
import { AvatarGroup } from '../components/AvatarGroup';
import { ProgressBar } from '../components/ProgressBar';
import { AssignResponsibleModal, type AssignCandidate } from '../components/AssignResponsibleModal';
import { AddMemberModal } from '../components/AddMemberModal';
import {
  useApiBoards, useApiProjectMembers, useApiUsers, useApiTasks, useApiRoles, useApiSprints,
  useApiBoardColumns, useApiProjectRoles, useProjectPermissions,
} from '../hooks/useProjectData';
import { projectsService, tasksService, usersService } from '../../services';
import type { ApiProject, ApiTask, ApiTaskAssignment, ApiUserAccount } from '../../services';
import { RoleManager } from '../components/RoleManager';
import { useAuth } from '../context/AuthContext';
import { GitHubReposView } from '../components/GitHubReposView';
import { CodeReviewPanel } from '../components/CodeReviewPanel';
import { ScrumPoker } from '../components/ScrumPoker';
import { ProjectTasksWorkspace } from '../components/ProjectTasksWorkspace.tsx';
import Timeline from '../components/Timeline';
import { getProjectStatusApiValue, getProjectStatusBadge, getProjectStatusLabel, normalizeProjectStatus, PROJECT_STATUS_OPTIONS } from '../utils/projectStatus';
import { formatProjectDate, getProjectTimeRemainingLabel } from '../utils/projectDates';
import {
  canEditMemberProjectRole,
  getAllowedProjectRoleIdsForUser,
  getProjectCapabilities,
  getProjectRoleIds,
  isStakeholderSystemUser,
} from '../utils/projectPermissions';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const projectId = Number(id) || 0;

  // ── Project ──────────────────────────────────────────────────────────────
  const [project, setProject] = useState<ApiProject | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [savingProjectConfig, setSavingProjectConfig] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  const [projectStatus, setProjectStatus] = useState('planning');
  const [projectEndDate, setProjectEndDate] = useState('');
  const [reviewBranches, setReviewBranches] = useState('');

  useEffect(() => {
    if (!projectId) return;
    setLoadingProject(true);
    setProjectError(null);
    projectsService.get(projectId)
      .then(setProject)
      .catch(() => setProjectError('Failed to load project.'))
      .finally(() => setLoadingProject(false));
  }, [projectId]);

  useEffect(() => {
    setProjectStatus(normalizeProjectStatus(project?.status) ?? 'planning');
    setProjectEndDate(project?.end_date ?? '');
    setReviewBranches(project?.review_branches ?? '');
  }, [project?.status, project?.end_date, project?.review_branches]);

  // ── Boards ───────────────────────────────────────────────────────────────
  const { data: boards, loading: loadingBoards, refetch: refetchBoards } = useApiBoards(projectId);
  // Columns of the project's first board — used for the role "move tasks up to" cap picker.
  const firstBoardId = (boards ?? [])[0]?.id_board;
  const { data: firstBoardColumns } = useApiBoardColumns(firstBoardId);
  const [selectedBoardId, setSelectedBoardId] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (boards && boards.length > 0 && !selectedBoardId) {
      setSelectedBoardId(boards[0].id_board);
    }
  }, [boards, selectedBoardId]);
  // ── Sprints (for project end date validation) ─────────────────────────────
  const { data: sprints, refetch: refetchSprints } = useApiSprints(projectId);
  const latestSprintEndDate = useMemo(() => {
    const dates = (sprints ?? [])
      .map((s) => s.end_date)
      .filter((d): d is string => d != null)
      .sort();
    return dates.length > 0 ? dates[dates.length - 1] : null;
  }, [sprints]);
  // ── Tasks ─────────────────────────────────────────────────────────────────
  const { statuses, refetch: refetchTasks } = useApiTasks(selectedBoardId, projectId);
  const { data: allProjectTasks, refetch: refetchAllProjectTasks } = useApiTasks(undefined, projectId);

  // ── Members + Users ───────────────────────────────────────────────────────
  const { data: members, loading: loadingMembers, refetch: refetchMembers } = useApiProjectMembers(projectId);
  const { data: users, loading: loadingUsers, refetch: refetchUsers } = useApiUsers();
  const { data: roles } = useApiRoles();

  const currentUserId = Number(user?.id ?? 0);
  const currentUserAccount = useMemo(
    () => (users ?? []).find((candidate) => candidate.id_user === currentUserId) ?? null,
    [users, currentUserId],
  );
  const currentUserMember = useMemo(
    () => (members ?? []).find((member) => member.user === currentUserId) ?? null,
    [members, currentUserId],
  );
  const projectRoleIds = useMemo(() => getProjectRoleIds(roles), [roles]);
  const capabilities = useMemo(
    () => getProjectCapabilities(currentUserMember, currentUserAccount, projectRoleIds),
    [currentUserAccount, currentUserMember, projectRoleIds],
  );

  // ── Per-project role permissions (authoritative source from the backend) ────
  const { data: perms } = useProjectPermissions(projectId);
  const { data: projectRoles } = useApiProjectRoles(projectId);
  const isProjectAdmin = perms?.is_project_admin ?? capabilities.isProjectManager;

  const canAccessProject = capabilities.canAccessProject;
  // Backend permissions take precedence; fall back to the legacy heuristic until loaded.
  const canManageProject = perms?.can_manage_project ?? capabilities.canManageProject;
  const canManageMembers = perms?.can_manage_members ?? capabilities.canManageMembers;
  const canEditMemberRoles = isProjectAdmin || canManageMembers;
  const canManageTasks = perms ? (perms.can_create_tasks || perms.can_edit_tasks) : capabilities.canManageTasks;
  const canCreateRepos = capabilities.canCreateRepos;

  const memberIds = useMemo(
    () => new Set((members ?? []).map((m) => m.user)),
    [members],
  );

  const candidatesToAdd = useMemo(() => {
    if (!users) return [];
    return users.filter((u) => !memberIds.has(u.id_user));
  }, [users, memberIds]);

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [bypassGithubCheck, setBypassGithubCheck] = useState(false);
  const [sectionRefreshToken, setSectionRefreshToken] = useState<number | null>(null);
  const refreshClickTimestamps = useRef<number[]>([]);
  const handleAddMember = async (userId: number, roleId: number | null) => {
    if (!canManageMembers) {
      throw new Error('Only the Project Manager can add members.');
    }
    try {
      await usersService.addMember(projectId, userId, roleId ?? undefined);
      toast.success('Member added');
      refetchMembers();
      refetchUsers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add member';
      toast.error(msg);
      throw err;
    }
  };

  const handleChangeMemberProjectRole = async (memberId: number, projectRoleId: number | null) => {
    try {
      await usersService.updateMember(memberId, { project_role: projectRoleId });
      toast.success('Member role updated.');
      refetchMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update the member role.');
    }
  };

  const userMap = useMemo(() => {
    const m = new Map<number, string>();
    (users ?? []).forEach((u) => m.set(u.id_user, u.username));
    return m;
  }, [users]);

  const roleMap = useMemo(() => {
    const m = new Map<number, string>();
    (roles ?? []).forEach((r) => m.set(r.id_role, r.name));
    return m;
  }, [roles]);

  const projectRoleOptions = useMemo(
    () => (roles ?? []).filter((role) => getAllowedProjectRoleIdsForUser(null, projectRoleIds).includes(role.id_role) || role.id_role === projectRoleIds.stakeholderId),
    [projectRoleIds, roles],
  );

  const handleRefreshActiveSection = () => {
    const now = Date.now();
    refreshClickTimestamps.current = refreshClickTimestamps.current.filter((timestamp) => now - timestamp < 60_000);

    if (refreshClickTimestamps.current.length >= 30) {
      toast.error('Refresh limit reached. Try again in a minute.');
      return;
    }

    refreshClickTimestamps.current.push(now);
    setSectionRefreshToken((current) => (current == null ? 1 : current + 1));

    if (activeTab === 'resumen') {
      projectsService.get(projectId)
        .then(setProject)
        .catch(() => setProjectError('Failed to load project.'));
      refetchTasks();
      refetchAllProjectTasks();
      refetchMembers();
      refetchUsers();
      refetchBoards();
      refetchSprints();
      return;
    }

    if (activeTab === 'timeline') {
      refetchTasks();
      refetchAllProjectTasks();
      refetchBoards();
      refetchSprints();
      return;
    }

    if (activeTab === 'scrum-poker') {
      refetchAllProjectTasks();
      return;
    }

    if (activeTab === 'equipo') {
      refetchMembers();
      refetchUsers();
      return;
    }

    if (activeTab === 'configuracion') {
      projectsService.get(projectId)
        .then(setProject)
        .catch(() => setProjectError('Failed to load project.'));
      refetchBoards();
      refetchSprints();
    }
  };

  const memberUserMap = useMemo(() => {
    const nextMap = new Map<number, ApiUserAccount>();
    (users ?? []).forEach((candidate) => nextMap.set(candidate.id_user, candidate));
    return nextMap;
  }, [users]);

  const doneStatusIds = useMemo(() => {
    const normalizedDoneNames = new Set(['done', 'completada', 'completado']);
    return new Set(
      statuses
        .filter((s) => normalizedDoneNames.has(s.name.trim().toLowerCase()))
        .map((s) => s.id_status),
    );
  }, [statuses]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const tList = allProjectTasks ?? [];
    const now = new Date();
    const total = tList.length;
    const completed = tList.filter((t) => t.completed_at != null || (t.status != null && doneStatusIds.has(t.status))).length;
    const overdue = tList.filter(
      (t) => !t.completed_at && (t.status == null || !doneStatusIds.has(t.status)) && t.due_date && new Date(t.due_date) < now,
    ).length;
    const memberCount = (members ?? []).length;
    return { total, completed, overdue, memberCount };
  }, [allProjectTasks, members, doneStatusIds]);

  // ── Days remaining ───────────────────────────────────────────────────────
  const timeRemainingLabel = getProjectTimeRemainingLabel(project?.end_date ?? null, project?.status).label;
  const tomorrowDate = useMemo(() => {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    return next.toISOString().slice(0, 10);
  }, []);
  const hasProjectConfigChanges = projectStatus !== (normalizeProjectStatus(project?.status) ?? 'planning') || projectEndDate !== (project?.end_date ?? '') || reviewBranches !== (project?.review_branches ?? '');

  // ── Assign modal ─────────────────────────────────────────────────────────
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningResponsible, setAssigningResponsible] = useState(false);
  const currentProjectManagerMember = useMemo(
    () => (members ?? []).find((member) => member.role === projectRoleIds.projectManagerId) ?? null,
    [members, projectRoleIds.projectManagerId],
  );
    const assignCandidates: AssignCandidate[] = useMemo(
    () => (members ?? []).map((m) => ({
      id: m.user,
      name: userMap.get(m.user) ?? `User #${m.user}`,
      email: `user${m.user}@platform`,
      role: roleMap.get(m.role ?? 0) ?? 'No role',
    })),
    [members, userMap, roleMap],
  );
  const handleAssign = async (userId: number) => {
    if (!canManageProject) {
      toast.error('You do not have permissions to reassign the project owner.');
      return;
    }

    const nextResponsibleMember = (members ?? []).find((member) => member.user === userId);
      if (!nextResponsibleMember) {
      toast.error('Selected person is not part of the project.');
      return;
    }

    if (currentProjectManagerMember?.user === userId) {
      setShowAssignModal(false);
      return;
    }

    setAssigningResponsible(true);
    try {
      await usersService.updateMember(nextResponsibleMember.id, { role: projectRoleIds.projectManagerId ?? undefined });

      if (currentProjectManagerMember) {
        await usersService.updateMember(currentProjectManagerMember.id, {
          role: projectRoleIds.developerId ?? undefined,
        });
      }

      await refetchMembers();
      const candidate = assignCandidates.find((x) => x.id === userId);
      if (candidate) toast.success(`Assigned responsible: ${candidate.name}`);
      setShowAssignModal(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reassign responsible.';
      toast.error(msg);
    } finally {
      setAssigningResponsible(false);
    }
  };

  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);
  const [updatingMemberRoleId, setUpdatingMemberRoleId] = useState<number | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);

  const handleMemberRoleChange = async (memberId: number, nextRoleId: number) => {
    if (!canEditMemberRoles) {
      toast.error('Only the Project Manager can change project roles.');
      return;
    }

    const member = (members ?? []).find((entry) => entry.id === memberId) ?? null;
    const memberUser = member ? memberUserMap.get(member.user) ?? null : null;
    const allowedRoleIds = getAllowedProjectRoleIdsForUser(memberUser, projectRoleIds);

    if (!member) {
      toast.error('Selected member not found.');
      return;
    }
    if (!canEditMemberProjectRole(memberUser, member, projectRoleIds)) {
      toast.error('That role cannot be changed from the project.');
      return;
    }
    if (!allowedRoleIds.includes(nextRoleId)) {
      toast.error('That role change is not allowed.');
      return;
    }
    if (member.role === nextRoleId) {
      return;
    }

    setUpdatingMemberRoleId(memberId);
    try {
      await usersService.updateMember(memberId, { role: nextRoleId });
      await refetchMembers();
      toast.success('Member role updated.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update member role.';
      toast.error(msg);
    } finally {
      setUpdatingMemberRoleId(null);
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!canManageMembers) {
      toast.error('Only the Project Manager can remove project members.');
      return;
    }

    const member = (members ?? []).find((m) => m.id === memberId);
    if (!member) {
      toast.error('Selected member not found.');
      return;
    }

    if (member.role === projectRoleIds.projectManagerId) {
      toast.error('Reassign the project owner first.');
      return;
    }

    if (!confirm('Remove this member from the project?')) {
      return;
    }

    setRemovingMemberId(memberId);
    try {
      const projectTasks = await tasksService.list(undefined, projectId);
      const allAssignments = (await Promise.all(
        projectTasks.map((task: ApiTask) => tasksService.listAssignments(task.id_task)),
      )).flat();
      const projectTaskIds = new Set(projectTasks.map((task: ApiTask) => task.id_task));
      const memberAssignments = allAssignments.filter(
        (assignment: ApiTaskAssignment) => projectTaskIds.has(assignment.task) && assignment.assigned_to === member.user,
      );

      if (memberAssignments.length > 0) {
        await Promise.all(memberAssignments.map((assignment: ApiTaskAssignment) => tasksService.deleteAssignment(assignment.id_assignment)));
      }

      const remainingAssignmentsByTask = allAssignments
        .filter((assignment: ApiTaskAssignment) => projectTaskIds.has(assignment.task) && assignment.assigned_to !== member.user)
        .reduce<Map<number, number[]>>((map: Map<number, number[]>, assignment: ApiTaskAssignment) => {
          const current = map.get(assignment.task) ?? [];
          current.push(assignment.assigned_to);
          map.set(assignment.task, current);
          return map;
        }, new Map());

      const legacyTasksToUpdate = projectTasks.filter((task: ApiTask) => task.assigned_to === member.user);
      if (legacyTasksToUpdate.length > 0) {
        await Promise.all(
          legacyTasksToUpdate.map((task: ApiTask) => tasksService.update(task.id_task, {
            assigned_to: remainingAssignmentsByTask.get(task.id_task)?.[0] ?? null,
          })),
        );
      }

      await usersService.removeMember(memberId);
      await refetchMembers();
      toast.success('Member removed from project.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to remove member.';
      toast.error(msg);
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleProjectStatusSave = async () => {
    if (!project) return;
    if (latestSprintEndDate && projectEndDate && projectEndDate < latestSprintEndDate) {
      toast.error(`End date cannot be before the last sprint end date (${latestSprintEndDate}).`);
      return;
    }
    const apiStatus = getProjectStatusApiValue(projectStatus);
    if (!apiStatus) {
      toast.error('Invalid project status.');
      return;
    }
    setSavingProjectConfig(true);
    try {
      const updated = await projectsService.update(project.id_project, {
        status: apiStatus,
        end_date: projectEndDate || undefined,
        review_branches: reviewBranches,
      });
      setProject(updated);
      toast.success('Project configuration updated.');
    } catch {
      toast.error('Failed to update project configuration.');
    } finally {
      setSavingProjectConfig(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    if (!confirm(`Delete project "${project.name}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingProject(true);
    try {
      await projectsService.delete(project.id_project);
      toast.success('Project deleted.');
      navigate('/projects');
    } catch {
      toast.error('Failed to delete project.');
      setDeletingProject(false);
    }
  };

  // ── Tabs ─────────────────────────────────────────────────────────────────
  const initialQueryTab = searchParams.get('tab');
  const initialQueryTaskId = Number(searchParams.get('task'));
  const normalizedInitialTaskId = Number.isNaN(initialQueryTaskId) || initialQueryTaskId <= 0 ? null : initialQueryTaskId;

  type ProjectWorkspaceTab = 'backlog' | 'sprints' | 'boards' | 'milestones';

  const [activeTab, setActiveTab] = useState<'resumen' | ProjectWorkspaceTab | 'timeline' | 'scrum-poker' | 'code-review' | 'repositorios' | 'equipo' | 'configuracion'>(() => {
    if (initialQueryTab === 'tareas' || initialQueryTab === 'backlog') return 'backlog';
    if (initialQueryTab === 'sprints') return 'sprints';
    if (initialQueryTab === 'boards') return 'boards';
    if (initialQueryTab === 'milestones') return 'milestones';
    if (initialQueryTab === 'timeline') return 'timeline';
    if (initialQueryTab === 'configuracion') return 'configuracion';
    return 'resumen';
  });
  const [initialTaskId, setInitialTaskId] = useState<number | null>(
    initialQueryTab === 'tareas' || initialQueryTab === 'backlog' || initialQueryTab === 'sprints' || initialQueryTab === 'boards' || initialQueryTab === 'milestones' || initialQueryTab === 'timeline'
      ? normalizedInitialTaskId
      : null,
  );

  useEffect(() => {
    const tab = searchParams.get('tab');
    const taskId = Number(searchParams.get('task'));
    const normalizedTaskId = Number.isNaN(taskId) || taskId <= 0 ? null : taskId;

    if (tab === 'tareas' || tab === 'backlog' || tab === 'sprints' || tab === 'boards' || tab === 'milestones') {
      setActiveTab(tab === 'tareas' ? 'backlog' : tab);
      setInitialTaskId(normalizedTaskId);
      return;
    }

    if (tab === 'timeline') {
      setActiveTab('timeline');
      return;
    }

    if (tab === 'configuracion') {
      setActiveTab('configuracion');
    }
  }, [searchParams]);

  useEffect(() => {
    if (!canManageProject && activeTab === 'configuracion') {
      setActiveTab('resumen');
    }
  }, [canManageProject, activeTab]);

  const loading = loadingProject || loadingBoards;

  // ── Error state ───────────────────────────────────────────────────────────
  if (projectError) {
    return (
      <div className="px-4 pt-10 text-center">
        <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
        <p className="text-[13px] text-destructive">{projectError}</p>
        <button onClick={() => navigate('/projects')} className="mt-3 text-[12px] text-primary hover:underline">
          Back to Projects
        </button>
      </div>
    );
  }

  if (!loadingProject && !loadingMembers && !canAccessProject) {
    return (
      <div className="px-4 pt-10 text-center">
        <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
        <p className="text-[13px] text-destructive">You don't have access to this project.</p>
        <button onClick={() => navigate('/projects')} className="mt-3 text-[12px] text-primary hover:underline">
          Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 pb-6 pt-3 max-w-[1400px] min-h-full flex flex-col gap-3">
      <section className="rounded-[6px] border border-border bg-card overflow-hidden">
        <CommandBar
          actions={[
            { label: 'Back', icon: <ArrowLeft className="w-3.5 h-3.5" />, onClick: () => navigate('/projects') },
            ...(canManageProject ? [{ label: 'Assign owner', icon: <UserPlus className="w-3.5 h-3.5" />, onClick: () => setShowAssignModal(true) }] : []),
          ]}
          rightSlot={project ? <StatusBadge status={getProjectStatusBadge(project.status)} text={getProjectStatusLabel(project.status)} size="sm" /> : null}
        />

        {loading ? (
          <div className="mx-4 my-3 h-14 animate-pulse bg-surface-secondary/50 rounded-[4px]" />
        ) : project ? (
          <div className="px-4 pb-3 pt-2 border-b border-border">
            <h1 className="text-[16px] font-semibold text-foreground">{project.name}</h1>
            {project.description && (
              <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2">{project.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-4 mt-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />Start: {formatProjectDate(project.created_at)}
              </span>
              {project.end_date && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />End: {formatProjectDate(project.end_date)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />{kpis.memberCount} members
              </span>
            </div>
          </div>
        ) : null}

        <div className="px-3">
          <ADOTabs
            tabs={[
              { id: 'resumen', label: 'Overview' },
              { id: 'backlog', label: 'Backlog' },
              { id: 'timeline', label: 'Timeline' },
              { id: 'sprints', label: 'Sprints' },
              { id: 'boards', label: 'Boards' },
              { id: 'milestones', label: 'Milestones' },
              { id: 'scrum-poker', label: 'Scrum Poker' },
              ...(canCreateRepos ? [{ id: 'code-review', label: 'Code Review' }] : []),
                { id: 'repositorios', label: 'Repositories' },
                { id: 'equipo', label: 'Team', count: (members ?? []).length },
                ...(canManageProject ? [{ id: 'configuracion', label: 'Settings', icon: <Settings2 className="w-3.5 h-3.5" /> }] : []),
            ]}
            activeTab={activeTab}
            onTabChange={(id) => setActiveTab(id as typeof activeTab)}
            rightSlot={(
              <button
                type="button"
                onClick={handleRefreshActiveSection}
                className="inline-flex h-full w-full min-w-8 items-center justify-center self-stretch rounded-[3px] border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Refresh current section"
                aria-label="Refresh current section"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          />
        </div>
      </section>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={activeTab === 'backlog' || activeTab === 'sprints' || activeTab === 'boards' || activeTab === 'milestones' || activeTab === 'timeline' ? 'flex-1 min-h-0 flex flex-col' : undefined}
      >
        {/* RESUMEN */}
        {activeTab === 'resumen' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              {[
                { title: 'Tasks', value: kpis.total, subtitle: 'in the project', icon: <List className="w-4 h-4" />, accentColor: 'info' as const },
                { title: 'Completed', value: kpis.completed, subtitle: 'completed', icon: <CheckCircle2 className="w-4 h-4" />, accentColor: 'success' as const },
                { title: 'Overdue', value: kpis.overdue, subtitle: 'require attention', icon: <AlertTriangle className="w-4 h-4" />, accentColor: 'destructive' as const },
                {
                  title: 'Time Remaining',
                  value: timeRemainingLabel,
                  subtitle: formatProjectDate(project?.end_date),
                  icon: <Clock className="w-4 h-4" />,
                  accentColor: 'warning' as const,
                },
              ].map((card, i) => (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: i * 0.05, ease: 'easeOut' }}
                >
                  <KPICard title={card.title} value={card.value} subtitle={card.subtitle} icon={card.icon} accentColor={card.accentColor} />
                </motion.div>
              ))}
            </div>

            <div className="grid lg:grid-cols-1 gap-3">
              <div className="space-y-3">
              <div className="bg-card border border-border rounded-[4px] p-4">
                <h2 className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.06em] mb-2.5">
                  General Information
                </h2>
                {project ? (
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                    {[
                      { label: 'Status', value: getProjectStatusLabel(project.status) },
                      { label: 'Created', value: formatProjectDate(project.created_at) },
                      { label: 'End Date', value: formatProjectDate(project.end_date) },
                      { label: 'Time remaining', value: timeRemainingLabel },
                      { label: 'Members', value: `${kpis.memberCount} members` },
                    ].map((item) => (
                      <div key={item.label}>
                        <dt className="text-[10px] text-muted-foreground">{item.label}</dt>
                        <dd className="text-[13px] font-medium text-foreground mt-0.5">{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <div className="h-20 animate-pulse bg-secondary rounded" />
                )}
              </div>

              {/* Completion progress bar */}
              {kpis.total > 0 && (
                <div className="bg-card border border-border rounded-[4px] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.06em]">
                      Progress
                    </h2>
                    <span className="text-[12px] font-semibold text-foreground">
                      {Math.round((kpis.completed / kpis.total) * 100)}%
                    </span>
                  </div>
                  <ProgressBar value={Math.round((kpis.completed / kpis.total) * 100)} height={6} />
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    {kpis.completed} of {kpis.total} tasks completed
                  </p>
                </div>
              )}
              </div>
            </div>
          </div>
        )}

        {/* WORKSPACE TABS */}
        {(activeTab === 'backlog' || activeTab === 'sprints' || activeTab === 'boards' || activeTab === 'milestones') && (
          <div className="flex-1 min-h-0 flex flex-col">
            <ProjectTasksWorkspace
              refreshSignal={sectionRefreshToken}
              projectId={projectId}
              userMap={userMap}
              assignableUsers={(members ?? []).map((m) => ({
                id: m.user,
                name: userMap.get(m.user) ?? `User #${m.user}`,
              }))}
              canCreateTasks={perms ? perms.can_create_tasks : canManageTasks}
              canCreateBoards={perms ? perms.can_manage_board : canManageTasks}
              canEditTasks={perms ? (perms.can_edit_tasks || perms.can_move_tasks) : canManageTasks}
              canDeleteTasks={perms ? perms.can_delete_tasks : canManageTasks}
              projectEndDate={project?.end_date ?? null}
              projectCreatedAt={project?.created_at ?? null}
              repoFullName={project?.github_repo_full_name ?? null}
              forcedTab={activeTab}
              initialTaskId={initialTaskId}
              onInitialTaskHandled={(taskId: number) => {
                setInitialTaskId((current) => (current === taskId ? null : current));
                const nextParams = new URLSearchParams(searchParams);
                nextParams.delete('task');
                setSearchParams(nextParams, { replace: true });
              }}
            />
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="flex-1 min-h-0 flex flex-col">
            <Timeline key={`timeline-${sectionRefreshToken ?? 0}`} projectId={projectId} projectEndDate={project?.end_date} />
          </div>
        )}

        {/* SCRUM POKER */}
        {activeTab === 'scrum-poker' && (
          <ScrumPoker
            key={`scrum-poker-${sectionRefreshToken ?? 0}`}
            tasks={allProjectTasks ?? []}
            canAssignPoints={canManageProject}
            onTaskUpdated={(_updated) => {
              refetchAllProjectTasks();
            }}
          />
        )}

        {/* CODE REVIEW */}
        {activeTab === 'code-review' && canCreateRepos && (
          <CodeReviewPanel
            key={`code-review-${sectionRefreshToken ?? 0}`}
            projectId={projectId}
            repoFullName={project?.github_repo_full_name ?? null}
          />
        )}

        {/* REPOSITORIOS */}
        {activeTab === 'repositorios' && (
          <GitHubReposView
            key={`repos-${sectionRefreshToken ?? 0}`}
            projectId={projectId}
            canCreateRepos={canCreateRepos}
          />
        )}

        {/* EQUIPO */}
        {activeTab === 'equipo' && (
            <div className="bg-card border border-border rounded-[4px] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h2 className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.06em]">
                  Project Members
                </h2>
                {members && members.length > 0 && (
                  <AvatarGroup
                    users={(members ?? []).map((m) => ({
                      name: userMap.get(m.user) ?? `User #${m.user}`,
                    }))}
                    max={5}
                    size={24}
                  />
                )}
              </div>
              {canManageMembers && (
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-[3px] transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add Member
                </button>
              )}
            </div>

            {(loadingMembers || loadingUsers) ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse bg-secondary rounded" />)}
              </div>
            ) : !members || members.length === 0 ? (
              <p className="text-[12px] text-muted-foreground py-6 text-center">No members registered.</p>
            ) : (
              <div className="space-y-0.5">
                {members.map((member) => {
                  const name = userMap.get(member.user) ?? `User #${member.user}`;
                  const memberUser = memberUserMap.get(member.user) ?? null;
                  const canChangeRole = canEditMemberRoles && canEditMemberProjectRole(memberUser, member, projectRoleIds);
                  const roleIsLocked = isStakeholderSystemUser(memberUser);
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between py-2.5 px-3 rounded-[6px] border border-border/60 bg-surface-secondary/20 hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-medium">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-foreground">{name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {canEditMemberRoles && (projectRoles ?? []).length > 0 ? (
                              <select
                                value={member.project_role ?? ''}
                                onChange={(e) => void handleChangeMemberProjectRole(member.id, e.target.value ? Number(e.target.value) : null)}
                                title="Project role (permissions)"
                                className="h-6 rounded-[3px] border border-border bg-surface-secondary px-1.5 text-[10px] text-foreground"
                              >
                                <option value="">No role</option>
                                {(projectRoles ?? []).map((r) => (
                                  <option key={r.id_project_role} value={r.id_project_role}>{r.name}</option>
                                ))}
                              </select>
                            ) : (
                              <p className="text-[11px] font-medium text-foreground">{member.project_role_name ?? 'No role'}</p>
                            )}
                            {canChangeRole && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMemberId(member.id);
                                  setEditingRoleId(member.role ?? null);
                                }}
                                className="h-6 px-2.5 text-[10px] font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-[3px] transition-colors"
                              >
                                Edit
                              </button>
                            )}
                            {member.role === projectRoleIds.projectManagerId && (
                              <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                PM
                              </span>
                            )}
                            {roleIsLocked && (
                              <span className="inline-flex items-center rounded-full border border-border bg-surface-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                System-locked
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          since {member.joined_at.slice(0, 10)}
                        </span>
                            {canManageMembers && member.role !== projectRoleIds.projectManagerId && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={removingMemberId === member.id}
                            className="h-7 px-2 text-[10px] font-medium text-destructive border border-destructive/30 rounded-[3px] hover:bg-destructive/10 transition-colors disabled:opacity-50"
                          >
                            {removingMemberId === member.id ? 'Removing…' : 'Remove'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'configuracion' && (
          <div className="bg-card border border-border rounded-[4px] p-4 mb-3">
            <h2 className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.06em] mb-3">
              Roles &amp; Permissions
            </h2>
            <RoleManager
              projectId={projectId}
              canManage={isProjectAdmin}
              boardColumns={firstBoardColumns ?? []}
            />
          </div>
        )}

        {activeTab === 'configuracion' && (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-3">
            <div className="bg-card border border-border rounded-[4px] p-4">
              <h2 className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.06em] mb-3">
                Project Settings
              </h2>

              <div className="space-y-3 max-w-md">
                <div>
                  <label className="block text-[11px] font-medium text-foreground mb-1">Project status</label>
                  <select
                    value={projectStatus}
                    onChange={(e) => setProjectStatus(e.target.value)}
                    disabled={!canManageProject || savingProjectConfig}
                    className="w-full h-8 bg-surface-secondary border border-border rounded-[3px] px-2.5 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:opacity-60"
                  >
                    {PROJECT_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-foreground mb-1">End date</label>
                  <DatePickerField
                    value={projectEndDate}
                    onChange={setProjectEndDate}
                    disabled={!canManageProject || savingProjectConfig}
                    minDate={latestSprintEndDate ?? tomorrowDate}
                    placeholder="Select an end date"
                  />
                  {latestSprintEndDate && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Cannot be before the last sprint: <span className="font-medium">{latestSprintEndDate}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-foreground mb-1">Branches monitored by AI agent</label>
                  <input
                    type="text"
                    value={reviewBranches}
                    onChange={(e) => setReviewBranches(e.target.value)}
                    disabled={!canManageProject || savingProjectConfig}
                    placeholder="main,develop  (empty = all branches)"
                    className="w-full h-8 bg-surface-secondary border border-border rounded-[3px] px-2.5 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:opacity-60 placeholder:text-muted-foreground/50"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Enter the names separated by commas. Task branches (<span className="font-mono">{'{id}'}</span>-*) are always analyzed.</p>
                </div>

                <button
                  type="button"
                  onClick={handleProjectStatusSave}
                  disabled={!canManageProject || savingProjectConfig || !hasProjectConfigChanges}
                  className="h-8 px-3 bg-primary hover:bg-primary-hover text-primary-foreground rounded-[3px] text-[11px] font-medium transition-colors disabled:opacity-50"
                >
                  {savingProjectConfig ? 'Saving…' : 'Save changes'}
                </button>

                {!canManageProject && (
                  <p className="text-[11px] text-muted-foreground">Only the project manager can modify project settings.</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-card border border-border rounded-[4px] p-4">
                <h2 className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.06em] mb-1">Team restrictions</h2>
                <p className="text-[11px] text-muted-foreground mb-3">By default only users with a connected GitHub account can be added. You can disable this temporarily.</p>
                <button
                  type="button"
                  disabled={!canManageProject}
                  onClick={() => setBypassGithubCheck((prev) => !prev)}
                  className={`inline-flex items-center gap-2 h-8 px-3 rounded-[3px] text-[11px] font-medium border transition-colors disabled:opacity-50 ${
                    bypassGithubCheck
                      ? 'bg-warning/10 border-warning/40 text-warning hover:bg-warning/20'
                      : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${bypassGithubCheck ? 'bg-warning' : 'bg-muted-foreground/50'}`} />
                  {bypassGithubCheck ? 'GitHub verification disabled' : 'Require GitHub when adding members'}
                </button>
              </div>

              <div className="bg-card border border-destructive/20 rounded-[4px] p-4 h-fit">
              <h2 className="text-[10px] font-medium text-destructive uppercase tracking-[0.06em] mb-2">
                Danger Zone
              </h2>
              <p className="text-[11px] text-muted-foreground mb-3">
                Deleting this project will also remove its access from the main view.
              </p>
              <button
                type="button"
                onClick={handleDeleteProject}
                disabled={!canManageProject || deletingProject}
                className="h-8 px-3 bg-destructive hover:bg-destructive/90 text-white rounded-[3px] text-[11px] font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deletingProject ? 'Deleting…' : 'Delete project'}
              </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      <AddMemberModal
        open={showAddMemberModal}
        onOpenChange={setShowAddMemberModal}
        candidates={candidatesToAdd}
        roles={projectRoleOptions}
        roleIds={projectRoleIds}
        memberIds={memberIds}
        bypassGithubCheck={bypassGithubCheck}
        onSubmit={handleAddMember}
      />

      <AssignResponsibleModal
        open={showAssignModal}
        onOpenChange={setShowAssignModal}
        candidates={assignCandidates}
        currentResponsibleId={currentProjectManagerMember?.user}
        onAssign={handleAssign}
        loading={assigningResponsible}
        title="Assign owner"
      />

      {editingMemberId != null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
            <div className="bg-card border border-border rounded-[6px] p-5 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-[13px] font-semibold text-foreground mb-4">Change member role</h2>
            {(() => {
              const member = (members ?? []).find((m) => m.id === editingMemberId);
              if (!member) return null;
              const memberUser = memberUserMap.get(member.user);
              const allowedRoleIds = getAllowedProjectRoleIdsForUser(memberUser, projectRoleIds);
              return (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-2">New role</label>
                    <select
                      value={editingRoleId ?? ''}
                      onChange={(e) => setEditingRoleId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full h-9 bg-surface-secondary border border-border rounded-[4px] px-3 text-[12px] text-foreground"
                    >
                      {allowedRoleIds.map((roleId) => (
                        <option key={roleId} value={roleId}>{roleMap.get(roleId) ?? `Role #${roleId}`}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingMemberId(null)}
                      className="flex-1 h-8 border border-border rounded-[3px] text-[11px] font-medium text-foreground hover:bg-accent/30 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (editingRoleId != null) {
                          await handleMemberRoleChange(editingMemberId, editingRoleId);
                          setEditingMemberId(null);
                        }
                      }}
                      disabled={updatingMemberRoleId === editingMemberId}
                      className="flex-1 h-8 bg-primary text-primary-foreground rounded-[3px] text-[11px] font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
                    >
                      {updatingMemberRoleId === editingMemberId ? 'Updating…' : 'Save'}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
