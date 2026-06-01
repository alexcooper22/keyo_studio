import { supabaseAdmin } from './supabase'

export type PlanBreakdownItem = {
  icon: 'image' | 'video'
  main: string
  sub: string
}

export type SubscriptionPlan = {
  id: string
  name: string
  description: string
  price_usd: number
  credits: number
  featured: boolean
  cta_text: string
  cta_style: 'outline' | 'primary'
  sort_order: number
  breakdown: PlanBreakdownItem[]
}

type CacheEntry = { data: SubscriptionPlan[]; expiresAt: number }
let plansCache: CacheEntry | null = null
const TTL_MS = 60 * 60 * 1000 // 1 hour

export async function getPlans(): Promise<SubscriptionPlan[]> {
  if (plansCache && Date.now() < plansCache.expiresAt) return plansCache.data

  const { data, error } = await supabaseAdmin
    .from('subscription_plans')
    .select('*')
    .order('sort_order')

  if (error) throw new Error(`Failed to fetch plans: ${error.message}`)

  const plans = (data ?? []) as SubscriptionPlan[]
  plansCache = { data: plans, expiresAt: Date.now() + TTL_MS }
  return plans
}

export function invalidatePlansCache(): void {
  plansCache = null
}
