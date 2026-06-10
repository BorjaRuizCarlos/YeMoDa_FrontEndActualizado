import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Check, Crown, Loader2, ArrowRight, BadgeDollarSign, Info, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { paymentsService } from '../../services';
import { ApiRequestError } from '../../services/api';

const proPlan = {
  title: 'Pro',
  price: '$12',
  billing: 'per seat / month',
  description: 'Full AI power for your team, billed per member. Billing scales automatically as members join or leave.',
  features: [
    '50 AI code reviews per member / month',
    '10 AI fixes per member / month',
    '50 AI chat messages per member / month',
    'Billing adjusts automatically with your team size',
    'Cancel anytime from Stripe',
  ],
};

export default function Plans() {
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();

  // Billing is per-project: a project id is required to start checkout. It is supplied via the
  // `project` query param (e.g. from a project's Settings → AI usage card).
  const projectParam = searchParams.get('project');
  const projectId = projectParam !== null && /^\d+$/.test(projectParam) ? Number(projectParam) : null;

  const startCheckout = async () => {
    if (projectId === null) {
      toast.error('Open a project’s Settings → AI usage to upgrade that project.');
      return;
    }
    setLoading(true);
    try {
      const { checkout_url } = await paymentsService.createCheckoutSession(projectId);
      window.location.href = checkout_url;
    } catch (err) {
      const status = err instanceof ApiRequestError ? err.status : undefined;
      if (status === 403) {
        toast.error('Only the project admin can upgrade this project.');
      } else if (status === 404) {
        toast.error('Project not found. Please reopen it from your projects list.');
      } else if (status === 409) {
        toast.error('This project already has an active subscription.');
      } else {
        toast.error('Could not start the Stripe checkout.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="px-4 pb-8 pt-3 max-w-[640px] mx-auto">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Pro plan</p>
          <h1 className="mt-1 text-[18px] font-semibold text-foreground" data-tour="plans-header">Upgrade this project to Pro</h1>
          <p className="mt-1 max-w-2xl text-[12px] leading-5 text-muted-foreground">
            Continue to the secure Stripe checkout. Pro access is activated for the project once the backend confirms the payment.
          </p>
        </div>

        <Link
          to="/profile"
          className="inline-flex h-8 items-center justify-center rounded-[4px] border border-border bg-card px-3 text-[11px] font-medium text-foreground transition-colors hover:bg-accent"
        >
          Back to profile
        </Link>
      </div>

      {projectId === null && (
        <div className="mb-4 flex items-start gap-2 rounded-[8px] border border-warning/30 bg-warning/10 px-4 py-3 text-[11px] leading-5 text-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
          <span>
            Plans are per project. Open a project’s <span className="font-medium">Settings → AI usage</span> and use the
            “Upgrade to Pro” button to upgrade that project.
          </span>
        </div>
      )}

      <div className="relative overflow-hidden rounded-[10px] border border-primary/30 bg-card p-5 shadow-sm ring-1 ring-primary/10">
        <div className="absolute inset-x-0 top-0 h-1 bg-primary" />

        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary">
          <Sparkles className="h-3 w-3" />
          Billed per member, monthly
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              <h2 className="text-[16px] font-semibold text-foreground">{proPlan.title}</h2>
            </div>
            <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{proPlan.description}</p>
          </div>
          <div className="rounded-[8px] border border-border bg-surface-secondary/40 px-3 py-2 text-right">
            <p className="text-[21px] font-semibold leading-none text-foreground">{proPlan.price}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{proPlan.billing}</p>
          </div>
        </div>

        <div className="mt-5 rounded-[8px] border border-border/70 bg-surface-secondary/30 p-4">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-medium text-foreground">
            <BadgeDollarSign className="h-3.5 w-3.5 text-primary" />
            Includes
          </div>
          <ul className="space-y-2">
            {proPlan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-[11px] leading-5 text-muted-foreground">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={startCheckout}
          disabled={loading || projectId === null}
          className="mt-5 inline-flex h-9 w-full items-center justify-center gap-2 rounded-[5px] bg-primary px-4 text-[11px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
          {loading ? 'Redirecting to Stripe…' : 'Upgrade to Pro'}
        </button>
      </div>

      <div className="mt-5 rounded-[8px] border border-border bg-card px-4 py-3 text-[11px] text-muted-foreground">
        Charges are processed securely by Stripe. If Stripe takes a few seconds to confirm the payment, the success page will re-check the status automatically.
      </div>
    </div>
  );
}
