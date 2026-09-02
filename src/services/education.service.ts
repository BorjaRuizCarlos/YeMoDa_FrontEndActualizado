import { api } from './api';
import { educationTopics as seedTopics } from '../app/data/educationContent';
import type { EducationSubtopic, EducationTopic } from '../app/data/educationContent';

export interface EducationContentResponse {
  topics: EducationTopic[];
  /** Whether the current user may edit content. Computed server-side from the editors allowlist. */
  can_edit: boolean;
}

export interface UpdateSubtopicPayload {
  title: string;
  summary: string;
  content: string;
}

// ─── Mock mode ───────────────────────────────────────────────────────────────
// The Education backend does not exist yet. While USE_MOCK is true:
// - Base content comes from src/app/data/educationContent.ts.
// - Edits are stored as overrides in localStorage, so they are only visible in
//   the browser where they were made (they do NOT reach other users).
// - The editors list below gates the edit UI only. It is NOT security: the real
//   allowlist (editor emails + master emails) must live in the backend and be
//   enforced on every write endpoint.
// When the endpoints exist, flip USE_MOCK to false — the real API calls are
// already wired below.
export const EDUCATION_MOCK_MODE = true;

const MOCK_EDUCATION_EDITORS = [
  'yemodase@hotmail.com', // master
];

const OVERRIDES_KEY = 'pip_education_overrides';

type OverrideMap = Record<string, UpdateSubtopicPayload>;

function readOverrides(): OverrideMap {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    return raw ? (JSON.parse(raw) as OverrideMap) : {};
  } catch {
    return {};
  }
}

function writeOverrides(map: OverrideMap) {
  try {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(map));
  } catch {
    // Storage full or blocked; the edit still lives in component state for the session.
  }
}

function mockTopics(): EducationTopic[] {
  const overrides = readOverrides();
  return seedTopics.map((topic) => ({
    ...topic,
    subtopics: topic.subtopics.map((subtopic) => {
      const override = overrides[`${topic.id}/${subtopic.id}`];
      return override ? { ...subtopic, ...override } : subtopic;
    }),
  }));
}

function mockCanEdit(email?: string | null): boolean {
  if (!email) return false;
  return MOCK_EDUCATION_EDITORS.includes(email.trim().toLowerCase());
}

export const educationService = {
  /**
   * GET /education/ — topics plus the current user's edit permission.
   * `userEmail` is only used by the mock; the real backend derives the user
   * from the auth token, so the parameter can be dropped once it exists.
   */
  async getContent(userEmail?: string | null): Promise<EducationContentResponse> {
    if (EDUCATION_MOCK_MODE) {
      return { topics: mockTopics(), can_edit: mockCanEdit(userEmail) };
    }
    return api.get<EducationContentResponse>('/education/');
  },

  /** PUT /education/topics/:topicId/subtopics/:subtopicId/ — editors only (enforced server-side). */
  async updateSubtopic(
    topicId: string,
    subtopicId: string,
    payload: UpdateSubtopicPayload,
    userEmail?: string | null,
  ): Promise<EducationSubtopic> {
    if (EDUCATION_MOCK_MODE) {
      if (!mockCanEdit(userEmail)) {
        throw new Error('Tu correo no está en la lista de editores.');
      }
      const overrides = readOverrides();
      overrides[`${topicId}/${subtopicId}`] = payload;
      writeOverrides(overrides);
      return { id: subtopicId, ...payload };
    }
    return api.put<EducationSubtopic>(
      `/education/topics/${topicId}/subtopics/${subtopicId}/`,
      payload,
    );
  },
};
