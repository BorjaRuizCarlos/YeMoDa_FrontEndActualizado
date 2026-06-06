import { useState, useEffect } from 'react';
import { Github, CheckCircle2, Download, Building2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { githubService } from '../../services/github.service';
import { useAuth } from '../context/AuthContext';

/**
 * Reusable GitHub connection section.
 * Shows "Connect" button when not connected, or a connected badge otherwise.
 * Handles the OAuth callback (code/state query params) transparently.
 *
 * Login is pure OAuth (identity only) and never forces the App installation page.
 * Installing the App (personal account or organization) is a separate, explicit action.
 */
export function GitHubConnectSection() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const isStakeholder = user?.role === 'stakeholder';

  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [githubLogin, setGithubLogin] = useState<string | null>(null);
  // Default true so we don't flash the "not installed" prompt before status loads, and so
  // an older backend (which omits the field) never nags the user.
  const [hasInstallation, setHasInstallation] = useState(true);


  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    // Handle OAuth callback redirect
    if (params.get('github') === 'connected' && code && state) {
      window.history.replaceState({}, '', window.location.pathname);
      setBusy(true);

      githubService.completeOAuth({ code, state })
        .then((res) => {
          setGithubLogin(res.github_login);
          setConnected(true);
          setHasInstallation(res.has_installation !== false);
          toast.success('GitHub account connected', {
            description: `Connected as ${res.github_login}`,
          });
        })
        .catch((err) => {
          const detail = err instanceof Error ? err.message : 'Unknown error';
          toast.error('Error completing GitHub connection', { description: detail });
        })
        .finally(() => { setBusy(false); setLoading(false); });
      return;
    }

    if (params.get('github') === 'connected') {
      window.history.replaceState({}, '', window.location.pathname);
      toast.error('Missing authorization code. Please try again.');
    }

    // Check connection status with backend
    githubService.checkConnectionStatus()
      .then((status) => {
        if (status.connected) {
          setConnected(true);
          setGithubLogin(status.github_login);
          setHasInstallation(status.has_installation !== false);
        } else if (status.reason === 'token_expired') {
          toast.info('Your GitHub connection expired. Please reconnect.');
        }
      })
      .catch(() => { /* endpoint may not exist yet */ })
      .finally(() => setLoading(false));
  }, [userId]);

  const handleConnect = async () => {
    setBusy(true);
    try {
      await githubService.startOAuth();
    } catch {
      toast.error('Could not start GitHub connection');
      setBusy(false);
    }
  };

  const handleInstall = async () => {
    setBusy(true);
    try {
      await githubService.startAppInstall();
    } catch {
      toast.error('Could not open the GitHub App installation page');
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your GitHub account?')) {
      return;
    }
    setBusy(true);
    try {
      await githubService.disconnectGitHub();
      toast.success('Disconnected successfully', {
        description: 'Your GitHub account has been disconnected',
      });
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Could not disconnect', { description: detail });
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-[11px] text-muted-foreground">Checking GitHub...</span>
      </div>
    );
  }

  if (isStakeholder) {
    return (
      <div className="rounded-[4px] border border-border bg-surface-secondary/30 px-3 py-3">
        <p className="text-[12px] font-medium text-foreground">GitHub not available for Stakeholders</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          This role has read-only access in the platform and cannot connect a GitHub account.
        </p>
      </div>
    );
  }

  if (connected) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 py-2 px-3 border border-border rounded-[4px] bg-accent/20">
          <div className="w-8 h-8 bg-[#24292e] rounded-full flex items-center justify-center">
            <Github className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              <span className="text-[12px] font-medium text-foreground">Connected to GitHub</span>
            </div>
            {githubLogin && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                <span className="font-mono text-foreground">{githubLogin}</span>
              </p>
            )}
          </div>
          <button
            onClick={handleDisconnect}
            disabled={busy}
            className="px-3 py-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-[3px] text-[11px] font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {busy ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>

        {/* The App isn't installed on this account yet — repo features need it. */}
        {!hasInstallation && (
          <div className="flex items-center gap-2.5 py-2 px-3 border border-warning/30 bg-warning/10 rounded-[4px]">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-foreground">GitHub App not installed</p>
              <p className="text-[10px] text-muted-foreground">
                Install it on your account to enable repository features.
              </p>
            </div>
            <button
              onClick={handleInstall}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#24292e] hover:bg-[#1b1f23] text-white rounded-[3px] text-[11px] font-medium transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              {busy ? 'Opening...' : 'Install'}
            </button>
          </div>
        )}

        {/* Separate, explicit action: install the App on an organization. */}
        <button
          onClick={handleInstall}
          disabled={busy}
          className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60"
        >
          <Building2 className="w-3 h-3" />
          Install on an organization
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 py-2 px-3 border border-border rounded-[4px]">
        <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
          <Github className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium text-foreground">GitHub not connected</p>
          <p className="text-[10px] text-muted-foreground">
            Link your GitHub account to manage repositories in your projects.
          </p>
        </div>
        <button
          onClick={handleConnect}
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#24292e] hover:bg-[#1b1f23] text-white rounded-[3px] text-[11px] font-medium transition-colors disabled:opacity-60"
        >
          <Github className="w-3.5 h-3.5" />
          {busy ? 'Redirecting...' : 'Sign in with GitHub'}
        </button>
      </div>

      {/* Installing the App is optional at sign-in and can also be done on an organization. */}
      <button
        onClick={handleInstall}
        disabled={busy}
        className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60"
      >
        <Building2 className="w-3 h-3" />
        Install the app on an organization
      </button>
    </div>
  );
}
