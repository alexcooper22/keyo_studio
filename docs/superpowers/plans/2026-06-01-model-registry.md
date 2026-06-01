# Model Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded model names and credit costs with a Supabase-driven model registry with a 30-minute in-memory cache.

**Architecture:** Two new Supabase tables (`ai_models`, `model_pricing`) are the single source of truth for models and prices. `lib/models.ts` wraps Supabase with a 30-min module-level cache and exports typed helpers used by all routes. The frontend fetches public model data from a new `GET /api/models` endpoint.

**Tech Stack:** Next.js 14, Supabase (supabaseAdmin), TypeScript, no test framework (TypeScript compilation + curl for verification)

**Spec:** `docs/superpowers/specs/2026-06-01-model-registry-design.md`

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `supabase/migrations/20260601_add_model_registry.sql` | DB schema + seed data |
| Create | `lib/models.ts` | Cache layer: types, getModels, getModelById, getCreditCost, resolveApiKey, invalidateModelsCache |
| Create | `app/api/models/route.ts` | GET — public model list for frontend |
| Create | `app/api/admin/models/invalidate-cache/route.ts` | POST — clear cache immediately |
| Modify | `app/api/generate-image/route.ts` | Use getModelById + getCreditCost instead of hardcoded values |
| Modify | `app/api/generate-video/route.ts` | Same |
| Modify | `components/image/PromptBar.tsx` | Fetch models from API, dynamic credit cost in UI |
| Modify | `app/image/page.tsx` | Remove hardcoded creditCost calc, pass model data to PromptBar |
| Modify | `app/video/page.tsx` | Remove hardcoded credit calc, fetch video models from API |
| Modify | `.env.local` | Add ADMIN_SECRET |

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/20260601_add_model_registry.sql`

- [ ] **Step 1: Create migration file**

```bash
mkdir -p supabase/migrations
```

Create `supabase/migrations/20260601_add_model_registry.sql`:

```sql
-- ai_models: registry of all AI models available in the system
CREATE TABLE ai_models (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  provider        text NOT NULL,       -- 'google' | 'openai' | 'kling' | 'alibaba'
  model_id        text NOT NULL,       -- real API identifier
  category        text NOT NULL,       -- 'image' | 'video'
  enabled         boolean NOT NULL DEFAULT true,
  sort_order      int NOT NULL DEFAULT 0,
  api_key_env     text NOT NULL,       -- env var name holding API key
  api_secret_env  text,                -- optional second env var (Kling needs two)
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- model_pricing: credit costs per model × quality
CREATE TABLE model_pricing (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id    uuid NOT NULL REFERENCES ai_models(id) ON DELETE CASCADE,
  quality     text NOT NULL,           -- '1K'|'2K'|'4K' for image; '720p'|'1080p' for video
  credits     int NOT NULL,            -- fixed credit cost
  unit        text NOT NULL,           -- 'per_image' | 'per_second'
  cost_usd    numeric(10,4) NOT NULL   -- actual API cost for margin tracking
);

-- Seed: image models
INSERT INTO ai_models (name, provider, model_id, category, enabled, sort_order, api_key_env)
VALUES
  ('Nano Banana 2', 'google', 'gemini-3.1-flash-image-preview', 'image', true, 1, 'GOOGLE_AI_API_KEY'),
  ('GPT-image-2',   'openai', 'gpt-image-2',                   'image', false, 2, 'OPENAI_API_KEY'),
  ('Qwen 2.0 Pro',  'alibaba','qwen-vl-plus',                  'image', false, 3, 'QWEN_API_KEY');

-- Seed: video models
INSERT INTO ai_models (name, provider, model_id, category, enabled, sort_order, api_key_env, api_secret_env)
VALUES
  ('Kling v3', 'kling', 'kling-v3', 'video', true, 1, 'KLING_ACCESS_KEY_ID', 'KLING_ACCESS_KEY_SECRET');

-- Seed: image pricing (GPT-image-2 and Qwen disabled until providers implemented)
INSERT INTO model_pricing (model_id, quality, credits, unit, cost_usd)
SELECT id, '1K', 2, 'per_image', 0.067 FROM ai_models WHERE name = 'Nano Banana 2'
UNION ALL
SELECT id, '2K', 3, 'per_image', 0.101 FROM ai_models WHERE name = 'Nano Banana 2'
UNION ALL
SELECT id, '4K', 4, 'per_image', 0.151 FROM ai_models WHERE name = 'Nano Banana 2'
UNION ALL
SELECT id, '1K', 1, 'per_image', 0.030 FROM ai_models WHERE name = 'GPT-image-2'
UNION ALL
SELECT id, '2K', 2, 'per_image', 0.045 FROM ai_models WHERE name = 'GPT-image-2'
UNION ALL
SELECT id, '4K', 3, 'per_image', 0.060 FROM ai_models WHERE name = 'GPT-image-2'
UNION ALL
SELECT id, '2K', 3, 'per_image', 0.075 FROM ai_models WHERE name = 'Qwen 2.0 Pro';

-- Seed: video pricing
INSERT INTO model_pricing (model_id, quality, credits, unit, cost_usd)
SELECT id, '720p',  3, 'per_second', 0.084 FROM ai_models WHERE name = 'Kling v3'
UNION ALL
SELECT id, '1080p', 4, 'per_second', 0.112 FROM ai_models WHERE name = 'Kling v3';
```

- [ ] **Step 2: Run in Supabase SQL Editor**

Open Supabase Dashboard → SQL Editor → paste the full SQL above → Run.

- [ ] **Step 3: Verify**

Run in SQL Editor:
```sql
SELECT am.name, am.category, mp.quality, mp.credits, mp.unit
FROM ai_models am
JOIN model_pricing mp ON mp.model_id = am.id
ORDER BY am.category, am.sort_order, mp.quality;
```

Expected: 10 rows (3 Nano Banana 2, 3 GPT-image-2, 1 Qwen, 3 Kling — wait, Kling has 2 rows = 3+3+1+2=9 rows total. Verify all are present.

---

## Task 2: Add ADMIN_SECRET to env

**Files:**
- Modify: `.env.local`

- [ ] **Step 1: Add to .env.local**

Append to `.env.local`:
```
ADMIN_SECRET=<generate a random 32-char string, e.g. openssl rand -hex 16>
```

Run to generate:
```bash
openssl rand -hex 16
```

- [ ] **Step 2: Verify**

```bash
grep ADMIN_SECRET .env.local
```

Expected: line with the key present (value will vary).

---

## Task 3: Create `lib/models.ts`

**Files:**
- Create: `lib/models.ts`

- [ ] **Step 1: Create the file**

```typescript
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

type CacheEntry = { data: AIModel[]; expiresAt: number }
const cache = new Map<string, CacheEntry>()
const TTL_MS = 30 * 60 * 1000

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
  const entry = cache.get(category)
  if (entry && Date.now() < entry.expiresAt) return entry.data

  const data = await fetchFromSupabase(category)
  cache.set(category, { data, expiresAt: Date.now() + TTL_MS })
  return data
}

