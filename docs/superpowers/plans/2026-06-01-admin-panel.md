# Admin Panel — Model Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full CRUD admin panel for AI models accessible as a tab in `/settings`, visible only to users with `is_admin = true` in the `users` table.

**Architecture:** `is_admin` column on `users` table is checked server-side via `supabaseAdmin` on every admin API call. Frontend fetches `/api/admin/me` on settings page load to conditionally render the "Models" tab. All admin routes share a `isAdmin()` helper from `lib/admin.ts`.

**Tech Stack:** Next.js 14 App Router, Supabase (supabaseAdmin), Clerk auth, TypeScript, Tailwind/inline styles (matching existing settings page)

**Spec:** `docs/superpowers/specs/2026-06-01-admin-panel-design.md`

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create (SQL) | `supabase/migrations/20260601_add_is_admin.sql` | Add is_admin to users table |
| Create | `lib/admin.ts` | isAdmin(userId) helper |
| Create | `app/api/admin/me/route.ts` | GET — returns { isAdmin } |
| Create | `app/api/admin/models/route.ts` | GET all models + POST new model |
| Create | `app/api/admin/models/[id]/route.ts` | PATCH + DELETE single model |
| Create | `app/api/admin/models/[id]/pricing/route.ts` | POST new pricing row |
| Create | `app/api/admin/pricing/[id]/route.ts` | PATCH + DELETE pricing row |
| Create | `components/admin/ModelManager.tsx` | Full admin UI component |
| Modify | `app/settings/page.tsx` | Add "Models" tab for admins |

---

## Task 1: DB Migration — Add is_admin

**Files:**
- Create: `supabase/migrations/20260601_add_is_admin.sql`

- [ ] **Step 1: Create migration file**

Create `supabase/migrations/20260601_add_is_admin.sql`:
```sql
ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;
```

- [ ] **Step 2: Run on remote DB**

```bash
SUPABASE_ACCESS_TOKEN=<SUPABASE_ACCESS_TOKEN> \
  supabase db query --linked --file supabase/migrations/20260601_add_is_admin.sql
```

Expected: `{ "rows": [] }` — no error.

- [ ] **Step 3: Grant admin to owner**

```bash
SUPABASE_ACCESS_TOKEN=<SUPABASE_ACCESS_TOKEN> \
  supabase db query --linked "UPDATE users SET is_admin = true WHERE email = 'gmstudio1916@gmail.com';"
```

Expected: `{ "rows": [] }`.

- [ ] **Step 4: Verify**

```bash
SUPABASE_ACCESS_TOKEN=<SUPABASE_ACCESS_TOKEN> \
  supabase db query --linked "SELECT email, is_admin FROM users WHERE email = 'gmstudio1916@gmail.com';"
```

Expected: one row with `is_admin: true`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260601_add_is_admin.sql
git commit -m "feat: add is_admin column to users table"
```

---

## Task 2: Create `lib/admin.ts`

**Files:**
- Create: `lib/admin.ts`

- [ ] **Step 1: Create the file**

```typescript
import { supabaseAdmin } from './supabase'

export async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('users')
    .select('is_admin')
    .eq('clerk_id', userId)
    .maybeSingle()
  return data?.is_admin === true
}
```

- [ ] **Step 2: Type-check**

```bash
npm run build 2>&1 | grep "error TS" | head -5
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add lib/admin.ts
git commit -m "feat: add isAdmin helper (lib/admin.ts)"
```

---

## Task 3: Create `GET /api/admin/me`

**Files:**
- Create: `app/api/admin/me/route.ts`

- [ ] **Step 1: Create the file**

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { isAdmin } from '../../../lib/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await isAdmin(userId)
  return NextResponse.json({ isAdmin: admin })
}
```

- [ ] **Step 2: Verify with curl (requires dev server running)**

```bash
npm run dev &
sleep 5
curl http://localhost:3000/api/admin/me
```

