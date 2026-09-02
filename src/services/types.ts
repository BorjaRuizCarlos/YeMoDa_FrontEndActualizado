// ─── Backend API types — mirrors Django models exactly ───────────────────────

export interface ApiUserAccount {
  id_user: number;
  email: string;
  username: string;
  created_at: string;
  system_role?: number | null;
  system_role_name?: string | null;
  is_premium?: boolean;
  subscription_plan?: 'monthly' | null;
  github_connected?: boolean;
  is_github_connected?: boolean;
  github_login?: string | null;
  github_username?: string | null;
  github_token?: string | null;
}

export interface ApiSystemRole {
  id_system_role: number;
  name: string;
  description: string | null;
}

export interface ApiProject {
  id_project: number;
  name: string;
  description: string | null;
  created_at: string;
  end_date: string | null;   // ISO date YYYY-MM-DD
  status: string | null;     // free-text e.g. "active", "on_hold", "completed"
  created_by: number | null;
  github_repo_full_name: string | null;
  review_branches: string;   // comma-separated branch names, empty = all branches
}

export interface ApiRole {
  id_role: number;
  name: string;
  description: string | null;
}

export interface ApiProjectMember {
  id: number;
  user: number;
  project: number;
  role: number | null;
  // Per-project custom role that drives authorization.
  project_role: number | null;
  project_role_name?: string | null;
  joined_at: string;
}

// ─── Per-project custom roles & permissions ──────────────────────────────────

/** The granular permission flags shared by ProjectRole and the my-permissions response. */
export interface ProjectPermissionFlags {
  can_create_tasks: boolean;
  can_edit_tasks: boolean;
  can_delete_tasks: boolean;
  can_move_tasks: boolean;
  can_manage_sprints: boolean;
  can_manage_board: boolean;
  can_manage_milestones: boolean;
  can_manage_tags: boolean;
  can_comment: boolean;
  can_manage_members: boolean;
  can_manage_project: boolean;
  can_trigger_ai: boolean;
}

export interface ApiProjectRole extends ProjectPermissionFlags {
  id_project_role: number;
  project: number;
  name: string;
  description: string | null;
  is_admin_role: boolean;
  is_system: boolean;
  // Cap: tasks may only be moved into columns with order <= this column's order. Null = no limit.
  max_move_column: number | null;
  created_at: string;
}

/** Resolved capabilities of the current user in a project (GET /projects/:id/my-permissions/). */
export interface ProjectPermissions extends ProjectPermissionFlags {
  is_project_admin: boolean;
  project_role_id: number | null;
  project_role_name: string | null;
  max_move_column_id: number | null;
  max_move_column_order: number | null;
}

export interface ApiBoard {
  id_board: number;
  project: number;
  name: string;
  description: string | null;
  created_at: string;
  // AI agent configuration
  coding_style: 'standard' | 'clean_code' | 'tdd' | 'security' | 'performance';
  review_focus: 'strict' | 'general';
  tech_stack: 'mixed' | 'python' | 'nodejs' | 'typescript' | 'java' | 'go' | 'dotnet' | 'react' | 'nextjs' | 'angular' | 'vue' | 'vite';
  naming_convention: 'default' | 'camel_case' | 'pascal_case' | 'snake_case' | 'kebab_case' | 'mixed';
  response_language: 'es' | 'en';
  custom_instructions: string | null;
}

export interface ApiTaskStatus {
  id_status: number;
  name: string;
  description: string | null;
}

export interface ApiTaskPriority {
  id_priority: number;
  name: string;
  level: number;
}

export interface ApiTask {
  id_task: number;
  project: number;
  sprint: number | null;
  board_column: number;
  milestone: number | null;
  tags: number[];
  assigned_users: Array<{
    id_user: number;
    email: string;
    username: string;
    id_assignment: number;
  }>;
  title: string;
  description: string | null;
  priority: number;
  created_by: number | null;
  created_at: string;
  start_date?: string | null; // ISO date
  due_date: string | null;   // ISO date
  completed_at: string | null;

  story_points?: number | null;

  // ── Subtasks / epics (self-referential hierarchy) ──
  // A task with a `parent` is a subtask. Hierarchy supports arbitrary depth.
  parent?: number | null;
  // Completion progress over direct subtasks (computed by the backend).
  subtask_progress?: { total: number; completed: number; percent: number };
  // Sum of story_points across leaf descendants (only leaves carry real points).
  rolled_up_points?: number | null;

  // Legacy compatibility fields retained while frontend migrates.
  board?: number;
  status?: number | null;
  assigned_to?: number | null;
}

export interface ApiTag {
  id_tag: number;
  name: string;
  color: string;
  project: number;
}

export interface ApiSprint {
  id_sprint: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: 'planned' | 'active' | 'closed';
  project: number;
}

export interface ApiMilestone {
  id_milestone: number;
  name: string;
  description: string | null;
  due_date: string | null;
  is_completed: boolean;
  project: number;
}

