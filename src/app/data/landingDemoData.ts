import type { UserRole } from '../utils/roles';
import type { ProjectWorkflowStatus } from '../utils/projectStatus';

export type LandingDemoView = 'dashboard' | 'projects' | 'reports' | 'alerts' | 'profile' | 'settings';

export interface LandingDemoMetric {
  title: string;
  value: string;
  delta: string;
  tone: 'primary' | 'success' | 'warning' | 'info';
}

export interface LandingDemoProject {
  id: number;
  name: string;
  status: ProjectWorkflowStatus;
  progress: number;
  owner: string;
  teamSize: number;
  dueLabel: string;
  health: 'success' | 'warning' | 'danger' | 'info';
  budgetUsage: string;
  scope: string;
  nextMilestone: string;
  lastUpdate: string;
}

export interface LandingDemoAlert {
  id: number;
  title: string;
  project: string;
  detail: string;
  time: string;
  tone: 'warning' | 'danger' | 'info' | 'success';
}

export interface LandingDemoProfile {
  name: string;
  title: string;
  email: string;
  scope: string;
  location: string;
  team: string;
}

export interface LandingDemoRoleConfig {
  label: string;
  description: string;
  audience: string;
  views: LandingDemoView[];
  metrics: LandingDemoMetric[];
  projects: LandingDemoProject[];
  alerts: LandingDemoAlert[];
  profile: LandingDemoProfile;
  emptyStates: {
    alerts: { title: string; description: string };
    reports: { title: string; description: string };
    settings: { title: string; description: string };
  };
}

const PROJECT_CATALOG: LandingDemoProject[] = [
  {
    id: 101,
    name: 'Atlas Retail Platform',
    status: 'in_progress',
    progress: 74,
    owner: 'María González',
    teamSize: 12,
    dueLabel: '18 days',
    health: 'warning',
    budgetUsage: '81%',
    scope: 'Omnichannel and commercial analytics for retail operations.',
    nextMilestone: 'Release unified catalog and review integrations.',
    lastUpdate: '2 hours ago',
  },
  {
    id: 102,
    name: 'Core API Stabilization',
    status: 'review',
    progress: 58,
    owner: 'Diego Ortega',
    teamSize: 8,
    dueLabel: '9 days',
    health: 'warning',
    budgetUsage: '67%',
    scope: 'Refactor of critical services, observability and hardening.',
    nextMilestone: 'Close contract tests and security validation.',
    lastUpdate: '40 min ago',
  },
  {
    id: 103,
    name: 'Data Hub Consolidation',
    status: 'planning',
    progress: 42,
    owner: 'Andrea Flores',
    teamSize: 6,
    dueLabel: '27 days',
    health: 'danger',
    budgetUsage: '53%',
    scope: 'Unified model for executive KPIs and cross-cutting auditing.',
    nextMilestone: 'Define data governance and initial catalog.',
    lastUpdate: 'Yesterday',
  },
  {
    id: 104,
    name: 'Mobile Release v2',
    status: 'completed',
    progress: 100,
    owner: 'Roberto Pérez',
    teamSize: 5,
    dueLabel: 'Completed',
    health: 'success',
    budgetUsage: '94%',
    scope: 'Final delivery of the field app with offline reports.',
    nextMilestone: 'Handover to support and post-release monitoring.',
    lastUpdate: '3 days ago',
  },
];

