import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router';
import { CheckCircle2, XCircle, Loader2, MailCheck, ArrowRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '../../services';

type Status = 'idle' | 'loading' | 'success' | 'error' | 'no_token';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<Status>(token ? 'idle' : 'no_token');
  const [errorMsg, setErrorMsg] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const verify = async () => {
    if (!token) return;
    setStatus('loading');
    try {
      await authService.verifyEmail(token);
      setStatus('success');
    } catch (err: unknown) {
      const detail = (err as { detail?: string })?.detail ?? '';
      if (detail.toLowerCase().includes('expir') || detail.toLowerCase().includes('invalid')) {
        setErrorMsg('El enlace ha expirado o no es válido. Solicita uno nuevo.');
      } else if (detail.toLowerCase().includes('already')) {
        setErrorMsg('Este correo ya fue verificado. Puedes iniciar sesión.');
      } else {
        setErrorMsg(detail || 'No se pudo verificar el correo. Intenta de nuevo.');
      }
      setStatus('error');
    }
  };

  // Countdown redirect after success
  useEffect(() => {
    if (status !== 'success') return;
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(id);
          window.location.href = '/login';
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [status]);

  const handleResend = async () => {
    const email = window.prompt('Ingresa el correo con el que te registraste:');
    if (!email) return;
    setResendLoading(true);
    try {
      await authService.resendVerification(email);
      toast.success('Correo de verificación enviado. Revisa tu bandeja.');
    } catch {
      toast.error('No se pudo reenviar el correo. Intenta más tarde.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-[8px] border border-border bg-card p-8 flex flex-col items-center gap-5 text-center shadow-sm">

        {/* Icon */}
        {status === 'loading' && (
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        )}
        {status === 'idle' && (
          <MailCheck className="w-12 h-12 text-muted-foreground" />
        )}
        {status === 'success' && (
          <CheckCircle2 className="w-12 h-12 text-success" />
        )}
        {(status === 'error' || status === 'no_token') && (
          <XCircle className="w-12 h-12 text-destructive" />
        )}

        {/* Title */}
        {status === 'loading' && (
          <>
            <h1 className="text-[16px] font-semibold text-foreground">Verificando correo…</h1>
            <p className="text-[13px] text-muted-foreground">Por favor espera un momento.</p>
          </>
        )}
        {status === 'idle' && (
          <>
            <h1 className="text-[16px] font-semibold text-foreground">Verificar correo electrónico</h1>
            <p className="text-[13px] text-muted-foreground">Haz clic en el botón para confirmar tu dirección de correo.</p>
            <button
              type="button"
              onClick={() => void verify()}
              className="mt-2 h-10 w-full rounded-[5px] bg-primary text-primary-foreground text-[13px] font-medium inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              <MailCheck className="w-4 h-4" /> Verificar mi correo
            </button>
          </>
        )}
        {status === 'success' && (
          <>
            <h1 className="text-[16px] font-semibold text-foreground">¡Correo verificado!</h1>
            <p className="text-[13px] text-muted-foreground">
              Tu cuenta está activa. Redirigiendo al inicio de sesión en <strong>{countdown}s</strong>…
            </p>
            <Link
              to="/login"
              className="mt-2 h-10 w-full rounded-[5px] bg-primary text-primary-foreground text-[13px] font-medium inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              Ir al inicio de sesión <ArrowRight className="w-4 h-4" />
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="text-[16px] font-semibold text-foreground">Error de verificación</h1>
            <p className="text-[13px] text-muted-foreground">{errorMsg}</p>
            <div className="w-full flex flex-col gap-2 mt-2">
              <button
                type="button"
                onClick={() => void verify()}
                className="h-10 w-full rounded-[5px] bg-primary text-primary-foreground text-[13px] font-medium inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <RefreshCw className="w-4 h-4" /> Reintentar
              </button>
              <button
                type="button"
                onClick={() => void handleResend()}
                disabled={resendLoading}
                className="h-10 w-full rounded-[5px] border border-border text-[13px] font-medium inline-flex items-center justify-center gap-2 hover:bg-accent transition-colors disabled:opacity-50"
              >
                {resendLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MailCheck className="w-4 h-4" />}
                Reenviar correo de verificación
              </button>
              <Link to="/login" className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                Volver al inicio de sesión
              </Link>
            </div>
          </>
        )}
        {status === 'no_token' && (
          <>
            <h1 className="text-[16px] font-semibold text-foreground">Enlace inválido</h1>
            <p className="text-[13px] text-muted-foreground">
              No se encontró ningún token en este enlace. Usa el enlace exacto que recibiste en tu correo.
            </p>
            <button
              type="button"
              onClick={() => void handleResend()}
              disabled={resendLoading}
              className="mt-2 h-10 w-full rounded-[5px] border border-border text-[13px] font-medium inline-flex items-center justify-center gap-2 hover:bg-accent transition-colors disabled:opacity-50"
            >
              {resendLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MailCheck className="w-4 h-4" />}
              Reenviar correo de verificación
            </button>
            <Link to="/login" className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
              Volver al inicio de sesión
            </Link>
          </>
        )}

      </div>
    </div>
  );
}