export async function getModelById(id: string): Promise<AIModel> {
  const entry = cache.get('all')
  if (entry && Date.now() < entry.expiresAt) {
    const found = entry.data.find(m => m.id === id)
    if (found) return found
  }

  const data = await fetchFromSupabase()
  cache.set('all', { data, expiresAt: Date.now() + TTL_MS })

  const model = data.find(m => m.id === id)
  if (!model) throw new Error(`Model not found or disabled: ${id}`)
  return model
}

export async function getCreditCost(modelId: string, quality: string): Promise<number> {
  const model = await getModelById(modelId)
  const pricing = model.pricing.find(p => p.quality === quality)
  if (!pricing) throw new Error(`No pricing for model ${modelId} quality ${quality}`)
  return pricing.credits
}

export function resolveApiKey(model: AIModel): { apiKey: string; apiSecret: string | null } {
  const apiKey = process.env[model.api_key_env]
  if (!apiKey) throw new Error(`Env var ${model.api_key_env} is not set`)
  const apiSecret = model.api_secret_env ? (process.env[model.api_secret_env] ?? null) : null
  return { apiKey, apiSecret }
}

export function invalidateModelsCache(): void {
  cache.clear()
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm build 2>&1 | grep -E "error TS|lib/models"
```

Expected: no TypeScript errors related to `lib/models.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/models.ts supabase/migrations/20260601_add_model_registry.sql .env.local
git commit -m "feat: add model registry cache layer and DB migration"
```

---

## Task 4: Create `GET /api/models`

**Files:**
- Create: `app/api/models/route.ts`

- [ ] **Step 1: Create the file**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getModels, type PublicModel } from '../../../lib/models'

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get('category')
  if (category !== 'image' && category !== 'video') {
    return NextResponse.json({ error: 'category must be "image" or "video"' }, { status: 400 })
  }

  try {
    const models = await getModels(category)
    const publicModels: PublicModel[] = models.map(({ api_key_env, api_secret_env, ...rest }) => rest)
    return NextResponse.json({ models: publicModels })
  } catch (err: any) {
    console.error('Failed to fetch models:', err)
    return NextResponse.json({ error: 'Failed to fetch models' }, { status: 503 })
  }
}
```

- [ ] **Step 2: Start dev server and verify**

```bash
pnpm dev
```

In a second terminal:
```bash
curl "http://localhost:3000/api/models?category=image" | jq .
```

Expected response shape:
```json
{
  "models": [
    {
      "id": "<uuid>",
      "name": "Nano Banana 2",
      "provider": "google",
      "model_id": "gemini-3.1-flash-image-preview",
      "category": "image",
      "pricing": [
        { "quality": "1K", "credits": 2, "unit": "per_image", "cost_usd": 0.067 },
        { "quality": "2K", "credits": 3, "unit": "per_image", "cost_usd": 0.101 },
        { "quality": "4K", "credits": 4, "unit": "per_image", "cost_usd": 0.151 }
      ]
    }
  ]
}
```

Verify `api_key_env` and `api_secret_env` are NOT in the response.

- [ ] **Step 3: Commit**

```bash
git add app/api/models/route.ts
git commit -m "feat: add GET /api/models endpoint"
```

---

## Task 5: Create `POST /api/admin/models/invalidate-cache`

**Files:**
- Create: `app/api/admin/models/invalidate-cache/route.ts`

- [ ] **Step 1: Create the file**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { invalidateModelsCache } from '../../../../../lib/models'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expected = `Bearer ${process.env.ADMIN_SECRET}`

  if (!process.env.ADMIN_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  invalidateModelsCache()
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Verify — reject without token**

```bash
curl -X POST http://localhost:3000/api/admin/models/invalidate-cache
```

Expected: `{"error":"Unauthorized"}` with status 401.

- [ ] **Step 3: Verify — accept with correct token**

```bash
ADMIN_SECRET=$(grep ADMIN_SECRET .env.local | cut -d= -f2)
curl -X POST http://localhost:3000/api/admin/models/invalidate-cache \
  -H "Authorization: Bearer $ADMIN_SECRET"
```

Expected: `{"ok":true}` with status 200.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/models/invalidate-cache/route.ts
git commit -m "feat: add cache invalidation endpoint"
```

---

## Task 6: Update `app/api/generate-image/route.ts`

**Files:**
- Modify: `app/api/generate-image/route.ts`

- [ ] **Step 1: Add import and replace credit cost logic**

At the top of the file, after existing imports add:
```typescript
import { getModelById, getCreditCost, resolveApiKey } from '../../../lib/models'
```

- [ ] **Step 2: Replace body parsing to extract modelId**

Find:
```typescript
const { prompt, aspectRatio, imageUrls, resolution } = body;
const creditCost = resolution === '4K' ? 4 : resolution === '2K' ? 3 : 2;
```

Replace with:
```typescript
const { prompt, aspectRatio, imageUrls, resolution, modelId } = body;

if (!modelId) {
  return NextResponse.json({ error: 'modelId is required' }, { status: 400 });
}

let aiModel: Awaited<ReturnType<typeof getModelById>>;
let creditCost: number;
try {
  aiModel = await getModelById(modelId);
  creditCost = await getCreditCost(aiModel.id, resolution);
} catch (err: any) {
  return NextResponse.json({ error: err.message }, { status: 400 });
}
```

- [ ] **Step 3: Replace hardcoded API key and model ID**

Find:
```typescript
const apiKey = process.env.GOOGLE_AI_API_KEY;
if (!apiKey) {
  throw new Error("GOOGLE_AI_API_KEY is not configured");
}

const ai = new GoogleGenAI({ apiKey });
```

Replace with:
```typescript
let apiKey: string;
try {
  ({ apiKey } = resolveApiKey(aiModel));
} catch (err: any) {
  throw new Error(err.message);
}

if (aiModel.provider !== 'google') {
  return NextResponse.json({ error: `Provider "${aiModel.provider}" not yet implemented` }, { status: 501 });
}

const ai = new GoogleGenAI({ apiKey });
```

- [ ] **Step 4: Replace hardcoded model name in generateContent call**

Find:
```typescript
const geminiResponse = await ai.models.generateContent({
  model: "gemini-3.1-flash-image-preview",
```

Replace with:
```typescript
const geminiResponse = await ai.models.generateContent({
  model: aiModel.model_id,
```

- [ ] **Step 5: Replace hardcoded model name in DB insert**

Find:
```typescript
model: 'gemini-3.1-flash-image-preview',
```

Replace with:
```typescript
model: aiModel.name,
```

- [ ] **Step 6: Type-check**

```bash
pnpm build 2>&1 | grep -E "error TS|generate-image"
```

Expected: no TypeScript errors.

- [ ] **Step 7: Verify end-to-end (requires running dev server + valid session cookie)**

Get the Nano Banana 2 model UUID first:
```bash
NANO_ID=$(curl -s "http://localhost:3000/api/models?category=image" | jq -r '.models[0].id')
echo "Model ID: $NANO_ID"
```

Then test generation returns an error about missing auth (not a model error):
```bash
curl -X POST http://localhost:3000/api/generate-image \
  -H "Content-Type: application/json" \
  -d "{\"prompt\":\"test\",\"modelId\":\"$NANO_ID\",\"resolution\":\"1K\"}"
```

Expected: `{"error":"Unauthorized..."}` — confirms route reached the auth check (model lookup is after auth).

- [ ] **Step 8: Commit**

```bash
git add app/api/generate-image/route.ts
git commit -m "feat: use model registry in generate-image route"
```

---

## Task 7: Update `app/api/generate-video/route.ts`

**Files:**
- Modify: `app/api/generate-video/route.ts`

- [ ] **Step 1: Add import**

After existing imports add:
```typescript
import { getModelById, getCreditCost, resolveApiKey } from '../../../lib/models'
```

- [ ] **Step 2: Extract modelId from request body and replace credit calculation**

Find:
```typescript
const { prompt, duration = 5, aspectRatio = '9:16', mode = 'std', quality = '720p', audio = false, startFrame = null, endFrame = null } = await req.json();
if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

// Calculate credit cost
const baseCostPerSec = quality === '1080p' ? 4 : 3;
const audioCostPerSec = audio ? 1 : 0;
const creditCost = (baseCostPerSec + audioCostPerSec) * duration;
```

Replace with:
```typescript
const { prompt, duration = 5, aspectRatio = '9:16', mode = 'std', quality = '720p', audio = false, startFrame = null, endFrame = null, modelId } = await req.json();
if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });
if (!modelId) return NextResponse.json({ error: 'modelId is required' }, { status: 400 });

let aiModel: Awaited<ReturnType<typeof getModelById>>;
let perSecond: number;
try {
  aiModel = await getModelById(modelId);
  perSecond = await getCreditCost(aiModel.id, quality);
} catch (err: any) {
  return NextResponse.json({ error: err.message }, { status: 400 });
}

const audioCostPerSec = audio ? 1 : 0;
const creditCost = (perSecond + audioCostPerSec) * duration;
```

- [ ] **Step 3: Replace hardcoded Kling token generation with dynamic key resolution**

Find the `generateKlingToken` call and the hardcoded `model_name: 'kling-v3'` in the fetch body.

After the credit check block, find:
```typescript
const token = await generateKlingToken();
```

Before this line, add:
```typescript
if (aiModel.provider !== 'kling') {
  return NextResponse.json({ error: `Provider "${aiModel.provider}" not yet implemented for video` }, { status: 501 });
}
```

Then replace in the fetch body:
```typescript
model_name: 'kling-v3',
```

With:
```typescript
model_name: aiModel.model_id,
```

Note: `generateKlingToken()` still reads `KLING_ACCESS_KEY_ID` / `KLING_ACCESS_KEY_SECRET` directly — this is fine because Kling is currently the only video provider and the function is already scoped to Kling.

- [ ] **Step 4: Type-check**

```bash
pnpm build 2>&1 | grep -E "error TS|generate-video"
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/generate-video/route.ts
git commit -m "feat: use model registry in generate-video route"
```

---

## Task 8: Update `components/image/PromptBar.tsx`

**Files:**
- Modify: `components/image/PromptBar.tsx`

- [ ] **Step 1: Update props interface**

Find the `PromptBarProps` interface. Replace:
```typescript
  selectedModel: string;
  onModelChange: (model: string) => void;
```

With:
```typescript
  models: Array<{ id: string; name: string; pricing: Array<{ quality: string; credits: number }> }>;
  selectedModelId: string;
  onModelChange: (id: string) => void;
```

- [ ] **Step 2: Remove hardcoded modelOptions**

Find and delete:
```typescript
const modelOptions = [
  { id: 'google/nano-banana-2/text-to-image', name: 'Nano Banana 2', price: '1 credit' },
];
```

- [ ] **Step 3: Update destructured props**

Find:
```typescript
  creditCount, creditCost,
  selectedModel, onModelChange,
```

Replace with:
```typescript
  creditCount, creditCost,
  models, selectedModelId, onModelChange,
```

- [ ] **Step 4: Update model dropdown rendering**

Find the model dropdown JSX that references `modelOptions` and `selectedModel`. Replace the entire dropdown content to use the new props. Look for the block that maps over `modelOptions` (inside the dropdown):

```typescript
// find: modelOptions.map(...)
// replace the options list with:
{models.map(m => (
  <button
    key={m.id}
    onClick={() => { onModelChange(m.id); setIsModelDropdownOpen(false); }}
    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${selectedModelId === m.id ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
  >
    <div className="font-medium">{m.name}</div>
    <div className="text-xs text-white/40 mt-0.5">
      {m.pricing.find(p => p.quality === quality)?.credits ?? '?'} credits
    </div>
  </button>
))}
```

- [ ] **Step 5: Update the model button label**

Find where the selected model name is displayed in the trigger button (currently shows `modelOptions.find(m => m.id === selectedModel)?.name`). Replace with:

```typescript
{models.find(m => m.id === selectedModelId)?.name ?? 'Loading...'}
```

- [ ] **Step 6: Update the model card preview above the bar**

Find where the model card displays the name and credit cost. Update to use:
```typescript
// name:
{models.find(m => m.id === selectedModelId)?.name ?? '...'}
// credit cost label:
{creditCost} credit{creditCost !== 1 ? 's' : ''}
```

- [ ] **Step 7: Type-check**

```bash
pnpm build 2>&1 | grep -E "error TS|PromptBar"
```

Expected: TypeScript errors only in `app/image/page.tsx` where old props are passed (fixed in next task).

- [ ] **Step 8: Commit**

```bash
git add components/image/PromptBar.tsx
git commit -m "feat: PromptBar accepts dynamic model list from API"
```

---

## Task 9: Update `app/image/page.tsx`

**Files:**
- Modify: `app/image/page.tsx`

- [ ] **Step 1: Add models state and fetching**

After the existing `useState` declarations, add:
```typescript
const [imageModels, setImageModels] = useState<Array<{ id: string; name: string; pricing: Array<{ quality: string; credits: number; unit: string; cost_usd: number }> }>>([]);
```

Change:
```typescript
const [selectedModel, setSelectedModel] = useState('google/nano-banana-2/text-to-image');
```

To:
```typescript
const [selectedModelId, setSelectedModelId] = useState('');
```

- [ ] **Step 2: Fetch models on mount**

Inside the `useEffect` that runs when `isLoaded && isSignedIn`, add a `fetchModels` call. Add the function:

```typescript
const fetchModels = async () => {
  try {
    const res = await fetch('/api/models?category=image');
    const data = await res.json();
    if (data.models?.length) {
      setImageModels(data.models);
      const saved = localStorage.getItem('image_model_draft');
      const validSaved = data.models.find((m: any) => m.id === saved);
      setSelectedModelId(validSaved ? saved : data.models[0].id);
    }
  } catch (err) {
    console.error('Failed to fetch image models', err);
  }
};
```

Call it inside the effect:
```typescript
if (isLoaded && isSignedIn) {
  fetchCredits();
  fetchImages();
  fetchModels();  // add this line
  ...
}
```

- [ ] **Step 3: Replace hardcoded creditCost**

Find:
```typescript
const creditCost = quality === '4K' ? 4 : quality === '2K' ? 3 : 2;
```

Replace with:
```typescript
const selectedModelData = imageModels.find(m => m.id === selectedModelId);
const creditCost = selectedModelData?.pricing.find(p => p.quality === quality)?.credits ?? 2;
```

- [ ] **Step 4: Update localStorage persistence for model**

Find:
```typescript
useEffect(() => { localStorage.setItem('image_model_draft', selectedModel); }, [selectedModel]);
```

Replace with:
```typescript
useEffect(() => {
  if (selectedModelId) localStorage.setItem('image_model_draft', selectedModelId);
}, [selectedModelId]);
```

- [ ] **Step 5: Update handleGenerate to send modelId**

Find in `handleGenerate`:
```typescript
body: JSON.stringify({ prompt, model: selectedModel, imageUrls: uploadedUrls, aspectRatio, resolution: quality }),
```

Replace with:
```typescript
body: JSON.stringify({ prompt, modelId: selectedModelId, imageUrls: uploadedUrls, aspectRatio, resolution: quality }),
```

- [ ] **Step 6: Update PromptBar props**

Find the `<PromptBar` JSX and update props:

Remove:
```typescript
selectedModel={selectedModel}
onModelChange={setSelectedModel}
```

Add:
```typescript
models={imageModels}
selectedModelId={selectedModelId}
onModelChange={setSelectedModelId}
```

- [ ] **Step 7: Type-check**

```bash
pnpm build 2>&1 | grep -E "error TS|image/page"
```

Expected: no TypeScript errors.

- [ ] **Step 8: Manual UI verification**

Navigate to `http://localhost:3000/image`. Verify:
- Model dropdown shows "Nano Banana 2"
- Generate button shows correct credit count
- Selecting 1K/2K/4K updates the credit count in the button

- [ ] **Step 9: Commit**

```bash
git add app/image/page.tsx
git commit -m "feat: image page fetches models dynamically from registry"
```

---

## Task 10: Update `app/video/page.tsx`

**Files:**
- Modify: `app/video/page.tsx`

- [ ] **Step 1: Add video models state**

After existing useState declarations, add:
```typescript
const [videoModels, setVideoModels] = useState<Array<{ id: string; name: string; pricing: Array<{ quality: string; credits: number }> }>>([]);
const [selectedVideoModelId, setSelectedVideoModelId] = useState('');
```

- [ ] **Step 2: Add fetchModels function and call on mount**

Add the function (place it near other fetch functions in the component):
```typescript
const fetchVideoModels = async () => {
  try {
    const res = await fetch('/api/models?category=video');
    const data = await res.json();
    if (data.models?.length) {
      setVideoModels(data.models);
      setSelectedVideoModelId(data.models[0].id);
    }
  } catch (err) {
    console.error('Failed to fetch video models', err);
  }
};
```

Find the `useEffect` that initializes the component (the one with `localStorage` reads) and add `fetchVideoModels()` at the end of it.

- [ ] **Step 3: Replace hardcoded credit cost**

Find (line ~466):
```typescript
disabled={isGenerating || !prompt.trim() || (creditCount !== null && creditCount < ((quality === '1080p' ? 4 : 3) + (audioEnabled ? 1 : 0)) * duration)}
```

Add a derived variable before the `return` statement (at the top of the component's return area or near the state declarations):
```typescript
const selectedVideoModel = videoModels.find(m => m.id === selectedVideoModelId);
const perSecond = selectedVideoModel?.pricing.find(p => p.quality === quality)?.credits ?? (quality === '1080p' ? 4 : 3);
const videoCreditCost = (perSecond + (audioEnabled ? 1 : 0)) * duration;
```

Then replace ALL occurrences of `((quality === '1080p' ? 4 : 3) + (audioEnabled ? 1 : 0)) * duration` with `videoCreditCost`.

- [ ] **Step 4: Update handleGenerate to send modelId**

Find in the generate function the fetch body sent to `/api/generate-video`. Add `modelId`:
```typescript
body: JSON.stringify({
  prompt, duration, aspectRatio, mode, quality, audio: audioEnabled,
  startFrame, endFrame,
  modelId: selectedVideoModelId,  // add this
}),
```

- [ ] **Step 5: Type-check**

```bash
pnpm build 2>&1 | grep -E "error TS|video/page"
```

Expected: no TypeScript errors.

- [ ] **Step 6: Manual UI verification**

Navigate to `http://localhost:3000/video`. Verify:
- Credit cost shown in generate button updates when changing quality or duration
- Page loads without errors

- [ ] **Step 7: Commit**

```bash
git add app/video/page.tsx
git commit -m "feat: video page fetches models dynamically from registry"
```

---

## Task 11: Final verification

- [ ] **Step 1: Full build check**

```bash
pnpm build
```

Expected: Build completes with 0 TypeScript errors. May have linting warnings but no errors.

- [ ] **Step 2: Test cache invalidation workflow**

```bash
# 1. Hit models endpoint (populates cache)
curl "http://localhost:3000/api/models?category=image" | jq '.models[0].name'
# Expected: "Nano Banana 2"

# 2. Invalidate cache
ADMIN_SECRET=$(grep ADMIN_SECRET .env.local | cut -d= -f2)
curl -X POST http://localhost:3000/api/admin/models/invalidate-cache \
  -H "Authorization: Bearer $ADMIN_SECRET"
# Expected: {"ok":true}

# 3. Hit models endpoint again (re-fetches from Supabase)
curl "http://localhost:3000/api/models?category=image" | jq '.models[0].name'
# Expected: "Nano Banana 2" — same data, confirms re-fetch worked
```

- [ ] **Step 3: Verify no secrets leak**

```bash
curl "http://localhost:3000/api/models?category=image" | jq 'keys, .models[0] | keys'
```

Confirm `api_key_env` and `api_secret_env` are not present in any model object.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: model registry — complete implementation"
```
