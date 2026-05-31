import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Timeline } from '../../app/components/Timeline';

const useApiTasksMock = vi.fn();
const useApiSprintsMock = vi.fn();
const useApiBoardColumnsMock = vi.fn();

vi.mock('../../app/hooks/useProjectData', () => ({
  useApiTasks: (...args: unknown[]) => useApiTasksMock(...args),
  useApiSprints: (...args: unknown[]) => useApiSprintsMock(...args),
  useApiBoardColumns: (...args: unknown[]) => useApiBoardColumnsMock(...args),
}));

describe('Timeline', () => {
  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.setSystemTime(new Date('2026-05-11T12:00:00'));
    useApiTasksMock.mockReturnValue({
      data: [
        {
          id_task: 1,
          title: 'Tarea de prueba',
          description: 'Descripción',
          start_date: '2026-05-09',
          due_date: '2026-05-11',
          created_at: '2026-05-09',
          completed_at: null,
          status: null,
          assigned_users: [],
        },
      ],
      loading: false,
      statuses: [],
    });
    useApiSprintsMock.mockReturnValue({ data: [] });
    useApiBoardColumnsMock.mockReturnValue({ data: [] });
  });

  it('centers the today marker inside the current day column', () => {
    const { container } = render(<Timeline projectId={1} />);

    expect(screen.getByText('Timeline')).toBeInTheDocument();

    const todayMarkers = Array.from(container.querySelectorAll('div[style]')).filter((element) => {
      const htmlElement = element as HTMLElement;
      return htmlElement.style.width === '2px' && htmlElement.style.backgroundColor.includes('239, 68, 68');
    }) as HTMLElement[];

    expect(todayMarkers.length).toBeGreaterThan(0);
    todayMarkers.forEach((marker) => {
      expect(marker.style.left).toBe('50%');
    });
  });
});