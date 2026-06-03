import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Activity, Bell, Briefcase, CheckCircle2, ChevronRight, CircleUser, FileText, LayoutGrid, RefreshCw, Settings2, Shield, Sparkles, Users } from 'lucide-react';
import { KPICard } from './KPICard';
import { ADOTabs } from './ADOTabs';
import { DataTable, type DataTableColumn } from './DataTable';
import { EmptyState } from './EmptyState';
import { StatusBadge } from './StatusBadge';
import { LANDING_DEMO_DATA, type LandingDemoProject, type LandingDemoView } from '../data/landingDemoData';

const VIEW_LABELS: Record<LandingDemoView, string> = {
  dashboard: 'Dashboard',
  projects: 'Projects',
  reports: 'Reports',
  alerts: 'Alerts',
  profile: 'Profile',
  settings: 'Settings',
};

const DEMO_ROLE = 'project_manager' as const;

const roleToneMap = {
  project_manager: 'bg-info/10 text-info border-info/20',
} as const;

const metricIconMap = {
  primary: LayoutGrid,
  success: CheckCircle2,
  warning: Bell,
  info: Sparkles,
} as const;

function projectHealthStatus(health: LandingDemoProject['health']) {
  if (health === 'danger') return 'danger' as const;
  if (health === 'success') return 'success' as const;
  if (health === 'info') return 'info' as const;
  return 'warning' as const;
}

function DemoShell({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="bg-card border border-border rounded-[4px] shadow-sm overflow-hidden"
    >
      {children}
    </motion.div>
  );
}

