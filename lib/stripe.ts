import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-04-22.dahlia',
  typescript: true,
});

export const STRIPE_PLANS = {
  starter: {
    priceId: process.env.STRIPE_PRICE_ID_STARTER!,
    credits: 200,
    name: 'Starter',
  },
  plus: {
    priceId: process.env.STRIPE_PRICE_ID_PLUS!,
    credits: 1000,
    name: 'Plus',
  },
} as const;

export type PlanType = keyof typeof STRIPE_PLANS;
