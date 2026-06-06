import { toast } from 'sonner';
import { ApiRequestError } from '../../services/api';

/**
 * Detect the "AI quota reached" condition (HTTP 402) coming from either:
 *  - the shared api client, which throws `ApiRequestError` exposing `.status`, or
 *  - the streaming chat path (chat.service.ts), which throws an `Error` whose
 *    message starts with `402:` (e.g. "402:Upgrade your plan…").
 * Returns the `detail` string when the error is a 402, otherwise `null`.
 */
export function getAiQuotaDetail(err: unknown): string | null {
  if (err instanceof ApiRequestError && err.status === 402) {
    return String(err.body?.detail ?? '');
  }
  if (err instanceof Error && /^402:/.test(err.message)) {
    return err.message.slice(4).trim();
  }
  return null;
}

/** True when the error represents an AI quota (402) failure. */
export function isAiQuotaError(err: unknown): boolean {
  return getAiQuotaDetail(err) !== null;
}

/**
 * Show a friendly "AI quota reached" toast with an Upgrade CTA. Pass a `navigate`
 * function (from react-router's useNavigate) so the action can route to /plans.
 * When `projectId` is provided the Upgrade action routes to that project's plans
 * (billing is per-project); otherwise it falls back to the generic /plans page.
 */
export function showAiQuotaToast(
  detail: string,
  navigate: (path: string) => void,
  projectId?: number,
): void {
  const upgradePath = projectId != null ? `/plans?project=${projectId}` : '/plans';
  toast.error('AI quota reached for this project', {
    description: detail?.trim() || 'Upgrade your plan or wait for the next cycle.',
    action: {
      label: 'Upgrade',
      onClick: () => navigate(upgradePath),
    },
  });
}

/**
 * If `err` is an AI quota (402) error, show the upgrade toast and return true.
 * Otherwise return false so the caller can fall back to its generic handling.
 * Pass the current `projectId` so the Upgrade CTA is project-scoped.
 */
export function handleAiQuotaError(
  err: unknown,
  navigate: (path: string) => void,
  projectId?: number,
): boolean {
  const detail = getAiQuotaDetail(err);
  if (detail === null) return false;
  showAiQuotaToast(detail, navigate, projectId);
  return true;
}
