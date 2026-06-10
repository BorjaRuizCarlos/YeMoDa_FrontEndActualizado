import type { DriveStep } from 'driver.js';

// Guided-tour registry. Each tour maps to a route and a list of steps that
// highlight the most important elements on that page. Add a new tour by giving its
// target elements a `data-tour="..."` attribute and adding an entry here.

export interface TourDef {
  id: string;
  /** Mono eyebrow shown in the popover header, e.g. "Workspace · 02/06". */
  label: string;
  /** True when this tour applies to the given pathname. */
  match: (pathname: string) => boolean;
  steps: DriveStep[];
}

export const TOURS: TourDef[] = [
  {
    // First time on the dashboard: orient the user around the whole workspace.
    id: 'dashboard-v1',
    label: 'Workspace',
    match: (p) => p === '/dashboard' || p === '/',
    steps: [
      {
        element: '[data-tour="sidebar-nav"]',
        popover: {
          title: 'Your workspace',
          description:
            'Dashboard, Backlog, Projects, Reports, Alerts — every signal lives one click from here.',
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '[data-tour="nav-projects"]',
        popover: {
          title: 'Projects',
          description:
            'Each project carries its own boards, sprints, code review and team. Most days start here.',
          side: 'right',
        },
      },
      {
        element: '[data-tour="nav-alerts"]',
        popover: {
          title: 'Early warnings',
          description:
            'Yemoda flags risk before it becomes a blocker. When the badge lights up, look here first.',
          side: 'right',
        },
      },
      {
        element: '[data-tour="topbar-search"]',
        popover: {
          title: 'Jump anywhere',
          description: 'Press Ctrl / ⌘ K and type — projects, tasks and pages resolve instantly.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="topbar-notifications"]',
        popover: {
          title: 'Notifications',
          description: 'Mentions and alert updates land here the moment they happen.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="topbar-help"]',
        popover: {
          title: 'Replay this anytime',
          description: 'Every page has a short tour like this one — the “?” replays it on demand.',
          side: 'bottom',
          align: 'end',
        },
      },
    ],
  },
  {
    // First time on the projects list: point at how to create one.
    id: 'projects-v1',
    label: 'Projects',
    match: (p) => p === '/projects',
    steps: [
      {
        element: '[data-tour="projects-new"]',
        popover: {
          title: 'Create a project',
          description:
            'Name it and set an end date — boards, sprints, code review and team all hang off this one move.',
          side: 'bottom',
          align: 'end',
        },
      },
    ],
  },
  {
    id: 'backlog-v1',
    label: 'Backlog',
    match: (p) => p === '/backlog',
    steps: [
      {
        element: '[data-tour="backlog-header"]',
        popover: {
          title: 'The backlog',
          description:
            'Work that isn’t sprint-committed waits here — your team’s pool of next moves.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="backlog-project"]',
        popover: {
          title: 'Scope & tag',
          description: 'Filter the pool down to one project, then tag tasks to group related work.',
          side: 'bottom',
          align: 'end',
        },
      },
    ],
  },
  {
    id: 'reports-v1',
    label: 'Reports',
    match: (p) => p === '/reports',
    steps: [
      {
        element: '[data-tour="reports-toolbar"]',
        popover: {
          title: 'Reports & exports',
          description:
            'Switch project scope, refresh the data, then ship it out as a full report or CSV.',
          side: 'bottom',
          align: 'start',
        },
      },
    ],
  },
  {
    id: 'alerts-v1',
    label: 'Alerts',
    match: (p) => p === '/alerts',
    steps: [
      {
        element: '[data-tour="alerts-toolbar"]',
        popover: {
          title: 'Stay ahead of risk',
          description:
            'Filter by status, search, resolve or bulk-clear — the goal is to keep this list near zero.',
          side: 'bottom',
          align: 'start',
        },
      },
    ],
  },
  {
    id: 'profile-v1',
    label: 'Profile',
    match: (p) => p === '/profile',
    steps: [
      {
        element: '[data-tour="profile-info"]',
        popover: {
          title: 'Your profile',
          description:
            'Name, email and plan live here — GitHub and Azure connect from the side cards.',
          side: 'right',
          align: 'start',
        },
      },
    ],
  },
  {
    id: 'settings-v1',
    label: 'Preferences',
    match: (p) => p === '/settings',
    steps: [
      {
        element: '[data-tour="settings-toolbar"]',
        popover: {
          title: 'Preferences',
          description: 'Tune notifications and email digests, then hit Save changes.',
          side: 'bottom',
          align: 'start',
        },
      },
    ],
  },
  {
    id: 'plans-v1',
    label: 'Plans',
    match: (p) => p === '/plans',
    steps: [
      {
        element: '[data-tour="plans-header"]',
        popover: {
          title: 'Upgrade to Pro',
          description:
            'Plans are per project — checkout runs on Stripe and Pro unlocks the moment it clears.',
          side: 'bottom',
          align: 'start',
        },
      },
    ],
  },
  {
    // Inside a single project — point at the tab bar that holds everything.
    id: 'project-detail-v1',
    label: 'Project',
    match: (p) => /^\/projects\/[^/]+/.test(p),
    steps: [
      {
        element: '[data-tour="project-header"]',
        popover: {
          title: 'Project HQ',
          description:
            'Timeline, budget, team and the AI workflow — everything this project owns is in here.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-tour="project-tabs"]',
        popover: {
          title: 'The tab rail',
          description:
            'Overview to Settings — eleven tabs, one project. Code Review is where the AI earns its keep.',
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