export const LANDING_DEMO_DATA: Record<UserRole, LandingDemoRoleConfig> = {
  admin: {
    label: 'Admin',
    description: 'Full visibility of the portfolio, users and operational alerts.',
    audience: 'Platform and operations leadership.',
    views: ['dashboard', 'projects', 'reports', 'alerts', 'profile', 'settings'],
    metrics: [
      { title: 'Active projects', value: '24', delta: '+3 this week', tone: 'primary' },
      { title: 'Portfolio health', value: '78%', delta: '+6 pts vs. last month', tone: 'success' },
      { title: 'Open alerts', value: '5', delta: '+1 critical', tone: 'warning' },
      { title: 'Team coverage', value: '96%', delta: 'No relevant gaps', tone: 'info' },
    ],
    projects: PROJECT_CATALOG,
    alerts: [
      {
        id: 1,
        title: 'Two deliverables are approaching the review deadline',
        project: 'Core API Stabilization',
        detail: 'The QA pipeline still flags inconsistencies in integration contracts.',
        time: '12 min ago',
        tone: 'danger',
      },
      {
        id: 2,
        title: 'Budget consumption above plan',
        project: 'Atlas Retail Platform',
        detail: 'Progress is below the expected spend for this phase.',
        time: '27 min ago',
        tone: 'warning',
      },
      {
        id: 3,
        title: 'A stable mobile release was published',
        project: 'Mobile Release v2',
        detail: 'The initiative has been closed out and is ready for tracking.',
        time: 'Yesterday',
        tone: 'success',
      },
    ],
    profile: {
      name: 'María González',
      title: 'VP of Operations',
      email: 'maria.gonzalez@abcdh.com',
      scope: 'Global portfolio governance and risk review.',
      location: 'CDMX · HQ',
      team: '14 critical projects',
    },
    emptyStates: {
      alerts: { title: 'No new alerts', description: 'All monitoring is green for this view.' },
      reports: { title: 'No reports generated', description: 'Custom reports will appear here once the cycle closes.' },
      settings: { title: 'Settings unavailable', description: 'This space reserves advanced administration for the demo.' },
    },
  },
  project_manager: {
    label: 'Project Manager',
    description: 'Operational tracking, risks and delivery coordination.',
    audience: 'Project management and delivery.',
    views: ['dashboard', 'projects', 'reports', 'alerts', 'profile', 'settings'],
    metrics: [
      { title: 'Projects in progress', value: '9', delta: '+2 in review', tone: 'primary' },
      { title: 'Overdue tasks', value: '3', delta: '-2 since yesterday', tone: 'warning' },
      { title: 'Critical blockers', value: '1', delta: 'Pending decision', tone: 'warning' },
      { title: 'On-time delivery', value: '84%', delta: '+4 pts', tone: 'success' },
    ],
    projects: PROJECT_CATALOG.slice(0, 3),
    alerts: [
      {
        id: 4,
        title: 'The contract review moved by 1 day',
        project: 'Core API Stabilization',
        detail: 'The QA team requested an extra validation before approving the release.',
        time: '18 min ago',
        tone: 'warning',
      },
      {
        id: 5,
        title: 'A deliverable was blocked by dependencies',
        project: 'Atlas Retail Platform',
        detail: 'Progress depends on a pending integration from the external partner.',
        time: '1 h ago',
        tone: 'danger',
      },
    ],
    profile: {
      name: 'Diego Ortega',
      title: 'Project Manager',
      email: 'diego.ortega@abcdh.com',
      scope: 'Coordination of teams, dates and risks.',
      location: 'Guadalajara · Remote',
      team: '3 active squads',
    },
    emptyStates: {
      alerts: { title: 'No active alerts', description: 'This view stays empty once incidents have been handled.' },
      reports: { title: 'No recent exports', description: 'Exports ready to share will appear here.' },
      settings: { title: 'Limited settings', description: 'The demo keeps only operational access for this profile.' },
    },
  },
  stakeholder: {
    label: 'Stakeholder',
    description: 'Executive summary of health, progress and relevant risks.',
    audience: 'Leadership and stakeholders.',
    views: ['dashboard', 'projects', 'reports', 'alerts', 'profile'],
    metrics: [
      { title: 'Visible portfolio', value: '7', delta: 'Prioritized projects', tone: 'primary' },
      { title: 'Overall health', value: '81%', delta: 'Stable trend', tone: 'success' },
      { title: 'Aggregate risk', value: 'Medium', delta: '2 areas to review', tone: 'warning' },
      { title: 'Compliance', value: '93%', delta: 'Within threshold', tone: 'info' },
    ],
    projects: PROJECT_CATALOG.slice(0, 2),
    alerts: [],
    profile: {
      name: 'Ana Torres',
      title: 'Executive Sponsor',
      email: 'ana.torres@abcdh.com',
      scope: 'Executive overview and validation of priorities.',
      location: 'Monterrey · Regional office',
      team: 'Cross-cutting coverage',
    },
    emptyStates: {
      alerts: { title: 'No alerts for this role', description: 'Detailed alerts are hidden to keep the executive view clean.' },
      reports: { title: 'Summary reports not active', description: 'Executive summaries will appear when the weekly snapshot is published.' },
      settings: { title: 'No editable settings', description: 'This profile only consumes consolidated information.' },
    },
  },
  user: {
    label: 'User',
    description: 'Daily work, personal tracking and access to assigned projects.',
    audience: 'Contributors and end users.',
    views: ['dashboard', 'projects', 'profile'],
    metrics: [
      { title: 'My tasks', value: '12', delta: '4 due soon', tone: 'primary' },
      { title: 'Deliveries done', value: '8', delta: '67% completed', tone: 'success' },
      { title: 'Blockers', value: '1', delta: 'Pending support', tone: 'warning' },
      { title: 'Activity today', value: '5', delta: 'Updated 10 min ago', tone: 'info' },
    ],
    projects: [PROJECT_CATALOG[1], PROJECT_CATALOG[3]],
    alerts: [],
    profile: {
      name: 'Roberto Pérez',
      title: 'Product Developer',
      email: 'roberto.perez@abcdh.com',
      scope: 'Task execution and review of assigned progress.',
      location: 'Puebla · Hybrid',
      team: 'Core API Team',
    },
    emptyStates: {
      alerts: { title: 'No personal alerts', description: 'Operational notifications are grouped outside this demo view.' },
      reports: { title: 'Personal reports unavailable', description: 'This profile does not publish executive reports in the demo.' },
      settings: { title: 'Restricted preferences', description: 'Advanced settings are reserved for management profiles.' },
    },
  },
};
