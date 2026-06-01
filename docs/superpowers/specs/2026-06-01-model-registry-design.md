# Model Registry — Design Spec
**Date:** 2026-06-01  
**Status:** Approved

## Problem

Models and credit costs are hardcoded in 4+ places across the codebase. Adding a new model requires touching `PromptBar.tsx`, `image/page.tsx`, `generate-image/route.ts`, and `generate-video/route.ts`. There is no single source of truth.

## Goal

A Supabase-driven model registry with a 30-minute in-memory cache, so adding a new model requires only an INSERT into the database and adding an env var to the hosting provider — no code deploy needed.

---

## Database Schema

### `ai_models`

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | Display name, e.g. "Nano Banana 2" |
| `provider` | text | "google", "openai", "kling" |
| `model_id` | text | Real API identifier, e.g. "gemini-3.1-flash-image-preview" |
| `category` | text | "image" or "video" |
| `enabled` | boolean | Toggle without deleting |
| `sort_order` | int | Order in dropdown |
| `api_key_env` | text | Env var name holding the API key, e.g. "GOOGLE_AI_API_KEY" |
| `api_secret_env` | text \| null | Second env var for providers needing two keys (Kling) |
| `created_at` | timestamptz | |

### `model_pricing`

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | |
| `model_id` | uuid FK → ai_models.id | |
| `quality` | text | "1K","2K","4K" for image; "720p","1080p" for video |
| `credits` | int | Fixed credit cost |
| `unit` | text | "per_image" or "per_second" |
| `cost_usd` | numeric | Actual API cost (for margin tracking) |

### Seed Data

```sql
-- Image models
INSERT INTO ai_models (name, provider, model_id, category, enabled, sort_order, api_key_env)
VALUES
  ('Nano Banana 2', 'google', 'gemini-3.1-flash-image-preview', 'image', true, 1, 'GOOGLE_AI_API_KEY'),
  ('GPT-image-2',   'openai', 'gpt-image-2',                    'image', true, 2, 'OPENAI_API_KEY'),
  ('Qwen 2.0 Pro',  'alibaba','qwen-vl-plus',                   'image', true, 3, 'QWEN_API_KEY');

-- Video models
INSERT INTO ai_models (name, provider, model_id, category, enabled, sort_order, api_key_env, api_secret_env)
VALUES
  ('Kling v3', 'kling', 'kling-v3', 'video', true, 1, 'KLING_ACCESS_KEY_ID', 'KLING_ACCESS_KEY_SECRET');

-- Image pricing
INSERT INTO model_pricing (model_id, quality, credits, unit, cost_usd) VALUES
  ((SELECT id FROM ai_models WHERE name='Nano Banana 2'), '1K', 2, 'per_image', 0.067),
  ((SELECT id FROM ai_models WHERE name='Nano Banana 2'), '2K', 3, 'per_image', 0.101),
  ((SELECT id FROM ai_models WHERE name='Nano Banana 2'), '4K', 4, 'per_image', 0.151),
  ((SELECT id FROM ai_models WHERE name='GPT-image-2'),   '1K', 1, 'per_image', 0.030),
  ((SELECT id FROM ai_models WHERE name='GPT-image-2'),   '2K', 2, 'per_image', 0.045),
  ((SELECT id FROM ai_models WHERE name='GPT-image-2'),   '4K', 3, 'per_image', 0.060),
  ((SELECT id FROM ai_models WHERE name='Qwen 2.0 Pro'),  '2K', 3, 'per_image', 0.075);

-- Video pricing
INSERT INTO model_pricing (model_id, quality, credits, unit, cost_usd) VALUES
  ((SELECT id FROM ai_models WHERE name='Kling v3'), '720p',  3, 'per_second', 0.084),
  ((SELECT id FROM ai_models WHERE name='Kling v3'), '1080p', 4, 'per_second', 0.112);
```

---

## `lib/models.ts` — Cache Layer

### Types

```ts
type ModelPricing = {
  quality: string
  credits: number
  unit: 'per_image' | 'per_second'
  cost_usd: number
}

// Full model — used server-side (includes secrets)
type AIModel = {
  id: string
  name: string
  provider: string
  model_id: string
  category: 'image' | 'video'
  api_key_env: string
  api_secret_env: string | null
  pricing: ModelPricing[]
}

// Public model — returned to frontend (no secrets)
type PublicModel = Omit<AIModel, 'api_key_env' | 'api_secret_env'>
```

