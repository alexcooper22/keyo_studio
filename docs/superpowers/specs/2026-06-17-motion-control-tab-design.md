# Motion Control Tab — Design Spec
Date: 2026-06-17

## Overview

Add a "Motion Control" tab to the video page (`/video`) that uses Kling's motion-transfer API to animate a still character image by copying motion from a reference video. UI modeled after Higgsfield's Motion Control feature.

---

## Architecture

### Files to create
- `app/api/generate-motion-control/route.ts` — POST endpoint for MC generation

### Files to modify
- `app/[locale]/video/page.tsx` — add tab state, tab bar, Motion Control left panel
- `app/api/check-video/route.ts` — extend to poll `/v1/videos/motion-control/{taskId}` when `task_type = 'motion-control'`
- `app/api/upload-frame/route.ts` — extend to accept video files (mp4, webm) in addition to images

### Database changes (Supabase)
1. `generated_videos` table: add column `task_type VARCHAR DEFAULT 'text2video'`
2. `ai_models` table: insert new record for "Kling Motion Control" model

---

## UI

### Tab bar
Added at the top of the video page, above the left panel. Shared between desktop and mobile.

```
[ Create Video ]  [ Motion Control ]
```

Active tab: highlighted with brand color. Switching tabs resets generation state but preserves the video feed.

### Motion Control left panel (desktop)
Replaces the existing left panel when the Motion Control tab is active.

```
┌─────────────────────────────┐
│  Motion video upload box    │  ← click to upload mp4 (3–30s)
│  "Add motion to copy"       │
│  Video duration: 3–30s      │
├─────────────────────────────┤
│  Character image upload box │  ← click to upload jpg/png
│  "Add your character"       │
│  Image with face and body   │
├─────────────────────────────┤
│  Quality: [720p ▾]          │  ← same dropdown as regular video
├─────────────────────────────┤
│  Scene control mode  [●]   │  ← toggle
│  [ Video ]  [ Image ]       │
│  "Background from..."       │
├─────────────────────────────┤
│  Prompt (optional)          │  ← small textarea, collapsible
├─────────────────────────────┤
│  [ Generate  ✦ 15 ]        │  ← credit cost updates with quality
└─────────────────────────────┘
```

**Scene control mode:**
- `Image` (default) → `character_orientation: 'image'` — background from character image, max 10s output
- `Video` → `character_orientation: 'video'` — background from motion video, max 30s output

### Mobile
Same two upload boxes stacked vertically in the options panel. Quality and scene mode accessible in collapsible section. Same fixed prompt bar at bottom as regular video tab.

### Shared video feed
Both tabs write to the same `generated_videos` table and display in the same center feed. MC videos show model name "Kling Motion Control" in the right sidebar.

---

## API

### New: `POST /api/generate-motion-control`

**Request body:**
```typescript
{
  characterImageUrl: string       // uploaded character image public URL
  motionVideoUrl: string          // uploaded motion reference video public URL
  characterOrientation: 'image' | 'video'   // scene control mode
  quality: '720p' | '1080p'
  modelId: string                 // UUID of "Kling Motion Control" in ai_models
  prompt?: string                 // optional
}
```

**Logic:**
1. Auth check + rate limit
2. Resolve model from DB (`getModelById`)
3. Calculate credit cost: `getCreditCost(modelId, quality)` — same per-second structure, fixed 5s duration → 720p=15cr, 1080p=20cr
4. Check `user_subscriptions.credits_remaining >= creditCost`
5. Generate Kling JWT token
6. `POST https://api.klingai.com/v1/videos/motion-control` with:
   ```json
   {
     "model_name": "<aiModel.model_id>",
     "image_url": "<characterImageUrl>",
     "video_url": "<motionVideoUrl>",
     "character_orientation": "<characterOrientation>",
     "prompt": "<prompt>"
   }
   ```
7. Save to `generated_videos`: `{ task_type: 'motion-control', provider: 'kling', ... }`
8. Deduct credits
9. Return `{ taskId, remainingCredits }`

### Modified: `GET /api/check-video`

Add branch: if `videoRecord.task_type === 'motion-control'` → poll `GET https://api.klingai.com/v1/videos/motion-control/{taskId}` instead of the current `/v1/videos/text2video/{taskId}`.

Response parsing is identical: `task_status`, `task_result.videos[0].url`.

### Modified: `POST /api/upload-frame`

Accept video mimetypes (`video/mp4`, `video/webm`) in addition to existing image types. Store in same `user-images` Supabase Storage bucket (or a separate `user-videos` bucket). Return `{ url }` same as now.

---

## Credit Pricing

| Quality | Credits per generation |
|---------|----------------------|
| 720p    | 15 credits           |
| 1080p   | 20 credits           |

Stored in `ai_models.pricing` as `[{ quality: '720p', credits: 3 }, { quality: '1080p', credits: 4 }]` (per-second rate × 5s default duration used in UI calculation).

---

## Database

### Migration: add `task_type` to `generated_videos`
```sql
ALTER TABLE generated_videos
ADD COLUMN task_type VARCHAR DEFAULT 'text2video';
```

### Insert Kling Motion Control model
```sql
INSERT INTO ai_models (name, provider, model_id, category, api_key_env, api_secret_env)
VALUES ('Kling Motion Control', 'kling', 'kling-v3', 'video',
        'KLING_ACCESS_KEY_ID', 'KLING_ACCESS_KEY_SECRET');
-- Then insert pricing rows referencing the new model's id
```

---

## State Management (video/page.tsx)

New state:
```typescript
const [activeTab, setActiveTab] = useState<'create' | 'motion-control'>('create')
const [mcMotionVideoUrl, setMcMotionVideoUrl] = useState<string | null>(null)
const [mcCharacterImageUrl, setMcCharacterImageUrl] = useState<string | null>(null)
const [mcCharacterOrientation, setMcCharacterOrientation] = useState<'image' | 'video'>('image')
const [mcQuality, setMcQuality] = useState<'720p' | '1080p'>('720p')
const [mcPrompt, setMcPrompt] = useState('')
const [isMcGenerating, setIsMcGenerating] = useState(false)
```

MC generation uses separate handler `handleMcGenerate()` that calls `/api/generate-motion-control` and then polls `/api/check-video` (same 5s interval pattern as regular video). On success, prepends video to shared `videos` state.

---

## Out of Scope
- `elements` parameter (facial consistency binding) — not in v1
- `keep_original_sound` toggle — not in v1 (defaults to true)
- Motion library / history sub-tab
- Motion Control on mobile app / different layout (uses same mobile options panel)
