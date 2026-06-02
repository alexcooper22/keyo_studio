# LiqPay Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Stripe with LiqPay for subscription payments, keeping identical UX and Supabase data model.

**Architecture:** LiqPay uses base64-encoded JSON params + SHA1 signature for both checkout redirect and webhook verification. On checkout: backend signs params → returns redirect URL → user pays on liqpay.ua → LiqPay POSTs to `server_url` webhook. Subscriptions are automatic via `action: subscribe` + `subscribe_periodicity: month`.

**Tech Stack:** Next.js 14 App Router, LiqPay API v3 (raw fetch, no SDK), Node.js `crypto` module, Supabase

---

## Files

| Action | Path | Purpose |
|---|---|---|
| CREATE | `lib/liqpay.ts` | Sign params, build checkout URL, verify webhook signature |
| CREATE | `app/api/liqpay/checkout/route.ts` | Replaces `/api/stripe/create-checkout` |
| CREATE | `app/api/liqpay/webhook/route.ts` | Replaces `/api/stripe/webhook` |
| DELETE | `app/api/stripe/create-checkout/route.ts` | Stripe checkout |
| DELETE | `app/api/stripe/webhook/route.ts` | Stripe webhook handler |
| DELETE | `lib/stripe.ts` | Stripe client |
| MODIFY | `app/pricing/page.tsx:45` | Change API endpoint URL |
| MODIFY | `middleware.ts:13` | Change public webhook route |
| MODIFY | `.env.local` | Add LiqPay keys, remove Stripe keys |
| MIGRATION | Supabase | Add `liqpay_subscribe_id` column to `user_subscriptions` |

---

## Task 1: Add LiqPay env vars

**Files:**
- Modify: `.env.local`

- [ ] **Step 1: Add LiqPay keys** (get them from https://www.liqpay.ua/en/admin/business)

```env
LIQPAY_PUBLIC_KEY=sandbox_i00000000000
LIQPAY_PRIVATE_KEY=sandbox_00000000000000000000000000000000
```

- [ ] **Step 2: Verify keys are set**

```bash
grep LIQPAY .env.local
```
Expected: two lines with LIQPAY_PUBLIC_KEY and LIQPAY_PRIVATE_KEY

---

## Task 2: Create `lib/liqpay.ts`

**Files:**
- Create: `lib/liqpay.ts`

- [ ] **Step 1: Create the helper**

```ts
import crypto from 'crypto'

const PUBLIC_KEY = process.env.LIQPAY_PUBLIC_KEY!
const PRIVATE_KEY = process.env.LIQPAY_PRIVATE_KEY!

export const LIQPAY_PLANS = {
  starter: { credits: 200, name: 'Starter', amount: '19', currency: 'USD' },
  plus:    { credits: 1000, name: 'Plus',    amount: '49', currency: 'USD' },
} as const

export type LiqPayPlanType = keyof typeof LIQPAY_PLANS

function sign(data: string): string {
  return crypto
    .createHash('sha1')
    .update(PRIVATE_KEY + data + PRIVATE_KEY)
    .digest('base64')
}

export function buildCheckoutUrl(params: Record<string, string>): string {
  const data = Buffer.from(JSON.stringify(params)).toString('base64')
  const signature = sign(data)
  return `https://www.liqpay.ua/api/3/checkout?data=${encodeURIComponent(data)}&signature=${encodeURIComponent(signature)}`
}

export function verifyWebhook(data: string, signature: string): boolean {
  return sign(data) === signature
}

export function decodeWebhookData(data: string): Record<string, any> {
  return JSON.parse(Buffer.from(data, 'base64').toString('utf8'))
}

export { PUBLIC_KEY }
```

- [ ] **Step 2: Commit**

```bash
git add lib/liqpay.ts
git commit -m "feat: add LiqPay helper (sign, checkout URL, webhook verify)"
```

---

## Task 3: Supabase migration — add `liqpay_subscribe_id`

**Files:**
- Supabase: `user_subscriptions` table

- [ ] **Step 1: Run migration via Supabase MCP**

```sql
ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS liqpay_subscribe_id text;
```

- [ ] **Step 2: Verify column exists**

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'user_subscriptions'
  AND column_name = 'liqpay_subscribe_id';
```

Expected: one row returned.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add liqpay_subscribe_id column to user_subscriptions"
```

---

## Task 4: Create `/api/liqpay/checkout/route.ts`

**Files:**
- Create: `app/api/liqpay/checkout/route.ts`

- [ ] **Step 1: Create the route**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { buildCheckoutUrl, LIQPAY_PLANS, LiqPayPlanType, PUBLIC_KEY } from '@/lib/liqpay'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await currentUser()
  const email = user?.emailAddresses?.[0]?.emailAddress
  if (!email) return NextResponse.json({ error: 'Email not found' }, { status: 400 })

  const { plan } = (await req.json()) as { plan: LiqPayPlanType }
  if (!plan || !LIQPAY_PLANS[plan]) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const planConfig = LIQPAY_PLANS[plan]
  const orderId = `${plan}_${userId}_${Date.now()}`

  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  const url = buildCheckoutUrl({
    public_key: PUBLIC_KEY,
    version: '3',
    action: 'subscribe',
    amount: planConfig.amount,
    currency: planConfig.currency,
    description: `Keyo Studio — ${planConfig.name} Plan`,
    order_id: orderId,
    subscribe_periodicity: 'month',
    subscribe_date_start: today,
    server_url: `${req.nextUrl.origin}/api/liqpay/webhook`,
    result_url: `${req.nextUrl.origin}/pricing?success=true`,
    customer: userId,
    info: JSON.stringify({ clerk_id: userId, plan }),
  })

  return NextResponse.json({ url })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/liqpay/checkout/route.ts
git commit -m "feat: LiqPay checkout endpoint — subscribe action with monthly periodicity"
```

