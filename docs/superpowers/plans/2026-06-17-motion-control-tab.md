# Motion Control Tab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Motion Control" tab to the `/video` page that lets users animate a character image by copying motion from a reference video, using the Kling Motion Control API.

**Architecture:** Five sequential tasks — DB schema first, then backend (upload, generate, check-video), then UI. The video page stays a single file; new UI is a conditional panel rendered when `activeTab === 'motion-control'`. The shared video feed and polling pattern are reused unchanged.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (Postgres + Storage), Kling AI API (JWT auth), Clerk auth, inline CSS styles (no Tailwind classes beyond layout).

## Global Constraints

- All inline styles — no new Tailwind utility classes beyond existing `flex`, `hidden md:flex`, etc.
- Font families: `var(--font-dm)` for body/labels, `font-clash` for headings
- Brand purple: `rgba(83,47,207,…)` / `rgba(120,80,255,…)` — match existing button/border colors exactly
- Kling API base: `https://api.klingai.com` — JWT auth header `Bearer <token>` via HS256 with `KLING_ACCESS_KEY_ID` / `KLING_ACCESS_KEY_SECRET`
- No test files exist in this project — verification is manual (browser + curl)
- YAGNI: no new components, no extraction, no abstraction beyond what the tasks require
- Commit after each task

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/rateLimit.ts` | Modify | Add `video/mp4`, `video/webm` to `ALLOWED_MIME` |
| `app/api/upload-frame/route.ts` | Modify | Accept `.mp4`, `.webm` extensions; route videos to `motionvideos/` path |
| `app/api/generate-motion-control/route.ts` | **Create** | POST — call Kling `/v1/videos/motion-control`, insert DB record, deduct credits |
| `app/api/check-video/route.ts` | Modify | Select `task_type` from DB; poll `/v1/videos/motion-control/{taskId}` for MC tasks |
| `app/[locale]/video/page.tsx` | Modify | Tab bar, MC state, MC upload handlers, MC generate handler, MC left panel |

---

## Task 1: DB — add `task_type` column + insert Kling Motion Control model

**Files:**
- Supabase MCP or SQL migration

**Interfaces:**
- Produces: `generated_videos.task_type` column (VARCHAR, default `'text2video'`); new row in `ai_models` for Kling Motion Control

- [ ] **Step 1: Add `task_type` column to `generated_videos`**

Run this SQL via Supabase MCP (`mcp__supabase__execute_sql`) or the Supabase dashboard SQL editor:

```sql
ALTER TABLE generated_videos
ADD COLUMN IF NOT EXISTS task_type VARCHAR DEFAULT 'text2video';
```

- [ ] **Step 2: Insert the Kling Motion Control model**

```sql
-- Insert the model
INSERT INTO ai_models (name, provider, model_id, category, api_key_env, api_secret_env)
VALUES ('Kling Motion Control', 'kling', 'kling-v3', 'video',
        'KLING_ACCESS_KEY_ID', 'KLING_ACCESS_KEY_SECRET')
RETURNING id;
```

Note the returned `id` (UUID). Use it in the next step.

- [ ] **Step 3: Insert pricing rows for the new model**

Replace `<model-uuid>` with the ID returned above:

```sql
INSERT INTO ai_model_pricing (model_id, quality, credits)
VALUES
  ('<model-uuid>', '720p',  3),
  ('<model-uuid>', '1080p', 4);
```

> If the pricing is stored as JSONB in `ai_models` rather than a separate table, update accordingly:
> ```sql
> UPDATE ai_models
> SET pricing = '[{"quality":"720p","credits":3},{"quality":"1080p","credits":4}]'::jsonb
> WHERE name = 'Kling Motion Control';
> ```

- [ ] **Step 4: Verify**

```sql
SELECT id, name, model_id, category FROM ai_models WHERE name = 'Kling Motion Control';
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'generated_videos' AND column_name = 'task_type';
```

Expected: one row for the model, one column `task_type` with default `text2video`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add task_type column to generated_videos and Kling Motion Control model"
```

---

## Task 2: Extend upload-frame to accept video files

**Files:**
- Modify: `lib/rateLimit.ts`
- Modify: `app/api/upload-frame/route.ts`

