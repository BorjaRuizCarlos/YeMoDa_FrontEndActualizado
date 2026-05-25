import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Check, Crown, Loader2, ArrowRight, Sparkles, BadgeDollarSign, CheckCircle2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { paymentsService, usersService } from '../../services';
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
    title: 'Mensual',
    price: '$5.49',
    billing: 'por mes',
    description: 'Ideal para probar las funciones premium sin compromiso a largo plazo.',
    features: [
      'Acceso premium inmediato',
      'Pago mensual flexible',
      'Cancela cuando quieras desde Stripe',
    ],
  },
  {
    id: 'annual',
    title: 'Anual',
    price: '$54.9',
    billing: 'por año',
    description: 'La mejor opción si vas a usar la plataforma durante todo el año.',
    highlight: 'Mejor valor',
    features: [
      'Ahorro frente al plan mensual',
      'Acceso premium durante 12 meses',
      'Menos fricción de renovación',
    ],
  },
];

export default function Plans() {
  const [loadingPlan, setLoadingPlan] = useState<PremiumPlan | null>(null);
  const [currentPlan, setCurrentPlan] = useState<'monthly' | 'annual' | null>(null);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    usersService.me().then((account) => {
      setIsPremium(Boolean(account.is_premium));
      setCurrentPlan(account.subscription_plan ?? null);
    }).catch(() => {});
  }, []);

  const startCheckout = async (plan: PremiumPlan) => {
    setLoadingPlan(plan);
    try {
      const { checkout_url } = await paymentsService.createCheckoutSession(plan);
      window.location.href = checkout_url;
    } catch {
      toast.error('No se pudo iniciar el checkout de Stripe');
      setLoadingPlan(null);
    }
  };

  return (
    <div className="px-4 pb-8 pt-3 max-w-[1280px] mx-auto">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Planes premium</p>
          <h1 className="mt-1 text-[18px] font-semibold text-foreground">Elige el plan que mejor se adapte a tu equipo</h1>
          <p className="mt-1 max-w-2xl text-[12px] leading-5 text-muted-foreground">
            Selecciona un plan para continuar al checkout seguro de Stripe. El acceso premium se activa cuando el backend confirme el pago.
          </p>
        </div>

        <Link
          to="/profile"
          className="inline-flex h-8 items-center justify-center rounded-[4px] border border-border bg-card px-3 text-[11px] font-medium text-foreground transition-colors hover:bg-accent"
        >
          Volver al perfil
        </Link>
      </div>

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
                  Incluye
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
                  Tu plan actual
                </div>
              ) : isDowngrade ? (
                <div className="mt-5 inline-flex h-9 w-full items-center justify-center gap-2 rounded-[5px] border border-border bg-surface-secondary/40 px-4 text-[11px] font-medium text-muted-foreground cursor-not-allowed">
                  Disponible al renovar
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => startCheckout(plan.id)}
                  disabled={isLoading}
                  className="mt-5 inline-flex h-9 w-full items-center justify-center gap-2 rounded-[5px] bg-primary px-4 text-[11px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
                >
                  {isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : isUpgrade ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5" />
                  )}
                  {isLoading ? 'Redirigiendo a Stripe…' : isUpgrade ? 'Upgrade a Anual' : 'Elegir plan'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 rounded-[8px] border border-border bg-card px-4 py-3 text-[11px] text-muted-foreground">
        El cobro se procesa de forma segura en Stripe. Si Stripe tarda unos segundos en confirmar el pago, la página de éxito volverá a consultar tu estado premium automáticamente.
      </div>
    </div>
  );
}