import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
} from '../components/ui/alert-dialog';
import { Button } from '../components/ui/button';

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

export type UnsavedChoice = 'save' | 'discard' | 'cancel';

export type UnsavedOptions = {
  title?: string;
  message?: string;
  saveLabel?: string;
  discardLabel?: string;
  cancelLabel?: string;
};

type DialogState =
  | { kind: 'confirm'; opts: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: 'unsaved'; opts: UnsavedOptions; resolve: (v: UnsavedChoice) => void }
  | null;

type ConfirmContextValue = {
  /** Two-way confirm (e.g. destructive actions). Resolves true on confirm, false on cancel. */
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  /** Three-way unsaved-changes prompt. Resolves 'save' | 'discard' | 'cancel'. */
  confirmUnsaved: (opts?: UnsavedOptions) => Promise<UnsavedChoice>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState>(null);

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setState({ kind: 'confirm', opts, resolve })),
    [],
  );

  const confirmUnsaved = useCallback(
    (opts: UnsavedOptions = {}) =>
      new Promise<UnsavedChoice>((resolve) => setState({ kind: 'unsaved', opts, resolve })),
    [],
  );

  const settle = (value: boolean | UnsavedChoice) => {
    setState((current) => {
      if (current) (current.resolve as (v: boolean | UnsavedChoice) => void)(value);
      return null;
    });
  };

  return (
    <ConfirmContext.Provider value={{ confirm, confirmUnsaved }}>
      {children}
      <AlertDialog
        open={state !== null}
        onOpenChange={(open) => {
          // Escape / programmatic close counts as cancel.
          if (!open && state) settle(state.kind === 'unsaved' ? 'cancel' : false);
        }}
      >
        {state && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {state.kind === 'unsaved' ? state.opts.title ?? 'Unsaved changes' : state.opts.title}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {state.kind === 'unsaved'
                  ? state.opts.message ??
                    'You have unsaved changes. Do you want to save them before leaving?'
                  : state.opts.message}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              {state.kind === 'unsaved' ? (
                <>
                  <Button variant="outline" onClick={() => settle('cancel')}>
                    {state.opts.cancelLabel ?? 'Keep editing'}
                  </Button>
                  <Button variant="destructive" onClick={() => settle('discard')}>
                    {state.opts.discardLabel ?? 'Discard'}
                  </Button>
                  <Button onClick={() => settle('save')}>{state.opts.saveLabel ?? 'Save'}</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => settle(false)}>
                    {state.opts.cancelLabel ?? 'Cancel'}
                  </Button>
                  <Button
                    variant={state.opts.danger ? 'destructive' : 'default'}
                    onClick={() => settle(true)}
                  >
                    {state.opts.confirmLabel ?? 'Confirm'}
                  </Button>
                </>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}