export interface ApiBoardColumn {
  id_column: number;
  name: string;
  order: number;
  is_final: boolean;
  is_review: boolean;
  board: number;
}

export interface ApiTaskAssignment {
  id_assignment: number;
  task: number;
  assigned_to: number;
  created_at?: string | null;
}

export interface ApiTaskComment {
  id_comment: number;
  task: number;
  user: number | null;
  content: string;
  created_at: string;
}

export interface ApiActivityLog {
  id_activity: number;
  user: number | null;
  entity_type: string | null;
  entity_id: number | null;
  action: string | null;
  created_at: string;
}

export interface CreateCheckoutSessionResponse {
  checkout_url: string;
}

/** POST /api/payments/cancel/ — cancels the project's subscription at period end. */
export interface CancelSubscriptionResponse {
  detail: string;
  cancel_at_period_end?: boolean;
  current_period_end?: string;
}

// ─── AI usage quotas (paywall) ───────────────────────────────────────────────

/** The three metered AI categories shared by quota / used / remaining. */
export interface AiUsageCategories {
  reviews: number;   // push + on-demand AI reviews
  chat: number;      // AI chat questions
  aifix: number;     // "send warnings to AI to resolve"
}

/** The billing plan a project is on. Billing is per-project, not per-user. */
export type ProjectPlan = 'free' | 'pro';

/** GET /api/projects/:id/ai-usage/ — the project's AI quota usage for the current period. */
export interface AiUsage {
  period: string;            // YYYY-MM
  plan: ProjectPlan;         // 'free' or 'pro' (per-project)
  seats: number;
  enforced: boolean;
  quota: AiUsageCategories;
  used: AiUsageCategories;
  remaining: AiUsageCategories;
}

// ─── Auth response shapes ────────────────────────────────────────────────────

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_at: string;
  user: ApiUserAccount;
}

export interface RefreshResponse {
  access_token: string;
  token_type: string;
  expires_at: string;
}

export interface RegisterResponse {
  detail: string;
}

// ─── DRF paginated list (optional — DRF returns plain arrays by default) ────

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ─── GitHub integration ───────────────────────────────────────────────────────

export interface GitHubAppInstallStartResponse {
  install_url: string;
}

export interface GitHubOAuthStartResponse {
  authorize_url: string;
}

export interface GitHubOAuthCallbackPayload {
  code: string;
  state: string;
}

export interface GitHubOAuthCallbackResponse {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  github_login: string;
  user: ApiUserAccount;
  /** Whether the user has the GitHub App installed (personal account or org). */
  has_installation?: boolean;
}

export interface GitHubConnectionStatusResponse {
  connected: boolean;
  github_login: string | null;
  /** Present when connected=true: whether the GitHub App is installed (personal or org). */
  has_installation?: boolean;
  reason?: string;
}

export interface GitHubCreateRepoPayload {
  user_id: number;
  project_id?: number;
  name: string;
  description?: string;
  private: boolean;
  auto_init: boolean;
  installation_id?: number;
  webhook_url?: string;
}

export interface GitHubRepo {
  id_repo: number;
  github_repo_id: number;
  name: string;
  full_name: string;
  owner: string;
  html_url: string;
  private: boolean;
  created_at: string;
  user: number;
  project: number | null;
}

export interface GitHubWebhook {
  id: number;
  events: string[];
}

export interface GitHubCreateRepoResponse {
  repository: GitHubRepo;
  webhook: GitHubWebhook;
}

// ─── Task Warnings ───────────────────────────────────────────────────────────

export interface ApiTaskWarning {
  id_warning: number;
  message: string;
  status: 'active' | 'resolved';
  severity: 'critical' | 'warning' | 'info';
  created_at: string;
  resolved_at: string | null;
  task: number;
  resolved_in_push: number | null;
}

export interface ApiTaskAiFixPromptWarning {
  id_warning: number;
  severity: 'critical' | 'warning' | 'info';
  message: string;
}

export interface ApiTaskAiFixPromptResponse {
  task_id: number;
  task_title: string;
  warnings_count: number;
  warnings: ApiTaskAiFixPromptWarning[];
  copy_prompt: string;
}

// ─── GitHub Push Events ──────────────────────────────────────────────────────

export interface ApiGithubPushEvent {
  id_push: number;
  repo_full_name: string;
  ref: string;
  pusher: string | null;
  commits: unknown;
  received_at: string;
  project: number | null;
}

export interface ApiTaskPushMatch {
  id_match: number;
  coverage: 'full' | 'partial';
  reason: string | null;
  code_snippet: string | null;
  created_at: string;
  push_ref: string;
  push_pusher: string | null;
  push_received_at: string;
  push_repo: string;
  push_commits: Array<{
    id: string;
    message: string;
    author?: string;
    added?: string[];
    modified?: string[];
    removed?: string[];
  }>;
  push_diff_text: string | null;
}

