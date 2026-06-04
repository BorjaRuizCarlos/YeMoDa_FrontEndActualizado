import { api } from './api';
import type { ApiProjectRole, ProjectPermissionFlags, ProjectPermissions } from './types';

export interface UpsertProjectRolePayload extends Partial<ProjectPermissionFlags> {
  project?: number;
  name?: string;
  description?: string | null;
  max_move_column?: number | null;
}

export const projectRolesService = {
  /** GET /api/project-roles/?project=:id — custom roles of a project */
  list(projectId: number): Promise<ApiProjectRole[]> {
    return api.get<ApiProjectRole[]>(`/project-roles/?project=${projectId}`);
  },

  /** POST /api/project-roles/ — create a custom role (project admin only) */
  create(payload: UpsertProjectRolePayload): Promise<ApiProjectRole> {
    return api.post<ApiProjectRole>('/project-roles/', payload);
  },

  /** PATCH /api/project-roles/:id/ */
  update(id: number, payload: UpsertProjectRolePayload): Promise<ApiProjectRole> {
    return api.patch<ApiProjectRole>(`/project-roles/${id}/`, payload);
  },

  /** DELETE /api/project-roles/:id/ */
  delete(id: number): Promise<void> {
    return api.delete<void>(`/project-roles/${id}/`);
  },

  /** GET /api/projects/:id/my-permissions/ — current user's resolved capabilities */
  myPermissions(projectId: number): Promise<ProjectPermissions> {
    return api.get<ProjectPermissions>(`/projects/${projectId}/my-permissions/`);
  },
};