---

## Task 5: Create `/api/liqpay/webhook/route.ts`

**Files:**
- Create: `app/api/liqpay/webhook/route.ts`

- [ ] **Step 1: Create the route**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhook, decodeWebhookData, LIQPAY_PLANS, LiqPayPlanType } from '@/lib/liqpay'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const data = formData.get('data') as string
  const signature = formData.get('signature') as string

  if (!data || !signature) {
    return NextResponse.json({ error: 'Missing data or signature' }, { status: 400 })
  }

  if (!verifyWebhook(data, signature)) {
    console.error('LiqPay webhook: invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const payload = decodeWebhookData(data)
  const { status, action, order_id, subscribe_id, amount } = payload

  // Only handle subscribe actions
  if (action !== 'subscribe') {
    return NextResponse.json({ received: true })
  }

  let info: { clerk_id?: string; plan?: string } = {}
  try {
    info = payload.info ? JSON.parse(payload.info) : {}
  } catch {}

  const clerkId = info.clerk_id ?? payload.customer
  const plan = (info.plan ?? order_id?.split('_')[0]) as LiqPayPlanType

  if (!clerkId || !plan || !LIQPAY_PLANS[plan]) {
    console.error('LiqPay webhook: missing clerkId or plan', { clerkId, plan, order_id })
    return NextResponse.json({ received: true })
  }

  const planConfig = LIQPAY_PLANS[plan]

  if (status === 'subscribed' || status === 'success') {
    // New subscription or renewal
    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    await supabaseAdmin.from('user_subscriptions').upsert({
      clerk_id: clerkId,
      liqpay_subscribe_id: subscribe_id ?? null,
      plan,
      status: 'active',
      credits_remaining: planConfig.credits,
      credits_total: planConfig.credits,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      updated_at: now.toISOString(),
    }, { onConflict: 'clerk_id' })

  } else if (status === 'unsubscribed' || status === 'failure' || status === 'error') {
    await supabaseAdmin.from('user_subscriptions')
      .update({ status: 'canceled', credits_remaining: 0, updated_at: new Date().toISOString() })
      .eq('clerk_id', clerkId)
  }

  return NextResponse.json({ received: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/liqpay/webhook/route.ts
git commit -m "feat: LiqPay webhook handler — subscribed/success/failure/unsubscribed"
```

---

## Task 6: Update `pricing/page.tsx`

**Files:**
- Modify: `app/pricing/page.tsx:45`

- [ ] **Step 1: Change endpoint**

Change line 45 from:
```ts
const res = await fetch('/api/stripe/create-checkout', {
```
To:
```ts
const res = await fetch('/api/liqpay/checkout', {
```

- [ ] **Step 2: Commit**

```bash
git add app/pricing/page.tsx
git commit -m "feat: pricing page — point checkout to LiqPay endpoint"
```

---

## Task 7: Update `middleware.ts`

**Files:**
- Modify: `middleware.ts:13`

- [ ] **Step 1: Change public webhook route**

Change:
```ts
'/api/stripe/webhook(.*)',
```
To:
```ts
'/api/liqpay/webhook(.*)',
```

- [ ] **Step 2: Commit**

```bash
git add middleware.ts
git commit -m "feat: allow LiqPay webhook as public route (no Clerk auth)"
```

---

## Task 8: Delete Stripe files

**Files:**
- Delete: `lib/stripe.ts`
- Delete: `app/api/stripe/create-checkout/route.ts`
- Delete: `app/api/stripe/webhook/route.ts`

- [ ] **Step 1: Delete files**

```bash
rm lib/stripe.ts
rm -rf app/api/stripe
```

- [ ] **Step 2: Verify no remaining Stripe imports**

```bash
grep -r "from.*stripe\|import.*stripe" --include="*.ts" --include="*.tsx" . | grep -v node_modules
```

Expected: no output.

- [ ] **Step 3: Uninstall Stripe package**

```bash
npm uninstall stripe
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove Stripe — replaced by LiqPay"
```

---

## Task 9: Remove Stripe env vars from `.env.local`

- [ ] **Step 1: Remove these 5 lines from `.env.local`**

```
STRIPE_SECRET_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_PRICE_ID_STARTER=...
STRIPE_PRICE_ID_PLUS=...
```

- [ ] **Step 2: Verify**

```bash
grep -i stripe .env.local
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add .env.local
git commit -m "chore: remove Stripe env vars"
```

---

## Task 10: Test the integration end-to-end

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Click "Get started" on `/pricing` page**

Expected: redirect to `https://www.liqpay.ua/api/3/checkout?data=...&signature=...`

- [ ] **Step 3: Test webhook locally with ngrok or similar**

```bash
# In a second terminal
npx ngrok http 3000
# Update server_url in checkout route to use ngrok URL temporarily
```

Then complete a test payment in LiqPay sandbox. Check Supabase `user_subscriptions` table — a row should appear with `status: 'active'`.

- [ ] **Step 4: Test webhook signature verification**

Send a POST to `/api/liqpay/webhook` with a wrong signature:
```bash
curl -X POST http://localhost:3000/api/liqpay/webhook \
  -F "data=fake" \
  -F "signature=wrong"
```
Expected: `{"error":"Invalid signature"}` with 400 status.

---

## Secrets to remove from `.env.local`

```
❌ STRIPE_SECRET_KEY
❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
❌ STRIPE_WEBHOOK_SECRET
❌ STRIPE_PRICE_ID_STARTER
❌ STRIPE_PRICE_ID_PLUS
```

```
✅ LIQPAY_PUBLIC_KEY    (add)
✅ LIQPAY_PRIVATE_KEY   (add)
```