Expected: `{"error":"Unauthorized"}` — confirms route is protected (no session cookie in curl).

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/me/route.ts
git commit -m "feat: add GET /api/admin/me"
```

---

## Task 4: Create `app/api/admin/models/route.ts` (GET + POST)

**Files:**
- Create: `app/api/admin/models/route.ts`

- [ ] **Step 1: Create the file**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '../../../../lib/supabase'
import { isAdmin } from '../../../../lib/admin'
import { invalidateModelsCache } from '../../../../lib/models'

export const dynamic = 'force-dynamic'

async function checkAdmin(userId: string | null) {
  if (!userId) return false
  return isAdmin(userId)
}

export async function GET() {
  const { userId } = await auth()
  if (!await checkAdmin(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: userId ? 403 : 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('ai_models')
    .select('*, model_pricing(*)')
    .order('sort_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ models: data })
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!await checkAdmin(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: userId ? 403 : 401 })
  }

  const body = await request.json()
  const { name, provider, model_id, category, api_key_env, api_secret_env } = body

  if (!name || !provider || !model_id || !category || !api_key_env) {
    return NextResponse.json({ error: 'Missing required fields: name, provider, model_id, category, api_key_env' }, { status: 400 })
  }
  if (category !== 'image' && category !== 'video') {
    return NextResponse.json({ error: 'category must be "image" or "video"' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('ai_models')
    .insert({ name, provider, model_id, category, api_key_env, api_secret_env: api_secret_env || null, enabled: false })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  invalidateModelsCache()
  return NextResponse.json({ model: data }, { status: 201 })
}
```

- [ ] **Step 2: Type-check**

```bash
npm run build 2>&1 | grep "error TS" | head -5
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/models/route.ts
git commit -m "feat: add GET+POST /api/admin/models"
```

---

## Task 5: Create `app/api/admin/models/[id]/route.ts` (PATCH + DELETE)

**Files:**
- Create: `app/api/admin/models/[id]/route.ts`

- [ ] **Step 1: Create the file**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '../../../../../lib/supabase'
import { isAdmin } from '../../../../../lib/admin'
import { invalidateModelsCache } from '../../../../../lib/models'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId || !await isAdmin(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: userId ? 403 : 401 })
  }

  const body = await request.json()
  const allowed = ['name', 'provider', 'model_id', 'category', 'enabled', 'sort_order', 'api_key_env', 'api_secret_env']
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('ai_models')
    .update(update)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  invalidateModelsCache()
  return NextResponse.json({ model: data })
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId || !await isAdmin(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: userId ? 403 : 401 })
  }

  const { error } = await supabaseAdmin
    .from('ai_models')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  invalidateModelsCache()
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Type-check**

```bash
npm run build 2>&1 | grep "error TS" | head -5
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add "app/api/admin/models/[id]/route.ts"
git commit -m "feat: add PATCH+DELETE /api/admin/models/[id]"
```

---

## Task 6: Create pricing routes

**Files:**
- Create: `app/api/admin/models/[id]/pricing/route.ts`
- Create: `app/api/admin/pricing/[id]/route.ts`

- [ ] **Step 1: Create POST pricing route**

Create `app/api/admin/models/[id]/pricing/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '../../../../../../lib/supabase'
import { isAdmin } from '../../../../../../lib/admin'
import { invalidateModelsCache } from '../../../../../../lib/models'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId || !await isAdmin(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: userId ? 403 : 401 })
  }

  const body = await request.json()
  const { quality, credits, unit, cost_usd } = body

  if (!quality || credits == null || !unit || cost_usd == null) {
    return NextResponse.json({ error: 'Missing required fields: quality, credits, unit, cost_usd' }, { status: 400 })
  }
  if (unit !== 'per_image' && unit !== 'per_second') {
    return NextResponse.json({ error: 'unit must be "per_image" or "per_second"' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('model_pricing')
    .insert({ model_id: params.id, quality, credits, unit, cost_usd })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  invalidateModelsCache()
  return NextResponse.json({ pricing: data }, { status: 201 })
}
```

