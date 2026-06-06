import { useMemo, useState } from 'react';
import { Navigate, Outlet } from 'react-router';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from './CommandPalette';
import { PageTransition } from './PageTransition';
import { ScrollToTop } from './ScrollToTop';
import { ErrorBoundary } from './ErrorBoundary';
import { useGlobalShortcuts } from '../hooks/useGlobalShortcuts';
import { useTours } from '../hooks/useTours';
import { OnboardingWelcome } from './OnboardingWelcome';
import { useAuth } from '../context/AuthContext';
import { ConfirmProvider } from '../context/ConfirmContext';
import { UnsavedChangesProvider } from '../context/UnsavedChangesContext';
import { ApiRequestError, usersService } from '../../services';
import { toast } from 'sonner';

export function AppLayout() {
  const { loading, isAuthenticated, user, syncUser } = useAuth();
  const [nicknameInput, setNicknameInput] = useState('');
  const [savingNickname, setSavingNickname] = useState(false);
  useGlobalShortcuts();
  useTours();

  const mustChooseNickname = useMemo(() => {
    if (!user) return false;
    return localStorage.getItem('pip_needs_nickname') === '1';
  }, [user]);

  const handleSaveNickname = async () => {
    if (!user?.id) return;
    const trimmedNickname = nicknameInput.trim();
    if (!trimmedNickname) {
      toast.error('Nickname is required.');
      return;
    }

    setSavingNickname(true);
    try {
      const updated = await usersService.update(Number(user.id), { username: trimmedNickname });
      syncUser(updated);
      localStorage.removeItem('pip_needs_nickname');
      toast.success('Nickname updated successfully.');
    } catch (error) {
      if (error instanceof ApiRequestError) {
        toast.error(String(error.body?.detail || 'Could not save the nickname.'));
      } else {
        toast.error('Could not save the nickname.');
      }
    } finally {
      setSavingNickname(false);
    }
  };

  if (loading) {
    return <div className="h-screen bg-background" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Gate the whole app until a nickname is chosen: render ONLY the modal so the
  // protected routes never mount behind it.
  if (mustChooseNickname) {
    return (
      <div className="fixed inset-0 z-[130] flex items-center justify-center bg-background px-6">
        <div className="w-full max-w-md rounded-[10px] border border-border bg-card p-6 shadow-xl">
          <h2 className="text-[18px] font-semibold text-foreground">Choose your nickname</h2>
          <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
            To continue, set the name people will see on your profile. Duplicate nicknames are not allowed.
          </p>

          <div className="mt-4">
            <label className="block text-[12px] font-medium text-foreground mb-1.5">Nickname</label>
            <input
              type="text"
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              placeholder="e.g. alex.dev"
              className="w-full rounded-[4px] border border-input bg-input-background px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              disabled={savingNickname}
              autoFocus
            />
          </div>

          <button
            type="button"
            onClick={handleSaveNickname}
            disabled={savingNickname}
            className="mt-5 h-10 w-full rounded-[6px] bg-primary text-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {savingNickname ? 'Saving...' : 'Save nickname'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <ConfirmProvider>
      <UnsavedChangesProvider>
        <div className="flex h-screen overflow-hidden bg-background">
          <ScrollToTop />
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <Topbar />
            <div className="flex-1 flex overflow-hidden">
              <main className="flex-1 overflow-y-auto min-w-0 scrollbar-app">
                <ErrorBoundary>
                  <PageTransition>
                    <Outlet />
                  </PageTransition>
                </ErrorBoundary>
              </main>
            </div>
          </div>
          <CommandPalette />
        </div>
        <OnboardingWelcome />
      </UnsavedChangesProvider>
    </ConfirmProvider>
  );
}
