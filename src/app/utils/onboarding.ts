// Onboarding / guided-tour completion flags.
//
// Deliberately NOT prefixed with `pip_` so clearAllAppState() (logout / session
// expiry, which sweeps every `pip_*` key) does NOT wipe them — onboarding should
// stay completed across logins. Keyed per user so different accounts on the same
// browser never collide.

const PREFIX = 'ym_ob';

// The first-run welcome flow. Tours wait until this is completed so they don't
// fire underneath the welcome overlay.
export const WELCOME_ID = 'welcome-v1';

function storageKey(userId: string, id: string): string {
  return `${PREFIX}:${userId}:${id}`;
}

export function hasSeen(userId: string, id: string): boolean {
  try {
    return localStorage.getItem(storageKey(userId, id)) === '1';
  } catch {
    return false;
  }
}

export function markSeen(userId: string, id: string): void {
  try {
    localStorage.setItem(storageKey(userId, id), '1');
  } catch {
    /* localStorage unavailable — ignore */
  }
}

export function resetSeen(userId: string, id: string): void {
  try {
    localStorage.removeItem(storageKey(userId, id));
  } catch {
    /* ignore */
  }
}