### Cache

Module-level `Map<category, { data, expiresAt }>` with 30-minute TTL. Invalidates on next call after expiry.

Keys: `"image"`, `"video"`, and `"all"` (flat list, used by `getModelById` to avoid searching both caches). All three are populated lazily and share the same 30-min TTL.

### Exported functions

```ts
// Load models by category (with cache)
getModels(category: 'image' | 'video'): Promise<AIModel[]>

// Get a single model by its UUID (used in routes)
getModelById(id: string): Promise<AIModel>

// Get credit cost for a model+quality combo — throws if not found
getCreditCost(modelId: string, quality: string): Promise<number>

// Resolve API credentials from env
resolveApiKey(model: AIModel): { apiKey: string; apiSecret: string | null }
```

---

## New API Endpoint: `GET /api/models`

Returns public model list for the frontend. Accepts `?category=image` or `?category=video`.

- Calls `getModels(category)` (uses cache)
- Strips `api_key_env` and `api_secret_env` before responding
- Returns `{ models: PublicModel[] }`

---

## Route Changes

### `/api/generate-image/route.ts`

**Before:**
```ts
const creditCost = resolution === '4K' ? 4 : resolution === '2K' ? 3 : 2
// hardcoded: model: "gemini-3.1-flash-image-preview"
```

**After:**
```ts
const model = await getModelById(modelId)          // from cache
const creditCost = await getCreditCost(model.id, resolution)
const { apiKey } = resolveApiKey(model)
// uses model.model_id and apiKey dynamically
```

### `/api/generate-video/route.ts`

**Before:**
```ts
const baseCostPerSec = quality === '1080p' ? 4 : 3
const creditCost = (baseCostPerSec + audioCostPerSec) * duration
// hardcoded: model_name: 'kling-v3'
```

**After:**
```ts
const model = await getModelById(modelId)
const perSecond = await getCreditCost(model.id, quality)  // unit: per_second
const creditCost = (perSecond + audioCostPerSec) * duration
const { apiKey, apiSecret } = resolveApiKey(model)
```

---

## Frontend Changes

### `PromptBar.tsx`

- Remove hardcoded `modelOptions` array
- On mount: `fetch('/api/models?category=image')` → populate dropdown
- Credit cost displayed dynamically: `selectedModel.pricing.find(p => p.quality === quality)?.credits`
- Generate button label updates reactively

### `image/page.tsx`

- Remove `const creditCost = quality === '4K' ? 4 : ...`
- Pass `selectedModelData` (from `/api/models` response) to `PromptBar` instead of raw `selectedModel` string
- `creditCost` derived from `selectedModelData.pricing`

---

## Adding a New Model (Workflow)

1. Add env var to hosting provider (e.g. Vercel): `NEW_PROVIDER_API_KEY=sk-...`
2. INSERT into `ai_models` with `api_key_env = 'NEW_PROVIDER_API_KEY'`
3. INSERT pricing rows into `model_pricing`
4. Implement provider-specific API call in `generate-image/route.ts` (switch on `model.provider`)
5. Cache invalidates within 30 minutes — or trigger manual invalidation by restarting the server

No code deploy required for steps 1–3. Step 4 is only needed when adding a **new provider** (new SDK/API format). Adding a second model from an existing provider (e.g. a new Gemini model) requires no code changes at all.

---

## Cache Invalidation Endpoint

`POST /api/admin/models/invalidate-cache`

- Protected by a static secret: requires header `Authorization: Bearer <ADMIN_SECRET>` where `ADMIN_SECRET` is an env var
- Calls `invalidateModelsCache()` exported from `lib/models.ts` — clears all cache keys (`"image"`, `"video"`, `"all"`)
- Returns `{ ok: true }` — next request to any model-dependent route re-fetches from Supabase
- Use after: changing prices, adding/disabling models, any `ai_models` or `model_pricing` change that should take effect immediately

```ts
// lib/models.ts
export function invalidateModelsCache(): void {
  cache.clear()
}
```

---

## Error Handling

- `getModelById` throws `ModelNotFoundError` if model doesn't exist or `enabled = false`
- `getCreditCost` throws `PricingNotFoundError` if model+quality combo has no entry
- Both errors are caught in routes and return `400 Bad Request` with a descriptive message
- If Supabase is unreachable and cache is cold → route returns `503 Service Unavailable`
