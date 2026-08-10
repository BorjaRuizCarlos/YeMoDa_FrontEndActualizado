import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Github, Link2, Loader2, Lock, Search, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import { githubService } from '../../services/github.service';
import { ApiRequestError } from '../../services/api';
import type { ConnectRepoResponse, ConnectableRepo } from '../../services/types';
import { normalizeRepoFullName, validateRepoFullName } from '../utils/repoName';

interface ConnectRepoPanelProps {
  projectId: number;
  onConnected: (result: ConnectRepoResponse) => void;
}

/**
 * Backend `code` → a message that tells the user what to do about it.
 * The raw `detail` is a fallback; these read better and name the fix.
 */
const ERROR_MESSAGES: Record<string, string> = {
  app_not_installed:
    'The Yemoda GitHub App is not installed on that repository. Install it on the repo, then try again.',
  repo_not_visible: 'You do not have access to that repository on GitHub.',
  insufficient_repo_permission: 'You need write access to that repository in order to connect it.',
  linked_elsewhere:
    'That repository is already connected to another project. Disconnect it there first.',
  already_linked: 'That repository is already connected to this project.',
  limit_reached: 'This project already has the maximum number of repositories.',
  invalid_format: 'Use the owner/repo format.',
  github_not_connected: 'Connect your GitHub account first.',
  forbidden: 'Your project role cannot manage repositories.',
};

export function describeConnectError(err: unknown): string {
  if (err instanceof ApiRequestError) {
    const body = (err.body ?? {}) as { code?: string; detail?: string };
    if (body.code && ERROR_MESSAGES[body.code]) return ERROR_MESSAGES[body.code];
    return String(body.detail ?? `HTTP ${err.status}`);
  }
  return err instanceof Error ? err.message : 'Unknown error';
}

/** Why a listed repo cannot be connected, or null when it can. */
function blockedReason(repo: ConnectableRepo): string | null {
  if (repo.linked_to_this_project) return 'Already connected';
  if (repo.linked_elsewhere) return 'In another project';
  if (!repo.can_push) return 'Read-only access';
  return null;
}

/**
 * Pick an existing GitHub repository to connect, or type one in.
 *
 * The list comes live from GitHub and is already narrowed to repos the user can reach AND that
 * a GitHub App installation covers — so anything shown here is connectable in principle. The
 * manual box exists because only the first page is fetched, and because a repo without the App
 * installed will never appear in the list at all.
 */
export function ConnectRepoPanel({ projectId, onConnected }: ConnectRepoPanelProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [repos, setRepos] = useState<ConnectableRepo[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [search, setSearch] = useState('');
  const [manual, setManual] = useState('');
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    githubService
      .listConnectableRepos(projectId)
      .then((data) => {
        if (cancelled) return;
        setRepos(data.repos);
        setTruncated(data.truncated);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(describeConnectError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return repos;
    return repos.filter((repo) => repo.full_name.toLowerCase().includes(query));
  }, [repos, search]);

  const manualError = manual.trim() ? validateRepoFullName(manual) : null;

  const connect = async (fullName: string) => {
    setConnecting(fullName);
    try {
      const result = await githubService.connectRepo(projectId, fullName);
      toast.success(`Connected ${result.repository.full_name}`, {
        description:
          result.collaborator_sync.status === 'skipped'
            ? 'Project members were not added as collaborators — that needs admin access on GitHub.'
            : undefined,
      });
      onConnected(result);
    } catch (err) {
      toast.error('Could not connect the repository', { description: describeConnectError(err) });
    } finally {
      setConnecting(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search your repositories"
          aria-label="Search your repositories"
          className="w-full h-7 bg-surface-secondary border border-border rounded-[3px] pl-7 pr-2.5 text-[11px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
      </div>

      {/* List */}
      <div className="max-h-56 overflow-y-auto border border-border rounded-[3px]">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-6">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-[11px] text-muted-foreground">Loading your repositories...</span>
          </div>
        ) : loadError ? (
          <div className="flex items-start gap-2 px-3 py-4">
            <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground">{loadError}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-3 py-5 text-center">
            <Github className="w-5 h-5 text-muted-foreground/40 mx-auto mb-1.5" />
            <p className="text-[11px] text-muted-foreground">
              {repos.length === 0
                ? 'No repositories available. Install the Yemoda GitHub App on the repo you want, or type it below.'
                : 'No repositories match that search.'}
            </p>
          </div>
        ) : (
          <ul>
            {filtered.map((repo) => {
              const blocked = blockedReason(repo);
              const busy = connecting === repo.full_name;
              return (
                <li
                  key={repo.full_name}
                  className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border last:border-b-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {repo.private ? (
                      <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-[11px] text-foreground truncate">{repo.full_name}</span>
                  </div>
                  {blocked ? (
                    <span className="text-[10px] text-muted-foreground shrink-0">{blocked}</span>
                  ) : (
                    <button
                      type="button"
                      // Names the repo so screen readers (and tests) can tell the rows apart —
                      // several buttons on this panel would otherwise all read as "Connect".
                      aria-label={`Connect ${repo.full_name}`}
                      disabled={busy || connecting !== null}
                      onClick={() => void connect(repo.full_name)}
                      className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 bg-primary hover:bg-primary-hover text-primary-foreground rounded-[3px] text-[10px] font-medium transition-colors disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
                      Connect
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {truncated && (
        <p className="text-[10px] text-muted-foreground">
          Only the first page of your repositories is shown. If yours is missing, type it below.
        </p>
      )}

      {/* Manual entry */}
      <div className="pt-1 border-t border-border">
        <label
          htmlFor="manual-repo"
          className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.06em]"
        >
          Or enter it manually
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="manual-repo"
            type="text"
            value={manual}
            onChange={(event) => setManual(event.target.value)}
            placeholder="owner/repo"
            className="flex-1 h-7 bg-surface-secondary border border-border rounded-[3px] px-2.5 text-[11px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
          <button
            type="button"
            aria-label="Connect entered repository"
            disabled={connecting !== null || !manual.trim() || Boolean(manualError)}
            onClick={() => void connect(normalizeRepoFullName(manual))}
            className="px-3 py-1 bg-primary hover:bg-primary-hover text-primary-foreground rounded-[3px] text-[11px] font-medium transition-colors disabled:opacity-50"
          >
            {connecting === normalizeRepoFullName(manual) ? 'Connecting...' : 'Connect'}
          </button>
        </div>
        {manualError && <p className="mt-1 text-[10px] text-destructive">{manualError}</p>}
        <p className="mt-1 text-[10px] text-muted-foreground">
          A GitHub URL works too. We check the App is installed and that you have write access
          before connecting.
        </p>
      </div>
    </div>
  );
}