- [ ] **Step 2: Create PATCH+DELETE pricing route**

Create `app/api/admin/pricing/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '../../../../../lib/supabase'
import { isAdmin } from '../../../../../lib/admin'
import { invalidateModelsCache } from '../../../../../lib/models'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId || !await isAdmin(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: userId ? 403 : 401 })
  }

  const body = await request.json()
  const allowed = ['quality', 'credits', 'unit', 'cost_usd']
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('model_pricing')
    .update(update)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  invalidateModelsCache()
  return NextResponse.json({ pricing: data })
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId || !await isAdmin(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: userId ? 403 : 401 })
  }

  const { error } = await supabaseAdmin
    .from('model_pricing')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  invalidateModelsCache()
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Type-check**

```bash
npm run build 2>&1 | grep "error TS" | head -5
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add "app/api/admin/models/[id]/pricing/route.ts" "app/api/admin/pricing/[id]/route.ts"
git commit -m "feat: add pricing CRUD routes"
```

---

## Task 7: Create `components/admin/ModelManager.tsx`

**Files:**
- Create: `components/admin/ModelManager.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'
import { useState, useEffect } from 'react'

type PricingRow = {
  id: string
  quality: string
  credits: number
  unit: 'per_image' | 'per_second'
  cost_usd: number
}

type AdminModel = {
  id: string
  name: string
  provider: string
  model_id: string
  category: 'image' | 'video'
  enabled: boolean
  sort_order: number
  api_key_env: string
  api_secret_env: string | null
  model_pricing: PricingRow[]
}

const PROVIDERS = ['google', 'openai', 'kling', 'alibaba']
const UNITS = ['per_image', 'per_second'] as const

