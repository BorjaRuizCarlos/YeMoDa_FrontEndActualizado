import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  X, Calendar, User, MessageSquare, AlertTriangle,
  GitCommit, Send, Loader2, Pencil, Trash2, Plus,
  GitBranch, Copy, Check, Info, ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import Prism from 'prismjs';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-yaml';
import { chatService, tasksService, githubService } from '../../services';
import { ApiRequestError } from '../../services/api';
import type { ApiTask, ApiTaskStatus, ApiTaskPriority, ApiTaskComment, ApiTaskWarning, ApiTaskAssignment, ApiTag, ChatModelsResponse, GitHubRepo, CreateBranchResponse, ApiBoardColumn, ApiSprint, ApiTaskAIReviewResult } from '../../services';
import { WarningBadge } from './WarningBadge';
import { TaskAssigneePicker } from './TaskAssigneePicker';
import { DatePickerField } from './DatePickerField';
import { TagColorPicker } from './TagColorPicker';
import { CodeDiffViewer } from './CodeDiffViewer';
import { TaskSubtasks } from './TaskSubtasks';
import { useAuth } from '../context/AuthContext';
import { handleAiQuotaError } from '../utils/aiQuota';

const DONE_STATUS_NAMES = new Set(['done', 'completada', 'completado']);
const EMPTY_ASSIGNABLE_USERS: Array<{ id: number; name: string }> = [];
const EMPTY_TASK_ASSIGNMENTS: ApiTaskAssignment[] = [];
const MAX_AI_FILE_LIST = 400;
const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  py: 'python',
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  json: 'json',
  css: 'css',
  scss: 'css',
  less: 'css',
  html: 'markup',
  htm: 'markup',
  xml: 'markup',
  yml: 'yaml',
  yaml: 'yaml',
  md: 'markdown',
  sh: 'bash',
  sql: 'sql',
  go: 'go',
  java: 'java',
  cs: 'csharp',
};
const AI_FIX_FILES_INSTRUCTION = [
  'Respond ONLY with a single valid JSON object, with no text outside the JSON and no markdown fences.',
  'Shape: {"files":[{"path":"relative/path","action":"create|modify|delete","content":"FULL file content"}]}',
  'You MAY create new files and modify existing ones. "content" must be the COMPLETE final file (not a diff).',
  'For "delete" you may omit "content". Use repository-root-relative paths.',
  'If no changes are needed, respond exactly: {"files":[]}.',
].join('\n');

// A .ipynb is large JSON (base64 cell outputs); sending it whole overflows the model context and
// surfaces as a 502. Keep only cell sources, and cap any oversized file before it reaches the AI.
const AI_MAX_FILE_CONTENT_CHARS = 100_000;

function stripNotebookForAi(content: string): string {
  try {
    const nb = JSON.parse(content) as { cells?: unknown };
    if (!nb || !Array.isArray(nb.cells)) return content;
    const parts: string[] = [];
    for (const cell of nb.cells as Array<Record<string, unknown>>) {
      if (!cell || typeof cell !== 'object') continue;
      const src = Array.isArray(cell.source)
        ? cell.source.join('')
        : typeof cell.source === 'string' ? cell.source : '';
      if (!src.trim()) continue;
      const cellType = typeof cell.cell_type === 'string' ? cell.cell_type : 'code';
      parts.push(`# ===== ${cellType} cell =====\n${src}`);
    }
    return parts.join('\n\n');
  } catch {
    return content;
  }
}

function sanitizeFileContentForAi(path: string, content: string): string {
  if (!content) return content;
  let out = content;
  if (path.toLowerCase().endsWith('.ipynb')) out = stripNotebookForAi(content);
  if (out.length > AI_MAX_FILE_CONTENT_CHARS) {
    out = `${out.slice(0, AI_MAX_FILE_CONTENT_CHARS)}\n\n... [truncated for AI: file too large] ...`;
  }
  return out;
}

type AiFileAction = 'create' | 'modify' | 'delete';

interface AiFileChange {
  path: string;
  action: AiFileAction;
  content: string;
}

/**
 * Parse the AI's JSON file-list response ({"files":[{path, action, content}]}).
 * Returns the (possibly empty) list, or null when the response is not a file-list
 * (so callers can fall back to the legacy diff/whole-content handling).
 */
export function parseAiFileList(raw: string): AiFileChange[] | null {
  if (!raw || !raw.trim()) return null;
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const files = (parsed as Record<string, unknown>).files;
  if (!Array.isArray(files)) return null;
  const result: AiFileChange[] = [];
  for (const item of files) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const path = typeof rec.path === 'string' ? rec.path.trim() : '';
    if (!path) continue;
    const rawAction = typeof rec.action === 'string' ? rec.action.toLowerCase() : 'modify';
    const action: AiFileAction = rawAction === 'create' || rawAction === 'delete' ? rawAction : 'modify';
    const content = typeof rec.content === 'string' ? rec.content : '';
    result.push({ path, action, content });
  }
  return result;
}

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

