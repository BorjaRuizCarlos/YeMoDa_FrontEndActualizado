import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { tokenStore } from '../../services';

type CallbackState = 'loading' | 'success' | 'error';

function readToken(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default function GitHubAuthCallback() {
  const [state, setState] = useState<CallbackState>('loading');
  const [message, setMessage] = useState('Connecting your GitHub account...');

  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  // Tokens arrive in the URL fragment (#) so they never reach servers/logs/Referer.
  const hashParams = useMemo(() => new URLSearchParams(window.location.hash.replace(/^#/, '')), []);

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      setState('error');
      setMessage('Could not complete the connection with GitHub.');
      return;
    }

    const accessToken = readToken(hashParams.get('access_token'));

    if (!accessToken) {
      setState('error');
      setMessage('The GitHub response did not include the expected token.');
      return;
    }

    // Only the access token comes in the fragment; the refresh token is an HttpOnly cookie.
    tokenStore.set(accessToken);
    // Strip the tokens from the address bar / history immediately.
    window.history.replaceState(null, '', window.location.pathname);
    setState('success');
    setMessage('GitHub connected successfully. Redirecting...');

    const redirectId = window.setTimeout(() => {
      window.location.replace('/github');
    }, 800);

    return () => window.clearTimeout(redirectId);
  }, [searchParams, hashParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-[10px] border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          {state === 'loading' && <Loader2 className="h-5 w-5 animate-spin" />}
          {state === 'success' && <CheckCircle2 className="h-5 w-5" />}
          {state === 'error' && <AlertCircle className="h-5 w-5" />}
        </div>

        <h1 className="text-[18px] font-semibold text-foreground">GitHub connection</h1>
        <p className="mt-2 text-[13px] leading-6 text-muted-foreground">{message}</p>

        {state === 'error' && (
          <div className="mt-5 flex items-center gap-2">
            <Link
              to="/github"
              className="inline-flex h-9 items-center justify-center rounded-[4px] bg-primary px-4 text-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Back to GitHub
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
