import { api } from './api';
import type { CreateCheckoutSessionResponse, CancelSubscriptionResponse } from './types';

export type PremiumPlan = 'monthly' | 'annual';

export const paymentsService = {
  // Billing is per-project: the project (not the user) becomes Pro. Only the project admin
  // may start checkout; the backend returns 402/403/404/409 on errors.
  createCheckoutSession(plan: PremiumPlan, projectId: number): Promise<CreateCheckoutSessionResponse> {
    return api.post<CreateCheckoutSessionResponse>('/payments/create-checkout-session/', {
      plan,
      project_id: projectId,
    });
  },

  // Cancel the project's subscription at period end (admin-only; backend enforces).
  cancelSubscription(projectId: number): Promise<CancelSubscriptionResponse> {
    return api.post<CancelSubscriptionResponse>('/payments/cancel/', { project_id: projectId });
  },
};