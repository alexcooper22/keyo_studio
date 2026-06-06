import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set')
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-05-27.dahlia' })
  }
  return _stripe
}

export const STRIPE_PLANS = {
  nano:    { credits: 100,  name: 'Nano',    priceId: process.env.STRIPE_PRICE_NANO    ?? '' },
  starter: { credits: 200,  name: 'Starter', priceId: process.env.STRIPE_PRICE_STARTER ?? '' },
  plus:    { credits: 900,  name: 'Plus',    priceId: process.env.STRIPE_PRICE_PLUS    ?? '' },
} as const

export type StripePlanType = keyof typeof STRIPE_PLANS

export const STRIPE_CREDIT_PACKAGES = {
  s:  { credits: 100, name: 'S',  priceId: process.env.STRIPE_PRICE_CREDITS_S  ?? '' },
  m:  { credits: 200, name: 'M',  priceId: process.env.STRIPE_PRICE_CREDITS_M  ?? '' },
  l:  { credits: 450, name: 'L',  priceId: process.env.STRIPE_PRICE_CREDITS_L  ?? '' },
  xl: { credits: 900, name: 'XL', priceId: process.env.STRIPE_PRICE_CREDITS_XL ?? '' },
} as const

export type StripeCreditPackageType = keyof typeof STRIPE_CREDIT_PACKAGES
