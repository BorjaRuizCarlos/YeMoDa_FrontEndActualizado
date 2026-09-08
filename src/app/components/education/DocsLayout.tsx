import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Shell público del sitio de documentación. A diferencia de AppLayout, no exige
// sesión: la lectura es abierta y el header solo ofrece entrar a la app o
// iniciar sesión según el estado de auth.
export function DocsLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 flex h-[var(--topbar-height)] items-center justify-between border-b border-border bg-card px-4">
        <Link
          to="/education"
          className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[3px] bg-primary">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0 leading-none">
            <p className="truncate text-[13px] font-semibold tracking-tight text-foreground">Yemoda</p>
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">Education</p>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Ir a la app
            </Link>
          ) : (
            <Link
              to="/login"
              className="rounded-md border border-border px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Iniciar sesión
            </Link>
          )}
        </nav>
      </header>

      {children}
    </div>
  );
}
