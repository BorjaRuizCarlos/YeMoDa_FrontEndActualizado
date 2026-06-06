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
  {
    id: 'backlog-v1',
    match: (p) => p === '/backlog',
    steps: [
      {
        element: '[data-tour="backlog-header"]',
        popover: {
          title: 'Product backlog',
          description: 'Every task that isn’t in a sprint yet lives here — your team’s pool of upcoming work.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="backlog-project"]',
        popover: {
          title: 'Filter & organize',
          description: 'Scope the backlog to one project, and create tags to group related tasks.',
          side: 'bottom',
          align: 'end',
        },
      },
    ],
  },
  {
    id: 'reports-v1',
    match: (p) => p === '/reports',
    steps: [
      {
        element: '[data-tour="reports-toolbar"]',
        popover: {
          title: 'Reports & exports',
          description: 'Download a full report or export CSV, switch the project scope, and refresh the data here.',
          side: 'bottom',
          align: 'start',
        },
      },
    ],
  },
  {
    id: 'alerts-v1',
    match: (p) => p === '/alerts',
    steps: [
      {
        element: '[data-tour="alerts-toolbar"]',
        popover: {
          title: 'Stay ahead of risk',
          description: 'Filter alerts by status, search them, and resolve or bulk-clear them from this toolbar.',
          side: 'bottom',
          align: 'start',
        },
      },
    ],
  },
  {
    id: 'profile-v1',
    match: (p) => p === '/profile',
    steps: [
      {
        element: '[data-tour="profile-info"]',
        popover: {
          title: 'Your profile',
          description: 'Update your name, email and plan here — and connect GitHub or Azure from the side cards.',
          side: 'right',
          align: 'start',
        },
      },
    ],
  },
  {
    id: 'settings-v1',
    match: (p) => p === '/settings',
    steps: [
      {
        element: '[data-tour="settings-toolbar"]',
        popover: {
          title: 'Preferences',
          description: 'Tune your notification and email preferences, then hit Save changes.',
          side: 'bottom',
          align: 'start',
        },
      },
    ],
  },
  {
    id: 'plans-v1',
    match: (p) => p === '/plans',
    steps: [
      {
        element: '[data-tour="plans-header"]',
        popover: {
          title: 'Upgrade to Pro',
          description: 'Plans are per project. Continue to the secure Stripe checkout to unlock Pro for this project.',
          side: 'bottom',
          align: 'start',
        },
      },
    ],
  },
  {
    // Inside a single project — point at the tab bar that holds everything.
    id: 'project-detail-v1',
    match: (p) => /^\/projects\/[^/]+/.test(p),
    steps: [
      {
        element: '[data-tour="project-header"]',
        popover: {
          title: 'Your project',
          description: 'Everything for this project lives here — timeline, budget, team and the AI workflow.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="project-tabs"]',
        popover: {
          title: 'Project tabs',
          description: 'Switch between Overview, Backlog, Timeline, Sprints, Boards, Milestones, Scrum Poker, Code Review, Repositories, Team and Settings.',
          side: 'bottom',
          align: 'start',
        },
      },
    ],
  },
];

export function getTourForPath(pathname: string): TourDef | null {
  return TOURS.find((tour) => tour.match(pathname)) ?? null;
}
