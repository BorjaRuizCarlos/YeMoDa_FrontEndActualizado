import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CheckCircle2, XCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { LoadingButton } from '../components/LoadingButton';
import { toast } from 'sonner';
import { authService } from '../../services';

export default function EmailVerified() {
  const [searchParams] = useSearchParams();
  const success = searchParams.get('success') === 'true';
  const error = searchParams.get('error');
  const [countdown, setCountdown] = useState(5);
  const [resendLoading, setResendLoading] = useState(false);

  // Auto-redirect to login on success
  useEffect(() => {
    if (!success) return;
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(t);
          window.location.href = '/login';
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [success]);

  const errorMessage =
    error === 'invalid_or_expired_token'
      ? 'This verification link has expired or is no longer valid. Please request a new one.'
      : error === 'missing_token'
      ? 'No verification token was found in the link. Please use the link from your email.'
      : 'An unexpected error occurred during verification.';

  const handleResend = async () => {
    // Prompt for email since we don't have it here
    const email = window.prompt('Enter the email address you registered with:');
    if (!email) return;
    setResendLoading(true);
    try {
      await authService.resendVerification(email);
      toast.success('Verification email sent! Check your inbox.');
    } catch {
      toast.error('Could not resend. Try again shortly.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">

        {/* Logo */}
        <Link to="/" className="inline-flex items-center gap-2 mb-10 justify-center">
          <div className="w-7 h-7 bg-primary rounded-[3px] flex items-center justify-center">
            <span className="text-white font-bold text-[10px]">YM</span>
          </div>
          <span className="font-semibold text-foreground text-[13px]">Yemoda</span>
        </Link>

        {success ? (
          <>
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <h1 className="text-[20px] font-bold text-foreground mb-2">Email verified!</h1>
            <p className="text-[13px] text-muted-foreground mb-6 leading-relaxed">
              Your account is now active. Taking you to sign in&hellip;
            </p>

            <div className="bg-card border border-border rounded-[3px] px-4 py-3 mb-6">
              <p className="text-[12px] text-muted-foreground">
                Redirecting in{' '}
                <span className="font-semibold text-foreground">{countdown}</span>{' '}
                second{countdown !== 1 ? 's' : ''}
              </p>
            </div>

            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground rounded-[3px] text-[13px] font-medium transition-colors"
            >
              Sign in now
              <ArrowRight className="w-4 h-4" />
            </Link>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-[20px] font-bold text-foreground mb-2">Verification failed</h1>
            <p className="text-[13px] text-muted-foreground mb-6 leading-relaxed max-w-xs mx-auto">
              {errorMessage}
            </p>

            <div className="flex flex-col gap-3">
              <LoadingButton
                type="button"
                loading={resendLoading}
                onClick={handleResend}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground rounded-[3px] text-[13px] font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Resend verification email
              </LoadingButton>
              <Link
                to="/login"
                className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Already verified? Sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
