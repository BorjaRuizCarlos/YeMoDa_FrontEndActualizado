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
        setErrorMsg('The link has expired or is not valid. Request a new one.');
      } else if (detail.toLowerCase().includes('already')) {
        setErrorMsg('This email has already been verified. You can sign in.');
      } else {
        setErrorMsg(detail || 'Could not verify the email. Please try again.');
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
    const email = window.prompt('Enter the email you registered with:');
    if (!email) return;
    setResendLoading(true);
    try {
      await authService.resendVerification(email);
      toast.success('Verification email sent. Check your inbox.');
    } catch {
      toast.error('Could not resend the email. Please try again later.');
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
            <h1 className="text-[16px] font-semibold text-foreground">Verifying email…</h1>
            <p className="text-[13px] text-muted-foreground">Please wait a moment.</p>
          </>
        )}
        {status === 'idle' && (
          <>
            <h1 className="text-[16px] font-semibold text-foreground">Verify email address</h1>
            <p className="text-[13px] text-muted-foreground">Click the button to confirm your email address.</p>
            <button
              type="button"
              onClick={() => void verify()}
              className="mt-2 h-10 w-full rounded-[5px] bg-primary text-primary-foreground text-[13px] font-medium inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              <MailCheck className="w-4 h-4" /> Verify my email
            </button>
          </>
        )}
        {status === 'success' && (
          <>
            <h1 className="text-[16px] font-semibold text-foreground">Email verified!</h1>
            <p className="text-[13px] text-muted-foreground">
              Your account is active. Redirecting to sign in in <strong>{countdown}s</strong>…
            </p>
            <Link
              to="/login"
              className="mt-2 h-10 w-full rounded-[5px] bg-primary text-primary-foreground text-[13px] font-medium inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              Go to sign in <ArrowRight className="w-4 h-4" />
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="text-[16px] font-semibold text-foreground">Verification error</h1>
            <p className="text-[13px] text-muted-foreground">{errorMsg}</p>
            <div className="w-full flex flex-col gap-2 mt-2">
              <button
                type="button"
                onClick={() => void verify()}
                className="h-10 w-full rounded-[5px] bg-primary text-primary-foreground text-[13px] font-medium inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
              <button
                type="button"
                onClick={() => void handleResend()}
                disabled={resendLoading}
                className="h-10 w-full rounded-[5px] border border-border text-[13px] font-medium inline-flex items-center justify-center gap-2 hover:bg-accent transition-colors disabled:opacity-50"
              >
                {resendLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MailCheck className="w-4 h-4" />}
                Resend verification email
              </button>
              <Link to="/login" className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                Back to sign in
              </Link>
            </div>
          </>
        )}
        {status === 'no_token' && (
          <>
            <h1 className="text-[16px] font-semibold text-foreground">Invalid link</h1>
            <p className="text-[13px] text-muted-foreground">
              No token was found in this link. Use the exact link you received in your email.
            </p>
            <button
              type="button"
              onClick={() => void handleResend()}
              disabled={resendLoading}
              className="mt-2 h-10 w-full rounded-[5px] border border-border text-[13px] font-medium inline-flex items-center justify-center gap-2 hover:bg-accent transition-colors disabled:opacity-50"
            >
              {resendLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MailCheck className="w-4 h-4" />}
              Resend verification email
            </button>
            <Link to="/login" className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
              Back to login
            </Link>
          </>
        )}

      </div>
    </div>
  );
}
