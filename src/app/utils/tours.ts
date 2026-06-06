import type { DriveStep } from 'driver.js';

// Guided-tour registry. Each tour maps to a route and a list of steps that
// highlight the most important elements on that page. Add a new tour by giving its
// target elements a `data-tour="..."` attribute and adding an entry here.

export interface TourDef {
  id: string;
  /** True when this tour applies to the given pathname. */
  match: (pathname: string) => boolean;
  steps: DriveStep[];
}

export const TOURS: TourDef[] = [
  {
    // First time on the dashboard: orient the user around the whole workspace.
    id: 'dashboard-v1',
    match: (p) => p === '/dashboard' || p === '/',
    steps: [
      {
        element: '[data-tour="sidebar-nav"]',
        popover: {
          title: 'Your workspace',
          description: 'Jump between Dashboard, Backlog, Projects, Reports and Alerts from here.',
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '[data-tour="nav-projects"]',
        popover: {
          title: 'Projects',
          description: 'Create and open projects — each one has its own boards, sprints, code review and team.',
          side: 'right',
        },
      },
      {
        element: '[data-tour="nav-alerts"]',
        popover: {
          title: 'Early-warning alerts',
          description: 'Yemoda surfaces risks here before they turn into blockers.',
          side: 'right',
        },
      },
      {
        element: '[data-tour="topbar-search"]',
        popover: {
          title: 'Search anything',
          description: 'Press Ctrl / ⌘ K to jump to any project, task or page instantly.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="topbar-notifications"]',
        popover: {
          title: 'Notifications',
          description: 'Mentions and alert updates land here.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="topbar-help"]',
        popover: {
          title: 'Replay tips anytime',
          description: 'Stuck on a page? Click here to replay its quick tour.',
          side: 'bottom',
          align: 'end',
        },
      },
    ],
  },
  {
    // First time on the projects list: point at how to create one.
    id: 'projects-v1',
    match: (p) => p === '/projects',
    steps: [
      {
        element: '[data-tour="projects-new"]',
        popover: {
          title: 'Create a project',
          description: 'Start here — name it, set an end date, then invite your team from the project’s Team tab.',
          side: 'bottom',
          align: 'end',
        },
      },
    ],
  },
];

export function getTourForPath(pathname: string): TourDef | null {
  return TOURS.find((tour) => tour.match(pathname)) ?? null;
}
