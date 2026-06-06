import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

vi.mock('../../app/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', name: 'Alex Dev', email: 'a@b.c', role: 'developer' } }),
}));

const listMock = vi.fn();
vi.mock('../../services', () => ({
  projectsService: { list: () => listMock() },
  githubService: {
    checkConnectionStatus: () => Promise.resolve({ connected: false }),
    startOAuth: vi.fn(),
  },
}));

import { OnboardingWelcome } from '../../app/components/OnboardingWelcome';

describe('OnboardingWelcome', () => {
  beforeEach(() => {
    localStorage.clear();
    listMock.mockReset();
  });

  it('shows the welcome flow for a brand-new user (no projects)', async () => {
    listMock.mockResolvedValue([]);
    render(
      <MemoryRouter>
        <OnboardingWelcome />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/Welcome to Yemoda/)).toBeInTheDocument();
    expect(screen.getByText(/get started/i)).toBeInTheDocument();
  });

  it('stays hidden (and marks done) for users who already have projects', async () => {
    listMock.mockResolvedValue([{ id_project: 1 }]);
    const { container } = render(
      <MemoryRouter>
        <OnboardingWelcome />
      </MemoryRouter>,
    );
    await waitFor(() => expect(localStorage.getItem('ym_ob:u1:welcome-v1')).toBe('1'));
    expect(container.querySelector('h2')).toBeNull();
  });
});
