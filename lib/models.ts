import { supabaseAdmin } from './supabase'

export type ModelPricing = {
  quality: string
  credits: number
  unit: 'per_image' | 'per_second'
  cost_usd: number
}

export type AIModel = {
  id: string
  name: string
  provider: string
  model_id: string
  category: 'image' | 'video'
  api_key_env: string
  api_secret_env: string | null
  pricing: ModelPricing[]
}

export type PublicModel = Omit<AIModel, 'api_key_env' | 'api_secret_env'>

async function fetchFromSupabase(category?: string): Promise<AIModel[]> {
  let query = supabaseAdmin
    .from('ai_models')
    .select('id, name, provider, model_id, category, api_key_env, api_secret_env, model_pricing(quality, credits, unit, cost_usd)')
    .eq('enabled', true)
    .order('sort_order')

  if (category) query = (query as any).eq('category', category)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch models: ${error.message}`)

  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    provider: row.provider,
    model_id: row.model_id,
    category: row.category,
    api_key_env: row.api_key_env,
    api_secret_env: row.api_secret_env ?? null,
    pricing: row.model_pricing as ModelPricing[],
  }))
}

export async function getModels(category: 'image' | 'video'): Promise<AIModel[]> {
  return fetchFromSupabase(category)
}

export async function getModelById(id: string): Promise<AIModel> {
  const data = await fetchFromSupabase()
  const model = data.find(m => m.id === id)
  if (!model) throw new Error(`Model not found or disabled: ${id}`)
  return model
}

export async function getCreditCost(modelId: string, quality: string): Promise<number> {
  const model = await getModelById(modelId)
  const pricing = model.pricing.find(p => p.quality === quality) ?? model.pricing[0]
  if (!pricing) throw new Error(`No pricing for model ${modelId}`)
  return pricing.credits
}

export function resolveApiKey(model: AIModel): { apiKey: string; apiSecret: string | null } {
  const apiKey = process.env[model.api_key_env]
  if (!apiKey) throw new Error(`Env var ${model.api_key_env} is not set`)
  const apiSecret = model.api_secret_env ? (process.env[model.api_secret_env] ?? null) : null
  return { apiKey, apiSecret }
}

export function invalidateModelsCache(): void {}
