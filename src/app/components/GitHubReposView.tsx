import { useState, useEffect } from 'react';
import { Github, Plus, ExternalLink, Lock, Unlock, X, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { githubService } from '../../services/github.service';
import { ApiRequestError } from '../../services/api';
import { useAuth } from '../context/AuthContext';
import type { GitHubRepo } from '../../services/types';

interface CreateRepoForm {
  name: string;
  description: string;
  private: boolean;
  auto_init: boolean;
}

interface GitHubReposViewProps {
  projectId: number;
  canCreateRepos?: boolean;
}

/**
 * Reusable view that displays the user's GitHub repos list and a "create repo" modal.
 * Requires the user to be already connected to GitHub.
 */
const REPO_NAME_PATTERN = /^[A-Za-z0-9._-]+$/;

function validateRepoName(rawName: string) {
  const name = rawName.trim();
  if (!name) return 'Repository name is required';
  if (!REPO_NAME_PATTERN.test(name)) return 'Only letters, numbers, dot, hyphen and underscore are allowed.';
  if (name.startsWith('.') || name.endsWith('.')) return 'Name cannot start or end with a dot.';
  if (name.endsWith('.git')) return 'Name cannot end with .git.';
  return null;
}

export function GitHubReposView({ projectId, canCreateRepos = true }: GitHubReposViewProps) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [githubLogin, setGithubLogin] = useState<string | null>(null);

  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [deletingRepoId, setDeletingRepoId] = useState<number | null>(null);

  const fetchRepos = async () => {
    if (!projectId || !connected) {
      setRepos([]);
      return;
    }

    setLoadingRepos(true);
    try {
      const data = await githubService.listRepos({ project_id: projectId });
      setRepos(data);
    } catch {
      // Requested behavior: show empty state when endpoint fails.
      setRepos([]);
    } finally {
      setLoadingRepos(false);
    }
  };

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    githubService.checkConnectionStatus()
      .then((status) => {
        if (status.connected) {
          setConnected(true);
          setGithubLogin(status.github_login);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    void fetchRepos();
  }, [connected, projectId]);

  const handleDeleteRepo = async (idRepo: number, repoName: string) => {
    if (!window.confirm(`Delete the repository "${repoName}" from YeMoDa? This does not delete it on GitHub, it only unlinks it.`)) return;
    setDeletingRepoId(idRepo);
    try {
      await githubService.deleteRepo(idRepo);
      setRepos((prev) => prev.filter((r) => r.id_repo !== idRepo));
      toast.success(`Repository "${repoName}" unlinked.`);
    } catch {
      toast.error('Could not delete repository.');
    } finally {
      setDeletingRepoId(null);
    }
  };

  const handleDisconnect = () => {
    if (!userId) return;
    setRepos([]);
    setGithubLogin(null);
    setConnected(false);
    toast.info('GitHub session disconnected');
  };

  // Create repo modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CreateRepoForm>({
    name: '',
    description: '',
    private: true,
    auto_init: true,
  });
  const [creating, setCreating] = useState(false);

  const resetForm = () =>
    setForm({ name: '', description: '', private: true, auto_init: true });

  const handleCreateRepo = async () => {
    const repoNameError = validateRepoName(form.name);
    if (repoNameError) {
      toast.error(repoNameError);
      return;
    }
    if (!userId) {
      toast.error('No active session');
      return;
    }
    if (!canCreateRepos) {
      toast.error('Your project role can only view repositories.');
      return;
    }
    if (!connected) {
      toast.error('You must connect your GitHub account before creating a repository.');
      return;
    }

    setCreating(true);
    try {
      const result = await githubService.createRepo({
        user_id: Number(userId),
        project_id: projectId,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        private: form.private,
        auto_init: form.auto_init,
      });

      const newRepo = result.repository;
      setRepos((prev) => [newRepo, ...prev.filter((repo) => repo.id_repo !== newRepo.id_repo)]);

      toast.success('Repository created', {
        description: (
          <a
            href={newRepo.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {newRepo.full_name}
          </a>
        ),
      });
      setShowModal(false);
      resetForm();
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 401) {
        handleDisconnect();
        toast.error('Your GitHub connection expired', {
          description: 'Reconnect your account to continue',
        });
      } else {
        let detail = 'Unknown error';
        if (err instanceof ApiRequestError) {
          const body = err.body as Record<string, unknown>;
          detail = body.detail
            ? String(body.detail)
            : Object.entries(body)
                .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                .join(' | ') || `HTTP ${err.status}`;
        } else if (err instanceof Error) {
          detail = err.message;
        }
        toast.error('Error creating repository', { description: detail });
      }
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-[11px] text-muted-foreground">Checking connection...</span>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-12 h-12 bg-card border border-border rounded-full flex items-center justify-center">
          <Github className="w-6 h-6 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-[13px] font-medium text-foreground">GitHub not connected</p>
          <p className="text-[11px] text-muted-foreground mt-1 max-w-xs">
            Connect your GitHub account from your{' '}
            <span className="text-foreground font-medium">Profile</span>{' '}
            to view and manage repositories.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="bg-card border border-border rounded-[4px] p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#24292e] rounded-full flex items-center justify-center">
            <Github className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-foreground">GitHub connected</p>
            <p className="text-[10px] text-muted-foreground">
              {githubLogin && (
                <span className="font-mono text-foreground">{githubLogin}</span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            if (!canCreateRepos) {
              toast.error('Your project role can only view repositories.');
              return;
            }
            if (!connected) {
              toast.error('You must connect your GitHub account before creating a repository.');
              return;
            }
            setShowModal(true);
          }}
          disabled={!canCreateRepos}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-primary hover:bg-primary-hover text-primary-foreground rounded-[3px] text-[11px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-3 h-3" />
          New repo
        </button>
      </div>

      {/* Repos list */}
      <div className="bg-card border border-border rounded-[4px] p-4 mt-2">
        <h2 className="text-[12px] font-semibold text-foreground mb-3 pb-2.5 border-b border-border">
          Created repositories
        </h2>

        {loadingRepos ? (
            <div className="flex items-center justify-center py-8 gap-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-[11px] text-muted-foreground">Loading project repositories...</span>
          </div>
        ) : repos.length === 0 ? (
          <div className="flex flex-col items-center py-8 gap-2 text-center">
            <Github className="w-6 h-6 text-muted-foreground/40" />
            <p className="text-[12px] text-muted-foreground">No repositories associated with this project.</p>
            <button
              onClick={() => {
                if (!canCreateRepos) {
                  toast.error('Your project role can only view repositories.');
                  return;
                }
                if (!connected) {
                  toast.error('You must connect your GitHub account before creating a repository.');
                  return;
                }
                setShowModal(true);
              }}
              className="text-[11px] text-primary hover:underline mt-1"
            >
              Create the first one
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {repos.map((repo) => (
              <div
                key={repo.id_repo}
                className="flex items-center justify-between py-2 px-3 border border-border rounded-[4px] hover:border-primary/30 transition-colors group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {repo.private ? (
                    <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-[12px] font-medium text-foreground truncate">
                    {repo.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate hidden sm:block">
                    {repo.full_name}
                  </span>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title="Abrir en GitHub"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  {canCreateRepos && (
                    <button
                      type="button"
                      title="Desvincular repositorio"
                      disabled={deletingRepoId === repo.id_repo}
                      onClick={() => void handleDeleteRepo(repo.id_repo, repo.name)}
                      className="opacity-0 group-hover:opacity-100 inline-flex items-center justify-center h-6 w-6 rounded-[3px] border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all disabled:opacity-50"
                    >
                      {deletingRepoId === repo.id_repo
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Trash2 className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Repo Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-[6px] p-5 w-full max-w-sm shadow-xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Github className="w-4 h-4 text-foreground" />
                <h3 className="text-[13px] font-semibold text-foreground">New repository</h3>
              </div>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="inline-flex h-8 items-center justify-center rounded-[4px] border border-border bg-card px-3 text-[11px] font-medium text-foreground shadow-sm transition-colors hover:bg-surface-secondary"
              >
                <X className="mr-1 w-4 h-4" /> Close
              </button>
            </div>

            <div className="space-y-3">

              {/* Repo name */}
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.06em]">
                  Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="my-repository"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateRepo()}
                  autoFocus
                  className="mt-1 w-full h-7 bg-surface-secondary border border-border rounded-[3px] px-2.5 text-[11px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Use only letters, numbers, dot, hyphen and underscore.
                </p>
                {validateRepoName(form.name) && form.name.trim() && (
                  <p className="mt-1 text-[10px] text-destructive">{validateRepoName(form.name)}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.06em]">
                  Description{' '}
                  <span className="normal-case text-muted-foreground/60">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Repository description"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="mt-1 w-full h-7 bg-surface-secondary border border-border rounded-[3px] px-2.5 text-[11px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>

              {/* Toggles */}
              <div className="flex gap-5 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.private}
                    onChange={(e) => setForm((f) => ({ ...f, private: e.target.checked }))}
                    className="w-3.5 h-3.5 accent-primary"
                  />
                  <span className="text-[11px] text-foreground">Private</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.auto_init}
                    onChange={(e) => setForm((f) => ({ ...f, auto_init: e.target.checked }))}
                    className="w-3.5 h-3.5 accent-primary"
                  />
                  <span className="text-[11px] text-foreground">Initialize with README</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border">
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                disabled={creating}
                className="px-3 py-1.5 border border-border rounded-[3px] text-[11px] text-foreground hover:bg-accent/30 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRepo}
                disabled={creating || Boolean(validateRepoName(form.name))}
                className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-primary-foreground rounded-[3px] text-[11px] font-medium transition-colors disabled:opacity-60"
              >
                {creating ? 'Creating...' : 'Create repository'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
