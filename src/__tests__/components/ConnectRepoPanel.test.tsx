import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ConnectRepoPanel } from '../../app/components/ConnectRepoPanel';
import type { ConnectableRepo } from '../../services/types';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const listConnectableRepos = vi.fn();
const connectRepo = vi.fn();

vi.mock('../../services/github.service', () => ({
  githubService: {
    listConnectableRepos: (...args: unknown[]) => listConnectableRepos(...args),
    connectRepo: (...args: unknown[]) => connectRepo(...args),
  },
}));

function repo(overrides: Partial<ConnectableRepo> = {}): ConnectableRepo {
  return {
    github_repo_id: 1,
    full_name: 'dinic/side-project',
    name: 'side-project',
    owner: 'dinic',
    private: true,
    html_url: 'https://github.com/dinic/side-project',
    default_branch: 'main',
    can_push: true,
    is_admin: false,
    linked_to_this_project: false,
    linked_elsewhere: false,
    ...overrides,
  };
}

function respondWith(repos: ConnectableRepo[], truncated = false) {
  listConnectableRepos.mockResolvedValue({
    repos,
    installations: 1,
    truncated,
    linked_count: 0,
    max_repos: 4,
  });
}

describe('ConnectRepoPanel', () => {
  beforeEach(() => {
    listConnectableRepos.mockReset();
    connectRepo.mockReset();
  });

  it('lists the repos returned by the backend', async () => {
    respondWith([repo(), repo({ full_name: 'acme/api', name: 'api', github_repo_id: 2 })]);
    render(<ConnectRepoPanel projectId={1} onConnected={vi.fn()} />);

    expect(await screen.findByText('dinic/side-project')).toBeInTheDocument();
    expect(screen.getByText('acme/api')).toBeInTheDocument();
  });

  it('filters the list as the user searches', async () => {
    respondWith([repo(), repo({ full_name: 'acme/api', name: 'api', github_repo_id: 2 })]);
    render(<ConnectRepoPanel projectId={1} onConnected={vi.fn()} />);
    await screen.findByText('dinic/side-project');

    fireEvent.change(screen.getByLabelText('Search your repositories'), {
      target: { value: 'acme' },
    });

    expect(screen.getByText('acme/api')).toBeInTheDocument();
    expect(screen.queryByText('dinic/side-project')).not.toBeInTheDocument();
  });

  it('shows a reason instead of a button for repos that cannot be connected', async () => {
    respondWith([
      repo({ full_name: 'a/already', linked_to_this_project: true }),
      repo({ full_name: 'b/elsewhere', linked_elsewhere: true, github_repo_id: 3 }),
      repo({ full_name: 'c/readonly', can_push: false, github_repo_id: 4 }),
    ]);
    render(<ConnectRepoPanel projectId={1} onConnected={vi.fn()} />);
    await screen.findByText('a/already');

    expect(screen.getByText('Already connected')).toBeInTheDocument();
    expect(screen.getByText('In another project')).toBeInTheDocument();
    // Read-only access is the case that used to silently succeed and then fail downstream.
    expect(screen.getByText('Read-only access')).toBeInTheDocument();
    for (const name of ['a/already', 'b/elsewhere', 'c/readonly']) {
      expect(screen.queryByRole('button', { name: `Connect ${name}` })).not.toBeInTheDocument();
    }
  });

  it('connects the chosen repo and reports it upward', async () => {
    respondWith([repo()]);
    connectRepo.mockResolvedValue({
      repository: { full_name: 'dinic/side-project' },
      collaborator_sync: { status: 'ok', results: [] },
      awaiting_first_push: true,
    });
    const onConnected = vi.fn();
    render(<ConnectRepoPanel projectId={7} onConnected={onConnected} />);
    await screen.findByText('dinic/side-project');

    fireEvent.click(screen.getByRole('button', { name: 'Connect dinic/side-project' }));

    await waitFor(() => expect(connectRepo).toHaveBeenCalledWith(7, 'dinic/side-project'));
    await waitFor(() => expect(onConnected).toHaveBeenCalled());
  });

  it('normalizes a pasted URL before sending it', async () => {
    respondWith([]);
    connectRepo.mockResolvedValue({
      repository: { full_name: 'dinic/side-project' },
      collaborator_sync: { status: 'ok', results: [] },
      awaiting_first_push: true,
    });
    render(<ConnectRepoPanel projectId={3} onConnected={vi.fn()} />);
    await screen.findByLabelText('Or enter it manually');

    fireEvent.change(screen.getByLabelText('Or enter it manually'), {
      target: { value: 'https://github.com/dinic/side-project' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Connect entered repository' }));

    await waitFor(() => expect(connectRepo).toHaveBeenCalledWith(3, 'dinic/side-project'));
  });

  it('blocks submission of a malformed manual entry', async () => {
    respondWith([]);
    render(<ConnectRepoPanel projectId={1} onConnected={vi.fn()} />);
    await screen.findByLabelText('Or enter it manually');

    fireEvent.change(screen.getByLabelText('Or enter it manually'), {
      target: { value: 'not-a-repo' },
    });

    expect(screen.getByText(/owner\/repo format/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect entered repository' })).toBeDisabled();
    expect(connectRepo).not.toHaveBeenCalled();
  });

  it('tells the user when only the first page was fetched', async () => {
    respondWith([repo()], true);
    render(<ConnectRepoPanel projectId={1} onConnected={vi.fn()} />);
    expect(await screen.findByText(/Only the first page/)).toBeInTheDocument();
  });

  it('surfaces a load failure instead of showing an empty list', async () => {
    listConnectableRepos.mockRejectedValue(new Error('network down'));
    render(<ConnectRepoPanel projectId={1} onConnected={vi.fn()} />);
    expect(await screen.findByText('network down')).toBeInTheDocument();
  });
});