export default function ModelManager() {
  const [models, setModels] = useState<AdminModel[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [pricingModel, setPricingModel] = useState<AdminModel | null>(null)
  const [showAddModel, setShowAddModel] = useState(false)
  const [editModel, setEditModel] = useState<AdminModel | null>(null)
  const [addPricingForm, setAddPricingForm] = useState({ quality: '', credits: '', unit: 'per_image', cost_usd: '' })
  const [addModelForm, setAddModelForm] = useState({ name: '', provider: 'google', model_id: '', category: 'image', api_key_env: '', api_secret_env: '' })

  const showNotice = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(''), 3000) }

  const fetchModels = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/models')
    const data = await res.json()
    setModels(data.models ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchModels() }, [])

  const toggleEnabled = async (model: AdminModel) => {
    await fetch(`/api/admin/models/${model.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !model.enabled }),
    })
    setModels(prev => prev.map(m => m.id === model.id ? { ...m, enabled: !m.enabled } : m))
    showNotice('Cache cleared — changes live within seconds')
  }

  const deleteModel = async (id: string) => {
    if (!confirm('Delete this model and all its pricing?')) return
    await fetch(`/api/admin/models/${id}`, { method: 'DELETE' })
    setModels(prev => prev.filter(m => m.id !== id))
    showNotice('Model deleted')
  }

  const saveModel = async (form: typeof addModelForm, id?: string) => {
    const method = id ? 'PATCH' : 'POST'
    const url = id ? `/api/admin/models/${id}` : '/api/admin/models'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, api_secret_env: form.api_secret_env || null }),
    })
    if (!res.ok) { const d = await res.json(); alert(d.error); return }
    await fetchModels()
    setShowAddModel(false)
    setEditModel(null)
    showNotice(id ? 'Model updated' : 'Model added (disabled by default)')
  }

  const addPricing = async () => {
    if (!pricingModel) return
    const res = await fetch(`/api/admin/models/${pricingModel.id}/pricing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quality: addPricingForm.quality,
        credits: Number(addPricingForm.credits),
        unit: addPricingForm.unit,
        cost_usd: Number(addPricingForm.cost_usd),
      }),
    })
    if (!res.ok) { const d = await res.json(); alert(d.error); return }
    const updated = await fetch('/api/admin/models')
    const data = await updated.json()
    const refreshed = data.models?.find((m: AdminModel) => m.id === pricingModel.id)
    if (refreshed) { setPricingModel(refreshed); setModels(data.models) }
    setAddPricingForm({ quality: '', credits: '', unit: 'per_image', cost_usd: '' })
    showNotice('Pricing row added')
  }

  const deletePricing = async (pricingId: string) => {
    if (!confirm('Delete this pricing row?')) return
    await fetch(`/api/admin/pricing/${pricingId}`, { method: 'DELETE' })
    if (pricingModel) {
      setPricingModel({ ...pricingModel, model_pricing: pricingModel.model_pricing.filter(p => p.id !== pricingId) })
      setModels(prev => prev.map(m => m.id === pricingModel.id ? { ...m, model_pricing: m.model_pricing.filter(p => p.id !== pricingId) } : m))
    }
    showNotice('Pricing row deleted')
  }

  const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px 10px', color: 'white', fontSize: '12px', outline: 'none', width: '100%' }
  const selectStyle = { ...inputStyle, cursor: 'pointer' }
  const btnPrimary = { background: 'linear-gradient(135deg, #9b7eff 0%, #6b4ef5 100%)', border: 'none', borderRadius: '8px', padding: '6px 14px', color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }
  const btnDanger = { background: 'rgba(255,60,60,0.1)', border: '0.5px solid rgba(255,60,60,0.3)', borderRadius: '8px', padding: '5px 10px', color: 'rgba(255,100,100,0.9)', fontSize: '11px', cursor: 'pointer' }
  const btnSecondary = { background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '5px 10px', color: 'rgba(255,255,255,0.6)', fontSize: '11px', cursor: 'pointer' }

  const ModelForm = ({ initial, onSave, onCancel }: { initial: typeof addModelForm; onSave: (f: typeof addModelForm) => void; onCancel: () => void }) => {
    const [form, setForm] = useState(initial)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {[
          { label: 'Display Name', key: 'name', placeholder: 'e.g. GPT-image-2' },
          { label: 'Model ID (API string)', key: 'model_id', placeholder: 'e.g. gpt-image-2' },
          { label: 'API Key Env Var', key: 'api_key_env', placeholder: 'e.g. OPENAI_API_KEY' },
          { label: 'API Secret Env Var (optional)', key: 'api_secret_env', placeholder: 'e.g. KLING_ACCESS_KEY_SECRET' },
        ].map(({ label, key, placeholder }) => (
          <div key={key}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
            <input style={inputStyle} placeholder={placeholder} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Provider</p>
            <select style={selectStyle} value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}>
              {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</p>
            <select style={selectStyle} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              <option value="image">image</option>
              <option value="video">video</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '4px' }}>
          <button style={btnSecondary} onClick={onCancel}>Cancel</button>
          <button style={btnPrimary} onClick={() => onSave(form)}>Save</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Notice banner */}
      {notice && (
        <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(83,47,207,0.12)', border: '0.5px solid rgba(120,80,255,0.3)', color: 'rgba(170,140,255,0.9)', fontSize: '12px' }}>
          ✓ {notice}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ color: 'white', fontSize: '15px', fontWeight: 700, margin: 0 }}>AI Models</h3>
        <button style={btnPrimary} onClick={() => setShowAddModel(true)}>+ Add Model</button>
      </div>

      {/* Add model modal */}
      {showAddModel && (
        <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>New Model</p>
          <ModelForm initial={addModelForm} onSave={(f) => saveModel(f)} onCancel={() => setShowAddModel(false)} />
        </div>
      )}

      {/* Edit model modal */}
      {editModel && (
        <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Edit: {editModel.name}</p>
          <ModelForm
            initial={{ name: editModel.name, provider: editModel.provider, model_id: editModel.model_id, category: editModel.category, api_key_env: editModel.api_key_env, api_secret_env: editModel.api_secret_env ?? '' }}
            onSave={(f) => saveModel(f, editModel.id)}
            onCancel={() => setEditModel(null)}
          />
        </div>
      )}

      {/* Models table */}
      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', padding: '20px 0', textAlign: 'center' }}>Loading...</div>
      ) : (
        <div style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 120px 160px', gap: '0', padding: '8px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
            {['Name / Provider', 'Category', 'Status', 'Pricing', 'Actions'].map(h => (
              <span key={h} style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</span>
            ))}
          </div>
          {/* Rows */}
          {models.map(model => (
            <div key={model.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 120px 160px', gap: '0', padding: '12px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
              {/* Name */}
              <div>
                <p style={{ color: 'white', fontSize: '13px', fontWeight: 500, margin: 0 }}>{model.name}</p>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', margin: '2px 0 0' }}>{model.provider} · {model.model_id}</p>
              </div>
              {/* Category */}
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>{model.category}</span>
              {/* Toggle */}
              <button
                onClick={() => toggleEnabled(model)}
                style={{ width: '36px', height: '20px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: model.enabled ? 'rgba(83,47,207,0.8)' : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
              >
                <span style={{ position: 'absolute', top: '2px', left: model.enabled ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
              </button>
              {/* Pricing count */}
              <button style={btnSecondary} onClick={() => setPricingModel(model)}>
                {model.model_pricing?.length ?? 0} rows →
              </button>
              {/* Actions */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button style={btnSecondary} onClick={() => setEditModel(model)}>Edit</button>
                <button style={btnDanger} onClick={() => deleteModel(model.id)}>Delete</button>
              </div>
            </div>
          ))}
          {models.length === 0 && (
            <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>No models yet</div>
          )}
        </div>
      )}

      {/* Pricing drawer */}
      {pricingModel && (
        <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(83,47,207,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p style={{ color: 'rgba(170,140,255,0.9)', fontSize: '12px', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Pricing — {pricingModel.name}
            </p>
            <button style={btnSecondary} onClick={() => setPricingModel(null)}>Close</button>
          </div>
          {/* Pricing rows */}
          {pricingModel.model_pricing?.length > 0 ? (
            <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {pricingModel.model_pricing.map(p => (
                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '80px 70px 100px 90px 60px', gap: '8px', alignItems: 'center', padding: '6px 8px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
                  <span style={{ color: 'white', fontSize: '12px', fontWeight: 500 }}>{p.quality}</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>{p.credits} cr</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{p.unit}</span>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>${p.cost_usd}</span>
                  <button style={btnDanger} onClick={() => deletePricing(p.id)}>✕</button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', marginBottom: '12px' }}>No pricing rows yet.</p>
          )}
          {/* Add pricing row */}
          <div style={{ display: 'grid', gridTemplateColumns: '80px 70px 110px 90px auto', gap: '8px', alignItems: 'flex-end' }}>
            {[
              { label: 'Quality', key: 'quality', placeholder: '1K' },
              { label: 'Credits', key: 'credits', placeholder: '2' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', marginBottom: '4px' }}>{label}</p>
                <input style={{ ...inputStyle, padding: '5px 8px' }} placeholder={placeholder} value={(addPricingForm as any)[key]} onChange={e => setAddPricingForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
            <div>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', marginBottom: '4px' }}>Unit</p>
              <select style={{ ...selectStyle, padding: '5px 8px' }} value={addPricingForm.unit} onChange={e => setAddPricingForm(f => ({ ...f, unit: e.target.value }))}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', marginBottom: '4px' }}>Cost USD</p>
              <input style={{ ...inputStyle, padding: '5px 8px' }} placeholder="0.067" value={addPricingForm.cost_usd} onChange={e => setAddPricingForm(f => ({ ...f, cost_usd: e.target.value }))} />
            </div>
            <button style={btnPrimary} onClick={addPricing}>Add</button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npm run build 2>&1 | grep "error TS" | head -10
```

Expected: no TypeScript errors in `components/admin/ModelManager.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/admin/ModelManager.tsx
git commit -m "feat: add ModelManager admin component"
```

---

## Task 8: Update `app/settings/page.tsx`

**Files:**
- Modify: `app/settings/page.tsx`

- [ ] **Step 1: Add isAdmin state and fetch**

After the existing imports, the file is a client component. Make these changes:

Add `useEffect` to existing imports:
```typescript
import React, { useState, useEffect } from 'react';
```

Add `ModelManager` import:
```typescript
import ModelManager from '../../components/admin/ModelManager';
```

**Change the `Section` type** — find:
```typescript
type Section = 'Personal Profile' | 'Gifts' | 'Referrals' | 'Subscription' | 'Credits Usage' | 'Promo Code';
```

Replace with:
```typescript
type Section = 'Personal Profile' | 'Gifts' | 'Referrals' | 'Subscription' | 'Credits Usage' | 'Promo Code' | 'Models';
```

**Add Models to the icons record** — inside the `icons` object, add after the last entry:
```typescript
  'Models': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
```

**Add isAdmin state** — inside `SettingsPage` component, after the existing `useState` for `activeSection`, add:
```typescript
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    fetch('/api/admin/me')
      .then(r => r.json())
      .then(d => { if (d.isAdmin) setIsAdminUser(true) })
      .catch(() => {})
  }, []);
```

- [ ] **Step 2: Add Models to sections array**

Find the `sections` array and add at the end:
```typescript
  { name: 'Models', group: 'admin' },
```

- [ ] **Step 3: Add admin group to desktop sidebar**

In the desktop sidebar (`aside`), after the "Workspace" group div, add:
```typescript
          {/* Admin group — only shown to admins */}
          {isAdminUser && (
            <div className="mb-6">
              <p className="px-3 mb-2 font-dm text-[10px] font-[700] uppercase tracking-[0.6px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Admin</p>
              {sections.filter(s => s.group === 'admin').map(s => (
                <button key={s.name} onClick={() => setActiveSection(s.name)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl font-dm text-[13px] font-[500] transition-all mb-0.5"
                  style={{
                    background: activeSection === s.name ? 'rgba(83,47,207,0.1)' : 'transparent',
                    color: activeSection === s.name ? 'rgba(170,140,255,0.95)' : 'rgba(255,255,255,0.4)',
                  }}>
                  <div className="flex items-center gap-2.5">
                    {icons[s.name]}
                    {s.name}
                  </div>
                </button>
              ))}
            </div>
          )}
```

- [ ] **Step 4: Add Models to mobile tab bar**

In the mobile tab bar (`div.md:hidden`), the current code maps over `sections`. Find the mobile tab bar `.map(s => ...)` and update the condition so admin sections only show for admins. After the existing `sections.map(...)`, update the filter:

Find the existing mobile tab mapping:
```typescript
          {sections.map(s => (
```

Replace with:
```typescript
          {sections.filter(s => s.group !== 'admin' || isAdminUser).map(s => (
```

- [ ] **Step 5: Add Models section content**

In the main content area, after the last `{activeSection === 'Promo Code' && ...}` block (before the "Coming soon" block), add:
```typescript
          {/* Models — admin only */}
          {activeSection === 'Models' && isAdminUser && (
            <ModelManager />
          )}
```

- [ ] **Step 6: Type-check**

```bash
npm run build 2>&1 | grep "error TS" | head -10
```

Expected: no TypeScript errors.

- [ ] **Step 7: Manual verification**

Start dev server: `npm run dev`

1. Visit `http://localhost:3000/settings` — should NOT see "Models" tab (before you're logged in or if not admin)
2. Log in as admin user — "Models" tab should appear in the Admin group in sidebar
3. Click "Models" — ModelManager component should load with models table
4. Test toggle on Nano Banana 2 — should flip enabled state
5. Log in as non-admin — Models tab should not be visible

- [ ] **Step 8: Commit**

```bash
git add app/settings/page.tsx
git commit -m "feat: add admin Models tab to settings page"
```

---

## Task 9: Enable GPT-image-2 and implement OpenAI provider

**Files:**
- Modify: `app/api/generate-image/route.ts`

- [ ] **Step 1: Install openai SDK**

```bash
npm install openai
```

- [ ] **Step 2: Enable GPT-image-2 in DB**

```bash
SUPABASE_ACCESS_TOKEN=<SUPABASE_ACCESS_TOKEN> \
  supabase db query --linked "UPDATE ai_models SET enabled = true WHERE name = 'GPT-image-2';"
```

- [ ] **Step 3: Add OpenAI generation to generate-image/route.ts**

Read `app/api/generate-image/route.ts`. After the existing Google import, add:
```typescript
import OpenAI from 'openai'
```

Find the provider guard:
```typescript
if (aiModel.provider !== 'google') {
  return NextResponse.json({ error: `Provider "${aiModel.provider}" not yet implemented` }, { status: 501 });
}

const ai = new GoogleGenAI({ apiKey });
```

Replace with:
```typescript
if (aiModel.provider === 'openai') {
  // OpenAI GPT-image-2 path
  const openai = new OpenAI({ apiKey })
  const size = resolution === '4K' ? '1536x1024' : resolution === '2K' ? '1024x1024' : '1024x1024'

  const response = await openai.images.generate({
    model: aiModel.model_id,
    prompt,
    n: 1,
    size,
    response_format: 'b64_json',
  })

  const b64 = response.data[0]?.b64_json
  if (!b64) throw new Error('No image data from OpenAI')

  // Upload to Supabase Storage (return early — no imageBase64/imageMimeType needed)
  const imageBuffer = Buffer.from(b64, 'base64')
  const ext = 'png'
  const fileName = `${userId}/${Date.now()}.${ext}`
  const bucketName = 'user-images'

  const { error: uploadError } = await supabaseAdmin.storage
    .from(bucketName)
    .upload(fileName, imageBuffer, { contentType: 'image/png', upsert: true })

  if (uploadError) throw new Error(`Supabase upload failed: ${uploadError.message}`)

  const { data: { publicUrl } } = supabaseAdmin.storage.from(bucketName).getPublicUrl(fileName)

  await supabaseAdmin.from('generated_images').insert({
    clerk_id: userId,
    prompt,
    image_url: publicUrl,
    model: aiModel.name,
    resolution: resolution || '1K',
  })

  const { data: updatedSub, error: updateError } = await supabaseAdmin
    .from('user_subscriptions')
    .update({ credits_remaining: currentCredits - creditCost, updated_at: new Date().toISOString() })
    .eq('clerk_id', userId)
    .eq('status', 'active')
    .gte('credits_remaining', creditCost)
    .select('credits_remaining')
    .maybeSingle()

  if (updateError) throw updateError
  if (!updatedSub) return NextResponse.json({ error: 'Insufficient credits' }, { status: 403 })

  return NextResponse.json({ images: [{ url: publicUrl }], prompt, remainingCredits: updatedSub.credits_remaining })
}

if (aiModel.provider !== 'google') {
  return NextResponse.json({ error: `Provider "${aiModel.provider}" not yet implemented` }, { status: 501 });
}

const ai = new GoogleGenAI({ apiKey });
```

Note: the `imageBase64` and `imageMimeType` variables are declared later in the file — for the OpenAI path we handle the full flow inline and return early, so we don't need those variables.

- [ ] **Step 4: Type-check**

```bash
npm run build 2>&1 | grep "error TS" | head -10
```

Fix any TypeScript errors.

- [ ] **Step 5: Invalidate cache so new model appears**

```bash
ADMIN_SECRET=$(grep ADMIN_SECRET .env.local | cut -d= -f2)
curl -X POST http://localhost:3000/api/admin/models/invalidate-cache \
  -H "Authorization: Bearer $ADMIN_SECRET"
```

Expected: `{"ok":true}`.

- [ ] **Step 6: Commit**

```bash
git add app/api/generate-image/route.ts package.json package-lock.json
git commit -m "feat: implement OpenAI GPT-image-2 provider, enable in DB"
```
