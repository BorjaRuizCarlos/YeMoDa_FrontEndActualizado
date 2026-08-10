import { api, tokenStore } from './api';
import type {
  GitHubAppInstallStartResponse,
  GitHubOAuthStartResponse,
  GitHubOAuthCallbackPayload,
  GitHubOAuthCallbackResponse,
  GitHubConnectionStatusResponse,
  GitHubCreateRepoPayload,
  GitHubCreateRepoResponse,
  GitHubRepo,
  ApiGithubPushEvent,
  ApiGithubCommitDiff,
  CreateBranchPayload,
  CreateBranchResponse,
  ApiPullRequest,
  ApiPRFile,
  ApiGithubContent,
  ApiGithubBranch,
  GitHubCommitPayload,
  GitHubCommitResponse,
  ConnectableReposResponse,
  ConnectRepoResponse,
} from './types';

// Per-user localStorage key for repos cache only
const reposKey = (uid: number | string) => `pip_gh_repos_${uid}`;

/**
 * Remove ALL app-owned client state from localStorage. Sweeps every key with
 * the `pip_` prefix (tokens, user, needs-nickname flag, per-user repo caches,
 * etc.) so logout / session-expiry leaves no stale state behind.
 */
export function clearAllAppState(): void {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('pip_')) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // localStorage unavailable (SSR / blocked) — nothing to clear
  }
}

