import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { CheckCircle2, Loader2, Crown, RefreshCcw, AlertCircle } from 'lucide-react';
import { usersService } from '../../services';

type PremiumStatus = 'loading' | 'success' | 'pending' | 'error';

export default function PaymentSuccess() {
  const [status, setStatus] = useState<PremiumStatus>('loading');

  useEffect(() => {
    let cancelled = false;

    const checkPremiumStatus = async () => {
      try {
        const account = await usersService.me();
        if (cancelled) return;

        if (Boolean(account.is_premium)) {
          setStatus('success');
          return;
        }

        // Webhook propagation can be slightly delayed after Stripe redirect.
        await new Promise((resolve) => window.setTimeout(resolve, 1500));
        if (cancelled) return;

        const retryAccount = await usersService.me();
        if (cancelled) return;

        setStatus(Boolean(retryAccount.is_premium) ? 'success' : 'pending');
      } catch {
        if (!cancelled) {
          setStatus('error');
        }
      }
    };

    checkPremiumStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="px-4 pb-6 pt-3 max-w-[980px]">
      <h1 className="text-[13px] font-semibold text-foreground mb-0.5">Payment result</h1>
      <p className="text-[11px] text-muted-foreground mb-4">Validating your premium subscription status</p>

      <div className="bg-card border border-border rounded-[6px] p-5">
        {status === 'loading' && (
          <div className="flex items-start gap-3">
            <Loader2 className="w-5 h-5 mt-0.5 text-primary animate-spin" />
            <div>
              <p className="text-[13px] font-medium text-foreground">Confirming your premium access...</p>
              <p className="text-[11px] text-muted-foreground mt-1">This may take a few seconds while the webhook is processed.</p>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 mt-0.5 text-success" />
            <div className="w-full">
              <p className="text-[13px] font-medium text-foreground">Payment confirmed. Premium active.</p>
              <p className="text-[11px] text-muted-foreground mt-1">Your account now has premium features enabled.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  to="/profile"
                  className="h-8 px-3 bg-primary hover:bg-primary-hover text-primary-foreground rounded-[4px] text-[11px] font-medium transition-colors inline-flex items-center gap-1.5"
                >
                  <Crown className="w-3.5 h-3.5" />
                  Go to my profile
                </Link>
                <Link
                  to="/dashboard"
                  className="h-8 px-3 border border-border hover:bg-accent rounded-[4px] text-[11px] font-medium transition-colors inline-flex items-center"
                >
                  Go to dashboard
                </Link>
              </div>
            </div>
          </div>
        )}

        {status === 'pending' && (
          <div className="flex items-start gap-3">
            <RefreshCcw className="w-5 h-5 mt-0.5 text-warning" />
            <div className="w-full">
              <p className="text-[13px] font-medium text-foreground">Payment received, awaiting final confirmation.</p>
              <p className="text-[11px] text-muted-foreground mt-1">We don't see `is_premium=true` yet. Reload this page in a few seconds or check your profile.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  to="/profile"
                  className="h-8 px-3 bg-primary hover:bg-primary-hover text-primary-foreground rounded-[4px] text-[11px] font-medium transition-colors"
                >
                  Check profile
                </Link>
                <Link
                  to="/dashboard"
                  className="h-8 px-3 border border-border hover:bg-accent rounded-[4px] text-[11px] font-medium transition-colors inline-flex items-center"
                >
                  Continue
                </Link>
              </div>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 text-destructive" />
            <div className="w-full">
              <p className="text-[13px] font-medium text-foreground">We couldn't validate your premium status.</p>
              <p className="text-[11px] text-muted-foreground mt-1">Try again from your profile or reload this page.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  to="/profile"
                  className="h-8 px-3 bg-primary hover:bg-primary-hover text-primary-foreground rounded-[4px] text-[11px] font-medium transition-colors"
                >
                  Go to profile
                </Link>
                <Link
                  to="/dashboard"
                  className="h-8 px-3 border border-border hover:bg-accent rounded-[4px] text-[11px] font-medium transition-colors inline-flex items-center"
                >
                  Back to dashboard
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}