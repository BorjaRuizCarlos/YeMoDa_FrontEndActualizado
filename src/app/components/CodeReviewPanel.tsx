import { useState, useEffect, useCallback } from 'react';
import {
  GitCommit, ChevronDown, ChevronRight, FileCode2,
  Loader2, RefreshCw, Clock, User, AlertCircle, Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { chatService, tasksService, githubService } from '../../services';
import { ApiRequestError } from '../../services/api';
import type { ApiTask, ApiTaskPushMatch, ChatModelsResponse } from '../../services';
import { CodeDiffViewer } from './CodeDiffViewer';

interface CodeReviewPanelProps {
  projectId: number;
  repoFullName: string | null;
}

// Parse a full unified git diff (push_diff_text) into per-file patches for CodeDiffViewer.
function parsePushDiff(diffText: string): Array<{ filename: string; patch: string }> {
  const files: Array<{ filename: string; patch: string }> = [];
  const sections = diffText.split(/^diff --git /m).filter(s => s.trim());
  for (const section of sections) {
    const lines = section.split('\n');
    const headerMatch = lines[0].match(/a\/.+ b\/(.+)/);
    const filename = headerMatch ? headerMatch[1].trim() : lines[0].trim();
    const patchIdx = lines.findIndex(l => l.startsWith('@@'));
    const patch = patchIdx >= 0 ? lines.slice(patchIdx).join('\n') : '';
    if (filename && patch) files.push({ filename, patch });
  }
  return files;
}

interface MatchDiffState {
  files: Array<{ filename: string; patch: string }> | null;
  loading: boolean;
  error: string | null;
}

interface TaskHistoryState {
  matches: ApiTaskPushMatch[] | null;
  loading: boolean;
  error: string | null;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function buildMatchFingerprint(match: ApiTaskPushMatch): string {
  const commits = [...(match.push_commits ?? [])]
    .map((commit) => commit.id)
    .filter(Boolean)
    .sort()
    .join('|');

  return [
    match.push_repo ?? '',
    match.push_ref ?? '',
    match.push_pusher ?? '',
    match.push_received_at ?? '',
    match.coverage ?? '',
    match.reason ?? '',
    commits,
    match.push_diff_text ?? '',
  ].join('::');
}

function dedupeMatches(matches: ApiTaskPushMatch[]): ApiTaskPushMatch[] {
  const seen = new Set<string>();
  const unique: ApiTaskPushMatch[] = [];

  for (const match of matches) {
    const fingerprint = buildMatchFingerprint(match);
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    unique.push(match);
  }

  return unique;
}

export function CodeReviewPanel({ projectId, repoFullName }: CodeReviewPanelProps) {
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [taskHistories, setTaskHistories] = useState<Map<number, TaskHistoryState>>(new Map());
  const [expandedMatches, setExpandedMatches] = useState<Set<number>>(new Set());
  const [matchDiffs, setMatchDiffs] = useState<Map<number, MatchDiffState>>(new Map());
  const [aiModels, setAiModels] = useState<ChatModelsResponse>({ yemoda: [] });
  const [loadingAiModels, setLoadingAiModels] = useState(false);
  const [aiModel, setAiModel] = useState('');
  const [chatInputByTask, setChatInputByTask] = useState<Map<number, string>>(new Map());
  const [chatByTask, setChatByTask] = useState<Map<number, ChatMessage[]>>(new Map());
  const [sendingTaskId, setSendingTaskId] = useState<number | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const data = await tasksService.list(undefined, projectId);
      setTasks(data);
    } catch {
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  }, [projectId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

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

  const toggleTask = async (taskId: number) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });
    if (!taskHistories.has(taskId)) {
      setTaskHistories(prev => new Map(prev).set(taskId, { matches: null, loading: true, error: null }));
      try {
        const matches = await tasksService.getTaskHistory(taskId);
        const dedupedMatches = dedupeMatches(matches);
        setTaskHistories(prev => new Map(prev).set(taskId, { matches: dedupedMatches, loading: false, error: null }));
      } catch {
        setTaskHistories(prev => new Map(prev).set(taskId, { matches: [], loading: false, error: 'Could not load history' }));
      }
    }
  };

  const toggleMatch = async (matchId: number, match: ApiTaskPushMatch) => {
    setExpandedMatches(prev => {
      const next = new Set(prev);
      next.has(matchId) ? next.delete(matchId) : next.add(matchId);
      return next;
    });
    if (matchDiffs.has(matchId)) return;

    // Use stored push_diff_text first; fallback to per-commit GitHub API call.
    if (match.push_diff_text) {
      const files = parsePushDiff(match.push_diff_text);
      setMatchDiffs(prev => new Map(prev).set(matchId, { files, loading: false, error: null }));
    } else if (repoFullName && match.push_commits.length > 0) {
      setMatchDiffs(prev => new Map(prev).set(matchId, { files: null, loading: true, error: null }));
      try {
        const firstSha = match.push_commits[0].id;
        const diff = await githubService.getCommitDiff(repoFullName, firstSha);
        const files = (diff.files ?? []).map(f => ({ filename: f.filename, patch: f.patch ?? '' }));
        setMatchDiffs(prev => new Map(prev).set(matchId, { files, loading: false, error: null }));
      } catch {
        setMatchDiffs(prev => new Map(prev).set(matchId, { files: null, loading: false, error: 'Could not load the diff' }));
      }
    } else {
      setMatchDiffs(prev => new Map(prev).set(matchId, { files: [], loading: false, error: null }));
    }
  };

  const sendCodeReviewMessage = async (task: ApiTask) => {
    const input = (chatInputByTask.get(task.id_task) ?? '').trim();
    if (!input) return;

    const history = taskHistories.get(task.id_task)?.matches ?? [];
    const primaryMatch = history[0] ?? null;
    const branchName = primaryMatch?.push_ref?.replace('refs/heads/', '') ?? 'main';
    const diff = primaryMatch?.push_diff_text
      ?? history.map((item) => item.push_diff_text).filter(Boolean).join('\n\n')
      ?? null;

    const nextUserMessage: ChatMessage = { role: 'user', content: input };
    const pendingAssistant: ChatMessage = { role: 'assistant', content: '' };
    const previousMessages = chatByTask.get(task.id_task) ?? [];
    const requestMessages = [
      ...previousMessages
        .filter((message) => message.content.trim().length > 0)
        .map((message) => ({ role: message.role, content: message.content })),
      { role: 'user' as const, content: input },
    ];

    setChatByTask((prev) => {
      const current = prev.get(task.id_task) ?? [];
      return new Map(prev).set(task.id_task, [...current, nextUserMessage, pendingAssistant]);
    });
    setChatInputByTask((prev) => new Map(prev).set(task.id_task, ''));
    setSendingTaskId(task.id_task);

    try {
      const payload = {
        model: aiModel || undefined,
        messages: requestMessages,
        context_type: 'code_review' as const,
        context_data: {
          diff,
          repo: repoFullName,
          branch: branchName,
          task_title: task.title,
        },
      };

      const response = await chatService.send(payload);
      if (response.trim()) {
        try {
          await tasksService.createAiReviewResult({
            task: task.id_task,
            provider: 'yemoda',
            model_name: aiModel || null,
            result_text: response.trim(),
          });
        } catch {
          // Non-blocking persistence failure.
        }
      }
      setChatByTask((prev) => {
        const current = [...(prev.get(task.id_task) ?? [])];
        if (current.length === 0) return prev;
        current[current.length - 1] = { role: 'assistant', content: response || 'No response from the AI.' };
        return new Map(prev).set(task.id_task, current);
      });
    } catch (err) {
      const detail = err instanceof ApiRequestError
        ? String(err.body?.detail ?? '')
        : err instanceof Error ? err.message : '';
      if (/unavailable|temporarily|down|service/i.test(detail)) {
        toast.error('AI service temporarily unavailable.');
      } else {
        toast.error('Could not send the review message.');
      }

      setChatByTask((prev) => {
        const current = [...(prev.get(task.id_task) ?? [])];
        if (current.length === 0) return prev;
        current[current.length - 1] = { role: 'assistant', content: 'Could not complete the request.' };
        return new Map(prev).set(task.id_task, current);
      });
    } finally {
      setSendingTaskId(null);
    }
  };

  if (!repoFullName) {
    return (
      <div className="text-center py-16">
        <FileCode2 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-[12px] text-muted-foreground">No repository linked to this project.</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">Link a repository in the Repositories tab.</p>
      </div>
    );
  }

  if (loadingTasks) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-[12px]">Loading tasks…</span>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16">
        <GitCommit className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-[12px] text-muted-foreground">No tasks in this project.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="rounded-[4px] border border-border bg-card p-2.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.06em]">AI Model</p>
          {loadingAiModels && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
        </div>
        <div>
          <select
            value={aiModel}
            onChange={(e) => setAiModel(e.target.value)}
            className="w-full h-7 rounded-[3px] border border-border bg-surface-secondary px-2 text-[10px]"
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

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <GitCommit className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[12px] font-semibold text-foreground">{tasks.length} tasks</span>
        </div>
        <button
          onClick={fetchTasks}
          className="p-1 rounded-[3px] hover:bg-surface-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Task list */}
      {tasks.map((task) => {
        const isTaskExpanded = expandedTasks.has(task.id_task);
        const history = taskHistories.get(task.id_task);

        return (
          <div key={task.id_task} className="border border-border rounded-[4px] overflow-hidden">
            {/* Task row */}
            <button
              onClick={() => toggleTask(task.id_task)}
              className="w-full px-3 py-2.5 flex items-center gap-2 bg-surface-secondary/20 hover:bg-surface-secondary/40 transition-colors text-left"
            >
              {isTaskExpanded
                ? <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
                : <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />}
              <p className="text-[11px] text-foreground font-medium truncate flex-1">{task.title}</p>
              {history?.loading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground shrink-0" />}
              {history?.matches != null && (
                <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-[2px] ${
                  history.matches.length > 0
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground/50 bg-surface-secondary'
                }`}>
                  {history.matches.length} push{history.matches.length !== 1 ? 'es' : ''}
                </span>
              )}
            </button>

            {/* Push matches */}
            {isTaskExpanded && (
              <div className="divide-y divide-border/50">
                {history?.loading && (
                  <div className="flex items-center gap-2 px-4 py-3 text-[11px] text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading history…
                  </div>
                )}
                {history?.error && (
                  <p className="px-4 py-3 text-[11px] text-destructive">{history.error}</p>
                )}
                {history?.matches?.length === 0 && !history.loading && (
                  <p className="px-4 py-3 text-[11px] text-muted-foreground/60 italic">
                    No pushes linked to this task.
                  </p>
                )}

                {history?.matches?.map((match) => {
                  const isMatchExpanded = expandedMatches.has(match.id_match);
                  const diffState = matchDiffs.get(match.id_match);
                  const filesChanged = match.push_commits.flatMap(c => [
                    ...(c.added ?? []), ...(c.modified ?? []), ...(c.removed ?? []),
                  ]);

                  return (
                    <div key={match.id_match}>
                      {/* Push match row */}
                      <button
                        onClick={() => toggleMatch(match.id_match, match)}
                        className="w-full px-4 py-2.5 flex items-start gap-2 hover:bg-surface-secondary/20 transition-colors text-left"
                      >
                        {isMatchExpanded
                          ? <ChevronDown className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                          : <ChevronRight className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded-[2px]">
                              {match.push_ref?.replace('refs/heads/', '') ?? 'unknown'}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-[2px] font-medium ${
                              match.coverage === 'full'
                                ? 'bg-emerald-500/8 text-emerald-300'
                                : 'bg-amber-500/10 text-amber-500'
                            }`}>
                              {match.coverage === 'full' ? 'Full' : 'Partial'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                            {match.push_pusher && (
                              <span className="flex items-center gap-1">
                                <User className="w-2.5 h-2.5" /> {match.push_pusher}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {new Date(match.push_received_at).toLocaleDateString('es-MX', {
                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                              })}
                            </span>
                            {match.push_commits.length > 0 && (
                              <span>{match.push_commits.length} commit{match.push_commits.length !== 1 ? 's' : ''}</span>
                            )}
                            {filesChanged.length > 0 && (
                              <span>{filesChanged.length} file{filesChanged.length !== 1 ? 's' : ''}</span>
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Expanded match: reason + diff */}
                      {isMatchExpanded && (
                        <div className="px-4 pb-3 space-y-3 border-t border-border/30 bg-surface-secondary/10">
                          {match.reason && (
                            <div className="flex items-start gap-2 pt-2.5">
                              <AlertCircle className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                              <p className="text-[11px] text-muted-foreground leading-relaxed">{match.reason}</p>
                            </div>
                          )}
                          {diffState?.loading && (
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <Loader2 className="w-3 h-3 animate-spin" /> Loading diff…
                            </div>
                          )}
                          {diffState?.error && (
                            <p className="text-[11px] text-destructive">{diffState.error}</p>
                          )}
                          {diffState?.files?.map((file, i) => (
                            <CodeDiffViewer key={i} filename={file.filename} patch={file.patch} />
                          ))}
                          {diffState?.files?.length === 0 && !diffState.loading && (
                            <p className="text-[11px] text-muted-foreground/60 italic">No diff available for this push.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="px-3 py-3 bg-card space-y-2">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.06em]">Code Review Chat</p>
                  <div className="max-h-44 overflow-y-auto rounded-[4px] border border-border bg-surface-secondary/30 p-2 space-y-1.5">
                    {(chatByTask.get(task.id_task) ?? []).length === 0 ? (
                      <p className="text-[11px] text-muted-foreground">Ask about the diff to start the conversation.</p>
                    ) : (
                      (chatByTask.get(task.id_task) ?? []).map((message, index) => (
                        <div key={`${task.id_task}-${index}`} className={`rounded-[3px] px-2 py-1.5 text-[11px] ${message.role === 'user' ? 'bg-primary/10 text-foreground' : 'bg-card border border-border text-muted-foreground'}`}>
                          {message.content || (sendingTaskId === task.id_task && message.role === 'assistant' ? 'Typing…' : '')}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={chatInputByTask.get(task.id_task) ?? ''}
                      onChange={(e) => setChatInputByTask((prev) => new Map(prev).set(task.id_task, e.target.value))}
                      placeholder="Ask about changes, risks, or improvements…"
                      className="flex-1 h-7 rounded-[3px] border border-border bg-surface-secondary px-2 text-[11px]"
                    />
                    <button
                      type="button"
                      disabled={sendingTaskId === task.id_task || !(chatInputByTask.get(task.id_task) ?? '').trim()}
                      onClick={() => void sendCodeReviewMessage(task)}
                      className="h-7 w-7 rounded-[3px] bg-primary text-primary-foreground inline-flex items-center justify-center disabled:opacity-50"
                    >
                      {sendingTaskId === task.id_task ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