export const githubService = {
  // ─── Flow 3: Connection Status (always verify with backend) ────────────────

  /** GET /api/github/connection/status/ → check if user has active GitHub connection */
  async checkConnectionStatus(): Promise<GitHubConnectionStatusResponse> {
    return api.get<GitHubConnectionStatusResponse>('/github/connection/status/');
  },

  /** DELETE /api/github/connection/status/ → disconnect GitHub account */
  async disconnectGitHub(): Promise<void> {
    return api.delete('/github/connection/status/');
  },

  // ─── Flow 1: OAuth Connection ─────────────────────────────────────────────

  /** GET /api/github/app/oauth/start/ → redirect to GitHub OAuth */
  async startOAuth(): Promise<void> {
    const data = await api.get<GitHubOAuthStartResponse>('/github/app/oauth/start/');
    window.location.href = data.authorize_url;
  },

  /** POST /api/github/app/oauth/callback/ → exchange code for tokens + github_login */
  async completeOAuth(payload: GitHubOAuthCallbackPayload): Promise<GitHubOAuthCallbackResponse> {
    const res = await api.post<GitHubOAuthCallbackResponse>('/github/app/oauth/callback/', payload);
    // Backend returns a new access token (refresh is set as an HttpOnly cookie on this response).
    tokenStore.set(res.access_token);
    return res;
  },

  // ─── Flow 2: App Installation (personal account or organization) ──────────

  /** GET /api/github/app/install/start/ → redirect to the GitHub App installation page
   * (lets the user install it on their personal account or an organization). */
  async startAppInstall(): Promise<void> {
    const data = await api.get<GitHubAppInstallStartResponse>('/github/app/install/start/');
    window.location.href = data.install_url;
  },

  // ─── Repos (cached per user in localStorage) ─────────────────────────────

  getRepos(userId: number | string): GitHubRepo[] {
    try {
      const raw = localStorage.getItem(reposKey(userId));
      return raw ? (JSON.parse(raw) as GitHubRepo[]) : [];
    } catch {
      return [];
    }
  },

  persistRepos(userId: number | string, repos: GitHubRepo[]): void {
    localStorage.setItem(reposKey(userId), JSON.stringify(repos));
  },

  // ─── Create Repo ───────────────────────────────────────────────────────────

  /** POST /api/github/repos/ → creates repository in the given org */
  async createRepo(payload: GitHubCreateRepoPayload): Promise<GitHubCreateRepoResponse> {
    return api.post<GitHubCreateRepoResponse>('/github/repos/', payload);
  },

  // ─── Push Events ───────────────────────────────────────────────────────────

  /** GET /api/github/pushes/ → list push events, optionally filtered */
  async listPushes(filters?: { project_id?: number; repo?: string }): Promise<ApiGithubPushEvent[]> {
    const params = new URLSearchParams();
    if (filters?.project_id) params.set('project_id', String(filters.project_id));
    if (filters?.repo) params.set('repo', filters.repo);
    const qs = params.toString();
    return api.get<ApiGithubPushEvent[]>(`/github/pushes/${qs ? `?${qs}` : ''}`);
  },

  /** GET /api/github/commits/diff/ → get diff for a specific commit */
  async getCommitDiff(repo: string, commitSha: string): Promise<ApiGithubCommitDiff> {
    return api.get<ApiGithubCommitDiff>(`/github/commits/diff/?repo=${encodeURIComponent(repo)}&commit=${encodeURIComponent(commitSha)}`);
  },

  /** GET /api/github/contents/ → browse repo file tree */
  async getContents(repo: string, path = '', ref?: string): Promise<ApiGithubContent[] | ApiGithubContent> {
    const params = new URLSearchParams({ repo });
    if (path) params.set('path', path);
    if (ref) params.set('ref', ref);
    return api.get<ApiGithubContent[] | ApiGithubContent>(`/github/contents/?${params.toString()}`);
  },

  /** GET /api/github/branches/ → list repository branches */
  async getBranches(repo: string): Promise<ApiGithubBranch[]> {
    // The backend wraps the list as {branches: [{name, sha}]}; unwrap to the bare array.
    const res = await api.get<{ branches?: ApiGithubBranch[] }>(`/github/branches/?repo=${encodeURIComponent(repo)}`);
    return res.branches ?? [];
  },

  /** POST /api/github/commit/ → commit one or more file changes */
  async commitChanges(payload: GitHubCommitPayload): Promise<GitHubCommitResponse> {
    return api.post<GitHubCommitResponse>('/github/commit/', payload);
  },

  /** GET /api/github/repos/ → list repos from backend, optionally filtered by project */
  async listRepos(filters?: { project_id?: number }): Promise<GitHubRepo[]> {
    const params = new URLSearchParams();
    if (filters?.project_id) params.set('project_id', String(filters.project_id));
    const qs = params.toString();
    return api.get<GitHubRepo[]>(`/github/repos/${qs ? `?${qs}` : ''}`);
  },

  /** DELETE /api/github/repos/{id}/ → unlink repo from YeMoDa */
  async deleteRepo(idRepo: number): Promise<void> {
    return api.delete(`/github/repos/${idRepo}/`);
  },

  // ─── Connecting an existing repository ────────────────────────────────────

  /**
   * GET /api/github/repos/connectable/ → repos this user may connect to the project.
   * Live from GitHub, not from Yemoda's database: the intersection of what the user can reach
   * and what a GitHub App installation covers.
   */
  async listConnectableRepos(projectId: number): Promise<ConnectableReposResponse> {
    return api.get<ConnectableReposResponse>(`/github/repos/connectable/?project_id=${projectId}`);
  },

  /**
   * POST /api/projects/{id}/repos/ → connect an existing repository.
   * The backend verifies the App is installed AND that the caller has write access before it
   * writes anything; failures come back with a `code` the UI maps to a specific message.
   */
  async connectRepo(projectId: number, repoFullName: string): Promise<ConnectRepoResponse> {
    return api.post<ConnectRepoResponse>(`/projects/${projectId}/repos/`, {
      repo_full_name: repoFullName,
    });
  },

  /** DELETE /api/projects/{id}/repos/{repoId}/ → disconnect. Nothing is changed on GitHub. */
  async disconnectProjectRepo(projectId: number, projectRepoId: number): Promise<void> {
    return api.delete(`/projects/${projectId}/repos/${projectRepoId}/`);
  },

  // ─── Branch creation ──────────────────────────────────────────────────────

  /** POST /api/tasks/{task_id}/branch/ → creates {task_id}-{slug} branch and returns name + checkout command */
  async createBranch(taskId: number, payload: CreateBranchPayload): Promise<CreateBranchResponse> {
    return api.post<CreateBranchResponse>(`/tasks/${taskId}/branch/`, payload);
  },

  // ─── Pull Requests ─────────────────────────────────────────────────────────

  /** GET /api/tasks/{task_id}/pull-requests/ → lists PRs whose head branch starts with "{task_id}-" */
  async listTaskPullRequests(taskId: number): Promise<ApiPullRequest[]> {
    return api.get<ApiPullRequest[]>(`/tasks/${taskId}/pull-requests/`);
  },

  /** GET /api/reviews/pr/files/ → files changed in a PR with unified diffs */
  async getPRFiles(repo: string, prNumber: number): Promise<ApiPRFile[]> {
    return api.get<ApiPRFile[]>(`/reviews/pr/files/?repo=${encodeURIComponent(repo)}&pr=${prNumber}`);
  },
};
