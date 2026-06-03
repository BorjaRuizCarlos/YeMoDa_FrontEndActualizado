import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { tokenStore } from '../../services';
import type { User } from '../context/AuthContext';
import { mapUserRole } from '../utils/roles';

type CallbackState = 'loading' | 'success' | 'error';

function readToken(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, '=');
    const decoded = window.atob(padded);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function buildUserFromAccessToken(accessToken: string): User | null {
  const payload = parseJwtPayload(accessToken);
  if (!payload) return null;

  const id = typeof payload.sub === 'string' ? payload.sub : null;
  const email = typeof payload.email === 'string' ? payload.email : null;
  if (!id || !email) return null;

  const fallbackName = email.split('@')[0] || 'User';
  const systemRoleId = typeof payload.system_role === 'number' ? payload.system_role : null;
  const systemRoleName = typeof payload.system_role_name === 'string' ? payload.system_role_name : null;

  return {
    id,
    email,
    name: fallbackName,
    role: mapUserRole(systemRoleId, systemRoleName),
  };
}

function getOAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'nickname_taken':
      return 'That nickname is already taken. Please try again with a different one.';
    case 'missing_nickname':
      return 'You need to enter a nickname before continuing with Google.';
    case 'invalid_state':
      return 'The OAuth session expired or is invalid. Please try again.';
    case 'token_exchange_failed':
      return 'Could not complete authentication with Google. Please try again.';
    case 'no_access_token':
      return 'Google did not return the expected access token.';
    case 'userinfo_failed':
      return 'Could not retrieve your Google account information.';
    case 'no_email':
      return 'Your Google account did not return a valid email.';
    default:
      return 'Could not complete sign-in with Google.';
  }
}

export default function GoogleAuthCallback() {
  const [state, setState] = useState<CallbackState>('loading');
  const [message, setMessage] = useState('Processing sign-in with Google...');

  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);

  useEffect(() => {
    const oauthError = (searchParams.get('error') || '').trim();
    if (oauthError) {
      setState('error');
      setMessage(getOAuthErrorMessage(oauthError));
      return;
    }

    const accessToken = readToken(searchParams.get('access_token'));
    const refreshToken = readToken(searchParams.get('refresh_token'));
    const needsNickname = (searchParams.get('needs_nickname') || '').trim() === '1';

    if (!accessToken || !refreshToken) {
      setState('error');
      setMessage('Google\'s response did not include the expected tokens.');
      return;
    }

    tokenStore.set(accessToken, refreshToken);
    const user = buildUserFromAccessToken(accessToken);
    if (user) {
      localStorage.setItem('pip_user', JSON.stringify(user));
    }
    if (needsNickname) {
      localStorage.setItem('pip_needs_nickname', '1');
    } else {
      localStorage.removeItem('pip_needs_nickname');
    }

    setState('success');
    setMessage('Session ready. Redirecting to the dashboard...');

    const redirectId = window.setTimeout(() => {
      window.location.replace('/dashboard');
    }, 500);

    return () => window.clearTimeout(redirectId);
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-[10px] border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          {state === 'loading' && <Loader2 className="h-5 w-5 animate-spin" />}
          {state === 'success' && <CheckCircle2 className="h-5 w-5" />}
          {state === 'error' && <AlertCircle className="h-5 w-5" />}
        </div>

        <h1 className="text-[18px] font-semibold text-foreground">Sign in with Google</h1>
        <p className="mt-2 text-[13px] leading-6 text-muted-foreground">{message}</p>

        {state === 'error' && (
          <div className="mt-5 flex items-center gap-2">
            <Link
              to="/login"
              className="inline-flex h-9 items-center justify-center rounded-[4px] bg-primary px-4 text-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Back to login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}