**Interfaces:**
- Consumes: existing `isAllowedMime`, `sanitizeFileName` from `lib/rateLimit.ts`
- Produces: `POST /api/upload-frame` now accepts `video/mp4` and `video/webm`; videos stored at `{userId}/motionvideos/{timestamp}.{ext}` in `user-images` bucket

- [ ] **Step 1: Add video MIME types to the allowlist in `lib/rateLimit.ts`**

Current `ALLOWED_MIME` (line 65–71):
```typescript
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);
```

Replace with:
```typescript
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
]);
```

- [ ] **Step 2: Update `app/api/upload-frame/route.ts` to accept video extensions**

Replace the entire file with:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { isAllowedMime, sanitizeFileName } from '../../../lib/rateLimit';

const ALLOWED_IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp']);
const ALLOWED_VIDEO_EXT = new Set(['mp4', 'webm']);

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { fileName, fileType } = await req.json();
  if (!fileName || !fileType) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  if (!isAllowedMime(fileType)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
  }

  const safeName = sanitizeFileName(fileName);
  const ext = safeName.split('.').pop()?.toLowerCase() ?? '';
  const isVideo = ALLOWED_VIDEO_EXT.has(ext);
  const isImage = ALLOWED_IMAGE_EXT.has(ext);

  if (!isVideo && !isImage) {
    return NextResponse.json({ error: 'File extension not allowed' }, { status: 400 });
  }

  const folder = isVideo ? 'motionvideos' : 'frames';
  const storagePath = `${userId}/${folder}/${Date.now()}.${ext}`;

  const { data, error } = await supabaseAdmin.storage
    .from('user-images')
    .createSignedUploadUrl(storagePath);

  if (error || !data) return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 });

  const publicUrl = supabaseAdmin.storage.from('user-images').getPublicUrl(storagePath).data.publicUrl;

  return NextResponse.json({ signedUrl: data.signedUrl, publicUrl });
}
```

- [ ] **Step 3: Verify manually**

Start the dev server (`npm run dev`) and run:

```bash
# Should return signedUrl + publicUrl for a video upload
curl -X POST http://localhost:3000/api/upload-frame \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.mp4","fileType":"video/mp4"}' \
  -H "Cookie: <your-clerk-session-cookie>"
```

Expected: `{ "signedUrl": "...", "publicUrl": "..." }` (401 if not authenticated — that's fine for this check, main test is that the route doesn't 500 on video types).

- [ ] **Step 4: Commit**

```bash
git add lib/rateLimit.ts app/api/upload-frame/route.ts
git commit -m "feat: extend upload-frame to accept mp4/webm video files"
```

---

## Task 3: Create `generate-motion-control` API route

**Files:**
- Create: `app/api/generate-motion-control/route.ts`

**Interfaces:**
- Consumes: `getModelById`, `getCreditCost` from `lib/models`; `rateLimit` from `lib/rateLimit`; `supabaseAdmin` from `lib/supabase`
- Produces: `POST /api/generate-motion-control` → `{ taskId: string, remainingCredits: number }`

- [ ] **Step 1: Create the route file**

Create `app/api/generate-motion-control/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import * as jose from 'jose';
import { supabaseAdmin } from '../../../lib/supabase';
import { rateLimit } from '../../../lib/rateLimit';
import { getModelById, getCreditCost } from '../../../lib/models';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

async function generateKlingToken(): Promise<string> {
  const accessKeyId = process.env.KLING_ACCESS_KEY_ID!;
  const accessKeySecret = process.env.KLING_ACCESS_KEY_SECRET!;
  const secret = new TextEncoder().encode(accessKeySecret);
  return await new jose.SignJWT({})
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setNotBefore('-5s')
    .setExpirationTime('30m')
    .setIssuer(accessKeyId)
    .sign(secret);
}

