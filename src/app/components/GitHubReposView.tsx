import { useState, useEffect } from 'react';
import { Github, Plus, ExternalLink, Lock, Unlock, X, Trash2, Loader2, Folder, FileCode2, ChevronRight, Save } from 'lucide-react';
import { toast } from 'sonner';
import { githubService } from '../../services/github.service';
import { ApiRequestError } from '../../services/api';
import { useAuth } from '../context/AuthContext';
import type { ApiGithubContent, GitHubCommitFileChange, GitHubRepo } from '../../services/types';

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
  const [ideRepo, setIdeRepo] = useState('');
  const [branches, setBranches] = useState<string[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [currentPath, setCurrentPath] = useState('');
  const [listing, setListing] = useState<ApiGithubContent[]>([]);
  const [loadingListing, setLoadingListing] = useState(false);
  const [selectedFilePath, setSelectedFilePath] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [commitMessage, setCommitMessage] = useState('feat: cambios desde IDE');
  const [savingCommit, setSavingCommit] = useState(false);

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

  useEffect(() => {
    if (!ideRepo && repos.length > 0) {
      setIdeRepo(repos[0].full_name);
    }
  }, [repos, ideRepo]);

  useEffect(() => {
    if (!ideRepo) {
      setBranches([]);
      setSelectedBranch('main');
      return;
    }

    setLoadingBranches(true);
    githubService.getBranches(ideRepo)
      .then((items) => {
        const names = items.map((branch) => branch.name).filter(Boolean);
        setBranches(names);
        setSelectedBranch((current) => (current && names.includes(current) ? current : (names[0] ?? 'main')));
      })
      .catch(() => {
        setBranches([]);
        setSelectedBranch('main');
      })
      .finally(() => setLoadingBranches(false));
  }, [ideRepo]);

  useEffect(() => {
    if (!ideRepo || !selectedBranch) return;

    setLoadingListing(true);
    githubService.getContents(ideRepo, currentPath, selectedBranch)
      .then((data) => {
        const list = Array.isArray(data) ? data : [data];
        const dirs = list.filter((item) => item.type === 'dir');
        const files = list.filter((item) => item.type === 'file');
        setListing([...dirs, ...files]);
      })
      .catch(() => setListing([]))
      .finally(() => setLoadingListing(false));
  }, [ideRepo, selectedBranch, currentPath]);

  const openFileInEditor = async (path: string) => {
    if (!ideRepo || !selectedBranch) return;
    try {
      const data = await githubService.getContents(ideRepo, path, selectedBranch);
      const fileData = Array.isArray(data) ? data[0] : data;
      const decoded = fileData.content ? atob(fileData.content.replace(/\n/g, '')) : '';
      setSelectedFilePath(path);
      setEditorContent(decoded);
    } catch {
      toast.error('No se pudo abrir el archivo seleccionado.');
    }
  };

  const navigateUp = () => {
    if (!currentPath) return;
    const segments = currentPath.split('/').filter(Boolean);
    segments.pop();
    setCurrentPath(segments.join('/'));
  };

  const handleCommitFromIde = async () => {
    if (!ideRepo || !selectedBranch || !selectedFilePath) {
      toast.error('Selecciona un repositorio y un archivo para hacer commit.');
      return;
    }

    setSavingCommit(true);
    try {
      const files: GitHubCommitFileChange[] = [{ path: selectedFilePath, content: editorContent }];
      await githubService.commitChanges({
        repo: ideRepo,
        branch: selectedBranch,
        message: commitMessage.trim() || 'feat: cambios desde IDE',
        files,
      });
      toast.success('Commit enviado correctamente.');
    } catch (err) {
      const detail = err instanceof ApiRequestError
        ? String(err.body?.detail ?? 'Error desconocido')
        : err instanceof Error ? err.message : 'Error desconocido';
      toast.error('No se pudo confirmar el commit.', { description: detail });
    } finally {
      setSavingCommit(false);
    }
  };

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

      <div className="bg-card border border-border rounded-[4px] p-4 mt-2 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-[12px] font-semibold text-foreground">IDE rápido</h2>
          <div className="flex items-center gap-2">
            <select
              value={ideRepo}
              onChange={(e) => {
                setIdeRepo(e.target.value);
                setCurrentPath('');
                setSelectedFilePath('');
                setEditorContent('');
              }}
              className="h-7 rounded-[3px] border border-border bg-surface-secondary px-2 text-[11px] min-w-[180px]"
            >
              {repos.map((repo) => (
                <option key={repo.id_repo} value={repo.full_name}>{repo.full_name}</option>
              ))}
            </select>
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setCurrentPath('');
              }}
              className="h-7 rounded-[3px] border border-border bg-surface-secondary px-2 text-[11px] min-w-[120px]"
              disabled={loadingBranches}
            >
              {branches.map((branch) => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-3">
          <div className="rounded-[4px] border border-border bg-surface-secondary/20 min-h-[260px]">
            <div className="flex items-center justify-between px-2.5 py-2 border-b border-border">
              <p className="text-[10px] text-muted-foreground">/{currentPath || ''}</p>
              <button
                type="button"
                onClick={navigateUp}
                className="text-[10px] text-primary disabled:opacity-40"
                disabled={!currentPath}
              >
                Subir
              </button>
            </div>
            <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto">
              {loadingListing ? (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Cargando…</div>
              ) : listing.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">Sin contenido</p>
              ) : (
                listing.map((item) => (
                  <button
                    type="button"
                    key={item.path}
                    onClick={() => {
                      if (item.type === 'dir') {
                        setCurrentPath(item.path);
                        return;
                      }
                      void openFileInEditor(item.path);
                    }}
                    className="w-full h-7 px-2 rounded-[3px] border border-transparent hover:border-border hover:bg-card text-left text-[11px] text-foreground flex items-center gap-1.5"
                  >
                    {item.type === 'dir' ? <Folder className="w-3.5 h-3.5 text-primary" /> : <FileCode2 className="w-3.5 h-3.5 text-muted-foreground" />}
                    <span className="truncate">{item.name}</span>
                    {item.type === 'dir' && <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto" />}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[4px] border border-border overflow-hidden min-h-[260px] flex flex-col">
            <div className="px-3 py-2 border-b border-border bg-surface-secondary/40 text-[10px] text-muted-foreground truncate">
              {selectedFilePath || 'Selecciona un archivo para editar'}
            </div>
            <textarea
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              disabled={!selectedFilePath}
              className="flex-1 min-h-[180px] bg-card p-3 text-[11px] font-mono text-foreground resize-y focus:outline-none disabled:opacity-60"
            />
            <div className="px-3 py-2 border-t border-border bg-surface-secondary/20 flex flex-col sm:flex-row sm:items-center gap-2">
              <input
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                className="flex-1 h-7 rounded-[3px] border border-border bg-card px-2 text-[11px]"
                placeholder="Mensaje de commit"
              />
              <button
                type="button"
                onClick={() => void handleCommitFromIde()}
                disabled={savingCommit || !selectedFilePath}
                className="h-7 px-3 bg-primary text-primary-foreground rounded-[3px] text-[11px] inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {savingCommit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Commit
              </button>
            </div>
          </div>
        </div>
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