function decodeGitHubContent(content?: string): string {
  if (!content) return '';
  const compact = content.replace(/\n/g, '').trim();
  const looksBase64 = compact.length > 0
    && compact.length % 4 === 0
    && /^[A-Za-z0-9+/=]+$/.test(compact);

  if (!looksBase64) return content;

  try {
    return atob(compact);
  } catch {
    return content;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function detectLanguageFromFilename(filename: string): string | null {
  const lowerName = filename.toLowerCase();
  if (lowerName.endsWith('.dockerfile') || lowerName === 'dockerfile') return 'bash';
  const ext = lowerName.split('.').pop() ?? '';
  return LANGUAGE_BY_EXTENSION[ext] ?? null;
}

function highlightSourceCode(content: string, language: string | null): string {
  if (!content) return '';
  if (!language) return escapeHtml(content);

  const grammar = Prism.languages[language];
  if (!grammar) return escapeHtml(content);

  return Prism.highlight(content, grammar, language);
}

function highlightSourceCodeLines(content: string, language: string | null): string[] {
  if (!content) return [];
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  return lines.map((line) => {
    const safe = line.length > 0 ? line : ' ';
    return highlightSourceCode(safe, language);
  });
}

interface AiFilePatch {
  filename: string;
  patch: string;
}

function parseAiDiff(diffText: string): AiFilePatch[] {
  if (!diffText.trim()) return [];
  const sections = diffText.split(/^diff --git /m).filter((section) => section.trim());
  if (sections.length === 0) return [];

  const files: AiFilePatch[] = [];
  for (const section of sections) {
    const lines = section.split('\n');
    const headerMatch = lines[0]?.match(/a\/.+ b\/(.+)/);
    const filename = headerMatch ? headerMatch[1].trim() : '';
    const patchIndex = lines.findIndex((line) => line.startsWith('@@'));
    const patch = patchIndex >= 0 ? lines.slice(patchIndex).join('\n').trim() : '';
    if (filename && patch) {
      files.push({ filename, patch });
    }
  }

  return files;
}

export function applyUnifiedPatchToContent(originalContent: string, patch: string): string {
  const source = originalContent.replace(/\r\n/g, '\n');
  const sourceLines = source.split('\n');
  const patchLines = patch.replace(/\r\n/g, '\n').split('\n');

  const normalizeLine = (line: string) => line.replace(/\s+$/g, '');
  const sameLine = (a: string, b: string) => normalizeLine(a) === normalizeLine(b);
  const findNearestMatchingLine = (needle: string, preferredIndex: number): number => {
    if (!needle) return -1;
    const start = Math.max(0, preferredIndex - 25);
    const end = Math.min(sourceLines.length - 1, preferredIndex + 180);
    for (let i = start; i <= end; i += 1) {
      if (sameLine(sourceLines[i] ?? '', needle)) return i;
    }
    return -1;
  };

  let cursor = 0;
  let idx = 0;
  const output: string[] = [];
  let sawHunk = false;
  let skipped = 0;

  while (idx < patchLines.length) {
    const line = patchLines[idx];
    if (!line.startsWith('@@')) {
      idx += 1;
      continue;
    }

    const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    if (!hunkMatch) {
      throw new Error('Invalid hunk format in the diff.');
    }

    sawHunk = true;
    const oldStart = Number(hunkMatch[1]);
    let oldIndex = Math.max(0, oldStart - 1);

    // Fuzzy realignment: if line numbers are slightly off, align by first context/remove line.
    let probe = idx + 1;
    let anchor = '';
    while (probe < patchLines.length && !patchLines[probe].startsWith('@@')) {
      const probeLine = patchLines[probe];
      if (probeLine.startsWith(' ') || probeLine.startsWith('-')) {
        anchor = probeLine.slice(1);
        break;
      }
      probe += 1;
    }
    if (anchor && !sameLine(sourceLines[oldIndex] ?? '', anchor)) {
      const nearest = findNearestMatchingLine(anchor, oldIndex);
      if (nearest >= 0) oldIndex = nearest;
    }

    while (cursor < oldIndex && cursor < sourceLines.length) {
      output.push(sourceLines[cursor]);
      cursor += 1;
    }

    const tryRealignCursor = (expected: string): boolean => {
      const nearest = findNearestMatchingLine(expected, cursor);
      if (nearest < 0 || nearest === cursor) return false;
      while (cursor < nearest && cursor < sourceLines.length) {
        // Keep untouched lines when we advance to the nearest context anchor.
        output.push(sourceLines[cursor]);
        cursor += 1;
      }
      return true;
    };

    idx += 1;
    while (idx < patchLines.length && !patchLines[idx].startsWith('@@')) {
      const patchLine = patchLines[idx];

      if (patchLine.startsWith('```')) {
        idx += 1;
        continue;
      }

      if (patchLine.startsWith(' ')) {
        const expected = patchLine.slice(1);
        let actual = sourceLines[cursor] ?? '';
        if (!sameLine(actual, expected)) {
          const realigned = tryRealignCursor(expected);
          if (!realigned) {
            // Fuzzy mode: treat unmatched context as optional instead of failing hard.
            skipped += 1;
            idx += 1;
            continue;
          }
          actual = sourceLines[cursor] ?? '';
        }
        if (!sameLine(actual, expected)) {
          // Fuzzy mode fallback: keep going without consuming a source line.
          skipped += 1;
          idx += 1;
          continue;
        }
        output.push(actual);
        cursor += 1;
      } else if (patchLine.startsWith('-')) {
        const expected = patchLine.slice(1);
        let actual = sourceLines[cursor] ?? '';
        if (!sameLine(actual, expected)) {
          const realigned = tryRealignCursor(expected);
          if (!realigned) {
            const nearestRemove = findNearestMatchingLine(expected, cursor + 1);
            if (nearestRemove >= 0) {
              while (cursor < nearestRemove && cursor < sourceLines.length) {
                output.push(sourceLines[cursor]);
                cursor += 1;
              }
            } else {
              // Idempotent behavior: if the line is already gone, continue.
              skipped += 1;
              idx += 1;
              continue;
            }
          }
          actual = sourceLines[cursor] ?? '';
        }
        if (!sameLine(actual, expected)) {
          // Fuzzy mode fallback: assume line already removed.
          skipped += 1;
          idx += 1;
          continue;
        }
        cursor += 1;
      } else if (patchLine.startsWith('+')) {
        output.push(patchLine.slice(1));
      } else if (patchLine.startsWith('\\')) {
        // "\ No newline at end of file" marker, ignore.
      } else {
        let actual = sourceLines[cursor] ?? '';
        if (!sameLine(actual, patchLine)) {
          const realigned = tryRealignCursor(patchLine);
          if (!realigned) {
            skipped += 1;
            idx += 1;
            continue;
          }
          actual = sourceLines[cursor] ?? '';
        }
        if (!sameLine(actual, patchLine)) {
          skipped += 1;
          idx += 1;
          continue;
        }
        output.push(actual);
        cursor += 1;
      }

      idx += 1;
    }
  }

  if (!sawHunk) {
    throw new Error('The AI response does not contain applicable diff hunks.');
  }

  if (skipped > 0) {
    // The diff no longer aligns with the current file: applying it would silently
    // drop changes (e.g. a deletion that never happens). Fail loudly instead of
    // committing a partially-applied, corrupted file.
    throw new Error(`The diff did not align with the current file (${skipped} line(s) could not be matched). Retry the AI request or choose a different model.`);
  }

  while (cursor < sourceLines.length) {
    output.push(sourceLines[cursor]);
    cursor += 1;
  }

  return output.join('\n');
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
  canComment?: boolean;
  canTriggerAi?: boolean;
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
  canComment = true,
  canTriggerAi = true,
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUserId = useMemo(() => {
    const parsed = Number(user?.id ?? 0);
    return Number.isNaN(parsed) ? null : parsed;
  }, [user]);

  // Tracks the currently-selected task id so async handlers can detect a task switch
  // mid-request and discard stale results (the panel instance is reused across tasks).
  const activeTaskIdRef = useRef<number | null>(task?.id_task ?? null);

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
  const [aiModels, setAiModels] = useState<ChatModelsResponse>({ yemoda: [] });
  const [loadingAiModels, setLoadingAiModels] = useState(false);
  const [aiModel, setAiModel] = useState('');
  const [sendingToAi, setSendingToAi] = useState(false);
  const [showAiCodeModal, setShowAiCodeModal] = useState(false);
  const [aiSourceLoading, setAiSourceLoading] = useState(false);
  const [aiSourceBranch, setAiSourceBranch] = useState('main');
  const [aiSourcePath, setAiSourcePath] = useState('');
  const [aiSourceContent, setAiSourceContent] = useState('');
  const [aiRepoFiles, setAiRepoFiles] = useState<string[]>([]);
  const [aiRepoFilesLoading, setAiRepoFilesLoading] = useState(false);
  const [aiSuggestedContent, setAiSuggestedContent] = useState('');
  const [aiSuggestedPatches, setAiSuggestedPatches] = useState<AiFilePatch[]>([]);
  const [aiSelectedPatchFile, setAiSelectedPatchFile] = useState('');
  const [aiSuggestedFiles, setAiSuggestedFiles] = useState<AiFileChange[]>([]);
  const [aiSelectedFile, setAiSelectedFile] = useState('');
  const [aiModalPrompt, setAiModalPrompt] = useState('');
  const [committingAiFix, setCommittingAiFix] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
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

  const aiSourceLanguage = useMemo(
    () => detectLanguageFromFilename(aiSourcePath || ''),
    [aiSourcePath],
  );

  const highlightedAiSourceLines = useMemo(
    () => highlightSourceCodeLines(aiSourceContent, aiSourceLanguage),
    [aiSourceContent, aiSourceLanguage],
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
      toast.success(`Branch "${result.branch_name}" created`);
    } catch (err) {
      const detail = err instanceof ApiRequestError
        ? (err.body?.detail ?? 'Unknown error')
        : err instanceof Error ? err.message : 'Unknown error';
      toast.error('Could not create the branch', { description: detail });
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
      toast.error('Could not copy to clipboard');
    }
  };

  const handleGenerateAiPrompt = async () => {
    if (!task) return;
    if (!canTriggerAi) {
      toast.error('Your role cannot trigger AI actions.');
      return;
    }
    setGeneratingAiPrompt(true);
    try {
      const payload = await tasksService.getAiFixPrompt(task.id_task);
      if (!payload.copy_prompt?.trim()) {
        toast.error('The backend did not return a prompt to copy.');
        return;
      }
      await navigator.clipboard.writeText(payload.copy_prompt);
      toast.success('AI prompt copied to clipboard.', {
        description: `${payload.warnings_count} warning(s) included for task #${payload.task_id}.`,
      });
    } catch (err) {
      const detail = err instanceof ApiRequestError
        ? (err.body?.detail ?? 'Unknown error')
        : err instanceof Error ? err.message : 'Unknown error';
      toast.error('Could not generate the AI prompt.', { description: detail });
    } finally {
      setGeneratingAiPrompt(false);
    }
  };

  useEffect(() => {
    setLoadingAiModels(true);
    chatService.getModels()
      .then((models) => setAiModels(models))
      .catch(() => setAiModels({ yemoda: [] }))
      .finally(() => setLoadingAiModels(false));
  }, []);

  useEffect(() => {
    const options = aiModels.yemoda ?? [];
    setAiModel((current) => {
      if (current && options.some((model) => model.id === current)) return current;
      return options[0]?.id ?? '';
    });
  }, [aiModels]);

  useEffect(() => {
    const fileList = parseAiFileList(aiSuggestedContent);
    setAiSuggestedFiles(fileList ?? []);
    // Only fall back to legacy diff parsing when the response is NOT a JSON file-list.
    setAiSuggestedPatches(fileList ? [] : parseAiDiff(aiSuggestedContent));
  }, [aiSuggestedContent]);

  useEffect(() => {
    if (aiSuggestedPatches.length === 0) {
      setAiSelectedPatchFile('');
      return;
    }
    setAiSelectedPatchFile((current) => {
      if (current && aiSuggestedPatches.some((patch) => patch.filename === current)) return current;
      return aiSuggestedPatches[0].filename;
    });
  }, [aiSuggestedPatches]);

  useEffect(() => {
    if (aiSuggestedFiles.length === 0) {
      setAiSelectedFile('');
      return;
    }
    setAiSelectedFile((current) => {
      if (current && aiSuggestedFiles.some((file) => file.path === current)) return current;
      return aiSuggestedFiles[0].path;
    });
  }, [aiSuggestedFiles]);

  // True when the AI replied with the JSON file-list contract (even if the list is empty). In that
  // mode the commit path uses aiSuggestedFiles directly and the legacy diff/whole-file path is off.
  const aiIsFileListResponse = useMemo(
    () => parseAiFileList(aiSuggestedContent) !== null,
    [aiSuggestedContent],
  );

  const buildRefCandidates = (ref: string): string[] => {
    const candidates = [ref.trim(), 'main', 'master', ''];
    return Array.from(new Set(candidates));
  };

  const getContentsWithRefFallback = async (
    path: string,
    ref: string,
  ): Promise<{ result: Awaited<ReturnType<typeof githubService.getContents>>; resolvedRef: string }> => {
    if (!repoFullName) {
      throw new Error('No repository linked.');
    }

    let lastError: unknown = null;
    for (const candidateRef of buildRefCandidates(ref)) {
      try {
        const result = await githubService.getContents(repoFullName, path, candidateRef || undefined);
        return { result, resolvedRef: candidateRef };
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError ?? new Error('Could not fetch repository contents.');
  };

  // The commit endpoint requires a branch that already exists on the remote; it can't create one.
  // aiSourceBranch may be stale (a merged/deleted task push_ref from history), which would 400 the
  // commit — fatal for a brand-new file. Resolve to a real branch: keep the preferred one if it
  // exists, else fall back to main/master, else the first branch the repo actually has.
  const resolveCommitBranch = async (preferred: string): Promise<string> => {
    const fallback = preferred || 'main';
    if (!repoFullName) return fallback;
    try {
      const branches = await githubService.getBranches(repoFullName);
      const names = branches.map((b) => b.name).filter(Boolean);
      if (names.length === 0) return fallback;
      if (names.includes(fallback)) return fallback;
      if (names.includes('main')) return 'main';
      if (names.includes('master')) return 'master';
      return names[0];
    } catch {
      return fallback;
    }
  };

  const extractDirectoryEntries = (content: Awaited<ReturnType<typeof githubService.getContents>>) => {
    if (Array.isArray(content)) return content;
    if (content.type === 'dir' && 'items' in content) {
      const dirItems = (content as { items?: unknown }).items;
      if (Array.isArray(dirItems)) {
        return dirItems.filter((item): item is { type: 'file' | 'dir'; path: string } => {
          return typeof item === 'object'
            && item !== null
            && 'type' in item
            && 'path' in item
            && ((item as { type?: unknown }).type === 'file' || (item as { type?: unknown }).type === 'dir')
            && typeof (item as { path?: unknown }).path === 'string';
        });
      }
    }
    return [];
  };

  const loadRepoFiles = async (branch: string, preferredPath?: string): Promise<{ files: string[]; resolvedBranch: string }> => {
    if (!repoFullName) {
      setAiRepoFiles([]);
      return { files: [], resolvedBranch: branch };
    }

    setAiRepoFilesLoading(true);
    try {
      const root = await getContentsWithRefFallback('', branch);
      const effectiveBranch = root.resolvedRef;

      const queue: string[] = [''];
      const visited = new Set<string>();
      const collected: string[] = [];

      while (queue.length > 0 && collected.length < MAX_AI_FILE_LIST) {
        const currentPath = queue.shift() ?? '';
        if (visited.has(currentPath)) continue;
        visited.add(currentPath);

        const content = currentPath === ''
          ? root.result
          : await githubService.getContents(repoFullName, currentPath, effectiveBranch || undefined);
        const entries = extractDirectoryEntries(content);
        if (entries.length > 0) {
          for (const item of entries) {
            if (item.type === 'file') {
              collected.push(item.path);
              if (collected.length >= MAX_AI_FILE_LIST) break;
            } else if (item.type === 'dir') {
              queue.push(item.path);
            }
          }
        } else if (!Array.isArray(content) && content.type === 'file' && typeof content.path === 'string') {
          collected.push(content.path);
        }
      }

      const files = Array.from(new Set(collected)).sort((a, b) => a.localeCompare(b));
      setAiRepoFiles(files);

      if (preferredPath && files.includes(preferredPath)) {
        setAiSourcePath(preferredPath);
      } else {
        setAiSourcePath((current) => current || files[0] || '');
      }

      if (effectiveBranch && effectiveBranch !== branch) {
        setAiSourceBranch(effectiveBranch);
      }

      return { files, resolvedBranch: effectiveBranch || branch };
    } catch {
      setAiRepoFiles([]);
      toast.error('Could not load the repository file list.');
      return { files: [], resolvedBranch: branch };
    } finally {
      setAiRepoFilesLoading(false);
    }
  };

  const loadSourceFileContent = async (
    filePath: string,
    branch: string,
    showSuccessToast = false,
  ): Promise<string> => {
    if (!repoFullName || !filePath.trim()) return '';

    const { result, resolvedRef } = await getContentsWithRefFallback(filePath.trim(), branch || 'main');
    const fileData = Array.isArray(result) ? result.find((item) => item.type === 'file') : result;

    if (!fileData || fileData.type !== 'file') {
      throw new Error('The selected path does not correspond to a file.');
    }

    const decoded = decodeGitHubContent(fileData.content);
    setAiSourceContent(decoded);
    if (resolvedRef && resolvedRef !== branch) {
      setAiSourceBranch(resolvedRef);
    }
    if (showSuccessToast) toast.success('Current code loaded.');
    return decoded;
  };

  const handleSelectRepoFile = async (filePath: string) => {
    if (!filePath) return;
    setAiSourcePath(filePath);
    setAiSourceLoading(true);
    try {
      await loadSourceFileContent(filePath, aiSourceBranch || 'main', false);
    } catch {
      toast.error('Could not load the selected file.');
    } finally {
      setAiSourceLoading(false);
    }
  };

  const handleSendWarningsToAi = async () => {
    if (!task) return;
    const taskId = task.id_task;
    if (!canTriggerAi) {
      toast.error('Your role cannot trigger AI actions.');
      return;
    }
    const activeWarningsPayload = warnings.filter((w) => w.status === 'active').map((w) => ({
      id_warning: w.id_warning,
      severity: w.severity,
      message: w.message,
      created_at: w.created_at,
    }));

    if (activeWarningsPayload.length === 0) {
      toast.error('No active warnings to send.');
      return;
    }

    setSendingToAi(true);
    setAiSuggestedContent('');
    try {
      let latestDiff: string | null = null;
      try {
        const history = await tasksService.getTaskHistory(task.id_task);
        latestDiff = history[0]?.push_diff_text ?? null;
      } catch {
        latestDiff = null;
      }

      const basePrompt = aiModalPrompt.trim() || `Analyze and propose fixes for the task ${task.title}`;
      const promptToSend = `${basePrompt}\n\n${AI_FIX_FILES_INSTRUCTION}`;
      const payload = {
        model: aiModel || undefined,
        // Creating several whole files (e.g. scaffolding a frontend) needs more room than the
        // 4096 default, which would truncate the JSON file-list and make it unparseable.
        max_tokens: 16384,
        messages: [{ role: 'user' as const, content: promptToSend }],
        context_type: 'ai_fix',
        context_data: {
          task_id: task.id_task,
          task_title: task.title,
          repo: repoFullName,
          branch: aiSourceBranch,
          file_path: aiSourcePath,
          repo_file_index: aiRepoFiles,
          warnings: activeWarningsPayload,
          // Notebooks/large files are stripped + capped so they don't overflow the model context (502).
          file_content: sanitizeFileContentForAi(aiSourcePath, aiSourceContent),
          diff: latestDiff,
        },
      };

      const response = await chatService.send(payload);
      if (activeTaskIdRef.current !== taskId) return; // task switched mid-request: discard the stale AI response
      const raw = response || '';
      const fileList = parseAiFileList(raw);
      let finalResult: string;
      if (fileList) {
        // New JSON file-list format: keep the raw JSON so the effect populates aiSuggestedFiles.
        setAiSuggestedContent(raw);
        finalResult = raw.trim();
      } else {
        // Legacy fallback: the model returned a diff or plain code.
        const extracted = extractBestCodeCandidate(raw);
        setAiSuggestedContent(extracted || raw);
        finalResult = extracted || raw.trim();
      }

      if (finalResult.trim()) {
        try {
          await tasksService.createAiReviewResult({
            task: task.id_task,
            provider: 'yemoda',
            model_name: aiModel || null,
            result_text: finalResult,
          });
        } catch {
          // Non-blocking: AI response is already available to the user.
        }
      }

      if (fileList && fileList.length === 0) {
        toast.info('The AI reported that no file changes are needed.');
      } else if (!finalResult.trim()) {
        toast.error('The AI did not return applicable code. Retry or change the model.');
      } else {
        toast.success('Response received from AI.');
      }
    } catch (err) {
      if (handleAiQuotaError(err, navigate, projectId)) return;
      const detail = err instanceof ApiRequestError
        ? String(err.body?.detail ?? '')
        : err instanceof Error ? err.message : '';
      if (/unavailable|temporarily|down|service/i.test(detail)) {
        toast.error('AI service temporarily unavailable.');
      } else {
        toast.error('Could not send the prompt to the AI.');
      }
    } finally {
      setSendingToAi(false);
    }
  };

  const openAiCodeModal = async () => {
    if (!task) return;
    const taskId = task.id_task;
    if (!canTriggerAi) {
      toast.error('Your role cannot trigger AI actions.');
      return;
    }
    const activeWarningsPayload = warnings.filter((w) => w.status === 'active');
    if (activeWarningsPayload.length === 0) {
      toast.error('No active warnings to send.');
      return;
    }

    setShowAiCodeModal(true);
    setAiSuggestedContent('');
    setAiSuggestedPatches([]);
    setAiSuggestedFiles([]);
    setAiSourceLoading(true);
    setAiRepoFiles([]);

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

      let discoveredFiles: string[] = [];
      let resolvedBranch = nextBranch;
      if (repoFullName) {
        const repoFilesResult = await loadRepoFiles(nextBranch, nextPath);
        discoveredFiles = repoFilesResult.files;
        resolvedBranch = repoFilesResult.resolvedBranch;
        nextBranch = resolvedBranch; // keep the resolved branch even if no source file ends up loading
      }

      if (!nextPath && discoveredFiles.length > 0) {
        nextPath = discoveredFiles[0];
      }

      if (repoFullName && nextPath) {
        nextContent = await loadSourceFileContent(nextPath, resolvedBranch, false);
        nextBranch = resolvedBranch;
      }
    } catch (err) {
      if (handleAiQuotaError(err, navigate, projectId)) {
        setShowAiCodeModal(false);
        return;
      }
      const detail = err instanceof ApiRequestError
        ? String(err.body?.detail ?? '')
        : err instanceof Error ? err.message : '';
      if (detail) {
        toast.error('Could not load the initial code.', { description: detail });
      }
      // Keep defaults if source retrieval fails; user can still request AI using warnings context.
    } finally {
      setAiSourceLoading(false);
      if (activeTaskIdRef.current === taskId) {
        setAiSourceBranch(nextBranch);
        setAiSourcePath(nextPath);
        setAiSourceContent(nextContent);
        if (!nextPath) {
          toast.error('The file was not detected automatically. Enter the path manually in the modal.');
        }
      }
    }
  };

  const handleCommitAiFix = async () => {
    if (!task || !repoFullName) {
      toast.error('No repository linked to commit to.');
      return;
    }
    if (!aiSuggestedContent.trim()) {
      toast.error('No code proposal to confirm.');
      return;
    }
    if (aiSuggestedContent.trim().toUpperCase() === 'NO_CHANGES') {
      toast.info('The AI indicated there are no changes to apply.');
      return;
    }

    setCommittingAiFix(true);
    try {
      // Resolve a branch that exists on the remote once, up front: all three paths commit to it,
      // and a stale aiSourceBranch would otherwise 400 the commit (fatal for new files).
      const commitBranch = await resolveCommitBranch(aiSourceBranch || 'main');

      if (aiIsFileListResponse) {
        // New JSON file-list contract: the model returns full file contents (create/modify) or
        // deletions. These map straight to the commit endpoint, which supports brand-new paths.
        const filesToCommit: Array<{ path: string; content?: string; deleted?: boolean }> = aiSuggestedFiles
          .filter((file) => file.path)
          .map((file) => file.action === 'delete'
            ? { path: file.path, deleted: true }
            : { path: file.path, content: file.content ?? '' });
        if (filesToCommit.length === 0) {
          toast.info('The AI reported no changes to apply.');
          return;
        }
        await githubService.commitChanges({
          repo: repoFullName,
          branch: commitBranch,
          message: `feat: ai changes task #${task.id_task} (${filesToCommit.length} file(s))`,
          files: filesToCommit,
        });
      } else if (aiSuggestedPatches.length > 0) {
        const filesToCommit: Array<{ path: string; content: string }> = [];

        for (const patchItem of aiSuggestedPatches) {
          const targetPath = patchItem.filename.trim();
          if (!targetPath) continue;

          // 404 on every ref candidate means the file doesn't exist in the repo yet: the AI is
          // creating it. Apply the patch against empty content — the commit endpoint (Git Data
          // API) creates brand-new paths without needing a sha.
          let currentContent = '';
          try {
            const { result } = await getContentsWithRefFallback(targetPath, commitBranch);
            const fileData = Array.isArray(result) ? result.find((item) => item.type === 'file') : result;
            if (!fileData || fileData.type !== 'file') {
              throw new Error(`Could not fetch the base file to apply the diff: ${targetPath}`);
            }
            currentContent = decodeGitHubContent(fileData.content);
          } catch (err) {
            if (!(err instanceof ApiRequestError && err.status === 404)) throw err;
          }

          let updatedContent = '';
          try {
            updatedContent = applyUnifiedPatchToContent(currentContent, patchItem.patch);
          } catch (error) {
            const detail = error instanceof Error ? error.message : 'Error applying patch';
            throw new Error(`Could not apply the diff to '${targetPath}': ${detail}`);
          }
          if (updatedContent !== currentContent) {
            // Skip files the patch leaves unchanged so we never push a no-op commit.
            filesToCommit.push({ path: targetPath, content: updatedContent });
          }
        }

        if (filesToCommit.length === 0) {
          toast.info('The AI changes do not modify the current files; nothing to commit.');
          return;
        }

        await githubService.commitChanges({
          repo: repoFullName,
          branch: commitBranch,
          message: `feat: ai fix task #${task.id_task} (${filesToCommit.length} files)`,
          files: filesToCommit,
        });
      } else {
        if (!aiSourcePath) {
          throw new Error('No active file to apply the change.');
        }
        if (aiSuggestedContent === aiSourceContent) {
          toast.info('The proposed content is identical to the current file; nothing to commit.');
          return;
        }
        await githubService.commitChanges({
          repo: repoFullName,
          branch: commitBranch,
          message: `feat: ai fix task #${task.id_task}`,
          files: [{ path: aiSourcePath, content: aiSuggestedContent }],
        });
      }
      toast.success('Commit / push completed with the AI changes.');
      setShowAiCodeModal(false);
    } catch (err) {
      const detail = err instanceof ApiRequestError
        ? String(err.body?.detail ?? 'Unknown error')
        : err instanceof Error ? err.message : 'Unknown error';
      toast.error('Could not confirm the commit / push.', { description: detail });
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

  // Reset transient, per-task UI state whenever the selected task changes. The panel
  // instance is reused across tasks (the parent swaps the `task` prop without unmounting),
  // so modal visibility, selections and form inputs would otherwise leak between tasks.
  useEffect(() => {
    activeTaskIdRef.current = task?.id_task ?? null;
    setShowNewTagForm(false);
    setNewTagName('');
    setNewTagColor('#56697f');
    setTagSearch('');
    setShowBranchModal(false);
    setBranchResult(null);
    setSelectedWarningIds(new Set());
    setShowAiCodeModal(false);
    setAiModalPrompt('');
    setAiSuggestedContent('');
    setAiSuggestedPatches([]);
    setAiSuggestedFiles([]);
    setAiSourcePath('');
    setAiSourceContent('');
    setAiSourceBranch('main');
    setAiRepoFiles([]);
  }, [task?.id_task]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canComment) {
      toast.error('Your role cannot comment on tasks.');
      return;
    }
    if (!task || !newComment.trim()) return;
    setSendingComment(true);
    try {
      const created = await tasksService.addComment(task.id_task, newComment.trim(), currentUserId ?? undefined);
      const createdWithUser = created.user == null && currentUserId != null
        ? { ...created, user: currentUserId }
        : created;
      setComments((prev) => [...prev, createdWithUser]);
      setNewComment('');
      toast.success('Comment added');
    } catch {
      toast.error('Error adding comment');
    } finally {
      setSendingComment(false);
    }
  };

  const handleStartEditComment = (comment: ApiTaskComment) => {
    setEditingCommentId(comment.id_comment);
    setEditingCommentContent(comment.content);
  };

  const handleUpdateComment = async (commentId: number) => {
    if (!canComment) return;
    if (!editingCommentContent.trim()) return;
    try {
      const updated = await tasksService.updateComment(commentId, { content: editingCommentContent.trim() });
      setComments((prev) => prev.map((c) => (c.id_comment === commentId ? updated : c)));
      setEditingCommentId(null);
      setEditingCommentContent('');
      toast.success('Comment updated');
    } catch {
      toast.error('Could not update the comment (check whether the backend supports it).');
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!canComment) return;
    if (!window.confirm('Delete comment?')) return;
    try {
      await tasksService.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id_comment !== commentId));
      toast.success('Comment deleted');
    } catch {
      toast.error('Could not delete the comment (check whether the backend supports it).');
    }
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditTask) {
      toast.error('Your role cannot edit stories.');
      return;
    }
    if (!task || !taskForm.title.trim()) return;

    setSavingTask(true);
    try {
      const nextStatusId = task.status != null ? Number(task.status) : null;
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
      toast.success('Story updated');
    } catch {
      toast.error('Error updating the story');
    } finally {
      setSavingTask(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!task || !onDeleteTask) return;
    if (!canDeleteTask) {
      toast.error('Only a Product Owner or Project Manager can delete stories.');
      return;
    }

    if (!window.confirm('Delete this story? This action cannot be undone.')) {
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
      toast.error('Your role cannot delete warnings.');
      return;
    }
    if (!window.confirm('Delete this warning?')) return;

    setDeletingWarningId(warningId);
    try {
      await tasksService.deleteWarning(warningId);
      setWarnings((prev) => prev.filter((w) => w.id_warning !== warningId));
      toast.success('Warning deleted.');
    } catch {
      toast.error('Could not delete the warning.');
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
      toast.success('Column updated.');
    } catch (err) {
      // Surfaces the backend's close-block message (e.g. parent with open subtasks → 400).
      toast.error(err instanceof ApiRequestError ? err.message : 'Could not change the column.');
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
      toast.success('Sprint updated.');
    } catch {
      toast.error('Could not update the sprint.');
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
    if (failed > 0) toast.error(`Could not delete ${failed} warning(s).`);
    else toast.success(`${succeeded.length} warning(s) deleted.`);
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
      toast.success('Tag created and assigned.');
    } catch {
      toast.error('Could not create the tag.');
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
      toast.success('Tag added.');
    } catch {
      toast.error('Could not add the tag.');
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
      toast.success('Tag removed.');
    } catch {
      toast.error('Could not remove the tag.');
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
                    <Pencil className="w-3 h-3" /> Edit
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
                {canTriggerAi && (
                  <>
                    <button
                      onClick={() => void handleGenerateAiPrompt()}
                      disabled={generatingAiPrompt}
                      className="inline-flex items-center gap-1 h-6 px-2 border border-border rounded-[3px] text-[10px] text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-50"
                      title="Generates the prompt with active warnings and copies it to the clipboard"
                    >
                      {generatingAiPrompt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
                      {generatingAiPrompt ? 'Generating...' : 'Copy prompt'}
                    </button>
                    <button
                      onClick={() => void openAiCodeModal()}
                      disabled={sendingToAi || loadingWarnings}
                      className="inline-flex items-center gap-1 h-6 px-2 border border-border rounded-[3px] text-[10px] text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-50"
                      title="Open the AI code review"
                    >
                      <Send className="w-3 h-3" />
                      Send to AI
                    </button>
                  </>
                )}
                <button onClick={onClose} aria-label="Close task panel" className="p-1 rounded-[3px] hover:bg-surface-secondary transition-colors">
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
                    <label className="block text-[11px] font-medium text-foreground mb-1">Title</label>
                    <input
                      type="text"
                      required
                      value={taskForm.title}
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                      className="w-full h-7 bg-surface-secondary border border-border rounded-[3px] px-2.5 text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1">Description</label>
                    <textarea
                      rows={3}
                      value={taskForm.description}
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-surface-secondary border border-border rounded-[3px] px-2.5 py-1.5 text-[11px] resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1">Priority</label>
                    <select
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, priority: e.target.value }))}
                      className="w-full h-7 bg-surface-secondary border border-border rounded-[3px] px-2.5 text-[11px]"
                    >
                      <option value="">No priority</option>
                      {priorities.map((p) => (
                        <option key={p.id_priority} value={p.id_priority}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1">Due date</label>
                    <DatePickerField
                      value={taskForm.dueDate}
                      onChange={(value) => setTaskForm((prev) => ({ ...prev, dueDate: value }))}
                      minDate={minDueDate}
                      maxDate={maxDueDate}
                      placeholder="Select a date"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-foreground mb-1">Assigned</label>
                    <TaskAssigneePicker
                      users={assignableUsers}
                      selectedIds={taskForm.assignedTo.map((value) => Number(value))}
                      onChange={(selectedIds) => setTaskForm((prev) => ({
                        ...prev,
                        assignedTo: selectedIds.map((id) => String(id)),
                      }))}
                      disabled={!canEditAssignment}
                      emptyText="No assignees"
                    />
                    {!canEditAssignment && (
                      <p className="text-[10px] text-muted-foreground mt-1">Your role cannot reassign tasks.</p>
                    )}
                    {canEditAssignment && (
                      <p className="text-[10px] text-muted-foreground mt-1">The first person selected remains the primary owner for compatibility.</p>
                    )}
                  </div>

                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.06em] mb-2 flex items-center gap-1.5">
                      <ShieldAlert className="w-3 h-3" /> AI results ({aiReviewResults.length})
                    </p>
                    {loadingAiReviewResults ? (
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" /> Loading results…
                      </div>
                    ) : aiReviewResults.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground">No saved AI results yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {aiReviewResults.map((result) => (
                          <div key={result.id_review_result} className="rounded-[4px] border border-border bg-surface-secondary/30 p-2.5 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-[0.06em]">
                                <span className="rounded-full border border-border px-1.5 py-0.5 text-foreground">{result.provider}</span>
                                <span>{result.model_name ?? 'no model'}</span>
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

                  <div className="flex items-center gap-2 pt-1">
                    {canDeleteTask && (
                      <button
                        type="button"
                        onClick={handleDeleteTask}
                        disabled={deletingTask}
                        className="h-7 px-3 border border-destructive/30 rounded-[3px] text-[11px] text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      >
                        {deletingTask ? 'Deleting…' : 'Delete'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsEditingTask(false)}
                      className="h-7 px-3 border border-border rounded-[3px] text-[11px]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingTask}
                      className="h-7 px-3 bg-primary text-primary-foreground rounded-[3px] text-[11px] disabled:opacity-50"
                    >
                      {savingTask ? 'Saving...' : 'Save changes'}
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <div>
                    <h2 className="text-[14px] font-semibold text-foreground leading-snug break-words">{task.title}</h2>
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
                    <span className="text-[10px] text-muted-foreground uppercase tracking-[0.06em]">Assigned</span>
                    <div className="text-[11px] text-foreground flex items-center gap-1 flex-wrap justify-end max-w-[220px] min-w-0">
                      <User className="w-3 h-3 shrink-0" />
                      <span className="text-right break-words min-w-0">{assignedNames.join(', ')}</span>
                    </div>
                  </div>
                )}
                {task.due_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-[0.06em]">Due date</span>
                    <span className={`text-[11px] flex items-center gap-1 ${isOverdue ? 'text-destructive font-semibold' : 'text-foreground'}`}>
                      <Calendar className="w-3 h-3" />{task.due_date}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-[0.06em]">Created</span>
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
                    <option value="">No sprint</option>
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
                          <option value="">No board</option>
                          {allBoards.map(([bid]) => (
                            <option key={bid} value={bid}>{boardNames?.get(bid) ?? `Board ${bid}`}</option>
                          ))}
                        </select>
                      </div>
                      {boardId != null && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-[0.06em]">Column</span>
                          <select
                            value={task.board_column ?? ''}
                            disabled={!canEditTask || savingBoardColumn}
                            onChange={(e) => void handleChangeBoardColumn(e.target.value ? Number(e.target.value) : null)}
                            className="h-6 rounded-[3px] border border-border bg-surface-secondary px-1.5 text-[10px] disabled:opacity-60"
                          >
                            <option value="">No column</option>
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
                    placeholder="Search tags..."
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
                            aria-label={`Remove ${tag.name} tag`}
                            disabled={savingTagId === tag.id_tag}
                            className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    )) : <span className="text-[11px] text-muted-foreground">No tags.</span>}
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
                      )) : <span className="text-[10px] text-muted-foreground">No tags to add.</span>}
                    </div>
                  )}
                  {canEditTask && onCreateTag && (
                    <button
                      type="button"
                      onClick={() => setShowNewTagForm(true)}
                      className="inline-flex items-center gap-1 rounded-[3px] border border-dashed border-border px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors mt-0.5"
                    >
                      <Plus className="w-3 h-3" /> New tag
                    </button>
                  )}
                </div>
              </div>

              {/* Subtasks */}
              <TaskSubtasks
                parentTask={task}
                projectId={projectId}
                canEdit={canEditTask}
                canTriggerAi={canTriggerAi}
                boardColumnsByBoard={boardColumnsByBoard}
                onParentRefreshed={onTaskUpdated}
              />

              {/* Comments */}
              <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.06em] mb-2 flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3" /> Comments ({comments.length})
                  </p>
                  {loadingComments ? (
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" /> Loading…
                    </div>
                  ) : comments.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">No comments yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {comments.map((c) => (
                        <div key={c.id_comment} className="p-2.5 bg-surface-secondary/50 rounded-[4px]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-medium text-foreground">
                              {c.user ? (userMap.get(c.user) ?? `User #${c.user}`) : 'System'}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground">{formatCommentTimestamp(c.created_at)}</span>
                              {canComment && currentUserId != null && c.user === currentUserId && (
                                <>
                                  <button
                                    onClick={() => handleStartEditComment(c)}
                                    className="text-muted-foreground hover:text-foreground"
                                    title="Edit comment"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteComment(c.id_comment)}
                                    className="text-muted-foreground hover:text-destructive"
                                    title="Delete comment"
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
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingCommentId(null);
                                    setEditingCommentContent('');
                                  }}
                                  className="h-6 px-2 border border-border rounded-[3px] text-[10px]"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[11px] text-muted-foreground leading-relaxed break-words">{c.content}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add comment form */}
                  {canComment && (
                    <form onSubmit={handleAddComment} className="mt-2 flex gap-1.5">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment…"
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
                  )}
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
                    Close
                  </button>
                </div>
              </div>
              </div>

              {showWarningsSidePanel && (
                <div className="flex-1 min-w-0 border-l border-border bg-card flex flex-col">
                  <div className="px-4 py-3 border-b border-border bg-surface-secondary shrink-0">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-warning" /> Warnings and Connections
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
                            {selectedWarningIds.size === activeWarnings.length ? 'Deselect.' : 'Select all'}
                          </button>
                          {selectedWarningIds.size > 0 && (
                            <button
                              type="button"
                              onClick={() => void handleDeleteSelectedWarnings()}
                              disabled={deletingSelectedWarnings}
                              className="inline-flex items-center gap-1 rounded-[3px] border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] text-destructive hover:bg-destructive/20 disabled:opacity-50"
                            >
                              {deletingSelectedWarnings ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                              Delete ({selectedWarningIds.size})
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="rounded-[4px] border border-border bg-surface-secondary/30 p-2.5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.06em]">AI Model</p>
                        {loadingAiModels && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                      </div>
                      <div>
                        <select
                          value={aiModel}
                          onChange={(e) => setAiModel(e.target.value)}
                          className="w-full h-7 rounded-[3px] border border-border bg-card px-2 text-[10px]"
                        >
                          {(aiModels.yemoda ?? []).map((model) => (
                            <option key={model.id} value={model.id}>{model.id}</option>
                          ))}
                          {(aiModels.yemoda ?? []).length === 0 && (
                            <option value="">No models available</option>
                          )}
                        </select>
                      </div>
                    </div>

                    {loadingWarnings ? (
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" /> Loading warnings…
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
                                  <p className="text-[11px] text-foreground leading-relaxed break-words">{w.message}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteWarning(w.id_warning)}
                                  disabled={!canEditTask || deletingWarningId === w.id_warning}
                                  className="inline-flex items-center gap-1 rounded-[3px] border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] text-destructive hover:bg-destructive/20 disabled:opacity-50 shrink-0"
                                >
                                  {deletingWarningId === w.id_warning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                  Delete
                                </button>
                              </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1 ml-5">{w.created_at.slice(0, 10)}</p>
                          </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">No active warnings.</p>
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
                <h2 className="text-[13px] font-semibold text-foreground">AI change review</h2>
                {task && <p className="text-[11px] font-medium text-primary mt-0.5 truncate max-w-[500px]">{task.title}</p>}
                <p className="text-[10px] text-muted-foreground mt-0.5">Current code on the left and the AI response on the right.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAiCodeModal(false)}
                className="h-8 px-3 border border-border rounded-[4px] text-[11px] hover:bg-accent"
              >
                Close
              </button>
            </div>

            <div className="px-4 py-3 border-b border-border bg-surface-secondary/20 space-y-2">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_160px_auto] gap-2 items-center">
                <div className="h-8 rounded-[4px] border border-border bg-card px-2.5 text-[11px] text-muted-foreground flex items-center truncate min-w-0">
                  {aiModalPrompt || 'Loading the fix prompt for this task...'}
                </div>
                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="h-8 rounded-[4px] border border-border bg-card px-2 text-[11px]"
                >
                  {(aiModels.yemoda ?? []).map((model) => (
                    <option key={model.id} value={model.id}>{model.id}</option>
                  ))}
                  {(aiModels.yemoda ?? []).length === 0 && (
                    <option value="">No models available</option>
                  )}
                </select>
                <button
                  type="button"
                  onClick={() => void handleSendWarningsToAi()}
                  disabled={sendingToAi || aiSourceLoading || !aiModalPrompt.trim()}
                  className="h-8 px-3 bg-primary text-primary-foreground rounded-[4px] text-[11px] inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {sendingToAi ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  {sendingToAi ? 'Listening...' : 'Send to AI'}
                </button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_160px_auto] gap-2 items-center">
                <select
                  value={aiSourcePath}
                  onChange={(e) => {
                    const nextPath = e.target.value;
                    if (!nextPath) {
                      setAiSourcePath('');
                      setAiSourceContent('');
                      return;
                    }
                    void handleSelectRepoFile(nextPath);
                  }}
                  disabled={aiRepoFilesLoading || aiSourceLoading}
                  className="h-8 rounded-[4px] border border-border bg-card px-2 text-[11px] w-full min-w-0"
                >
                  <option value="">
                    {aiRepoFilesLoading
                      ? 'Loading files...'
                      : aiRepoFiles.length > 0
                        ? 'Select a file...'
                        : 'No files available'}
                  </option>
                  {aiRepoFiles.map((filePath) => {
                    const hasChange = aiSuggestedPatches.some((patch) => patch.filename === filePath)
                      || aiSuggestedFiles.some((file) => file.path === filePath);
                    return (
                      <option key={filePath} value={filePath}>
                        {hasChange ? `[CHANGED] ${filePath}` : filePath}
                      </option>
                    );
                  })}
                </select>
                <div
                  className="h-8 rounded-[4px] border border-border bg-card px-2.5 text-[11px] text-muted-foreground flex items-center"
                  title={aiSourceBranch || 'main'}
                >
                  Branch: {aiSourceBranch || 'main'}
                </div>
                <button
                  type="button"
                  onClick={() => void loadRepoFiles(aiSourceBranch || 'main', aiSourcePath || undefined)}
                  disabled={aiRepoFilesLoading || aiSourceLoading || !repoFullName}
                  className="h-8 px-3 border border-border rounded-[4px] text-[11px] hover:bg-accent disabled:opacity-50"
                >
                  {aiRepoFilesLoading ? 'Listing...' : 'List files'}
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2">
              <div className="border-r border-border min-h-0 flex flex-col">
                <div className="px-3 py-2 border-b border-border bg-surface-secondary/30 text-[10px] text-muted-foreground">
                  Current code {aiSourcePath ? `(${aiSourcePath})` : ''}
                </div>
                <div className="flex-1 min-h-0 bg-card p-3 text-[11px] font-mono text-muted-foreground overflow-auto">
                  {aiSourceLoading ? (
                    'Loading current code...'
                  ) : aiSourceContent ? (
                    <table className="w-full border-collapse">
                      <tbody>
                        {highlightedAiSourceLines.map((lineHtml, index) => (
                          <tr key={index}>
                            <td className="w-12 pr-3 text-right align-top select-none text-[10px] text-muted-foreground/50 border-r border-border/30">
                              {index + 1}
                            </td>
                            <td className="pl-3 align-top whitespace-pre">
                              <span className="code-tokenized" dangerouslySetInnerHTML={{ __html: lineHtml }} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    'Select a file to view its content.'
                  )}
                </div>
              </div>
              <div className="min-h-0 flex flex-col">
                <div className="px-3 py-2 border-b border-border bg-surface-secondary/30 text-[10px] text-muted-foreground flex items-center justify-between">
                  <span>AI response (proposed changes)</span>
                  {aiSuggestedFiles.length > 0
                    ? <span className="text-[10px] text-warning">{aiSuggestedFiles.length} file(s) proposed</span>
                    : aiSuggestedPatches.length > 0 && <span className="text-[10px] text-warning">{aiSuggestedPatches.length} file(s) with detected changes</span>}
                </div>
                <div className="flex-1 min-h-0 bg-card p-3 overflow-auto">
                  {aiSuggestedFiles.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-muted-foreground shrink-0">File</label>
                        <select
                          value={aiSelectedFile}
                          onChange={(e) => setAiSelectedFile(e.target.value)}
                          className="h-8 rounded-[4px] border border-border bg-card px-2 text-[11px] w-full min-w-0 flex-1"
                        >
                          {aiSuggestedFiles.map((file) => (
                            <option key={file.path} value={file.path}>
                              [{file.action.toUpperCase()}] {file.path}
                            </option>
                          ))}
                        </select>
                      </div>
                      {(() => {
                        const selected = aiSuggestedFiles.find((file) => file.path === aiSelectedFile) ?? aiSuggestedFiles[0];
                        if (!selected) return <p className="text-[11px] text-muted-foreground">No file selected.</p>;
                        if (selected.action === 'delete') {
                          return <p className="text-[11px] text-destructive">This file will be deleted: {selected.path}</p>;
                        }
                        return (
                          <pre className="text-[11px] font-mono text-foreground whitespace-pre-wrap">{selected.content || '(empty file)'}</pre>
                        );
                      })()}
                    </div>
                  ) : aiSuggestedPatches.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-muted-foreground shrink-0">Modified file</label>
                        <select
                          value={aiSelectedPatchFile}
                          onChange={(e) => setAiSelectedPatchFile(e.target.value)}
                          className="h-8 rounded-[4px] border border-border bg-card px-2 text-[11px] w-full min-w-0 flex-1"
                        >
                          {aiSuggestedPatches.map((patch) => (
                            <option key={patch.filename} value={patch.filename}>{patch.filename}</option>
                          ))}
                        </select>
                      </div>
                      {(() => {
                        const selectedPatch = aiSuggestedPatches.find((patch) => patch.filename === aiSelectedPatchFile) ?? aiSuggestedPatches[0];
                        return selectedPatch
                          ? <CodeDiffViewer filename={selectedPatch.filename} patch={selectedPatch.patch} />
                          : <p className="text-[11px] text-muted-foreground">No diff selected.</p>;
                      })()}
                    </div>
                  ) : (
                    <pre className="text-[11px] font-mono text-foreground whitespace-pre-wrap">{aiSuggestedContent || 'The AI response will appear here.'}</pre>
                  )}
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-2">
              <p className="text-[10px] text-muted-foreground">If you like the proposal, confirm the commit/push. Only allowed when the AI returns applicable code.</p>
              <button
                type="button"
                onClick={() => void handleCommitAiFix()}
                disabled={committingAiFix || (aiIsFileListResponse
                  ? aiSuggestedFiles.length === 0
                  : (!aiSuggestedContent.trim() || aiSuggestedContent.trim().toUpperCase() === 'NO_CHANGES' || (aiSuggestedPatches.length === 0 && (!aiSourcePath || aiSuggestedContent === aiSourceContent))))}
                className="h-8 px-3 bg-primary text-primary-foreground rounded-[4px] text-[11px] inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {committingAiFix ? <Loader2 className="w-3 h-3 animate-spin" /> : <GitCommit className="w-3 h-3" />}
                {committingAiFix ? 'Confirming...' : 'Commit / Push'}
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
                  <GitBranch className="w-3.5 h-3.5 text-primary" /> Create branch
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">A branch linked to task #{task?.id_task} will be created</p>
              </div>
              <button
                type="button"
                onClick={() => setShowBranchModal(false)}
                aria-label="Close branch creation modal"
                className="p-1 rounded-[3px] hover:bg-surface-secondary transition-colors"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            {branchResult ? (
              /* Success state */
              <div className="px-4 py-4 space-y-3">
                <div className="rounded-[4px] bg-success/5 border border-success/20 px-3 py-2.5 space-y-1">
                  <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-success/80">Branch created</p>
                  <p className="font-mono text-[12px] text-foreground font-medium">{branchResult.branch_name}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-medium text-muted-foreground">Checkout command</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 font-mono text-[11px] text-muted-foreground bg-surface-secondary/60 border border-border rounded-[3px] px-2.5 py-1.5 truncate">
                      {branchResult.checkout_command}
                    </code>
                    <button
                      type="button"
                      onClick={() => void handleCopyCheckout()}
                      className="h-8 w-8 shrink-0 flex items-center justify-center border border-border rounded-[4px] text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy"
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
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* Form state */
              <div className="px-4 py-4 space-y-4">
                {branchLoadingRepos ? (
                  <div className="flex items-center justify-center py-6 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span className="text-[12px]">Loading repositories…</span>
                  </div>
                ) : branchRepos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
                    <GitBranch className="w-6 h-6 text-muted-foreground/40" />
                    <p className="text-[12px] text-muted-foreground">No repositories connected to this project.</p>
                    <p className="text-[11px] text-muted-foreground/60">Link a repository in the Repositories tab first.</p>
                  </div>
                ) : (
                  <>
                    {branchRepos.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-foreground">Repository</label>
                        <select
                          value={branchSelectedRepo}
                          onChange={(e) => setBranchSelectedRepo(e.target.value)}
                          className="w-full h-9 rounded-[4px] border border-border bg-surface-secondary px-3 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                        >
                          <option value="">Select repository…</option>
                          {branchRepos.map((r) => (
                            <option key={r.id_repo} value={r.full_name}>{r.full_name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-foreground">Base branch</label>
                      <input
                        value={branchBase}
                        onChange={(e) => setBranchBase(e.target.value)}
                        placeholder="main"
                        className="w-full h-9 rounded-[4px] border border-border bg-surface-secondary px-3 text-[12px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                    </div>
                    <div className="rounded-[4px] bg-surface-secondary/40 border border-border/50 px-3 py-2">
                      <p className="text-[10px] text-muted-foreground">The branch name will be generated automatically with the task ID as a prefix.</p>
                    </div>
                  </>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowBranchModal(false)}
                    className="h-8 px-3 border border-border rounded-[4px] text-[11px] hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  {!branchLoadingRepos && branchRepos.length > 0 && (
                  <button
                    type="button"
                    disabled={branchCreating || branchLoadingRepos || (branchRepos.length > 1 && !branchSelectedRepo)}
                    title={branchRepos.length > 1 && !branchSelectedRepo ? 'Select a repository' : undefined}
                    onClick={() => void handleCreateBranch()}
                    className="h-8 px-4 bg-primary text-primary-foreground rounded-[4px] text-[11px] disabled:opacity-40 transition-opacity inline-flex items-center gap-1.5"
                  >
                    {branchCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : <GitBranch className="w-3 h-3" />}
                    Create branch
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
              <h2 className="text-[13px] font-semibold text-foreground">New tag</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Set a name and a color for the tag.</p>
            </div>
            <div className="px-4 py-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-foreground">Name</label>
                <input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="e.g. Bug, Feature, Urgent…"
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
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newTagName.trim() || creatingTag}
                className="h-8 px-3 bg-primary text-primary-foreground rounded-[4px] text-[11px] disabled:opacity-40 transition-opacity inline-flex items-center gap-1"
              >
                {creatingTag ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Create tag
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