const FIXED_DURATION = 5;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { allowed } = rateLimit(`gen-mc:${userId}`, 5, 60_000);
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });

  const {
    characterImageUrl,
    motionVideoUrl,
    characterOrientation = 'image',
    quality = '720p',
    modelId,
    prompt = '',
  } = await req.json();

  if (!characterImageUrl) return NextResponse.json({ error: 'characterImageUrl required' }, { status: 400 });
  if (!motionVideoUrl) return NextResponse.json({ error: 'motionVideoUrl required' }, { status: 400 });
  if (!modelId) return NextResponse.json({ error: 'modelId required' }, { status: 400 });
  if (!['image', 'video'].includes(characterOrientation)) {
    return NextResponse.json({ error: 'characterOrientation must be "image" or "video"' }, { status: 400 });
  }

  let aiModel: Awaited<ReturnType<typeof getModelById>>;
  let perSecond: number;
  try {
    aiModel = await getModelById(modelId);
    perSecond = await getCreditCost(aiModel.id, quality);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  const creditCost = perSecond * FIXED_DURATION;

  const { data: subscription } = await supabaseAdmin
    .from('user_subscriptions')
    .select('credits_remaining, status')
    .eq('clerk_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (!subscription) {
    return NextResponse.json({ error: 'No active subscription. Please choose a plan.' }, { status: 403 });
  }
  if (subscription.credits_remaining < creditCost) {
    return NextResponse.json({ error: `Not enough credits. This requires ${creditCost} credits.` }, { status: 403 });
  }

  try {
    const token = await generateKlingToken();
    const klingBody: Record<string, unknown> = {
      model_name: aiModel.model_id,
      image_url: characterImageUrl,
      video_url: motionVideoUrl,
      character_orientation: characterOrientation,
    };
    if (prompt) klingBody.prompt = prompt;

    const response = await fetch('https://api.klingai.com/v1/videos/motion-control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(klingBody),
      signal: AbortSignal.timeout(30_000),
    });
    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data?.message ?? `Kling error ${response.status}` }, { status: response.status });
    }

    const taskId = data.data?.task_id;
    if (!taskId) return NextResponse.json({ error: 'No task_id returned from Kling' }, { status: 500 });

    await supabaseAdmin.from('generated_videos').insert({
      clerk_id: userId,
      prompt: prompt || 'Motion Control',
      task_id: taskId,
      model: aiModel.name,
      provider: 'kling',
      task_type: 'motion-control',
      quality,
      status: 'processing',
    });

    const { data: updatedSub } = await supabaseAdmin
      .from('user_subscriptions')
      .update({
        credits_remaining: subscription.credits_remaining - creditCost,
        updated_at: new Date().toISOString(),
      })
      .eq('clerk_id', userId)
      .eq('status', 'active')
      .gte('credits_remaining', creditCost)
      .select('credits_remaining')
      .maybeSingle();

    if (!updatedSub) return NextResponse.json({ error: 'Insufficient credits' }, { status: 403 });

    return NextResponse.json({ taskId, remainingCredits: updatedSub.credits_remaining });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors in the new file.

- [ ] **Step 3: Commit**

```bash
git add app/api/generate-motion-control/route.ts
git commit -m "feat: add generate-motion-control API route"
```

---

## Task 4: Extend `check-video` to handle motion-control tasks

**Files:**
- Modify: `app/api/check-video/route.ts`

**Interfaces:**
- Consumes: `generated_videos.task_type` (from Task 1)
- Produces: `GET /api/check-video?taskId=…` now polls `/v1/videos/motion-control/{taskId}` when `task_type = 'motion-control'`

- [ ] **Step 1: Update the DB select to also fetch `task_type`**

Find this block in `check-video/route.ts` (lines 32–38):
```typescript
  const { data: videoRecord } = await supabaseAdmin
    .from('generated_videos')
    .select('provider')
    .eq('task_id', taskId)
    .maybeSingle();

  const provider = videoRecord?.provider ?? 'kling';
```

Replace with:
```typescript
  const { data: videoRecord } = await supabaseAdmin
    .from('generated_videos')
    .select('provider, task_type')
    .eq('task_id', taskId)
    .maybeSingle();

  const provider = videoRecord?.provider ?? 'kling';
  const taskType = videoRecord?.task_type ?? 'text2video';
```

- [ ] **Step 2: Use `taskType` to choose the correct Kling polling endpoint**

Find this block (lines 65–68):
```typescript
    // Default: Kling
    const token = await generateKlingToken();
    const response = await fetch(`https://api.klingai.com/v1/videos/text2video/${taskId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