export interface ApiGithubCommitDiff {
  sha: string;
  message: string;
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
  files: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    patch?: string;
  }>;
}

export interface ApiGithubContent {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  sha?: string;
  content?: string;
  download_url?: string;
}

export interface ApiGithubBranch {
  name: string;
}

export interface GitHubCommitFileChange {
  path: string;
  content?: string;
  deleted?: boolean;
}

export interface GitHubCommitPayload {
  repo: string;
  branch: string;
  message: string;
  files: GitHubCommitFileChange[];
}

export interface GitHubCommitResponse {
  commit_sha?: string;
  message?: string;
}

// Only the server-side Yemoda (Claude) provider remains; GitHub Copilot was removed.
export type AIProvider = 'yemoda';

export interface ChatModelInfo {
  id: string;
  provider: AIProvider;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequestPayload {
  provider?: AIProvider;
  model?: string;
  messages: ChatMessage[];
  context_type?: 'ai_fix' | 'code_review' | string;
  context_data?: Record<string, unknown>;
  max_tokens?: number;
}

export interface ChatResponsePayload {
  message?: string;
  response?: string;
  content?: string;
  /** Anthropic stop_reason passed through by the backend; "max_tokens" => truncated output. */
  finish_reason?: string | null;
}

export interface ChatModelsResponse {
  yemoda?: ChatModelInfo[];
  [provider: string]: ChatModelInfo[] | undefined;
}

export interface ApiTaskAIReviewResult {
  id_review_result: number;
  task: number;
  user: number | null;
  provider: AIProvider;
  model_name: string | null;
  result_text: string;
  created_at: string;
}

export interface CreateTaskAIReviewResultPayload {
  task: number;
  provider: AIProvider;
  model_name?: string | null;
  result_text: string;
}

// ─── Branch creation ─────────────────────────────────────────────────────────

export interface CreateBranchPayload {
  base_branch: string;
  repo_full_name?: string;
}

export interface CreateBranchResponse {
  branch_name: string;
  checkout_command: string;
}

// ─── Pull Requests ────────────────────────────────────────────────────────────

export interface ApiPullRequest {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  html_url: string;
  head_ref: string;
  base_ref: string;
  created_at: string;
  merged_at: string | null;
  user: string;
}

export interface ApiPRFile {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  additions: number;
  deletions: number;
  patch?: string;
  blob_url: string;
  previous_filename?: string | null;
}

// ─── Azure DevOps integration ────────────────────────────────────────────────

export interface DevOpsOAuthStartResponse {
  authorize_url: string;
  state: string;
}

export interface DevOpsOAuthCallbackPayload {
  code: string;
  state: string;
}

export interface DevOpsOAuthCallbackResponse {
  connection_id: number;
  subscriptions_registered: number;
}

export interface DevOpsStory {
  id: string;
  title: string;
  status: string;
  project: string;
  [key: string]: unknown;
}

// ─── Hackathon "Robustness Score" ────────────────────────────────────────────

/** The fixed set of scoring categories shared by the rubric and per-category breakdowns. */
export type HackathonCategory =
  | 'security'
  | 'performance'
  | 'robustness'
  | 'correctness'
  | 'maintainability'
  | 'tdd';

/** Weights (0–100) for each scoring category. 0 = ignore the category. */
export type HackathonRubric = Record<HackathonCategory, number>;

export type HackathonProcessingMode = 'normal' | 'batch';

export type HackathonSubmissionStatus =
  | 'pending'
  | 'running'
  | 'batch_pending'
  | 'done'
  | 'failed';

export type HackathonFindingSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface Hackathon {
  id_hackathon: number;
  name: string;
  created_by: number;
  status: string;
  created_at: string;
  rubric: HackathonRubric;
  processing_mode: HackathonProcessingMode;
  verify_findings: boolean;
  expected_teams: number | null;
  price_per_team: number;
  estimated_total: number;
}

/** A single per-category contribution to a submission's overall score. */
export interface HackathonScoreEntry {
  score: number;
  weight: number;
}

export interface HackathonFinding {
  category: string;
  severity: HackathonFindingSeverity;
  title: string;
  file: string;
  description: string;
}

export interface HackathonSubmission {
  id_submission: number;
  hackathon: number;
  team_name: string;
  repo_url: string;
  ref: string;
  status: HackathonSubmissionStatus;
  score: number | null;
  score_breakdown: Record<string, HackathonScoreEntry> | null;
  findings: HackathonFinding[] | null;
  summary: string | null;
  error: string | null;
  created_at: string;
  analyzed_at: string | null;
}

export interface HackathonEstimate {
  processing_mode: HackathonProcessingMode;
  verify_findings: boolean;
  expected_teams: number;
  normal_price_per_team: number;
  batch_price_per_team: number;
  price_per_team: number;
  estimated_total: number;
}

// ─── API error shape ─────────────────────────────────────────────────────────

export interface ApiError {
  detail?: string;
  code?: string;
  [field: string]: string | string[] | undefined;
}
