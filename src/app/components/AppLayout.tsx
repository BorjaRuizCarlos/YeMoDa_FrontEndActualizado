import { useMemo, useState } from 'react';
import { Navigate, Outlet } from 'react-router';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from './CommandPalette';
import { PageTransition } from './PageTransition';
import { ScrollToTop } from './ScrollToTop';
import { ErrorBoundary } from './ErrorBoundary';
import { useGlobalShortcuts } from '../hooks/useGlobalShortcuts';
import { useAuth } from '../context/AuthContext';
import { ApiRequestError, usersService } from '../../services';
import { toast } from 'sonner';

export function AppLayout() {
  const { loading, isAuthenticated, user, syncUser } = useAuth();
  const [nicknameInput, setNicknameInput] = useState('');
  const [savingNickname, setSavingNickname] = useState(false);
  useGlobalShortcuts();

  const mustChooseNickname = useMemo(() => {
    if (!user) return false;
    return localStorage.getItem('pip_needs_nickname') === '1';
  }, [user]);

  const handleSaveNickname = async () => {
    if (!user?.id) return;
    const trimmedNickname = nicknameInput.trim();
    if (!trimmedNickname) {
      toast.error('El nickname es obligatorio.');
      return;
    }

    setSavingNickname(true);
    try {
      const updated = await usersService.update(Number(user.id), { username: trimmedNickname });
      syncUser(updated);
      localStorage.removeItem('pip_needs_nickname');
      toast.success('Nickname actualizado correctamente.');
    } catch (error) {
      if (error instanceof ApiRequestError) {
        toast.error(String(error.body?.detail || 'No se pudo guardar el nickname.'));
      } else {
        toast.error('No se pudo guardar el nickname.');
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

  return (
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

      {mustChooseNickname && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-background/90 px-6">
          <div className="w-full max-w-md rounded-[10px] border border-border bg-card p-6 shadow-xl">
            <h2 className="text-[18px] font-semibold text-foreground">Elige tu nickname</h2>
            <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
              Para continuar, define el nombre que verán en tu perfil. No se permiten nicknames repetidos.
            </p>

            <div className="mt-4">
              <label className="block text-[12px] font-medium text-foreground mb-1.5">Nickname</label>
              <input
                type="text"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                placeholder="Ej. alex.dev"
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
              {savingNickname ? 'Guardando...' : 'Guardar nickname'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
