import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Check, Crown, Loader2, ArrowRight, Sparkles, BadgeDollarSign, CheckCircle2, TrendingUp, Info } from 'lucide-react';
import { toast } from 'sonner';
import { paymentsService, usersService } from '../../services';
import { ApiRequestError } from '../../services/api';
import type { PremiumPlan } from '../../services/payments.service';

type PlanCard = {
  id: PremiumPlan;
  title: string;
  price: string;
  billing: string;
  description: string;
  highlight?: string;
  features: string[];
};

const plans: PlanCard[] = [
  {
    id: 'monthly',
    title: 'Monthly',
    price: '$5.49',
    billing: 'per month',
    description: 'Ideal for trying premium features without a long-term commitment.',
    features: [
      'Immediate premium access',
      'Flexible monthly billing',
      'Cancel anytime from Stripe',
    ],
  },
  {
    id: 'annual',
    title: 'Annual',
    price: '$54.9',
    billing: 'per year',
    description: 'The best option if you plan to use the platform year-round.',
    highlight: 'Best value',
    features: [
      'Savings compared to the monthly plan',
      'Premium access for 12 months',
      'Less renewal friction',
    ],
  },
];

export default function Plans() {
  const [loadingPlan, setLoadingPlan] = useState<PremiumPlan | null>(null);
  const [currentPlan, setCurrentPlan] = useState<'monthly' | 'annual' | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [searchParams] = useSearchParams();

  // Billing is per-project: a project id is required to start checkout. It is supplied
  // via the `project` query param (e.g. from a project's Settings → AI usage card).
  const projectParam = searchParams.get('project');
  const projectId = projectParam !== null && /^\d+$/.test(projectParam) ? Number(projectParam) : null;

  useEffect(() => {
    usersService.me().then((account) => {
      setIsPremium(Boolean(account.is_premium));
      setCurrentPlan(account.subscription_plan ?? null);
    }).catch(() => {});
  }, []);

  const startCheckout = async (plan: PremiumPlan) => {
    if (projectId === null) {
      toast.error('Open a project’s Settings → AI usage to upgrade that project.');
      return;
    }
    setLoadingPlan(plan);
    try {
      const { checkout_url } = await paymentsService.createCheckoutSession(plan, projectId);
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
      setLoadingPlan(null);
    }
  };

  return (
    <div className="px-4 pb-8 pt-3 max-w-[1280px] mx-auto">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Premium plans</p>
          <h1 className="mt-1 text-[18px] font-semibold text-foreground">Choose the plan that fits your team</h1>
          <p className="mt-1 max-w-2xl text-[12px] leading-5 text-muted-foreground">
            Select a plan to continue to the secure Stripe checkout. Premium access is activated when the backend confirms the payment.
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
            “Upgrade to Pro” button to choose a plan for that project.
          </span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {plans.map((plan) => {
          const isLoading = loadingPlan === plan.id;
          const isAnnual = plan.id === 'annual';
          const isCurrent = isPremium && currentPlan === plan.id;
          // Upgrade: user is on monthly and this card is annual
          const isUpgrade = isPremium && currentPlan === 'monthly' && plan.id === 'annual';
          // Downgrade: user is on annual and this card is monthly — block it
          const isDowngrade = isPremium && currentPlan === 'annual' && plan.id === 'monthly';

          return (
            <div
              key={plan.id}
              className={`relative overflow-hidden rounded-[10px] border bg-card p-5 shadow-sm ${isAnnual ? 'border-primary/30 ring-1 ring-primary/10' : 'border-border'}`}
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 via-primary to-accent" />

              {plan.highlight && (
                <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary">
                  <Sparkles className="h-3 w-3" />
                  {plan.highlight}
                </div>
              )}

              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-primary" />
                    <h2 className="text-[16px] font-semibold text-foreground">{plan.title}</h2>
                  </div>
                  <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{plan.description}</p>
                </div>
                <div className="rounded-[8px] border border-border bg-surface-secondary/40 px-3 py-2 text-right">
                  <p className="text-[21px] font-semibold leading-none text-foreground">{plan.price}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{plan.billing}</p>
                </div>
              </div>

              <div className="mt-5 rounded-[8px] border border-border/70 bg-surface-secondary/30 p-4">
                <div className="mb-3 flex items-center gap-2 text-[11px] font-medium text-foreground">
                  <BadgeDollarSign className="h-3.5 w-3.5 text-primary" />
                  Includes
                </div>
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-[11px] leading-5 text-muted-foreground">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

                {isCurrent ? (
                  <div className="mt-5 inline-flex h-9 w-full items-center justify-center gap-2 rounded-[5px] border border-success/30 bg-success/10 px-4 text-[11px] font-medium text-success cursor-default">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Your current plan
                  </div>
                ) : isDowngrade ? (
                  <div className="mt-5 inline-flex h-9 w-full items-center justify-center gap-2 rounded-[5px] border border-border bg-surface-secondary/40 px-4 text-[11px] font-medium text-muted-foreground cursor-not-allowed">
                    Available on renewal
                  </div>
                ) : (
                <button
                  type="button"
                  onClick={() => startCheckout(plan.id)}
                  disabled={isLoading || projectId === null}
                  className="mt-5 inline-flex h-9 w-full items-center justify-center gap-2 rounded-[5px] bg-primary px-4 text-[11px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : isUpgrade ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5" />
                  )}
                  {isLoading ? 'Redirecting to Stripe…' : isUpgrade ? 'Upgrade to Annual' : 'Choose plan'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 rounded-[8px] border border-border bg-card px-4 py-3 text-[11px] text-muted-foreground">
        Charges are processed securely by Stripe. If Stripe takes a few seconds to confirm the payment, the success page will re-check your premium status automatically.
      </div>
    </div>
  );
}