/**
 * Subscription Service
 * Handles all subscription-related API calls
 * Matches pharma-collect-ui subscriptionService exactly
 */

import { apiClient } from '../client';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
  stripe_product_id: string | null;
  features: string[];
  max_documents: number | null;
  max_distributors: number | null;
  analytics_features: string[];
  support_level: string;
  is_active: boolean;
  display_order: number;
}

export type SubscriptionPlanType = 'free' | 'basic' | 'premium' | 'enterprise';
export type SubscriptionStatus = 'active' | 'trial' | 'expired' | 'cancelled' | 'past_due';

export interface Subscription {
  id: string;
  pharmacyId: string;
  plan: SubscriptionPlanType;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  paymentMethod?: {
    type: 'card';
    last4: string;
    brand: string;
    expiryMonth: number;
    expiryYear: number;
  };
  price: number;
  billingInterval: 'monthly' | 'yearly';
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export interface PortalSessionResponse {
  url: string;
}

export const subscriptionService = {
  /**
   * Get all active subscription plans
   * GET /subscriptions/plans
   */
  async getPlans(): Promise<SubscriptionPlan[]> {
    const response = await apiClient.getWithoutPharmacyId<SubscriptionPlan[]>('/subscriptions/plans', {}, false);
    if (response.status === 'success' && response.data) {
      return Array.isArray(response.data) ? response.data : [];
    }
    return [];
  },

  /**
   * Get a single subscription plan by ID
   * GET /subscriptions/plans/:planId
   */
  async getPlanById(planId: string): Promise<SubscriptionPlan> {
    const response = await apiClient.getWithoutPharmacyId<SubscriptionPlan>(`/subscriptions/plans/${planId}`, {}, false);
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error('Plan not found');
  },

  /**
   * Get current pharmacy subscription
   * GET /subscriptions
   */
  async getSubscription(): Promise<Subscription | null> {
    const response = await apiClient.get<Subscription>('/subscriptions');
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    return null;
  },

  /**
   * Create Stripe checkout session
   * POST /subscriptions/checkout
   */
  async createCheckoutSession(
    planId: string,
    billingInterval: 'monthly' | 'yearly'
  ): Promise<CheckoutSessionResponse> {
    const response = await apiClient.post<CheckoutSessionResponse>('/subscriptions/checkout', {
      planId,
      billingInterval,
    });
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error('Failed to create checkout session');
  },

  /**
   * Create Stripe customer portal session
   * POST /subscriptions/portal
   */
  async createPortalSession(returnUrl: string): Promise<PortalSessionResponse> {
    const response = await apiClient.post<PortalSessionResponse>('/subscriptions/portal', {
      returnUrl,
    });
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error('Failed to create portal session');
  },

  /**
   * Cancel subscription (at period end)
   * POST /subscriptions/cancel
   */
  async cancelSubscription(): Promise<void> {
    const response = await apiClient.post('/subscriptions/cancel', {});
    if (response.status !== 'success') {
      throw new Error(response.message || 'Failed to cancel subscription');
    }
  },

  /**
   * Reactivate canceled subscription
   * POST /subscriptions/reactivate
   */
  async reactivateSubscription(): Promise<void> {
    const response = await apiClient.post('/subscriptions/reactivate', {});
    if (response.status !== 'success') {
      throw new Error(response.message || 'Failed to reactivate subscription');
    }
  },

  /**
   * Change subscription plan
   * POST /subscriptions/change-plan
   */
  async changeSubscriptionPlan(
    planId: string,
    billingInterval: 'monthly' | 'yearly'
  ): Promise<void> {
    const response = await apiClient.post('/subscriptions/change-plan', {
      planId,
      billingInterval,
    });
    if (response.status !== 'success') {
      throw new Error(response.message || 'Failed to change subscription plan');
    }
  },
};

