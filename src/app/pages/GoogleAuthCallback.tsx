import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { tokenStore, usersService } from '../../services';
import type { ApiUserAccount } from '../../services';
import type { User } from '../context/AuthContext';
import { mapUserRole } from '../utils/roles';

type CallbackState = 'loading' | 'success' | 'error';

function readToken(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// Build the persisted user from the authenticated /me response (server-verified)
// rather than from an unsigned, client-decoded JWT in the URL fragment.
function buildUserFromAccount(account: ApiUserAccount): User {
  return {
    id: String(account.id_user),
    email: account.email,
    name: account.username || account.email.split('@')[0] || 'User',
    role: mapUserRole(account.system_role, account.system_role_name),
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
  // Tokens arrive in the URL fragment (#) so they never reach servers/logs/Referer.
  const hashParams = useMemo(() => new URLSearchParams(window.location.hash.replace(/^#/, '')), []);

  useEffect(() => {
    const oauthError = (searchParams.get('error') || '').trim();
    if (oauthError) {
      setState('error');
      setMessage(getOAuthErrorMessage(oauthError));
      return;
    }

    const accessToken = readToken(hashParams.get('access_token'));
    const needsNickname = (hashParams.get('needs_nickname') || '').trim() === '1';

    if (!accessToken) {
      setState('error');
      setMessage('Google\'s response did not include the expected token.');
      return;
    }

    // Only the access token comes in the fragment; the refresh token is an HttpOnly cookie.
    // Use it purely as a bearer credential — never trust its (unsigned) decoded claims.
    tokenStore.set(accessToken);
    // Strip the tokens from the address bar / history immediately.
    window.history.replaceState(null, '', window.location.pathname);

    if (needsNickname) {
      localStorage.setItem('pip_needs_nickname', '1');
    } else {
      localStorage.removeItem('pip_needs_nickname');
    }

    let cancelled = false;
    let redirectId: number | undefined;

    void (async () => {
      try {
        // Resolve identity/role from the authenticated /me endpoint, not the JWT payload.
        const account = await usersService.me();
        if (cancelled) return;
        localStorage.setItem('pip_user', JSON.stringify(buildUserFromAccount(account)));
        setState('success');
        setMessage('Session ready. Redirecting to the dashboard...');
        redirectId = window.setTimeout(() => {
          window.location.replace('/dashboard');
        }, 500);
      } catch {
        if (cancelled) return;
        tokenStore.clear();
        setState('error');
        setMessage('Could not load your account after sign-in. Please try again.');
      }
    })();

    return () => {
      cancelled = true;
      if (redirectId !== undefined) window.clearTimeout(redirectId);
    };
  }, [searchParams, hashParams]);

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