import { api } from './api';
import type {
  Hackathon,
  HackathonEstimate,
  HackathonProcessingMode,
  HackathonRubric,
  HackathonSubmission,
} from './types';

export interface CreateHackathonPayload {
  name: string;
  rubric?: HackathonRubric;
  processing_mode: HackathonProcessingMode;
  verify_findings?: boolean;
  expected_teams?: number | null;
}

export interface AddSubmissionPayload {
  team_name: string;
  repo_url: string;
  ref?: string;
}

export interface EstimateHackathonPayload {
  processing_mode: HackathonProcessingMode;
  verify_findings?: boolean;
  expected_teams: number;
}

export const hackathonService = {
  /** GET /api/hackathons/ — my hackathons, newest first. */
  listHackathons(): Promise<Hackathon[]> {
    return api.get<Hackathon[]>('/hackathons/');
  },

  /** GET /api/hackathons/:id/ */
  getHackathon(id: number): Promise<Hackathon> {
    return api.get<Hackathon>(`/hackathons/${id}/`);
  },

  /** POST /api/hackathons/ */
  createHackathon(payload: CreateHackathonPayload): Promise<Hackathon> {
    return api.post<Hackathon>('/hackathons/', payload);
  },

  /** POST /api/hackathons/:id/submissions/ */
  addSubmission(hackathonId: number, payload: AddSubmissionPayload): Promise<HackathonSubmission> {
    return api.post<HackathonSubmission>(`/hackathons/${hackathonId}/submissions/`, payload);
  },

  /** GET /api/hackathons/:id/leaderboard/ — submissions ordered by score desc. */
  getLeaderboard(hackathonId: number): Promise<HackathonSubmission[]> {
    return api.get<HackathonSubmission[]>(`/hackathons/${hackathonId}/leaderboard/`);
  },

  /** GET /api/hackathons/:id/submissions/:submissionId/ */
  getSubmission(hackathonId: number, submissionId: number): Promise<HackathonSubmission> {
    return api.get<HackathonSubmission>(`/hackathons/${hackathonId}/submissions/${submissionId}/`);
  },

  /** POST /api/hackathons/estimate/ — price quote for a given mode + team count. */
  estimate(payload: EstimateHackathonPayload): Promise<HackathonEstimate> {
    return api.post<HackathonEstimate>('/hackathons/estimate/', payload);
  },
};
