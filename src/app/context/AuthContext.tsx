import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Clock3, LogOut } from 'lucide-react';
import { authService, tokenStore, AUTH_SESSION_EXPIRED_EVENT, AUTH_EMAIL_BLOCKED_EVENT, ApiRequestError } from '../../services';
import type { ApiUserAccount } from '../../services';
import { clearAllAppState } from '../../services/github.service';
import { tryRefresh } from '../../services/api';
import { mapUserRole } from '../utils/roles';
import type { UserRole } from '../utils/roles';

export type { UserRole } from '../utils/roles';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

function apiUserToUser(apiUser: ApiUserAccount, roleOverride?: UserRole): User {
  const role = roleOverride ?? mapUserRole(apiUser.system_role, apiUser.system_role_name);
  return {
    id: String(apiUser.id_user),
    name: apiUser.username,
    email: apiUser.email,
    role,
  };
}

// Decode a JWT payload (middle segment) without verifying the signature.
// Mirrors parseJwtPayload in app/pages/GoogleAuthCallback.tsx.
function parseJwt(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, '=');
    return JSON.parse(window.atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// True if the access token is missing/malformed or its `exp` claim is absent
// or already in the past relative to now.
function isAccessTokenExpired(token: string): boolean {
  const payload = parseJwt(token);
  if (!payload) return true;
  const exp = payload.exp;
  if (typeof exp !== 'number') return true;
  return exp * 1000 <= Date.now();
}

// Validate that a parsed value matches the User shape we rely on.
function isValidStoredUser(value: unknown): value is User {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.email === 'string' &&
    typeof candidate.role === 'string'
  );
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, role?: UserRole) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  syncUser: (apiUser: ApiUserAccount) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  const persistUser = (nextUser: User | null) => {
    setUser(nextUser);
    if (nextUser) {
      localStorage.setItem('pip_user', JSON.stringify(nextUser));
      return;
    }

    localStorage.removeItem('pip_user');
  };

  // On mount: validate the stored user shape, then restore. If the access token is missing or
  // expired we attempt a silent refresh via the HttpOnly cookie before giving up — only if that
  // fails do we wipe state and stay logged out.
  useEffect(() => {
    const stored = localStorage.getItem('pip_user');
    if (!stored) {
      setLoading(false);
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(stored);
    } catch {
      clearAllAppState();
      setLoading(false);
      return;
    }
    if (!isValidStoredUser(parsed)) {
      clearAllAppState();
      setLoading(false);
      return;
    }

    const token = tokenStore.getAccess();
    if (token && !isAccessTokenExpired(token)) {
      setUser(parsed);
      setLoading(false);
      return;
    }

    // Access token missing/expired — try to mint a fresh one from the refresh cookie.
    let cancelled = false;
    void (async () => {
      const refreshed = await tryRefresh();
      if (cancelled) return;
      if (refreshed) {
        setUser(parsed as User);
      } else {
        clearAllAppState();
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sessionExpired) return;

    setRedirectCountdown(5);

    const intervalId = window.setInterval(() => {
      setRedirectCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId);
          window.location.href = '/';
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [sessionExpired]);

  useEffect(() => {
    const handleSessionExpired = () => {
      authService.logout();
      clearAllAppState();
      persistUser(null);
      setSessionExpired(true);
    };

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, []);

  useEffect(() => {
    const handleEmailBlocked = () => {
      authService.logout();
      clearAllAppState();
      persistUser(null);
      window.location.href = '/login?reason=email_blocked';
    };
    window.addEventListener(AUTH_EMAIL_BLOCKED_EVENT, handleEmailBlocked);
    return () => window.removeEventListener(AUTH_EMAIL_BLOCKED_EVENT, handleEmailBlocked);
  }, []);

  const login = async (email: string, password: string, role?: UserRole) => {
    try {
      const data = await authService.login(email, password);
      const u = apiUserToUser(data.user, role);
      setSessionExpired(false);
      persistUser(u);
    } catch (err) {
      // Preserve email_not_verified so Login page can show the resend flow
      if (err instanceof ApiRequestError && err.body?.code === 'email_not_verified') {
        throw err;
      }
      // Only treat genuine credential rejections (400/401) as a bad email/password.
      // Network failures, rate limiting (429) and server errors (5xx) get a distinct,
      // retryable message. We attach the original error as `cause` so the status is
      // preserved for callers without relying on the ES2022 Error(cause) constructor.
      const message = err instanceof ApiRequestError && (err.status === 400 || err.status === 401)
        ? 'Incorrect email or password.'
        : 'Service temporarily unavailable, try again.';
      const mapped = new Error(message);
      (mapped as Error & { cause?: unknown }).cause = err;
      throw mapped;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      await authService.register(email, name, password);
    } catch (err) {
      throw new Error('Registration failed. Please try again.');
    }
  };

  const logout = () => {
    setSessionExpired(false);
    authService.logout();
    clearAllAppState();
    persistUser(null);
  };

  const syncUser = (apiUser: ApiUserAccount) => {
    persistUser(apiUserToUser(apiUser));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, syncUser, isAuthenticated: !!user }}>
      {children}
      {sessionExpired && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-background/96 px-6">
          <div className="w-full max-w-md rounded-[10px] border border-border bg-card p-6 shadow-2xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning/15 text-warning">
              <LogOut className="h-5 w-5" />
            </div>
            <div className="text-center">
              <h2 className="text-[18px] font-semibold text-foreground">Your session expired</h2>
              <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
                Your login expired and we couldn't renew it. We'll take you back to the home screen so you can sign in again.
              </p>
            </div>

            <div className="mt-5 rounded-[8px] border border-border bg-surface-secondary/40 px-4 py-3">
              <div className="flex items-center justify-center gap-2 text-[12px] font-medium text-foreground">
                <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
                Redirecting in {redirectCountdown} second{redirectCountdown === 1 ? '' : 's'}
              </div>
            </div>

            <button
              type="button"
              onClick={() => { window.location.href = '/'; }}
              className="mt-4 h-10 w-full rounded-[6px] bg-primary text-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Go now
            </button>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