```

Replace with:
```typescript
    // Default: Kling
    const token = await generateKlingToken();
    const klingPath = taskType === 'motion-control'
      ? `https://api.klingai.com/v1/videos/motion-control/${taskId}`
      : `https://api.klingai.com/v1/videos/text2video/${taskId}`;
    const response = await fetch(klingPath, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/check-video/route.ts
git commit -m "feat: extend check-video to poll motion-control endpoint for MC tasks"
```

---

## Task 5: Add Motion Control tab UI to video page

**Files:**
- Modify: `app/[locale]/video/page.tsx`

This task has four sub-steps: state, handlers, tab bar, panel.

### 5a — Add state variables

- [ ] **Step 1: Add MC state after the existing `const [endFrame, setEndFrame] = useState…` block (around line 43)**

Add these declarations:

```typescript
const [activeTab, setActiveTab] = useState<'create' | 'motion-control'>('create');
const [mcMotionVideoUrl, setMcMotionVideoUrl] = useState<string | null>(null);
const [mcCharacterImageUrl, setMcCharacterImageUrl] = useState<string | null>(null);
const [mcCharacterOrientation, setMcCharacterOrientation] = useState<'image' | 'video'>('image');
const [mcQuality, setMcQuality] = useState<'720p' | '1080p'>('720p');
const [mcPrompt, setMcPrompt] = useState('');
const [isMcGenerating, setIsMcGenerating] = useState(false);
const [mcError, setMcError] = useState<string | null>(null);
const mcPollRef = useRef<NodeJS.Timeout | null>(null);
const mcMotionVideoRef = useRef<HTMLInputElement>(null);
const mcCharacterImageRef = useRef<HTMLInputElement>(null);
```

### 5b — Add upload and generate handlers

- [ ] **Step 2: Add `handleMcUpload` after the existing `handleFrameUpload` function (after line 160)**

```typescript
const handleMcUpload = async (file: File, type: 'motionVideo' | 'characterImage') => {
  const preview = URL.createObjectURL(file);
  if (type === 'motionVideo') setMcMotionVideoUrl(preview);
  else setMcCharacterImageUrl(preview);

  try {
    const res = await fetch('/api/upload-frame', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, fileType: file.type }),
    });
    const { signedUrl, publicUrl } = await res.json();
    await fetch(signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (type === 'motionVideo') setMcMotionVideoUrl(publicUrl);
    else setMcCharacterImageUrl(publicUrl);
  } catch (err) {
    console.error('MC upload failed', err);
  }
};
```

- [ ] **Step 3: Add `handleMcGenerate` after `handleMcUpload`**

```typescript
const handleMcGenerate = async () => {
  if (!mcMotionVideoUrl || !mcCharacterImageUrl || isMcGenerating) return;
  const mcModel = videoModels.find(m => m.name === 'Kling Motion Control');
  if (!mcModel) return;

  setIsMcGenerating(true);
  setMcError(null);
  setStatus('Submitting...');

  try {
    const perSecond = mcModel.pricing.find(p => p.quality === mcQuality)?.credits ?? (mcQuality === '1080p' ? 4 : 3);
    const res = await fetch('/api/generate-motion-control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        characterImageUrl: mcCharacterImageUrl,
        motionVideoUrl: mcMotionVideoUrl,
        characterOrientation: mcCharacterOrientation,
        quality: mcQuality,
        modelId: mcModel.id,
        prompt: mcPrompt,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');

    const taskId = data.taskId;
    setStatus('Processing...');
    if (data.remainingCredits !== undefined) setCreditCount(data.remainingCredits);

    mcPollRef.current = setInterval(async () => {
      try {
        const check = await fetch(`/api/check-video?taskId=${taskId}`);
        const result = await check.json();
        if (result.status === 'succeed' && result.videoUrl) {
          clearInterval(mcPollRef.current!);
          const newVideo: VideoItem = {
            id: taskId,
            videoUrl: result.videoUrl,
            prompt: mcPrompt || 'Motion Control',
            createdAt: new Date(),
            quality: mcQuality,
            model: mcModel.name,
          };
          setVideos(prev => [newVideo, ...prev]);
          setIsMcGenerating(false);
          setStatus('');
          window.dispatchEvent(new Event('credits-updated'));
          if (feedRef.current) feedRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (result.status === 'failed') {
          clearInterval(mcPollRef.current!);
          setMcError('Generation failed. Please try again.');
          setIsMcGenerating(false);
          setStatus('');
        }
      } catch (err) {
        console.error('MC polling error:', err);
      }
    }, 5000);
  } catch (err: any) {
    setMcError(err.message);
    setIsMcGenerating(false);
    setStatus('');
  }
};
```

- [ ] **Step 4: Add cleanup for `mcPollRef` in the existing `useEffect` cleanup or add a new one after the existing `pollRef` cleanup**

After the existing `pollRef` cleanup `useEffect`, add:

```typescript
useEffect(() => {
  return () => {
    if (mcPollRef.current) clearInterval(mcPollRef.current);
  };
}, []);
```

### 5c — Add credit cost derived value

- [ ] **Step 5: Add MC credit cost calculation near the existing `videoCreditCost` line (around line 350)**

After:
```typescript
const videoCreditCost = (perSecond + (audioEnabled ? 1 : 0)) * duration;
```

Add:
```typescript
const mcModel = videoModels.find(m => m.name === 'Kling Motion Control');
const mcPerSecond = mcModel?.pricing.find(p => p.quality === mcQuality)?.credits ?? (mcQuality === '1080p' ? 4 : 3);
const mcCreditCost = mcPerSecond * 5;
```

### 5d — Add tab bar to the left panel

- [ ] **Step 6: Add the tab bar inside the left panel div**

Find the `{/* LEFT PANEL */}` comment block. Its opening tag is:
```tsx
<div className="video-panel" style={{ background: '#0a0a0e', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
  {/* Top shimmer */}
  <div aria-hidden style={{ ... }} />

  {/* Divider */}
  <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.06)' }} />
```

After the divider `<div>`, add the tab bar:

```tsx
          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
            {(['create', 'motion-control'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '10px 4px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab ? '1.5px solid rgba(120,80,255,0.8)' : '1.5px solid transparent',
                  color: activeTab === tab ? 'rgba(160,120,255,0.95)' : 'rgba(255,255,255,0.28)',
                  fontSize: '11px',
                  fontFamily: 'var(--font-dm)',
                  fontWeight: activeTab === tab ? 600 : 400,
                  letterSpacing: '0.3px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  marginBottom: '-0.5px',
                }}
              >
                {tab === 'create' ? 'Create Video' : 'Motion Control'}
              </button>
            ))}
          </div>
```

### 5e — Add Motion Control left panel

- [ ] **Step 7: Wrap the existing left panel content in a conditional and add the MC panel**

Find the scrollable padding div that contains the left panel content:
```tsx
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
            {/* Model card */}
            ...
          </div>
          {/* Footer */}
          <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', ... }}>
```

Wrap the entire content + footer in `{activeTab === 'create' && ( ... )}` and add the MC panel:

```tsx
          {activeTab === 'create' && (
            <>
              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
                {/* === EXISTING LEFT PANEL CONTENT — unchanged === */}
              </div>
              {/* === EXISTING FOOTER — unchanged === */}
              <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* existing footer content */}
              </div>
            </>
          )}

          {activeTab === 'motion-control' && (
            <>
              {/* Hidden file inputs */}
              <input ref={mcMotionVideoRef} type="file" accept="video/mp4,video/webm" style={{ display: 'none' }}
                onChange={e => e.target.files?.[0] && handleMcUpload(e.target.files[0], 'motionVideo')} />
              <input ref={mcCharacterImageRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => e.target.files?.[0] && handleMcUpload(e.target.files[0], 'characterImage')} />

              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>

                {/* Upload boxes */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {/* Motion video upload */}
                  <div style={{ position: 'relative', aspectRatio: '1' }}>
                    <div
                      onClick={() => mcMotionVideoRef.current?.click()}
                      style={{ background: '#0c0c14', border: `0.5px solid ${mcMotionVideoUrl && !mcMotionVideoUrl.startsWith('blob:') ? 'rgba(83,47,207,0.5)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '10px', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px', cursor: 'pointer', overflow: 'hidden', position: 'relative', transition: 'border-color 0.15s' }}
                    >
                      {mcMotionVideoUrl ? (
                        <video src={mcMotionVideoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                      ) : (
                        <>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-dm)', textAlign: 'center', lineHeight: 1.4, padding: '0 4px' }}>Add motion to copy</span>
                          <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.15)', fontFamily: 'var(--font-dm)' }}>3–30s video</span>
                        </>
                      )}
                    </div>
                    {mcMotionVideoUrl && (
                      <div onClick={() => setMcMotionVideoUrl(null)} style={{ position: 'absolute', top: '5px', right: '5px', width: '18px', height: '18px', background: 'rgba(10,10,14,0.85)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '11px', color: 'rgba(255,255,255,0.7)', zIndex: 10 }}>×</div>
                    )}
                  </div>

                  {/* Character image upload */}
                  <div style={{ position: 'relative', aspectRatio: '1' }}>
                    <div
                      onClick={() => mcCharacterImageRef.current?.click()}
                      style={{ background: '#0c0c14', border: `0.5px solid ${mcCharacterImageUrl && !mcCharacterImageUrl.startsWith('blob:') ? 'rgba(83,47,207,0.5)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '10px', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px', cursor: 'pointer', overflow: 'hidden', position: 'relative', transition: 'border-color 0.15s' }}
                    >
                      {mcCharacterImageUrl ? (
                        <img src={mcCharacterImageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      ) : (
                        <>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-dm)', textAlign: 'center', lineHeight: 1.4, padding: '0 4px' }}>Add your character</span>
                          <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.15)', fontFamily: 'var(--font-dm)' }}>Face + body visible</span>
                        </>
                      )}
                    </div>
                    {mcCharacterImageUrl && (
                      <div onClick={() => setMcCharacterImageUrl(null)} style={{ position: 'absolute', top: '5px', right: '5px', width: '18px', height: '18px', background: 'rgba(10,10,14,0.85)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '11px', color: 'rgba(255,255,255,0.7)', zIndex: 10 }}>×</div>
                    )}
                  </div>
                </div>

                {/* Model label */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '9px 12px' }}>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--font-dm)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Model</div>
                  <div style={{ fontSize: '12px', fontFamily: 'var(--font-dm)', fontWeight: 500, color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(120,80,255,0.8)', flexShrink: 0 }} />
                    Kling Motion Control
                  </div>
                </div>

                {/* Quality selector */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['720p', '1080p'] as const).map(q => (
                    <button
                      key={q}
                      onClick={() => setMcQuality(q)}
                      style={{ flex: 1, padding: '7px 4px', background: mcQuality === q ? 'rgba(83,47,207,0.1)' : 'rgba(255,255,255,0.04)', border: mcQuality === q ? '0.5px solid rgba(83,47,207,0.35)' : '0.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '11px', color: mcQuality === q ? 'rgba(160,120,255,0.9)' : 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'var(--font-dm)', transition: 'all 0.15s' }}
                    >
                      ◇ {q}
                    </button>
                  ))}
                </div>

                {/* Scene control mode */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-dm)', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.2px' }}>Scene control mode</span>
                    <div
                      onClick={() => setMcCharacterOrientation(v => v === 'image' ? 'video' : 'image')}
                      style={{ width: '32px', height: '18px', background: mcCharacterOrientation === 'video' ? 'rgba(83,47,207,0.8)' : 'rgba(255,255,255,0.1)', borderRadius: '20px', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}
                    >
                      <div style={{ width: '14px', height: '14px', background: 'white', borderRadius: '50%', position: 'absolute', left: mcCharacterOrientation === 'video' ? '16px' : '2px', top: '2px', transition: 'left 0.2s' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {(['video', 'image'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setMcCharacterOrientation(mode)}
                        style={{ flex: 1, padding: '6px 4px', background: mcCharacterOrientation === mode ? 'rgba(83,47,207,0.12)' : 'rgba(255,255,255,0.03)', border: mcCharacterOrientation === mode ? '0.5px solid rgba(83,47,207,0.35)' : '0.5px solid rgba(255,255,255,0.07)', borderRadius: '7px', fontSize: '11px', color: mcCharacterOrientation === mode ? 'rgba(160,120,255,0.9)' : 'rgba(255,255,255,0.3)', cursor: 'pointer', fontFamily: 'var(--font-dm)', transition: 'all 0.15s', textTransform: 'capitalize' }}
                      >
                        {mode === 'video' ? 'Video' : 'Image'}
                      </button>
                    ))}
                  </div>
                  <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-dm)', lineHeight: 1.4 }}>
                    {mcCharacterOrientation === 'video'
                      ? 'Background from motion video (up to 30s)'
                      : 'Background from character image (up to 10s)'}
                  </span>
                </div>

                {/* Optional prompt */}
                <textarea
                  value={mcPrompt}
                  onChange={e => setMcPrompt(e.target.value)}
                  placeholder="Optional prompt..."
                  style={{ background: 'rgba(10,10,14,0.97)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: 'rgba(255,255,255,0.85)', minHeight: '60px', resize: 'none', outline: 'none', width: '100%', fontFamily: 'var(--font-dm)', boxSizing: 'border-box', lineHeight: 1.6 }}
                />

                {mcError && <div style={{ fontSize: '11px', color: '#ef4444', fontFamily: 'var(--font-dm)' }}>{mcError}</div>}
              </div>

              {/* MC Footer */}
              <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', padding: '10px 12px' }}>
                <button
                  onClick={handleMcGenerate}
                  disabled={isMcGenerating || !mcMotionVideoUrl || !mcCharacterImageUrl || (creditCount !== null && creditCount < mcCreditCost)}
                  style={{
                    background: (creditCount !== null && creditCount < mcCreditCost) ? 'rgba(255,255,255,0.04)' : isMcGenerating ? 'rgba(83,47,207,0.5)' : 'linear-gradient(135deg, #7c5cf0 0%, #9b7eff 100%)',
                    border: (creditCount !== null && creditCount < mcCreditCost) ? '0.5px solid rgba(255,255,255,0.08)' : 'none',
                    borderRadius: '11px', padding: '13px', fontSize: '13px', fontWeight: 700,
                    fontFamily: 'var(--font-dm)', letterSpacing: '0.1px',
                    color: (creditCount !== null && creditCount < mcCreditCost) ? 'rgba(255,255,255,0.25)' : '#fff',
                    cursor: (isMcGenerating || !mcMotionVideoUrl || !mcCharacterImageUrl) ? 'not-allowed' : 'pointer',
                    opacity: isMcGenerating ? 0.85 : 1, width: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                    boxShadow: isMcGenerating || (creditCount !== null && creditCount < mcCreditCost) ? 'none' : '0 4px 20px rgba(83,47,207,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
                    transition: 'opacity 0.2s',
                  }}
                >
                  {isMcGenerating ? (
                    <><div style={{ width: '13px', height: '13px', border: '1.5px solid rgba(255,255,255,0.35)', borderTop: '1.5px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />{status || 'Generating...'}</>
                  ) : (creditCount !== null && creditCount < mcCreditCost) ? (
                    <>No Credits</>
                  ) : (
                    <><span style={{ fontSize: '10px', color: 'rgba(220,200,255,0.9)' }}>✦</span>Generate<span style={{ color: 'rgba(200,170,255,0.7)', fontSize: '11px', fontWeight: 500 }}>· {mcCreditCost}</span></>
                  )}
                </button>
              </div>
            </>
          )}
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Start dev server and test in browser**

```bash
npm run dev
```

Test checklist:
1. Navigate to `/video` — confirm two tabs appear: "Create Video" and "Motion Control"
2. Click "Motion Control" — confirm left panel switches to MC panel
3. Click "Create Video" — confirm original panel is restored
4. In MC tab: click motion video box — file picker opens, accepts only `.mp4`/`.webm`
5. Upload a short mp4 — thumbnail preview appears in the box; × button appears
6. Click character image box — file picker opens, accepts images
7. Upload a photo — image preview appears
8. Toggle Scene Control Mode — toggle switches, label updates ("Background from...")
9. Click Video / Image buttons — both update `characterOrientation` display
10. Quality buttons 720p/1080p — active state highlights correctly
11. Credit cost in Generate button matches `mcPerSecond * 5`
12. Click Generate (with both uploads done) — button shows spinner, feed shows generating placeholder
13. After ~30-120s — video appears in feed with "Kling Motion Control" in right sidebar

- [ ] **Step 10: Commit**

```bash
git add app/[locale]/video/page.tsx
git commit -m "feat: add Motion Control tab UI to video page"
```
