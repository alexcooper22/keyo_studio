# Admin Panel — Model Management Design Spec
**Date:** 2026-06-01  
**Status:** Approved

## Problem

No way to manage AI models without direct DB access. No admin role in the system. Adding, enabling, or pricing new models requires manual SQL queries.

## Goal

A full CRUD admin panel for managing AI models, accessible only to users with `is_admin = true` in the `users` table, surfaced as a tab in `/settings`.

---

## Database Change

Add to `users` table:
```sql
ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;
```

To grant admin: `UPDATE users SET is_admin = true WHERE email = 'your@email.com';`

---

## `lib/admin.ts` — Admin Check Helper

```ts
export async function isAdmin(userId: string): Promise<boolean>
```

Queries `supabaseAdmin.from('users').select('is_admin').eq('clerk_id', userId).maybeSingle()`.  
Returns `false` if user not found or `is_admin = false`.

All `/api/admin/*` routes call this as their first step after auth.

---

## API Endpoints

All endpoints:
1. Call `auth()` — 401 if not signed in
2. Call `isAdmin(userId)` — 403 if not admin
3. Call `invalidateModelsCache()` after any write

### `GET /api/admin/me`
Returns `{ isAdmin: boolean }`. Used by frontend to conditionally show Admin tab.

### `GET /api/admin/models`
Returns all models including disabled ones, with full fields (including `api_key_env`, `api_secret_env`) and nested pricing rows.

### `POST /api/admin/models`
Body: `{ name, provider, model_id, category, api_key_env, api_secret_env? }`  
Inserts into `ai_models` with `enabled = false` by default. Returns created model.

### `PATCH /api/admin/models/[id]`
Body: any subset of `{ name, provider, model_id, category, enabled, sort_order, api_key_env, api_secret_env }`  
Updates model. Returns updated model.

### `DELETE /api/admin/models/[id]`
Deletes model. Cascades to `model_pricing` via FK.

### `POST /api/admin/models/[id]/pricing`
Body: `{ quality, credits, unit, cost_usd }`  
Inserts pricing row for the given model.

### `PATCH /api/admin/pricing/[id]`
Body: any subset of `{ quality, credits, unit, cost_usd }`  
Updates pricing row.

### `DELETE /api/admin/pricing/[id]`
Deletes pricing row.

---

## Frontend

### `GET /api/admin/me` on mount
`app/settings/page.tsx` fetches `/api/admin/me` on load. If `isAdmin: true`, renders "Models" tab alongside existing settings tabs.

### `components/admin/ModelManager.tsx`
Main admin component rendered inside the Models tab.

**Model list table columns:**
- Name, Provider, Category, Model ID (API identifier)
- Status — toggle switch (calls `PATCH /api/admin/models/[id]` with `{ enabled }`)
- Actions — Edit button (opens edit modal), Pricing button (opens pricing drawer), Delete button

**Add Model button** — opens `AddModelModal`:
- Fields: Name, Provider (select: google/openai/kling/alibaba), Category (select: image/video), Model ID (API string), API Key Env var name, API Secret Env var name (optional)
- Submits to `POST /api/admin/models`
- New model created with `enabled = false` — must explicitly enable

**Edit Model modal** — pre-filled form, same fields, submits to `PATCH`

**Pricing drawer** (slides in from right):
- Table: Quality | Credits | Unit | Cost USD | Actions
- Inline edit/delete per row
- "Add pricing row" form at bottom
- Submits to `POST /api/admin/models/[id]/pricing`

**Cache invalidation banner** — after any write, shows: "Cache cleared — changes live within seconds"

---

## Security

- `is_admin` is checked server-side via `supabaseAdmin` (bypasses RLS) on every admin API call
- Frontend tab visibility is UX only — the actual enforcement is always on the API
- `api_key_env` and `api_secret_env` store env var NAMES, not values — actual secrets never touch the DB

---

## Files

| Action | Path |
|---|---|
| Modify (DB) | `supabase/migrations/20260601_add_is_admin.sql` |
| Create | `lib/admin.ts` |
| Create | `app/api/admin/me/route.ts` |
| Create | `app/api/admin/models/route.ts` (GET + POST) |
| Create | `app/api/admin/models/[id]/route.ts` (PATCH + DELETE) |
| Create | `app/api/admin/models/[id]/pricing/route.ts` (POST) |
| Create | `app/api/admin/pricing/[id]/route.ts` (PATCH + DELETE) |
| Create | `components/admin/ModelManager.tsx` |
| Modify | `app/settings/page.tsx` |
