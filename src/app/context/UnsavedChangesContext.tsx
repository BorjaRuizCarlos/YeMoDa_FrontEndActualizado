import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useBlocker } from 'react-router';
import { useConfirm } from './ConfirmContext';

type UnsavedChangesContextValue = {
  /** True when at least one registered form has unsaved changes. */
  isDirty: boolean;
  /** Register/unregister a form's dirty state under a stable key. */
  setDirty: (key: string, dirty: boolean) => void;
  /**
   * For non-router gates (tab switches, closing an inline panel): if anything is dirty,
   * ask the user to discard. Resolves true when it's safe to proceed.
   */
  confirmDiscardIfDirty: () => Promise<boolean>;
};

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(null);

export function useUnsavedChangesContext(): UnsavedChangesContextValue {
  const ctx = useContext(UnsavedChangesContext);
  if (!ctx) throw new Error('useUnsavedChangesContext must be used within UnsavedChangesProvider');
  return ctx;
}

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const { confirm } = useConfirm();
  const dirtyKeys = useRef<Set<string>>(new Set());
  const [isDirty, setIsDirty] = useState(false);

  const setDirty = useCallback((key: string, dirty: boolean) => {
    const set = dirtyKeys.current;
    if (dirty && !set.has(key)) {
      set.add(key);
      setIsDirty(set.size > 0);
    } else if (!dirty && set.has(key)) {
      set.delete(key);
      setIsDirty(set.size > 0);
    }
  }, []);

  // Warn on browser close / refresh while there are unsaved changes.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Block in-app (react-router) navigation while dirty; confirm before leaving.
  const blocker = useBlocker(isDirty);
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    let active = true;
    void (async () => {
      const leave = await confirm({
        title: 'Leave this page?',
        message: 'You have unsaved changes that will be lost if you leave.',
        confirmLabel: 'Leave',
        cancelLabel: 'Stay',
        danger: true,
      });
      if (!active) return;
      if (leave) blocker.proceed();
      else blocker.reset();
    })();
    return () => {
      active = false;
    };
  }, [blocker, confirm]);

  const confirmDiscardIfDirty = useCallback(async () => {
    if (dirtyKeys.current.size === 0) return true;
    return confirm({
      title: 'Discard changes?',
      message: 'You have unsaved changes that will be lost.',
      confirmLabel: 'Discard',
      cancelLabel: 'Keep editing',
      danger: true,
    });
  }, [confirm]);

  return (
    <UnsavedChangesContext.Provider value={{ isDirty, setDirty, confirmDiscardIfDirty }}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}

/**
 * Register a form's dirty state with the global guard. While `dirty` is true, in-app
 * navigation and browser close/refresh are intercepted with a confirmation. The key must be
 * stable and unique per form instance.
 */
export function useUnsavedChanges(key: string, dirty: boolean): void {
  const { setDirty } = useUnsavedChangesContext();
  useEffect(() => {
    setDirty(key, dirty);
    return () => setDirty(key, false);
  }, [key, dirty, setDirty]);
}
