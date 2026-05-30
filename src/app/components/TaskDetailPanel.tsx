import { useState, useEffect, useMemo } from 'react';
import {
  X, Calendar, User, MessageSquare, AlertTriangle,
  GitCommit, Send, Loader2, Pencil, Trash2, Plus,
  GitBranch, Copy, Check, Info, ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { chatService, tasksService, githubService, usersService } from '../../services';
import { ApiRequestError } from '../../services/api';
import type { AIProvider, ApiTask, ApiTaskStatus, ApiTaskPriority, ApiTaskComment, ApiTaskWarning, ApiTaskAssignment, ApiTag, ChatModelsResponse, GitHubRepo, CreateBranchResponse, ApiBoardColumn, ApiSprint, ApiTaskAIReviewResult } from '../../services';
import { WarningBadge } from './WarningBadge';
import { TaskAssigneePicker } from './TaskAssigneePicker';
import { DatePickerField } from './DatePickerField';
import { TagColorPicker } from './TagColorPicker';
import { useAuth } from '../context/AuthContext';

const DONE_STATUS_NAMES = new Set(['done', 'completada', 'completado']);
const EMPTY_ASSIGNABLE_USERS: Array<{ id: number; name: string }> = [];
const EMPTY_TASK_ASSIGNMENTS: ApiTaskAssignment[] = [];
export const TASK_REOPEN_ID_STORAGE_KEY = 'pip_reopen_task_id';
export const TASK_REOPEN_PATH_STORAGE_KEY = 'pip_reopen_task_path';

function formatCommentTimestamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function extractFirstFilePathFromDiff(diffText: string | null): string {
  if (!diffText) return '';
  const match = diffText.match(/^diff --git a\/.+ b\/(.+)$/m);
  return match?.[1]?.trim() ?? '';
}

function extractFilePathFromWarningMessage(message: string): string {
  const patterns = [
    /^([A-Za-z0-9_./-]+)\s+line\s+\d+:/i,
    /file\s+([A-Za-z0-9_./-]+)/i,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return '';
}

function extractBestCodeCandidate(content: string): string {
  const fencedBlockRegex = /```[a-zA-Z0-9_-]*\n([\s\S]*?)```/g;
  let best = '';
  let match: RegExpExecArray | null = null;
  while (true) {
    match = fencedBlockRegex.exec(content);
    if (!match) break;
    const candidate = match[1]?.trim() ?? '';
    if (candidate.length > best.length) best = candidate;
  }
  if (best) return best;

  const trimmed = content.trim();
  const looksLikeAnalysis = /(^#\s|\|\s*ID\s*\||Resumen Ejecutivo|\*\*|```)/im.test(trimmed);
  if (looksLikeAnalysis) return '';
  return trimmed;
}

interface TaskDetailPanelProps {
  task: ApiTask | null;
  statuses: ApiTaskStatus[];
  priorities: ApiTaskPriority[];
  tags?: ApiTag[];
  userMap: Map<number, string>;
  minDueDate?: string;
  maxDueDate?: string;
  assignableUsers?: Array<{ id: number; name: string }>;
  taskAssignments?: ApiTaskAssignment[];
  canEditAssignment?: boolean;
  canEditTask?: boolean;
  canDeleteTask?: boolean;
  projectId?: number;
  repoFullName?: string | null;
  boardColumnsByBoard?: Map<number, ApiBoardColumn[]>;
  boardNames?: Map<number, string>;
  sprints?: ApiSprint[];
  onClose: () => void;
  onDeleteTask?: (task: ApiTask) => Promise<void>;
  onTaskUpdated?: (updatedTask: ApiTask) => void;
  onCreateTag?: (name: string, color: string) => Promise<ApiTag>;
}

export function TaskDetailPanel({
  task,
  statuses,
  priorities,
  tags = [],
  userMap,
  minDueDate,
  maxDueDate,
  assignableUsers = EMPTY_ASSIGNABLE_USERS,
  taskAssignments = EMPTY_TASK_ASSIGNMENTS,
  canEditAssignment = true,
  canEditTask = true,
  canDeleteTask = false,
  projectId,
  repoFullName,
  boardColumnsByBoard,
  boardNames,
  sprints = [],
  onClose,
  onDeleteTask,
  onTaskUpdated,
  onCreateTag,
}: TaskDetailPanelProps) {
  const { user } = useAuth();
  const currentUserId = useMemo(() => {
    const parsed = Number(user?.id ?? 0);
    return Number.isNaN(parsed) ? null : parsed;
  }, [user]);

  const [comments, setComments] = useState<ApiTaskComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [warnings, setWarnings] = useState<ApiTaskWarning[]>([]);
  const [loadingWarnings, setLoadingWarnings] = useState(false);
  const [warningsPanelOpen, setWarningsPanelOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [tagSearch, setTagSearch] = useState('');
  const [savingTagId, setSavingTagId] = useState<number | null>(null);
  const [showNewTagForm, setShowNewTagForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#56697f');
  const [creatingTag, setCreatingTag] = useState(false);

  const [isEditingTask, setIsEditingTask] = useState(false);
  const [savingTask, setSavingTask] = useState(false);

  // ── Branch creation ────────────────────────────────────────────────────────
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [branchRepos, setBranchRepos] = useState<GitHubRepo[]>([]);
  const [branchLoadingRepos, setBranchLoadingRepos] = useState(false);
  const [branchSelectedRepo, setBranchSelectedRepo] = useState('');
  const [branchBase, setBranchBase] = useState('main');
  const [branchCreating, setBranchCreating] = useState(false);
  const [branchResult, setBranchResult] = useState<CreateBranchResponse | null>(null);
  const [branchCopied, setBranchCopied] = useState(false);
  const [generatingAiPrompt, setGeneratingAiPrompt] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);
  const [deletingWarningId, setDeletingWarningId] = useState<number | null>(null);
  const [savingBoardColumn, setSavingBoardColumn] = useState(false);
  const [savingSprint, setSavingSprint] = useState(false);
  const [selectedWarningIds, setSelectedWarningIds] = useState<Set<number>>(new Set());
  const [deletingSelectedWarnings, setDeletingSelectedWarnings] = useState(false);
  const [aiReviewResults, setAiReviewResults] = useState<ApiTaskAIReviewResult[]>([]);
  const [loadingAiReviewResults, setLoadingAiReviewResults] = useState(false);
  const [aiProvider, setAiProvider] = useState<AIProvider>('copilot');
  const [aiModels, setAiModels] = useState<ChatModelsResponse>({ copilot: [], yemoda: [] });
  const [loadingAiModels, setLoadingAiModels] = useState(false);
  const [aiModel, setAiModel] = useState('');
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [sendingToAi, setSendingToAi] = useState(false);
  const [showAiCodeModal, setShowAiCodeModal] = useState(false);
  const [aiSourceLoading, setAiSourceLoading] = useState(false);
  const [aiSourceBranch, setAiSourceBranch] = useState('main');
  const [aiSourcePath, setAiSourcePath] = useState('');
  const [aiSourceContent, setAiSourceContent] = useState('');
  const [aiSuggestedContent, setAiSuggestedContent] = useState('');
  const [aiModalPrompt, setAiModalPrompt] = useState('');
  const [committingAiFix, setCommittingAiFix] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    status: '',
    priority: '',
    assignedTo: [] as string[],
    dueDate: '',
  });

  const currentTaskAssignments = useMemo(
    () => (task ? taskAssignments.filter((assignment) => assignment.task === task.id_task) : []),
    [task, taskAssignments],
  );

  const doneStatusIds = useMemo(
    () => new Set(statuses.filter((s) => DONE_STATUS_NAMES.has(s.name.trim().toLowerCase())).map((s) => s.id_status)),
    [statuses],
  );

  const openBranchModal = () => {
    setBranchResult(null);
    setBranchBase('main');
    setBranchSelectedRepo('');
    setShowBranchModal(true);
    if (!projectId) return;
    setBranchLoadingRepos(true);
    githubService.listRepos({ project_id: projectId })
      .then((repos) => {
        setBranchRepos(repos);
        if (repos.length === 1) setBranchSelectedRepo(repos[0].full_name);
      })
      .catch(() => setBranchRepos([]))
      .finally(() => setBranchLoadingRepos(false));
  };

  const handleCreateBranch = async () => {
    if (!task) return;
    setBranchCreating(true);
    try {
      const result = await githubService.createBranch(task.id_task, {
        base_branch: branchBase.trim() || 'main',
        ...(branchSelectedRepo ? { repo_full_name: branchSelectedRepo } : {}),
      });
      setBranchResult(result);
      toast.success(`Branch "${result.branch_name}" creada`);
    } catch (err) {
      const detail = err instanceof ApiRequestError
        ? (err.body?.detail ?? 'Error desconocido')
        : err instanceof Error ? err.message : 'Error desconocido';
      toast.error('No se pudo crear la branch', { description: detail });
    } finally {
      setBranchCreating(false);
    }
  };

  const handleCopyCheckout = async () => {
    if (!branchResult) return;
    try {
      await navigator.clipboard.writeText(branchResult.checkout_command);
      setBranchCopied(true);
      setTimeout(() => setBranchCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar al portapapeles');
    }
  };

  const handleGenerateAiPrompt = async () => {
    if (!task) return;
    setGeneratingAiPrompt(true);
    try {
      const payload = await tasksService.getAiFixPrompt(task.id_task);
      if (!payload.copy_prompt?.trim()) {
        toast.error('El backend no devolvió un prompt para copiar.');
        return;
      }
      await navigator.clipboard.writeText(payload.copy_prompt);
      toast.success('Prompt IA copiado al portapapeles.', {
        description: `${payload.warnings_count} warning(s) incluidos para la tarea #${payload.task_id}.`,
      });
    } catch (err) {
      const detail = err instanceof ApiRequestError
        ? (err.body?.detail ?? 'Error desconocido')
        : err instanceof Error ? err.message : 'Error desconocido';
      toast.error('No se pudo generar el prompt IA.', { description: detail });
    } finally {
      setGeneratingAiPrompt(false);
    }
  };

  useEffect(() => {
    setLoadingAiModels(true);
    chatService.getModels()
      .then((models) => setAiModels(models))
      .catch(() => setAiModels({ copilot: [], yemoda: [] }))
      .finally(() => setLoadingAiModels(false));

    usersService.me()
      .then((me) => setGithubToken(me.github_token ?? null))
      .catch(() => setGithubToken(null));
  }, []);

  useEffect(() => {
    const options = aiProvider === 'copilot' ? (aiModels.copilot ?? []) : (aiModels.yemoda ?? []);
    setAiModel((current) => {
      if (current && options.some((model) => model.id === current)) return current;
      return options[0]?.id ?? '';
    });
  }, [aiProvider, aiModels]);

  const handleSendWarningsToAi = async () => {
    if (!task) return;
    const activeWarningsPayload = warnings.filter((w) => w.status === 'active').map((w) => ({
      id_warning: w.id_warning,
      severity: w.severity,
      message: w.message,
      created_at: w.created_at,
    }));

    if (activeWarningsPayload.length === 0) {
      toast.error('No hay warnings activos para enviar.');
      return;
    }

    setSendingToAi(true);
    setAiSuggestedContent('');
    const effectiveProvider: AIProvider = aiProvider === 'copilot' && !githubToken ? 'yemoda' : aiProvider;
    if (effectiveProvider !== aiProvider) {
      toast.info('Copilot no está disponible en tu cuenta. Se usará Yemoda AI para esta solicitud.');
    }
    try {
      let latestDiff: string | null = null;
      try {
        const history = await tasksService.getTaskHistory(task.id_task);
        latestDiff = history[0]?.push_diff_text ?? null;
      } catch {
        latestDiff = null;
      }

      const promptToSend = aiModalPrompt.trim() || `Analiza y propone correcciones para la tarea ${task.title}`;
      const payload = {
        provider: effectiveProvider,
        model: aiModel || undefined,
        messages: [{ role: 'user' as const, content: promptToSend }],
        stream: effectiveProvider === 'copilot',
        ...(effectiveProvider === 'copilot' && githubToken ? { github_token: githubToken } : {}),
        context_type: 'ai_fix',
        context_data: {
          task_id: task.id_task,
          task_title: task.title,
          repo: repoFullName,
          branch: aiSourceBranch,
          file_path: aiSourcePath,
          warnings: activeWarningsPayload,
          file_content: aiSourceContent,
          diff: latestDiff,
        },
      };

      if (effectiveProvider === 'copilot') {
        let aggregated = '';
        await chatService.stream(payload, (chunk) => {
          aggregated += chunk;
          setAiSuggestedContent(extractBestCodeCandidate(aggregated));
        });
        const finalResult = extractBestCodeCandidate(aggregated) || aggregated.trim();
        if (!finalResult.trim()) {
          toast.error('La IA no devolvió código aplicable. Reintenta o cambia proveedor/modelo.');
        } else {
          await tasksService.createAiReviewResult({
            task: task.id_task,
            provider: effectiveProvider,
            model_name: aiModel || null,
            result_text: finalResult,
          });
        }
      } else {
        const response = await chatService.send(payload);
        const raw = response || '';
        const extracted = extractBestCodeCandidate(raw);
        setAiSuggestedContent(extracted);
        const finalResult = extracted || raw.trim();
        if (!finalResult.trim()) {
          toast.error('La IA no devolvió código aplicable. Reintenta o cambia proveedor/modelo.');
        } else {
          await tasksService.createAiReviewResult({
            task: task.id_task,
            provider: effectiveProvider,
            model_name: aiModel || null,
            result_text: finalResult,
          });
        }
      }

      toast.success('Respuesta recibida desde IA.');
    } catch (err) {
      if (err instanceof ApiRequestError && effectiveProvider === 'copilot' && (err.status === 401 || err.status === 403)) {
        toast.error('Tu cuenta no tiene acceso activo a GitHub Copilot. Cambia a Yemoda AI o activa Copilot.');
      } else {
        const detail = err instanceof ApiRequestError
          ? String(err.body?.detail ?? '')
          : err instanceof Error ? err.message : '';
        if (aiProvider === 'yemoda' && /unavailable|temporarily|down|service/i.test(detail)) {
          toast.error('Servicio de IA temporalmente no disponible.');
        } else {
          toast.error('No se pudo enviar el prompt a IA.');
        }
      }
    } finally {
      setSendingToAi(false);
    }
  };

  const openAiCodeModal = async () => {
    if (!task) return;
    const activeWarningsPayload = warnings.filter((w) => w.status === 'active');
    if (activeWarningsPayload.length === 0) {
      toast.error('No hay warnings activos para enviar.');
      return;
    }

    setShowAiCodeModal(true);
    setAiSuggestedContent('');
    setAiSourceLoading(true);

    let nextBranch = 'main';
    let nextPath = '';
    let nextContent = '';
    try {
      try {
        const aiFixPayload = await tasksService.getAiFixPrompt(task.id_task);
        setAiModalPrompt(aiFixPayload.copy_prompt?.trim() || '');
      } catch {
        setAiModalPrompt('');
      }

      const history = await tasksService.getTaskHistory(task.id_task);
      nextBranch = history[0]?.push_ref?.replace('refs/heads/', '') || 'main';
      nextPath = extractFirstFilePathFromDiff(history[0]?.push_diff_text ?? null);

      if (!nextPath) {
        const warningPath = activeWarningsPayload
          .map((warning) => extractFilePathFromWarningMessage(warning.message))
          .find(Boolean);
        if (warningPath) nextPath = warningPath;
      }

      if (repoFullName && nextPath) {
        const result = await githubService.getContents(repoFullName, nextPath, nextBranch);
        const fileData = Array.isArray(result) ? result[0] : result;
        nextContent = fileData.content ? atob(fileData.content.replace(/\n/g, '')) : '';
      }
    } catch {
      // Keep defaults if source retrieval fails; user can still request AI using warnings context.
    } finally {
      setAiSourceBranch(nextBranch);
      setAiSourcePath(nextPath);
      setAiSourceContent(nextContent);
      setAiSourceLoading(false);
      if (!nextPath) {
        toast.error('No se detectó el archivo automáticamente. Indica la ruta manualmente en el modal.');
      }
    }
  };

  const handleLoadSourceFile = async () => {
    if (!repoFullName || !aiSourcePath.trim()) {
      toast.error('Indica la ruta del archivo para cargar el código actual.');
      return;
    }
    setAiSourceLoading(true);
    try {
      const result = await githubService.getContents(repoFullName, aiSourcePath.trim(), aiSourceBranch || 'main');
      const fileData = Array.isArray(result) ? result[0] : result;
      const content = fileData.content ? atob(fileData.content.replace(/\n/g, '')) : '';
      setAiSourceContent(content);
      toast.success('Código actual cargado.');
    } catch {
      toast.error('No se pudo cargar ese archivo. Verifica ruta y branch.');
    } finally {
      setAiSourceLoading(false);
    }
  };

  const handleCommitAiFix = async () => {
    if (!task || !repoFullName) {
      toast.error('No hay repositorio vinculado para hacer commit.');
      return;
    }
    if (!aiSourcePath || !aiSuggestedContent.trim()) {
      toast.error('No hay propuesta de código para confirmar.');
      return;
    }

    setCommittingAiFix(true);
    try {
      await githubService.commitChanges({
        repo: repoFullName,
        branch: aiSourceBranch || 'main',
        message: `feat: ai fix tarea #${task.id_task}`,
        files: [{ path: aiSourcePath, content: aiSuggestedContent }],
      });
      toast.success('Commit / push realizado con los cambios de IA.');
      setShowAiCodeModal(false);
    } catch (err) {
      const detail = err instanceof ApiRequestError
        ? String(err.body?.detail ?? 'Error desconocido')
        : err instanceof Error ? err.message : 'Error desconocido';
      toast.error('No se pudo confirmar el commit / push.', { description: detail });
    } finally {
      setCommittingAiFix(false);
    }
  };

  useEffect(() => {
    if (!task) return;

    setIsEditingTask(false);
    setTaskForm({
      title: task.title,
      description: task.description ?? '',
      status: task.status != null ? String(task.status) : '',
      priority: task.priority != null ? String(task.priority) : '',
      assignedTo: currentTaskAssignments.length > 0
        ? currentTaskAssignments.map((assignment) => String(assignment.assigned_to))
        : task.assigned_to != null ? [String(task.assigned_to)] : [],
      dueDate: task.due_date ?? '',
    });
  }, [task, currentTaskAssignments]);

  useEffect(() => {
    if (!task) return;

    let cancelled = false;
    const targetTaskId = task.id_task;

    setEditingCommentId(null);
    setEditingCommentContent('');
    setNewComment('');
    setComments([]);
    setWarnings([]);
    setWarningsPanelOpen(false);
    setLoadingComments(true);
    setLoadingWarnings(true);

    tasksService.listComments(targetTaskId)
      .then((nextComments) => {
        if (!cancelled) setComments(nextComments);
      })
      .catch(() => {
        if (!cancelled) setComments([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingComments(false);
      });

    tasksService.listWarnings({ task_id: targetTaskId, status: 'active' })
      .then((nextWarnings) => {
        if (!cancelled) setWarnings(nextWarnings);
      })
      .catch(() => {
        if (!cancelled) setWarnings([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingWarnings(false);
      });

    setLoadingAiReviewResults(true);
    tasksService.listAiReviewResults(targetTaskId)
      .then((results) => {
        if (!cancelled) setAiReviewResults(results);
      })
      .catch(() => {
        if (!cancelled) setAiReviewResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingAiReviewResults(false);
      });

    return () => {
      cancelled = true;
    };
  }, [task?.id_task]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !newComment.trim()) return;
    setSendingComment(true);
    try {
      const created = await tasksService.addComment(task.id_task, newComment.trim(), currentUserId ?? undefined);
      const createdWithUser = created.user == null && currentUserId != null
        ? { ...created, user: currentUserId }
        : created;
      setComments((prev) => [...prev, createdWithUser]);
      setNewComment('');
      toast.success('Comentario agregado');
    } catch {
      toast.error('Error al agregar comentario');
    } finally {
      setSendingComment(false);
    }
  };

  const handleStartEditComment = (comment: ApiTaskComment) => {
    setEditingCommentId(comment.id_comment);
    setEditingCommentContent(comment.content);
  };

  const handleUpdateComment = async (commentId: number) => {
    if (!editingCommentContent.trim()) return;
    try {
      const updated = await tasksService.updateComment(commentId, { content: editingCommentContent.trim() });
      setComments((prev) => prev.map((c) => (c.id_comment === commentId ? updated : c)));
      setEditingCommentId(null);
      setEditingCommentContent('');
      toast.success('Comentario actualizado');
    } catch {
      toast.error('No se pudo actualizar el comentario (revisa si el backend lo soporta).');
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!window.confirm('¿Eliminar comentario?')) return;
    try {
      await tasksService.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id_comment !== commentId));
      toast.success('Comentario eliminado');
    } catch {
      toast.error('No se pudo eliminar el comentario (revisa si el backend lo soporta).');
    }
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditTask) {
      toast.error('Tu rol no puede editar historias.');
      return;
    }
    if (!task || !taskForm.title.trim()) return;

    setSavingTask(true);
    try {
      const nextStatusId = taskForm.status ? Number(taskForm.status) : null;
      const shouldSetCompleted = nextStatusId != null && doneStatusIds.has(nextStatusId);
      const updated = await tasksService.update(task.id_task, {
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || null,
        status: nextStatusId,
        priority: taskForm.priority ? Number(taskForm.priority) : null,
        assigned_to: taskForm.assignedTo.length > 0 ? Number(taskForm.assignedTo[0]) : null,
        due_date: taskForm.dueDate || null,
        completed_at: shouldSetCompleted ? (task.completed_at ?? new Date().toISOString()) : null,
      });

      const nextAssignedIds = new Set(taskForm.assignedTo.map((value) => Number(value)));
      const currentAssignedIds = new Set(currentTaskAssignments.map((assignment) => assignment.assigned_to));

      const assignmentsToCreate = Array.from(nextAssignedIds).filter((assignedId) => !currentAssignedIds.has(assignedId));
      const assignmentsToDelete = currentTaskAssignments.filter((assignment) => !nextAssignedIds.has(assignment.assigned_to));

      await Promise.all([
        ...assignmentsToCreate.map((assignedId) => tasksService.createAssignment({ task: task.id_task, assigned_to: assignedId })),
        ...assignmentsToDelete.map((assignment) => tasksService.deleteAssignment(assignment.id_assignment)),
      ]);

      onTaskUpdated?.(updated);
      setIsEditingTask(false);
      toast.success('Historia actualizada');
    } catch {
      toast.error('Error al actualizar la historia');
    } finally {
      setSavingTask(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!task || !onDeleteTask) return;
    if (!canDeleteTask) {
      toast.error('Solo Product Owner o Project Manager pueden eliminar historias.');
      return;
    }

    if (!window.confirm('¿Eliminar esta historia? Esta acción no se puede deshacer.')) {
      return;
    }

    setDeletingTask(true);
    try {
      await onDeleteTask(task);
    } finally {
      setDeletingTask(false);
    }
  };

  const handleDeleteWarning = async (warningId: number) => {
    if (!canEditTask) {
      toast.error('Tu rol no puede eliminar warnings.');
      return;
    }
    if (!window.confirm('¿Eliminar este warning?')) return;

    setDeletingWarningId(warningId);
    try {
      await tasksService.deleteWarning(warningId);
      setWarnings((prev) => prev.filter((w) => w.id_warning !== warningId));
      toast.success('Warning eliminado.');
    } catch {
      toast.error('No se pudo eliminar el warning.');
    } finally {
      setDeletingWarningId(null);
    }
  };

  const handleChangeBoardColumn = async (columnId: number | null) => {
    if (!task || !canEditTask) return;
    setSavingBoardColumn(true);
    try {
      const updated = await tasksService.update(task.id_task, { board_column: columnId });
      onTaskUpdated?.(updated);
      toast.success('Columna actualizada.');
    } catch {
      toast.error('No se pudo cambiar la columna.');
    } finally {
      setSavingBoardColumn(false);
    }
  };

  const handleChangeSprint = async (sprintId: number | null) => {
    if (!task || !canEditTask) return;
    setSavingSprint(true);
    try {
      const updated = await tasksService.update(task.id_task, { sprint: sprintId });
      onTaskUpdated?.(updated);
      toast.success('Sprint actualizado.');
    } catch {
      toast.error('No se pudo actualizar el sprint.');
    } finally {
      setSavingSprint(false);
    }
  };

  const handleDeleteSelectedWarnings = async () => {
    if (selectedWarningIds.size === 0 || !canEditTask) return;
    setDeletingSelectedWarnings(true);
    const ids = Array.from(selectedWarningIds);
    const results = await Promise.allSettled(ids.map((id) => tasksService.deleteWarning(id)));
    const succeeded = ids.filter((_, i) => results[i].status === 'fulfilled');
    if (succeeded.length > 0) {
      setWarnings((prev) => prev.filter((w) => !succeeded.includes(w.id_warning)));
      setSelectedWarningIds(new Set());
    }
    const failed = ids.length - succeeded.length;
    if (failed > 0) toast.error(`No se pudieron eliminar ${failed} warning(s).`);
    else toast.success(`${succeeded.length} warning(s) eliminado(s).`);
    setDeletingSelectedWarnings(false);
  };

  const handleCreateAndAddTag = async () => {
    if (!onCreateTag || !newTagName.trim() || !task) return;
    setCreatingTag(true);
    try {
      const created = await onCreateTag(newTagName.trim(), newTagColor);
      await handleAddTaskTag(created.id_tag);
      setNewTagName('');
      setNewTagColor('#56697f');
      setShowNewTagForm(false);
      toast.success('Tag creado y asignado.');
    } catch {
      toast.error('No se pudo crear el tag.');
    } finally {
      setCreatingTag(false);
    }
  };

  const handleAddTaskTag = async (tagId: number) => {
    if (!task || !canEditTask) return;
    if (task.tags.includes(tagId)) return;
    setSavingTagId(tagId);
    try {
      const updated = await tasksService.update(task.id_task, {
        tags: [...task.tags, tagId],
      });
      onTaskUpdated?.(updated);
      setTagSearch('');
      toast.success('Tag agregado.');
    } catch {
      toast.error('No se pudo agregar el tag.');
    } finally {
      setSavingTagId(null);
    }
  };

  const handleRemoveTaskTag = async (tagId: number) => {
    if (!task || !canEditTask) return;
    setSavingTagId(tagId);
    try {
      const updated = await tasksService.update(task.id_task, {
        tags: task.tags.filter((id) => id !== tagId),
      });
      onTaskUpdated?.(updated);
      toast.success('Tag removido.');
    } catch {
      toast.error('No se pudo remover el tag.');
    } finally {
      setSavingTagId(null);
    }
  };

  const assignedNames = currentTaskAssignments.length > 0
    ? currentTaskAssignments.map((assignment) => userMap.get(assignment.assigned_to) ?? `#${assignment.assigned_to}`)
    : task?.assigned_to ? [userMap.get(task.assigned_to) ?? `#${task.assigned_to}`] : [];
  const isOverdue = task && !task.completed_at && task.due_date && new Date(task.due_date) < new Date();
  const activeWarnings = warnings.filter((w) => w.status === 'active');
  const showWarningsSidePanel = warningsPanelOpen && (loadingWarnings || activeWarnings.length > 0);

  const selectedTaskTags = useMemo(() => {
    if (!task) return [] as ApiTag[];
    return tags.filter((tag) => task.tags.includes(tag.id_tag));
  }, [tags, task]);

  const searchableTags = useMemo(() => {
    if (!task) return [] as ApiTag[];
    const query = tagSearch.trim().toLowerCase();
    return tags
      .filter((tag) => !task.tags.includes(tag.id_tag))
      .filter((tag) => (query ? tag.name.toLowerCase().includes(query) : true))
      .slice(0, 8);
  }, [tags, task, tagSearch]);

  return (
    <>
      <AnimatePresence>
        {task && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-30 bg-black/20"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <div
        className={`fixed top-0 right-0 h-full z-40 transition-all duration-300 ease-in-out ${showWarningsSidePanel ? 'w-[760px]' : 'w-[420px]'} ${
          task ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {task && (
          <div className="h-full flex min-w-0">
            <div className="w-[420px] min-w-0 bg-card border-l border-border flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-secondary/50 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <WarningBadge
                  count={activeWarnings.length}
                  showWhenZero
                  onClick={activeWarnings.length > 0 ? () => setWarningsPanelOpen((s) => !s) : undefined}
                  disabled={activeWarnings.length === 0}
                  className={warningsPanelOpen ? 'ring-1 ring-warning/40' : ''}
                />
              </div>
              <div className="flex items-center gap-1.5">
                {!isEditingTask && canEditTask && (
                  <button
                    onClick={() => setIsEditingTask(true)}
                    className="inline-flex items-center gap-1 h-6 px-2 border border-border rounded-[3px] text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="w-3 h-3" /> Editar
                  </button>
                )}
                {projectId != null && (
                  <button
                    onClick={openBranchModal}
                    className="inline-flex items-center gap-1 h-6 px-2 border border-border rounded-[3px] text-[10px] text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                  >
                    <GitBranch className="w-3 h-3" /> Branch
                  </button>
                )}
                <button
                  onClick={() => void handleGenerateAiPrompt()}
                  disabled={generatingAiPrompt}
                  className="inline-flex items-center gap-1 h-6 px-2 border border-border rounded-[3px] text-[10px] text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-50"
                  title="Genera el prompt con warnings activos y lo copia al portapapeles"
                >
                  {generatingAiPrompt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
                  {generatingAiPrompt ? 'Generando...' : 'Copiar prompt'}
                </button>
                <button
                  onClick={() => void openAiCodeModal()}
                  disabled={sendingToAi || loadingWarnings}
                  className="inline-flex items-center gap-1 h-6 px-2 border border-border rounded-[3px] text-[10px] text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-50"
                  title="Abre la revisión de código con IA"
                >
                  <Send className="w-3 h-3" />
                  Enviar a IA
                </button>
                <button onClick={onClose} className="p-1 rounded-[3px] hover:bg-surface-secondary transition-colors">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Title & Description */}
              {isEditingTask ? (
                <form onSubmit={handleSaveTask} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1">Titulo</label>
                    <input
                      type="text"
                      required
                      value={taskForm.title}
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                      className="w-full h-7 bg-surface-secondary border border-border rounded-[3px] px-2.5 text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1">Descripcion</label>
                    <textarea
                      rows={3}
                      value={taskForm.description}
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-surface-secondary border border-border rounded-[3px] px-2.5 py-1.5 text-[11px] resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1">Prioridad</label>
                    <select
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, priority: e.target.value }))}
                      className="w-full h-7 bg-surface-secondary border border-border rounded-[3px] px-2.5 text-[11px]"
                    >
                      <option value="">Sin prioridad</option>
                      {priorities.map((p) => (
                        <option key={p.id_priority} value={p.id_priority}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1">Fecha limite</label>
                    <DatePickerField
                      value={taskForm.dueDate}
                      onChange={(value) => setTaskForm((prev) => ({ ...prev, dueDate: value }))}
                      minDate={minDueDate}
                      maxDate={maxDueDate}
                      placeholder="Selecciona una fecha"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1">Asignado</label>
                    <TaskAssigneePicker
                      users={assignableUsers}
                      selectedIds={taskForm.assignedTo.map((value) => Number(value))}
                      onChange={(selectedIds) => setTaskForm((prev) => ({
                        ...prev,
                        assignedTo: selectedIds.map((id) => String(id)),
                      }))}
                      disabled={!canEditAssignment}
                      emptyText="Sin personas asignadas"
                    />
                    {!canEditAssignment && (
                      <p className="text-[10px] text-muted-foreground mt-1">Tu rol no puede reasignar tareas.</p>
                    )}
                    {canEditAssignment && (
                      <p className="text-[10px] text-muted-foreground mt-1">La primera persona seleccionada se mantiene como responsable principal para compatibilidad.</p>
                    )}
                  </div>

                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.06em] mb-2 flex items-center gap-1.5">
                      <ShieldAlert className="w-3 h-3" /> Resultados IA ({aiReviewResults.length})
                    </p>
                    {loadingAiReviewResults ? (
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" /> Cargando resultados…
                      </div>
                    ) : aiReviewResults.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground">Aún no hay resultados de IA guardados.</p>
                    ) : (
                      <div className="space-y-2">
                        {aiReviewResults.map((result) => (
                          <div key={result.id_review_result} className="rounded-[4px] border border-border bg-surface-secondary/30 p-2.5 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-[0.06em]">
                                <span className="rounded-full border border-border px-1.5 py-0.5 text-foreground">{result.provider}</span>
                                <span>{result.model_name ?? 'sin modelo'}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">{formatCommentTimestamp(result.created_at)}</span>
                            </div>
                            <p className="text-[11px] text-foreground whitespace-pre-wrap leading-relaxed">
                              {result.result_text}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1">                    {canDeleteTask && (
                      <button
                        type="button"
                        onClick={handleDeleteTask}
                        disabled={deletingTask}
                        className="h-7 px-3 border border-destructive/30 rounded-[3px] text-[11px] text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      >
                        {deletingTask ? 'Eliminando…' : 'Eliminar'}
                      </button>
                    )}                    <button
                      type="button"
                      onClick={() => setIsEditingTask(false)}
                      className="h-7 px-3 border border-border rounded-[3px] text-[11px]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={savingTask}
                      className="h-7 px-3 bg-primary text-primary-foreground rounded-[3px] text-[11px] disabled:opacity-50"
                    >
                      {savingTask ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <div>
                    <h2 className="text-[14px] font-semibold text-foreground leading-snug">{task.title}</h2>
                  </div>
                  {task.description && (
                    <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed">{task.description}</p>
                  )}
                </div>
              )}

              {/* Metadata */}
              <div className="bg-surface-secondary/50 rounded-[4px] p-3 space-y-2">
                {assignedNames.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-[0.06em]">Asignado</span>
                    <div className="text-[11px] text-foreground flex items-center gap-1 flex-wrap justify-end max-w-[220px]">
                      <User className="w-3 h-3 shrink-0" />
                      <span className="text-right">{assignedNames.join(', ')}</span>
                    </div>
                  </div>
                )}
                {task.due_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-[0.06em]">Fecha límite</span>
                    <span className={`text-[11px] flex items-center gap-1 ${isOverdue ? 'text-destructive font-semibold' : 'text-foreground'}`}>
                      <Calendar className="w-3 h-3" />{task.due_date}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-[0.06em]">Creada</span>
                  <span className="text-[11px] text-muted-foreground">{task.created_at.slice(0, 10)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-[0.06em]">Sprint</span>
                  <select
                    value={task.sprint ?? ''}
                    disabled={!canEditTask || savingSprint}
                    onChange={(e) => void handleChangeSprint(e.target.value ? Number(e.target.value) : null)}
                    className="h-6 rounded-[3px] border border-border bg-surface-secondary px-1.5 text-[10px] disabled:opacity-60"
                  >
                    <option value="">Sin sprint</option>
                    {sprints.map((sprint) => (
                      <option key={sprint.id_sprint} value={sprint.id_sprint}>{sprint.name}</option>
                    ))}
                  </select>
                </div>
                {boardColumnsByBoard && boardColumnsByBoard.size > 0 && (() => {
                  const allBoards = Array.from(boardColumnsByBoard.entries());
                  const currentBoard = allBoards.find(([, cols]) => cols.some((c) => c.id_column === task.board_column));
                  const boardId = currentBoard?.[0] ?? null;
                  const boardCols = boardId ? (boardColumnsByBoard.get(boardId) ?? []) : [];
                  return (
                    <div className="pt-1 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-[0.06em]">Board</span>
                        <select
                          value={boardId ?? ''}
                          disabled={!canEditTask || savingBoardColumn}
                          onChange={(e) => {
                            const newBoardId = e.target.value ? Number(e.target.value) : null;
                            const firstCol = newBoardId ? (boardColumnsByBoard.get(newBoardId) ?? []).find((c) => !c.is_final)?.id_column ?? null : null;
                            void handleChangeBoardColumn(firstCol);
                          }}
                          className="h-6 rounded-[3px] border border-border bg-surface-secondary px-1.5 text-[10px] disabled:opacity-60"
                        >
                          <option value="">Sin board</option>
                          {allBoards.map(([bid]) => (
                            <option key={bid} value={bid}>{boardNames?.get(bid) ?? `Board ${bid}`}</option>
                          ))}
                        </select>
                      </div>
                      {boardId != null && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-[0.06em]">Columna</span>
                          <select
                            value={task.board_column ?? ''}
                            disabled={!canEditTask || savingBoardColumn}
                            onChange={(e) => void handleChangeBoardColumn(e.target.value ? Number(e.target.value) : null)}
                            className="h-6 rounded-[3px] border border-border bg-surface-secondary px-1.5 text-[10px] disabled:opacity-60"
                          >
                            <option value="">Sin columna</option>
                            {boardCols.map((col) => (
                              <option key={col.id_column} value={col.id_column}>{col.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Task tags */}
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.06em] mb-2">
                  Tags
                </p>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    placeholder="Buscar tags..."
                    className="w-full h-7 bg-surface-secondary border border-border rounded-[3px] px-2.5 text-[11px]"
                    disabled={!canEditTask}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTaskTags.length > 0 ? selectedTaskTags.map((tag) => (
                      <span
                        key={tag.id_tag}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[10px]"
                      >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color || '#56697f' }} />
                        {tag.name}
                        {canEditTask && (
                          <button
                            type="button"
                            onClick={() => void handleRemoveTaskTag(tag.id_tag)}
                            disabled={savingTagId === tag.id_tag}
                            className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    )) : <span className="text-[11px] text-muted-foreground">Sin tags.</span>}
                  </div>
                  {canEditTask && (
                    <div className="flex flex-wrap gap-1.5">
                      {searchableTags.length > 0 ? searchableTags.map((tag) => (
                        <button
                          key={tag.id_tag}
                          type="button"
                          onClick={() => void handleAddTaskTag(tag.id_tag)}
                          disabled={savingTagId === tag.id_tag}
                          className="inline-flex items-center gap-1 rounded-[3px] border border-border bg-card px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-50"
                        >
                          {savingTagId === tag.id_tag ? <Loader2 className="w-3 h-3 animate-spin" /> : <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color || '#56697f' }} />}
                          {tag.name}
                        </button>
                      )) : <span className="text-[10px] text-muted-foreground">No hay tags para agregar.</span>}
                    </div>
                  )}
                  {canEditTask && onCreateTag && (
                    <button
                      type="button"
                      onClick={() => setShowNewTagForm(true)}
                      className="inline-flex items-center gap-1 rounded-[3px] border border-dashed border-border px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors mt-0.5"
                    >
                      <Plus className="w-3 h-3" /> Nuevo tag
                    </button>
                  )}
                </div>
              </div>

              {/* Comments */}
              <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.06em] mb-2 flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3" /> Comentarios ({comments.length})
                  </p>
                  {loadingComments ? (
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" /> Cargando…
                    </div>
                  ) : comments.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">Sin comentarios aún.</p>
                  ) : (
                    <div className="space-y-2">
                      {comments.map((c) => (
                        <div key={c.id_comment} className="p-2.5 bg-surface-secondary/50 rounded-[4px]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-medium text-foreground">
                              {c.user ? (userMap.get(c.user) ?? `User #${c.user}`) : 'Sistema'}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground">{formatCommentTimestamp(c.created_at)}</span>
                              {currentUserId != null && c.user === currentUserId && (
                                <>
                                  <button
                                    onClick={() => handleStartEditComment(c)}
                                    className="text-muted-foreground hover:text-foreground"
                                    title="Editar comentario"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteComment(c.id_comment)}
                                    className="text-muted-foreground hover:text-destructive"
                                    title="Eliminar comentario"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {editingCommentId === c.id_comment ? (
                            <div className="space-y-1.5">
                              <input
                                type="text"
                                value={editingCommentContent}
                                onChange={(e) => setEditingCommentContent(e.target.value)}
                                className="w-full h-7 bg-card border border-border rounded-[3px] px-2 text-[11px]"
                              />
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleUpdateComment(c.id_comment)}
                                  className="h-6 px-2 bg-primary text-primary-foreground rounded-[3px] text-[10px]"
                                >
                                  Guardar
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingCommentId(null);
                                    setEditingCommentContent('');
                                  }}
                                  className="h-6 px-2 border border-border rounded-[3px] text-[10px]"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[11px] text-muted-foreground leading-relaxed">{c.content}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add comment form */}
                  <form onSubmit={handleAddComment} className="mt-2 flex gap-1.5">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Agregar comentario…"
                      className="flex-1 h-7 bg-surface-secondary border border-border rounded-[3px] px-2.5 text-[11px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/20"
                    />
                    <button
                      type="submit"
                      disabled={sendingComment || !newComment.trim()}
                      className="h-7 px-2.5 bg-primary hover:bg-primary-hover text-primary-foreground rounded-[3px] text-[11px] font-medium transition-colors disabled:opacity-50"
                    >
                      <Send className="w-3 h-3" />
                    </button>
                  </form>
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-border shrink-0">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <GitCommit className="w-3 h-3" /> ID: {task.id_task}
                  </span>
                  <button
                    onClick={onClose}
                    className="px-3 py-1 bg-surface-secondary hover:bg-accent text-foreground text-[11px] font-medium rounded-[3px] transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
              </div>

              {showWarningsSidePanel && (
                <div className="flex-1 min-w-0 border-l border-border bg-card flex flex-col">
                  <div className="px-4 py-3 border-b border-border bg-surface-secondary shrink-0">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-warning" /> Warnings y Conexiones
                      </p>
                      {canEditTask && activeWarnings.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedWarningIds.size === activeWarnings.length) {
                                setSelectedWarningIds(new Set());
                              } else {
                                setSelectedWarningIds(new Set(activeWarnings.map((w) => w.id_warning)));
                              }
                            }}
                            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {selectedWarningIds.size === activeWarnings.length ? 'Deselect.' : 'Sel. todo'}
                          </button>
                          {selectedWarningIds.size > 0 && (
                            <button
                              type="button"
                              onClick={() => void handleDeleteSelectedWarnings()}
                              disabled={deletingSelectedWarnings}
                              className="inline-flex items-center gap-1 rounded-[3px] border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] text-destructive hover:bg-destructive/20 disabled:opacity-50"
                            >
                              {deletingSelectedWarnings ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                              Eliminar ({selectedWarningIds.size})
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="rounded-[4px] border border-border bg-surface-secondary/30 p-2.5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.06em]">Proveedor IA</p>
                        {loadingAiModels && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setAiProvider('copilot')}
                          className={`h-7 rounded-[3px] border text-[10px] ${aiProvider === 'copilot' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
                        >
                          Usar mi GitHub Copilot
                        </button>
                        <button
                          type="button"
                          onClick={() => setAiProvider('yemoda')}
                          className={`h-7 rounded-[3px] border text-[10px] ${aiProvider === 'yemoda' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
                        >
                          Usar Yemoda AI
                        </button>
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Modelo</label>
                        <select
                          value={aiModel}
                          onChange={(e) => setAiModel(e.target.value)}
                          className="w-full h-7 rounded-[3px] border border-border bg-card px-2 text-[10px]"
                        >
                            {(aiProvider === 'copilot' ? (aiModels.copilot ?? []) : (aiModels.yemoda ?? [])).map((model) => (
                              <option key={model.id} value={model.id}>{model.id}</option>
                          ))}
                          {((aiProvider === 'copilot' ? (aiModels.copilot ?? []) : (aiModels.yemoda ?? [])).length === 0) && (
                            <option value="">Sin modelos disponibles</option>
                          )}
                        </select>
                      </div>
                    </div>

                    {loadingWarnings ? (
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" /> Cargando warnings…
                      </div>
                    ) : activeWarnings.length > 0 ? (
                      <div className="space-y-2">
                        {activeWarnings.map((w) => {
                          const sev = w.severity ?? 'warning';
                          const sevStyle = sev === 'critical'
                            ? 'bg-card border-l-2 border-l-destructive border-destructive/30'
                            : sev === 'info'
                            ? 'bg-card border-l-2 border-l-info border-info/30'
                            : 'bg-card border-l-2 border-l-warning border-warning/30';
                          const SevIcon = sev === 'critical' ? ShieldAlert : sev === 'info' ? Info : AlertTriangle;
                          const iconColor = sev === 'critical' ? 'text-destructive' : sev === 'info' ? 'text-info' : 'text-warning';
                          const isSelected = selectedWarningIds.has(w.id_warning);
                          return (
                          <div
                            key={w.id_warning}
                            className={`p-2.5 border rounded-[4px] ${sevStyle} ${isSelected ? 'ring-1 ring-primary' : ''}`}
                          >
                            <div className="flex items-start gap-2">
                              {canEditTask && (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    setSelectedWarningIds((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(w.id_warning)) next.delete(w.id_warning);
                                      else next.add(w.id_warning);
                                      return next;
                                    });
                                  }}
                                  className="mt-0.5 shrink-0 accent-primary"
                                />
                              )}
                              <div className="flex items-start justify-between gap-2 flex-1 min-w-0">
                                <div className="flex items-start gap-1.5 flex-1 min-w-0">
                                  <SevIcon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${iconColor}`} />
                                  <p className="text-[11px] text-foreground leading-relaxed">{w.message}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteWarning(w.id_warning)}
                                  disabled={!canEditTask || deletingWarningId === w.id_warning}
                                  className="inline-flex items-center gap-1 rounded-[3px] border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] text-destructive hover:bg-destructive/20 disabled:opacity-50 shrink-0"
                                >
                                  {deletingWarningId === w.id_warning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                  Eliminar
                                </button>
                              </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1 ml-5">{w.created_at.slice(0, 10)}</p>
                          </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">Sin warnings activos.</p>
                    )}

                  </div>
                </div>
              )}
          </div>
        )}
      </div>

      {showAiCodeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-6xl h-[82vh] rounded-[8px] border border-border bg-card shadow-xl flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-[13px] font-semibold text-foreground">Revisión de cambios IA</h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">Código actual a la izquierda y respuesta IA en escucha a la derecha.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAiCodeModal(false)}
                className="h-8 px-3 border border-border rounded-[4px] text-[11px] hover:bg-accent"
              >
                Cerrar
              </button>
            </div>

            <div className="px-4 py-3 border-b border-border bg-surface-secondary/20 space-y-2">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_160px_160px_auto] gap-2 items-center">
                <div className="h-8 rounded-[4px] border border-border bg-card px-2.5 text-[11px] text-muted-foreground flex items-center truncate">
                  {aiModalPrompt || 'Cargando prompt de corrección para esta tarea...'}
                </div>
                <select
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value as AIProvider)}
                  className="h-8 rounded-[4px] border border-border bg-card px-2 text-[11px]"
                >
                  <option value="copilot">Usar mi GitHub Copilot</option>
                  <option value="yemoda">Usar Yemoda AI</option>
                </select>
                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="h-8 rounded-[4px] border border-border bg-card px-2 text-[11px]"
                >
                  {(aiProvider === 'copilot' ? (aiModels.copilot ?? []) : (aiModels.yemoda ?? [])).map((model) => (
                    <option key={model.id} value={model.id}>{model.id}</option>
                  ))}
                  {((aiProvider === 'copilot' ? (aiModels.copilot ?? []) : (aiModels.yemoda ?? [])).length === 0) && (
                    <option value="">Sin modelos disponibles</option>
                  )}
                </select>
                <button
                  type="button"
                  onClick={() => void handleSendWarningsToAi()}
                  disabled={sendingToAi || aiSourceLoading || !aiModalPrompt.trim() || !aiSourcePath.trim() || !aiSourceContent.trim()}
                  className="h-8 px-3 bg-primary text-primary-foreground rounded-[4px] text-[11px] inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {sendingToAi ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  {sendingToAi ? 'En escucha...' : 'Mandar a IA'}
                </button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_120px_auto] gap-2 items-center">
                <input
                  type="text"
                  value={aiSourcePath}
                  onChange={(e) => setAiSourcePath(e.target.value)}
                  placeholder="Ruta del archivo (ej. app.py)"
                  className="h-8 rounded-[4px] border border-border bg-card px-2.5 text-[11px]"
                />
                <input
                  type="text"
                  value={aiSourceBranch}
                  onChange={(e) => setAiSourceBranch(e.target.value)}
                  placeholder="branch"
                  className="h-8 rounded-[4px] border border-border bg-card px-2.5 text-[11px]"
                />
                <button
                  type="button"
                  onClick={() => void handleLoadSourceFile()}
                  disabled={aiSourceLoading || !aiSourcePath.trim()}
                  className="h-8 px-3 border border-border rounded-[4px] text-[11px] hover:bg-accent disabled:opacity-50"
                >
                  {aiSourceLoading ? 'Cargando...' : 'Cargar código actual'}
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2">
              <div className="border-r border-border min-h-0 flex flex-col">
                <div className="px-3 py-2 border-b border-border bg-surface-secondary/30 text-[10px] text-muted-foreground">Código actual</div>
                <textarea
                  value={aiSourceLoading ? 'Cargando código actual...' : aiSourceContent}
                  readOnly
                  className="flex-1 min-h-0 bg-card p-3 text-[11px] font-mono text-muted-foreground resize-none focus:outline-none"
                />
              </div>
              <div className="min-h-0 flex flex-col">
                <div className="px-3 py-2 border-b border-border bg-surface-secondary/30 text-[10px] text-muted-foreground">Respuesta IA (código propuesto)</div>
                <textarea
                  value={aiSuggestedContent}
                  readOnly
                  className="flex-1 min-h-0 bg-card p-3 text-[11px] font-mono text-foreground resize-none focus:outline-none"
                />
              </div>
            </div>

            <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-2">
              <p className="text-[10px] text-muted-foreground">Si te gusta la propuesta, confirma commit/push. Solo se permite cuando la IA devuelve código aplicable.</p>
              <button
                type="button"
                onClick={() => void handleCommitAiFix()}
                disabled={committingAiFix || !aiSuggestedContent.trim() || !aiSourcePath || aiSuggestedContent === aiSourceContent}
                className="h-8 px-3 bg-primary text-primary-foreground rounded-[4px] text-[11px] inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {committingAiFix ? <Loader2 className="w-3 h-3 animate-spin" /> : <GitCommit className="w-3 h-3" />}
                {committingAiFix ? 'Confirmando...' : 'Commit / Push'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Branch creation modal */}
      {showBranchModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6">
          <div className="w-full max-w-sm rounded-[8px] border border-border bg-card overflow-hidden shadow-lg">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-[13px] font-semibold text-foreground flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-primary" /> Crear branch
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">Se creará una branch vinculada a la tarea #{task?.id_task}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowBranchModal(false)}
                className="p-1 rounded-[3px] hover:bg-surface-secondary transition-colors"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            {branchResult ? (
              /* Success state */
              <div className="px-4 py-4 space-y-3">
                <div className="rounded-[4px] bg-success/5 border border-success/20 px-3 py-2.5 space-y-1">
                  <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-success/80">Branch creada</p>
                  <p className="font-mono text-[12px] text-foreground font-medium">{branchResult.branch_name}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-medium text-muted-foreground">Comando de checkout</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 font-mono text-[11px] text-muted-foreground bg-surface-secondary/60 border border-border rounded-[3px] px-2.5 py-1.5 truncate">
                      {branchResult.checkout_command}
                    </code>
                    <button
                      type="button"
                      onClick={() => void handleCopyCheckout()}
                      className="h-8 w-8 shrink-0 flex items-center justify-center border border-border rounded-[4px] text-muted-foreground hover:text-foreground transition-colors"
                      title="Copiar"
                    >
                      {branchCopied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setShowBranchModal(false)}
                    className="h-8 px-4 bg-primary text-primary-foreground rounded-[4px] text-[11px] transition-opacity"
                  >
                    Listo
                  </button>
                </div>
              </div>
            ) : (
              /* Form state */
              <div className="px-4 py-4 space-y-4">
                {branchLoadingRepos ? (
                  <div className="flex items-center justify-center py-6 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span className="text-[12px]">Cargando repositorios…</span>
                  </div>
                ) : branchRepos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
                    <GitBranch className="w-6 h-6 text-muted-foreground/40" />
                    <p className="text-[12px] text-muted-foreground">No repositories connected to this project.</p>
                    <p className="text-[11px] text-muted-foreground/60">Vincula un repositorio en la pestaña Repositorios primero.</p>
                  </div>
                ) : (
                  <>
                    {branchRepos.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-foreground">Repositorio</label>
                        <select
                          value={branchSelectedRepo}
                          onChange={(e) => setBranchSelectedRepo(e.target.value)}
                          className="w-full h-9 rounded-[4px] border border-border bg-surface-secondary px-3 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                        >
                          <option value="">Seleccionar repositorio…</option>
                          {branchRepos.map((r) => (
                            <option key={r.id_repo} value={r.full_name}>{r.full_name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-foreground">Branch base</label>
                      <input
                        value={branchBase}
                        onChange={(e) => setBranchBase(e.target.value)}
                        placeholder="main"
                        className="w-full h-9 rounded-[4px] border border-border bg-surface-secondary px-3 text-[12px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                    </div>
                    <div className="rounded-[4px] bg-surface-secondary/40 border border-border/50 px-3 py-2">
                      <p className="text-[10px] text-muted-foreground">El nombre de la branch será generado automáticamente con el ID de la tarea como prefijo.</p>
                    </div>
                  </>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowBranchModal(false)}
                    className="h-8 px-3 border border-border rounded-[4px] text-[11px] hover:bg-accent transition-colors"
                  >
                    Cancelar
                  </button>
                  {!branchLoadingRepos && branchRepos.length > 0 && (
                  <button
                    type="button"
                    disabled={branchCreating || branchLoadingRepos || (branchRepos.length > 1 && !branchSelectedRepo)}
                    title={branchRepos.length > 1 && !branchSelectedRepo ? 'Selecciona un repositorio' : undefined}
                    onClick={() => void handleCreateBranch()}
                    className="h-8 px-4 bg-primary text-primary-foreground rounded-[4px] text-[11px] disabled:opacity-40 transition-opacity inline-flex items-center gap-1.5"
                  >
                    {branchCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : <GitBranch className="w-3 h-3" />}
                    Crear branch
                  </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New tag modal */}
      {showNewTagForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6">
          <form
            onSubmit={(e) => { e.preventDefault(); void handleCreateAndAddTag(); }}
            className="w-full max-w-sm rounded-[8px] border border-border bg-card overflow-hidden shadow-lg"
          >
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-[13px] font-semibold text-foreground">Nuevo tag</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Define un nombre y un color para el tag.</p>
            </div>
            <div className="px-4 py-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-foreground">Nombre</label>
                <input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="ej. Bug, Feature, Urgente…"
                  className="w-full h-9 rounded-[4px] border border-border bg-surface-secondary px-3 text-[12px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  autoFocus
                />
              </div>
              <div className="border-t border-border/60" />
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-foreground">Color</label>
                <TagColorPicker value={newTagColor} onChange={setNewTagColor} />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-border bg-surface-secondary/30">
              <button
                type="button"
                onClick={() => { setShowNewTagForm(false); setNewTagName(''); setNewTagColor('#56697f'); }}
                className="h-8 px-3 border border-border rounded-[4px] text-[11px] hover:bg-accent transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!newTagName.trim() || creatingTag}
                className="h-8 px-3 bg-primary text-primary-foreground rounded-[4px] text-[11px] disabled:opacity-40 transition-opacity inline-flex items-center gap-1"
              >
                {creatingTag ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Crear tag
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