export function LandingDemo() {
  const [view, setView] = useState<LandingDemoView>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<number>(LANDING_DEMO_DATA[DEMO_ROLE].projects[0]?.id ?? 0);
  const [detailTab, setDetailTab] = useState<'resumen' | 'backlog' | 'timeline' | 'sprints' | 'boards' | 'milestones' | 'code-review' | 'repositorios' | 'equipo' | 'configuracion'>('resumen');
  const isStakeholderView = false;
  const canEditProfileSettings = true;

  const roleData = LANDING_DEMO_DATA[DEMO_ROLE];
  const visibleViews = roleData.views;
  const activeView = visibleViews.includes(view) ? view : visibleViews[0];
  const selectedProject = roleData.projects.find((project) => project.id === selectedProjectId) ?? roleData.projects[0];

  useEffect(() => {
    setView((current) => (visibleViews.includes(current) ? current : visibleViews[0]));
    setSelectedProjectId(roleData.projects[0]?.id ?? 0);
    setDetailTab('resumen');
  }, [roleData.projects, visibleViews]);

  useEffect(() => {
    setDetailTab('resumen');
  }, [selectedProjectId]);

  const columns = useMemo<DataTableColumn<LandingDemoProject>[]>(() => [
    {
      id: 'name',
      header: 'Project',
      accessor: (project) => (
        <div className="min-w-0">
          <div className="font-medium text-foreground truncate">{project.name}</div>
          <div className="text-[11px] text-muted-foreground truncate">{project.scope}</div>
        </div>
      ),
      sortKey: 'name',
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (project) => <StatusBadge status={projectHealthStatus(project.health)} text={project.status.replace('_', ' ')} variant="pill" size="sm" />,
    },
    {
      id: 'progress',
      header: 'Progress',
      accessor: (project) => (
        <div className="min-w-[120px]">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
            <span>{project.progress}%</span>
            <span>{project.dueLabel}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: `${project.progress}%` }} />
          </div>
        </div>
      ),
      sortKey: 'progress',
    },
    {
      id: 'owner',
      header: 'Owner',
      accessor: (project) => (
        <div className="text-[12px] text-foreground">
          <div className="font-medium">{project.owner}</div>
          <div className="text-muted-foreground">{project.teamSize} people</div>
        </div>
      ),
      sortKey: 'owner',
    },
  ], []);

  const metricCards = roleData.metrics.map((metric) => {
    const Icon = metricIconMap[metric.tone];
    return (
      <KPICard
        key={metric.title}
        title={metric.title}
        value={metric.value}
        trendValue={metric.delta}
        trend={metric.tone === 'success' ? 'up' : 'neutral'}
        accentColor={metric.tone === 'success' ? 'success' : metric.tone === 'warning' ? 'warning' : metric.tone === 'info' ? 'info' : 'primary'}
        icon={<Icon className="w-4 h-4" />}
      />
    );
  });

  return (
    <section id="demo" className="container mx-auto px-6 py-20 max-w-6xl scroll-mt-16">
      <div className="max-w-3xl mx-auto text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[3px] border border-primary/20 bg-primary/10 text-primary text-[11px] font-medium mb-4">
          <Sparkles className="w-3 h-3" />
          Embedded interactive demo
        </div>
        <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-3">
          A simulated view that feels like part of the platform
        </h2>
        <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Move between internal views and explore local mock data using the same visual language, the same radii, and the same hierarchy as the rest of the product.
        </p>
      </div>

      <DemoShell>
        <div className="grid lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="border-b lg:border-b-0 lg:border-r border-border bg-surface-secondary/40 p-4 space-y-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-muted-foreground mb-2">
                <Shield className="w-3.5 h-3.5" />
                Demo context
              </div>
              <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-[3px] border text-[11px] font-medium ${roleToneMap[DEMO_ROLE]}`}>
                <CircleUser className="w-3.5 h-3.5" />
                {roleData.label} · Fixed demo view
              </div>
              <p className="mt-3 text-[12px] leading-5 text-muted-foreground">{roleData.description}</p>
            </div>

            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2">Navigation</div>
              <nav className="space-y-1">
                {visibleViews.map((candidateView) => {
                  const active = candidateView === activeView;
                  return (
                    <button
                      key={candidateView}
                      type="button"
                      onClick={() => setView(candidateView)}
                      className={`w-full flex items-center justify-between rounded-[3px] px-2.5 py-2 text-[12px] transition-colors ${active ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                    >
                      <span>{VIEW_LABELS[candidateView]}</span>
                      <ChevronRight className={`w-3.5 h-3.5 ${active ? 'text-primary' : 'text-muted-foreground/60'}`} />
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="rounded-[3px] border border-border bg-card p-3">
              <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground mb-1">Simulated access</div>
              <div className="text-[12px] font-medium text-foreground">{roleData.projects.length} projects visible</div>
              <div className="text-[11px] text-muted-foreground">{roleData.alerts.length} active alerts in the current context</div>
            </div>
          </aside>

          <div className="min-w-0 bg-background">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-card/70 backdrop-blur-sm">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{roleData.audience}</div>
                <div className="text-[13px] font-semibold text-foreground truncate">
                  {VIEW_LABELS[activeView]} · {selectedProject?.name ?? roleData.profile.name}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="hidden md:flex items-center gap-2 rounded-[3px] border border-border bg-background px-3 py-1.5 text-[12px] text-muted-foreground min-w-[260px]">
                  <Activity className="w-3.5 h-3.5" />
                  Local demo search
                </div>
                <div className="inline-flex items-center gap-2 rounded-[3px] border border-border bg-background px-3 py-1.5 text-[12px] text-muted-foreground">
                  <Briefcase className="w-3.5 h-3.5" />
                  Local mock data
                </div>
              </div>
            </div>

            <div className="p-4 md:p-5 space-y-5">
              {activeView === 'dashboard' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">{metricCards}</div>

                  <div className="grid xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)] gap-3">
                    <div className="rounded-[4px] border border-border bg-card p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="text-[12px] font-semibold text-foreground">Consolidated progress</div>
                          <div className="text-[11px] text-muted-foreground">Simulated evolution over the last 12 iterations</div>
                        </div>
                        <StatusBadge status="success" text="Stable" variant="pill" size="sm" />
                      </div>
                      <div className="h-[190px] rounded-[3px] bg-surface-secondary/60 border border-border/60 p-3 flex items-end gap-2">
                        {[38, 44, 40, 52, 48, 61, 58, 66, 64, 72, 76, 82].map((height, index) => (
                          <div key={index} className="flex-1 flex items-end">
                            <div className="w-full rounded-t-[2px] bg-primary/15 overflow-hidden" style={{ height: `${height}%` }}>
                              <div className="h-[62%] w-full rounded-t-[2px] bg-primary/75" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[4px] border border-border bg-card p-4 space-y-4">
                      <div>
                        <div className="text-[12px] font-semibold text-foreground">Quick panel</div>
                        <div className="text-[11px] text-muted-foreground">Safe actions and context status</div>
                      </div>
                      <div className="space-y-2">
                        <div className="rounded-[3px] border border-border bg-background p-3">
                          <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground mb-1">Next decision</div>
                          <div className="text-[12px] text-foreground font-medium">Align the scope review before the weekly cutoff.</div>
                        </div>
                        <div className="rounded-[3px] border border-border bg-background p-3">
                          <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground mb-1">Security status</div>
                          <div className="flex items-center gap-2 text-[12px] text-foreground">
                            <Shield className="w-3.5 h-3.5 text-success" />
                            Read-only access for this demo
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeView === 'projects' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[12px] font-semibold text-foreground">Project list</div>
                      <div className="text-[11px] text-muted-foreground">Local table with simulated sorting, status, and owners</div>
                    </div>
                    <StatusBadge status="info" text={`${roleData.projects.length} visible`} variant="pill" size="sm" />
                  </div>
                  <div className="rounded-[4px] border border-border bg-card overflow-hidden">
                    <DataTable
                      columns={columns}
                      data={roleData.projects}
                      keyField="id"
                      emptyMessage={roleData.emptyStates.reports.title}
                      density="compact"
                      onRowClick={(project) => {
                        setSelectedProjectId(project.id);
                        setDetailTab('resumen');
                        setView('projects');
                      }}
                    />
                  </div>

                  {selectedProject && (
                    <div className="rounded-[4px] border border-border bg-card overflow-hidden">
                      <div className="px-4 py-3 border-b border-border bg-surface-secondary/40">
                        <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground mb-1">Project detail</div>
                        <div className="text-[18px] font-semibold text-foreground truncate">{selectedProject.name}</div>
                        <div className="mt-1 text-[12px] text-muted-foreground">{selectedProject.scope}</div>
                      </div>

                      <div className="px-3 pt-3">
                        <ADOTabs
                          tabs={[
                            { id: 'resumen', label: 'Overview', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
                            { id: 'backlog', label: 'Backlog', icon: <FileText className="w-3.5 h-3.5" /> },
                            { id: 'timeline', label: 'Timeline', icon: <Activity className="w-3.5 h-3.5" /> },
                            { id: 'sprints', label: 'Sprints', icon: <RefreshCw className="w-3.5 h-3.5" /> },
                            { id: 'boards', label: 'Boards', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
                            { id: 'milestones', label: 'Milestones', icon: <Sparkles className="w-3.5 h-3.5" /> },
                            { id: 'code-review', label: 'Code Review', icon: <Shield className="w-3.5 h-3.5" /> },
                            { id: 'repositorios', label: 'Repositories', icon: <Briefcase className="w-3.5 h-3.5" /> },
                            { id: 'equipo', label: 'Team', count: selectedProject.teamSize, icon: <Users className="w-3.5 h-3.5" /> },
                            { id: 'configuracion', label: 'Settings', icon: <Settings2 className="w-3.5 h-3.5" /> },
                          ]}
                          activeTab={detailTab}
                          onTabChange={(id) => setDetailTab(id as typeof detailTab)}
                        />
                      </div>

                      <div className="p-4 space-y-4">
                        {detailTab === 'resumen' && (
                          <div className="space-y-3">
                            <div className="grid sm:grid-cols-3 gap-2">
                              <div className="rounded-[3px] border border-border bg-background p-3">
                                <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground mb-1">Progress</div>
                                <div className="text-[18px] font-semibold text-foreground">{selectedProject.progress}%</div>
                              </div>
                              <div className="rounded-[3px] border border-border bg-background p-3">
                                <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground mb-1">Budget</div>
                                <div className="text-[18px] font-semibold text-foreground">{selectedProject.budgetUsage}</div>
                              </div>
                              <div className="rounded-[3px] border border-border bg-background p-3">
                                <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground mb-1">Team</div>
                                <div className="text-[18px] font-semibold text-foreground">{selectedProject.teamSize}</div>
                              </div>
                            </div>
                            <div className="rounded-[3px] border border-border bg-background p-3">
                              <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground mb-1">Owner</div>
                              <div className="font-medium text-foreground">{selectedProject.owner}</div>
                            </div>
                            <div className="rounded-[3px] border border-border bg-background p-3">
                              <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground mb-1">Next milestone</div>
                              <div className="font-medium text-foreground">{selectedProject.nextMilestone}</div>
                            </div>
                            <div className="rounded-[3px] border border-border bg-background p-3">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="text-[12px] font-semibold text-foreground">Overall progress</div>
                                <div className="text-[11px] text-muted-foreground">Last updated {selectedProject.lastUpdate}</div>
                              </div>
                              <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${selectedProject.progress}%` }} />
                              </div>
                            </div>
                          </div>
                        )}

                        {detailTab === 'backlog' && (
                          <div className="space-y-2 text-[12px]">
                            <div className="rounded-[3px] border border-border bg-background p-3">
                              <div className="font-medium text-foreground">Prioritized stories</div>
                              <div className="text-muted-foreground">3 tasks ready for the sprint and 2 in refinement.</div>
                            </div>
                            <div className="rounded-[3px] border border-border bg-background p-3">
                              <div className="font-medium text-foreground">Active blockers</div>
                              <div className="text-muted-foreground">One external dependency awaiting confirmation.</div>
                            </div>
                          </div>
                        )}

                        {detailTab === 'timeline' && (
                          <div className="space-y-2 text-[12px]">
                            <div className="rounded-[3px] border border-border bg-background p-3 flex items-center justify-between gap-2">
                              <span className="text-muted-foreground">Estimated start</span>
                              <span className="font-medium text-foreground">4 weeks ago</span>
                            </div>
                            <div className="rounded-[3px] border border-border bg-background p-3 flex items-center justify-between gap-2">
                              <span className="text-muted-foreground">Next delivery</span>
                              <span className="font-medium text-foreground">{selectedProject.dueLabel}</span>
                            </div>
                          </div>
                        )}

                        {detailTab === 'sprints' && (
                          <div className="space-y-2 text-[12px]">
                            <div className="rounded-[3px] border border-border bg-background p-3">
                              <div className="font-medium text-foreground">Current sprint</div>
                              <div className="text-muted-foreground">In progress with active daily tracking.</div>
                            </div>
                            <div className="rounded-[3px] border border-border bg-background p-3">
                              <div className="font-medium text-foreground">Next sprint</div>
                              <div className="text-muted-foreground">Planned to continue refinement and QA.</div>
                            </div>
                          </div>
                        )}

                        {detailTab === 'boards' && (
                          <div className="space-y-2 text-[12px]">
                            <div className="rounded-[3px] border border-border bg-background p-3">
                              <div className="font-medium text-foreground">Main board</div>
                              <div className="text-muted-foreground">Kanban flow with active and completed columns.</div>
                            </div>
                          </div>
                        )}

                        {detailTab === 'milestones' && (
                          <div className="space-y-2 text-[12px]">
                            <div className="rounded-[3px] border border-border bg-background p-3">
                              <div className="font-medium text-foreground">Milestone in progress</div>
                              <div className="text-muted-foreground">Pending closure of integration validations.</div>
                            </div>
                          </div>
                        )}

                        {detailTab === 'code-review' && (
                          <div className="space-y-2 text-[12px]">
                            <div className="rounded-[3px] border border-border bg-background p-3">
                              <div className="font-medium text-foreground">Active review</div>
                              <div className="text-muted-foreground">Pull requests pending approval and merge.</div>
                            </div>
                          </div>
                        )}

                        {detailTab === 'repositorios' && (
                          <div className="space-y-2 text-[12px]">
                            <div className="rounded-[3px] border border-border bg-background p-3">
                              <div className="font-medium text-foreground">Linked repository</div>
                              <div className="text-muted-foreground">Connection to the project's main repository.</div>
                            </div>
                          </div>
                        )}

                        {detailTab === 'equipo' && (
                          <div className="space-y-2 text-[12px]">
                            <div className="rounded-[3px] border border-border bg-background p-3 flex items-center justify-between gap-2">
                              <span className="text-muted-foreground">Members</span>
                              <span className="font-medium text-foreground">{selectedProject.teamSize}</span>
                            </div>
                            <div className="rounded-[3px] border border-border bg-background p-3">
                              <div className="font-medium text-foreground">Active contributors</div>
                              <div className="text-muted-foreground">Team assigned to delivery and daily tracking.</div>
                            </div>
                          </div>
                        )}

                        {detailTab === 'configuracion' && (
                          <div className="rounded-[3px] border border-border bg-background p-3 text-[12px] text-muted-foreground">
                            Project settings are available in the real view after signing in.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeView === 'reports' && (
                <div className="grid xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-3">
                  <div className="rounded-[4px] border border-border bg-card p-4 space-y-4">
                    <div>
                      <div className="text-[12px] font-semibold text-foreground">Executive report</div>
                      <div className="text-[11px] text-muted-foreground">Week-over-week comparable summary using local mock data</div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      <div className="rounded-[3px] border border-border bg-background p-3">
                        <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground mb-1">Schedule deviation</div>
                        <div className="text-[20px] font-semibold text-foreground">-6%</div>
                        <div className="text-[11px] text-success">Improved over the previous week</div>
                      </div>
                      <div className="rounded-[3px] border border-border bg-background p-3">
                        <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground mb-1">Scope variation</div>
                        <div className="text-[20px] font-semibold text-foreground">+2</div>
                        <div className="text-[11px] text-warning">Minor changes under control</div>
                      </div>
                    </div>
                    <div className="rounded-[3px] border border-border bg-background p-3">
                      <div className="text-[12px] font-medium text-foreground mb-2">Last cycle trend</div>
                      <div className="h-28 rounded-[3px] bg-surface-secondary/60 border border-border/60 p-2 flex items-end gap-2">
                        {[22, 38, 35, 49, 54, 60, 58, 72].map((height, index) => (
                          <div key={index} className="flex-1 flex items-end"><div className="w-full rounded-t-[2px] bg-info/20" style={{ height: `${height}%` }}><div className="h-[70%] w-full rounded-t-[2px] bg-info/75" /></div></div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[4px] border border-border bg-card p-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div>
                        <div className="text-[12px] font-semibold text-foreground">Executive readouts</div>
                        <div className="text-[11px] text-muted-foreground">Summaries and control statuses</div>
                      </div>
                      <StatusBadge status="info" variant="pill" size="sm" text="Weekly" />
                    </div>
                    <div className="space-y-2">
                      {isStakeholderView ? (
                        <EmptyState icon="inbox" title={roleData.emptyStates.reports.title} description={roleData.emptyStates.reports.description} />
                      ) : (
                        [
                          { label: 'Projects on track', value: '18', tone: 'success' },
                          { label: 'Pending reviews', value: '4', tone: 'warning' },
                          { label: 'Blocked tasks', value: '1', tone: 'danger' },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center justify-between rounded-[3px] border border-border bg-background px-3 py-2 text-[12px]">
                            <span className="text-muted-foreground">{item.label}</span>
                            <StatusBadge status={item.tone === 'danger' ? 'danger' : item.tone === 'warning' ? 'warning' : 'success'} variant="pill" size="sm" text={item.value} />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeView === 'alerts' && (
                <div className="grid xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-3">
                  <div className="rounded-[4px] border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[12px] font-semibold text-foreground">Recent alerts</div>
                        <div className="text-[11px] text-muted-foreground">Simulated notifications from the current context</div>
                      </div>
                      <StatusBadge status="warning" variant="pill" size="sm" text={`${roleData.alerts.length} active`} />
                    </div>
                    {roleData.alerts.length === 0 ? (
                      <EmptyState icon="inbox" title={roleData.emptyStates.alerts.title} description={roleData.emptyStates.alerts.description} />
                    ) : (
                      <div className="space-y-2">
                        {roleData.alerts.map((alert) => (
                          <div key={alert.id} className="rounded-[3px] border border-border bg-background p-3 flex items-start gap-3">
                            <span className={`mt-1 inline-flex h-2.5 w-2.5 rounded-full shrink-0 ${alert.tone === 'danger' ? 'bg-destructive/90' : alert.tone === 'success' ? 'bg-success/90' : alert.tone === 'info' ? 'bg-info/90' : 'bg-warning/90'}`} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-[12px] font-medium text-foreground truncate">{alert.title}</div>
                                <div className="text-[10px] text-muted-foreground shrink-0">{alert.time}</div>
                              </div>
                              <div className="text-[11px] text-muted-foreground mt-1 truncate">{alert.project} · {alert.detail}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-[4px] border border-border bg-card p-4 space-y-3">
                    <div className="text-[12px] font-semibold text-foreground">Prioritization criteria</div>
                    <div className="space-y-2 text-[12px] text-muted-foreground">
                      <div className="rounded-[3px] border border-border bg-background p-3">Critical alerts raise the red banner in the project header.</div>
                      <div className="rounded-[3px] border border-border bg-background p-3">Medium-severity issues are grouped by project to avoid cluttering the view.</div>
                      <div className="rounded-[3px] border border-border bg-background p-3">Executive profiles see summaries rather than the full operational queue.</div>
                    </div>
                  </div>
                </div>
              )}

              {activeView === 'profile' && (
                <div className="grid xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-3">
                  <div className="rounded-[4px] border border-border bg-card p-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg">{roleData.profile.name.charAt(0)}</div>
                      <div>
                        <div className="text-[12px] font-semibold text-foreground">{roleData.profile.name}</div>
                        <div className="text-[11px] text-muted-foreground">{roleData.profile.title}</div>
                      </div>
                    </div>
                    <div className="space-y-2 text-[12px]">
                      <div><span className="text-muted-foreground">Email:</span> <span className="text-foreground">{roleData.profile.email}</span></div>
                      <div><span className="text-muted-foreground">Coverage:</span> <span className="text-foreground">{roleData.profile.scope}</span></div>
                      <div><span className="text-muted-foreground">Location:</span> <span className="text-foreground">{roleData.profile.location}</span></div>
                      <div><span className="text-muted-foreground">Team:</span> <span className="text-foreground">{roleData.profile.team}</span></div>
                    </div>
                  </div>

                  <div className="rounded-[4px] border border-border bg-card p-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div>
                        <div className="text-[12px] font-semibold text-foreground">Settings and scope</div>
                        <div className="text-[11px] text-muted-foreground">Preferences, permissions, and demo placeholders</div>
                      </div>
                      <StatusBadge status="neutral" variant="pill" size="sm" text="Read only" />
                    </div>

                    {canEditProfileSettings ? (
                      <div className="grid md:grid-cols-2 gap-2">
                        <div className="rounded-[3px] border border-border bg-background p-3">
                          <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground mb-1">Notifications</div>
                          <div className="text-[12px] font-medium text-foreground">Daily summary enabled</div>
                        </div>
                        <div className="rounded-[3px] border border-border bg-background p-3">
                          <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground mb-1">Privacy</div>
                          <div className="text-[12px] font-medium text-foreground">Data visible by role</div>
                        </div>
                        <div className="rounded-[3px] border border-border bg-background p-3 md:col-span-2">
                          <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground mb-1">Test view</div>
                          <div className="text-[12px] text-foreground">{roleData.emptyStates.settings.description}</div>
                        </div>
                      </div>
                    ) : (
                      <EmptyState icon="file" title={roleData.emptyStates.settings.title} description={roleData.emptyStates.settings.description} />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DemoShell>
    </section>
  );
}
