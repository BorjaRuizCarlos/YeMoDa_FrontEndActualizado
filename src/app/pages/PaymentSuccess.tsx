import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CheckCircle2, Loader2, Crown, RefreshCcw, AlertCircle } from 'lucide-react';
import { projectsService, usersService } from '../../services';

type PremiumStatus = 'loading' | 'success' | 'pending' | 'error';

export default function PaymentSuccess() {
  const [status, setStatus] = useState<PremiumStatus>('loading');
  const [searchParams] = useSearchParams();

  // Billing is per-project: Stripe's success_url carries ?project=<id>. We confirm the purchase
  // by polling that project's plan (GET /projects/:id/ai-usage/) until it flips to 'pro' — NOT the
  // user-level is_premium flag, which a per-project checkout never sets.
  const projectParam = searchParams.get('project');
  const projectId = projectParam && /^\d+$/.test(projectParam) ? Number(projectParam) : null;

  useEffect(() => {
    let cancelled = false;
    const ATTEMPTS = 6;
    const DELAY_MS = 1500;

    const sleep = () => new Promise((resolve) => window.setTimeout(resolve, DELAY_MS));

    const confirmProject = async (id: number) => {
      for (let i = 0; i < ATTEMPTS; i++) {
        try {
          const usage = await projectsService.getAiUsage(id);
          if (cancelled) return;
          if (usage.plan === 'pro') {
            setStatus('success');
            return;
          }
        } catch {
          // transient (webhook not processed yet / network) — keep polling
        }
        await sleep();
        if (cancelled) return;
      }
      if (!cancelled) setStatus('pending');
    };

    // Legacy fallback when no project id is present in the URL (old user-level flow).
    const confirmUserLevel = async () => {
      try {
        for (let i = 0; i < 2; i++) {
          const account = await usersService.me();
          if (cancelled) return;
          if (Boolean(account.is_premium)) {
            setStatus('success');
            return;
          }
          await sleep();
          if (cancelled) return;
        }
        setStatus('pending');
      } catch {
        if (!cancelled) setStatus('error');
      }
    };

    if (projectId !== null) {
      confirmProject(projectId);
    } else {
      confirmUserLevel();
    }

    return () => {
      cancelled = true;
    };
  }, [projectId]);

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
              <p className="text-[11px] text-muted-foreground mt-1">Stripe is still confirming the payment. Reload this page in a few seconds — the project will switch to Pro automatically.</p>
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