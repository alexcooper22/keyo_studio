# Keyo Video Editor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based video editor at `/editor` — import clips, arrange on timeline, trim, add audio, export MP4 via FFmpeg.wasm.

**Architecture:** HTMLVideoElement-based preview with Canvas for frame rendering; FFmpeg.wasm runs client-side at export. State lives in React Context + useReducer. All editing is non-destructive (original blobs unchanged). No test framework — use `npx tsc --noEmit` for type checking and manual browser testing.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, `@ffmpeg/ffmpeg@0.12`, `@ffmpeg/util@0.12`, React 18, Canvas API, Web Audio API

---

## File Map

```
lib/editor/
  types.ts              ← VideoClip, AudioTrack, EditorState, EditorAction
  EditorContext.tsx     ← useReducer state, useEditor() hook
  timeline-utils.ts    ← clip math (duration, position, active clip lookup)
  ffmpeg.ts             ← lazy FFmpeg.wasm loader + exportToMp4()

app/editor/
  layout.tsx            ← metadata (server component)
  page.tsx              ← 'use client', EditorProvider wrapper

components/editor/
  EditorShell.tsx       ← root layout: left panel + center preview + bottom timeline
  Toolbar.tsx           ← undo/redo, zoom in/out, Export button
  VideoPreview.tsx      ← canvas element + RAF playback engine + play/pause
  ExportModal.tsx       ← FFmpeg progress dialog + download link

  Timeline/
    Timeline.tsx        ← scrollable container + keyboard handler
    TimelineRuler.tsx   ← time ticks (major every 1s, minor every 0.5s)
    Playhead.tsx        ← red vertical line, click-to-scrub on ruler
    VideoTrack.tsx      ← video clips lane
    AudioTrack.tsx      ← audio clips lane
    ClipBlock.tsx       ← clip rect: drag=move, drag-edge=trim, click=select

  Panels/
    MediaPanel.tsx      ← import video files (drag & drop + file picker)
    AudioPanel.tsx      ← import audio files (drag & drop + file picker)
    Waveform.tsx        ← SVG waveform bars (algorithmic, from seed)
```

**Modify:**
- `next.config.js` — add `blob: https://unpkg.com` to CSP for FFmpeg.wasm
- `components/layout/Navbar.tsx` — add "Editor" to `navLinks` and mobile nav

---

## Task 1: Install dependencies + create types

**Files:**
- Modify: `package.json`
- Create: `lib/editor/types.ts`

- [ ] **Step 1: Install FFmpeg.wasm packages**

```bash
cd /Users/mikolagnatuk/Projects/keyo_studio
npm install @ffmpeg/ffmpeg@0.12.10 @ffmpeg/util@0.12.2
```

Expected output: `added 2 packages` (or similar, no errors)

- [ ] **Step 2: Create `lib/editor/types.ts`**

```typescript
export interface VideoClip {
  id: string
  src: string               // blob URL from File
  filename: string
  originalDuration: number  // full source duration in seconds
  trimStart: number         // seconds cut from start of source
  trimEnd: number           // seconds cut from end of source
  startOnTimeline: number   // position on timeline in seconds
  volume: number            // 0–1
}

export interface AudioTrack {
  id: string
  src: string               // blob URL from File
  name: string
  startOnTimeline: number
  duration: number
  volume: number
}

export type EditorAction =
  | { type: 'ADD_CLIP'; clip: VideoClip }
  | { type: 'REMOVE_CLIP'; id: string }
  | { type: 'MOVE_CLIP'; id: string; startOnTimeline: number }
  | { type: 'TRIM_CLIP'; id: string; trimStart: number; trimEnd: number }
  | { type: 'ADD_AUDIO'; track: AudioTrack }
  | { type: 'REMOVE_AUDIO'; id: string }
  | { type: 'MOVE_AUDIO'; id: string; startOnTimeline: number }
  | { type: 'SET_PLAYHEAD'; time: number }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'SELECT'; id: string | null }
  | { type: 'SET_PLAYING'; playing: boolean }
  | { type: 'UNDO' }

export interface HistorySnapshot {
  clips: VideoClip[]
  audioTracks: AudioTrack[]
}

export interface EditorState {
  clips: VideoClip[]
  audioTracks: AudioTrack[]
  playhead: number
  duration: number          // derived: max end time across all clips
  zoom: number              // pixels per second (default 40)
  selectedId: string | null
  playing: boolean
  past: HistorySnapshot[]   // undo history (max 50)
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add lib/editor/types.ts package.json package-lock.json
git commit -m "feat(editor): add types and install ffmpeg deps"
```

---

## Task 2: EditorContext — state + reducer + hook

**Files:**
- Create: `lib/editor/EditorContext.tsx`

- [ ] **Step 1: Create `lib/editor/EditorContext.tsx`**

```typescript
'use client'
import React, { createContext, useContext, useReducer, type Dispatch } from 'react'
import type { EditorState, EditorAction, VideoClip, AudioTrack, HistorySnapshot } from './types'

function calcDuration(clips: VideoClip[], audioTracks: AudioTrack[]): number {
  let max = 5
  for (const c of clips) {
    const end = c.startOnTimeline + (c.originalDuration - c.trimStart - c.trimEnd)
    if (end > max) max = end
  }
  for (const a of audioTracks) {
    const end = a.startOnTimeline + a.duration
    if (end > max) max = end
  }
  return max
}

const initialState: EditorState = {
  clips: [],
  audioTracks: [],
  playhead: 0,
  duration: 30,
  zoom: 40,
  selectedId: null,
  playing: false,
  past: [],
}

function snapshot(state: EditorState): HistorySnapshot {
  return { clips: state.clips, audioTracks: state.audioTracks }
}

function pushPast(past: HistorySnapshot[], snap: HistorySnapshot): HistorySnapshot[] {
  return [...past.slice(-49), snap]
}

function reducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'ADD_CLIP': {
      const clips = [...state.clips, action.clip]
      return { ...state, clips, duration: calcDuration(clips, state.audioTracks), past: pushPast(state.past, snapshot(state)) }
    }
    case 'REMOVE_CLIP': {
      const clips = state.clips.filter(c => c.id !== action.id)
      return {
        ...state, clips,
        selectedId: state.selectedId === action.id ? null : state.selectedId,
        duration: calcDuration(clips, state.audioTracks),
        past: pushPast(state.past, snapshot(state)),
      }
    }
    case 'MOVE_CLIP': {
      const clips = state.clips.map(c =>
        c.id === action.id ? { ...c, startOnTimeline: Math.max(0, action.startOnTimeline) } : c
      )
      return { ...state, clips, duration: calcDuration(clips, state.audioTracks), past: pushPast(state.past, snapshot(state)) }
    }
    case 'TRIM_CLIP': {
      const clips = state.clips.map(c => {
        if (c.id !== action.id) return c
        const minDur = 0.2
        const maxTrimStart = c.originalDuration - c.trimEnd - minDur
        const maxTrimEnd = c.originalDuration - action.trimStart - minDur
        return {
          ...c,
          trimStart: Math.max(0, Math.min(action.trimStart, maxTrimStart)),
          trimEnd: Math.max(0, Math.min(action.trimEnd, maxTrimEnd)),
        }
      })
      return { ...state, clips, duration: calcDuration(clips, state.audioTracks), past: pushPast(state.past, snapshot(state)) }
    }
    case 'ADD_AUDIO': {
      const audioTracks = [...state.audioTracks, action.track]
      return { ...state, audioTracks, duration: calcDuration(state.clips, audioTracks), past: pushPast(state.past, snapshot(state)) }
    }
    case 'REMOVE_AUDIO': {
      const audioTracks = state.audioTracks.filter(a => a.id !== action.id)
      return {
        ...state, audioTracks,
        selectedId: state.selectedId === action.id ? null : state.selectedId,
        duration: calcDuration(state.clips, audioTracks),
        past: pushPast(state.past, snapshot(state)),
      }
    }
    case 'MOVE_AUDIO': {
      const audioTracks = state.audioTracks.map(a =>
        a.id === action.id ? { ...a, startOnTimeline: Math.max(0, action.startOnTimeline) } : a
      )
      return { ...state, audioTracks, duration: calcDuration(state.clips, audioTracks), past: pushPast(state.past, snapshot(state)) }
    }
    case 'SET_PLAYHEAD':
      return { ...state, playhead: Math.max(0, Math.min(action.time, state.duration)) }
    case 'SET_ZOOM':
      return { ...state, zoom: Math.max(10, Math.min(200, action.zoom)) }
    case 'SELECT':
      return { ...state, selectedId: action.id }
    case 'SET_PLAYING':
      return { ...state, playing: action.playing }
    case 'UNDO': {
      if (state.past.length === 0) return state
      const prev = state.past[state.past.length - 1]
      return {
        ...state,
        clips: prev.clips,
        audioTracks: prev.audioTracks,
        past: state.past.slice(0, -1),
        duration: calcDuration(prev.clips, prev.audioTracks),
      }
    }
    default:
      return state
  }
}

const EditorContext = createContext<{ state: EditorState; dispatch: Dispatch<EditorAction> } | null>(null)

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return <EditorContext.Provider value={{ state, dispatch }}>{children}</EditorContext.Provider>
}

export function useEditor() {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useEditor must be used inside EditorProvider')
  return ctx
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add lib/editor/EditorContext.tsx
git commit -m "feat(editor): add EditorContext with useReducer state"
```

---

## Task 3: timeline-utils.ts

**Files:**
- Create: `lib/editor/timeline-utils.ts`

- [ ] **Step 1: Create `lib/editor/timeline-utils.ts`**

```typescript
import type { VideoClip } from './types'

export function clipEffectiveDuration(clip: VideoClip): number {
  return Math.max(0, clip.originalDuration - clip.trimStart - clip.trimEnd)
}

export function clipEndTime(clip: VideoClip): number {
  return clip.startOnTimeline + clipEffectiveDuration(clip)
}

export function findActiveClip(clips: VideoClip[], playhead: number): VideoClip | null {
  return clips.find(c => {
    const end = clipEndTime(c)
    return c.startOnTimeline <= playhead && playhead < end
  }) ?? null
}

export function secondsToPixels(seconds: number, zoom: number): number {
  return seconds * zoom
}

export function pixelsToSeconds(pixels: number, zoom: number): number {
  return pixels / zoom
}

export function formatTimecode(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60).toString().padStart(2, '0')
  const f = Math.floor((seconds - Math.floor(seconds)) * 10)
  return `${m.toString().padStart(2, '0')}:${s}.${f}`
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/editor/timeline-utils.ts
git commit -m "feat(editor): add timeline utility functions"
```

---

## Task 4: Update next.config.js for FFmpeg.wasm CSP

**Files:**
- Modify: `next.config.js`

FFmpeg.wasm loads its core from a CDN URL (unpkg.com) via `toBlobURL` — this needs `connect-src` to allow unpkg.com, and `script-src`/`worker-src` to allow `blob:` URLs (the fetched files are re-hosted as blob URLs before execution).

- [ ] **Step 1: Update CSP in `next.config.js`**

In `next.config.js`, find the `csp` array and update these lines:

Old `script-src` line:
```javascript
"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.com https://*.clerk.accounts.dev https://*.clerk.com https://js.stripe.com",
```

New `script-src` line (add `blob:`):
```javascript
"script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://clerk.com https://*.clerk.accounts.dev https://*.clerk.com https://js.stripe.com",
```

Old `connect-src` line:
```javascript
"connect-src 'self' https://*.supabase.co wss://*.supabase.co https://clerk.com https://*.clerk.accounts.dev https://*.clerk.com https://api.klingai.com https://generativelanguage.googleapis.com",
```

New `connect-src` line (add unpkg.com and cdn.jsdelivr.net as fallback):
```javascript
"connect-src 'self' https://*.supabase.co wss://*.supabase.co https://clerk.com https://*.clerk.accounts.dev https://*.clerk.com https://api.klingai.com https://generativelanguage.googleapis.com https://unpkg.com https://cdn.jsdelivr.net",
```

After the existing `securityHeaders` array, add a new entry to the `return` array in `headers()`:

```javascript
{
  source: '/editor',
  headers: [
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
  ],
},
```

Also add `"worker-src 'self' blob:"` to the csp array (new line after `object-src`):
```javascript
"worker-src 'self' blob:",
```

- [ ] **Step 2: Restart dev server to verify no startup errors**

```bash
npm run dev
```

Expected: server starts on port 3000 with no config errors

- [ ] **Step 3: Commit**

```bash
git add next.config.js
git commit -m "feat(editor): update CSP to allow FFmpeg.wasm from unpkg"
```

---

## Task 5: Editor route — layout + page

**Files:**
- Create: `app/editor/layout.tsx`
- Create: `app/editor/page.tsx`

- [ ] **Step 1: Create `app/editor/layout.tsx`**

```typescript
import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Video Editor',
  description: 'Browser-based video editor — trim, arrange, and export MP4.',
  robots: { index: false, follow: false },
}

export default function EditorLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
```

- [ ] **Step 2: Create `app/editor/page.tsx`**

```typescript
'use client'
import { EditorProvider } from '../../lib/editor/EditorContext'
import EditorShell from '../../components/editor/EditorShell'

export default function EditorPage() {
  return (
    <EditorProvider>
      <EditorShell />
    </EditorProvider>
  )
}
```

- [ ] **Step 3: Create a placeholder `components/editor/EditorShell.tsx`** (will be replaced in Task 6)

```typescript
'use client'
export default function EditorShell() {
  return (
    <div style={{ background: '#141414', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontFamily: 'system-ui' }}>
      Editor coming soon
    </div>
  )
}
```

- [ ] **Step 4: Verify page loads at http://localhost:3000/editor**

Open browser, confirm page renders "Editor coming soon" on dark background.

- [ ] **Step 5: Commit**

```bash
git add app/editor/layout.tsx app/editor/page.tsx components/editor/EditorShell.tsx
git commit -m "feat(editor): add /editor route with placeholder shell"
```

---

## Task 6: EditorShell — main layout

**Files:**
- Modify: `components/editor/EditorShell.tsx`

The shell is a full-viewport 3-region layout:
- **Top** (48px): `Toolbar`
- **Middle** (flex, fills remaining): left panel (280px) + center `VideoPreview` (flex-1)
- **Bottom** (180px): `Timeline`

All components are placeholders until their respective tasks complete.

- [ ] **Step 1: Create placeholder sub-components**

Create `components/editor/Toolbar.tsx`:
```typescript
'use client'
export default function Toolbar() {
  return (
    <div style={{ height: 48, background: '#1a1a1a', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8 }}>
      <span style={{ color: '#666', fontSize: 12, fontFamily: 'system-ui' }}>Toolbar</span>
    </div>
  )
}
```

Create `components/editor/VideoPreview.tsx`:
```typescript
'use client'
export default function VideoPreview() {
  return (
    <div style={{ flex: 1, background: '#0e0e0e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#444', fontSize: 12, fontFamily: 'system-ui' }}>Preview</span>
    </div>
  )
}
```

Create `components/editor/Timeline/Timeline.tsx`:
```typescript
'use client'
export default function Timeline() {
  return (
    <div style={{ height: 180, background: '#161616', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#444', fontSize: 12, fontFamily: 'system-ui' }}>Timeline</span>
    </div>
  )
}
```

Create `components/editor/Panels/MediaPanel.tsx`:
```typescript
'use client'
export default function MediaPanel() {
  return (
    <div style={{ padding: 16 }}>
      <span style={{ color: '#666', fontSize: 12, fontFamily: 'system-ui' }}>Media</span>
    </div>
  )
}
```

- [ ] **Step 2: Replace `components/editor/EditorShell.tsx` with full layout**

```typescript
'use client'
import Toolbar from './Toolbar'
import VideoPreview from './VideoPreview'
import Timeline from './Timeline/Timeline'
import MediaPanel from './Panels/MediaPanel'

const PANEL_TABS = ['Media', 'Audio', 'Text', 'Filters'] as const
type PanelTab = typeof PANEL_TABS[number]

import { useState } from 'react'

export default function EditorShell() {
  const [activeTab, setActiveTab] = useState<PanelTab>('Media')

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      background: '#141414',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Top toolbar */}
      <Toolbar />

      {/* Middle: panel + preview */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left panel */}
        <div style={{ width: 280, display: 'flex', flexDirection: 'column', background: '#181818', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Panel tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            {PANEL_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1, height: 36, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500,
                  background: activeTab === tab ? 'rgba(200,237,77,0.08)' : 'transparent',
                  color: activeTab === tab ? '#c8ed4d' : 'rgba(255,255,255,0.35)',
                  borderBottom: activeTab === tab ? '1.5px solid #c8ed4d' : '1.5px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div style={{ flex: 1, overflow: 'hidden auto' }}>
            {activeTab === 'Media' && <MediaPanel />}
            {activeTab === 'Audio' && (
              <div style={{ padding: 16, color: '#666', fontSize: 12 }}>Audio panel — Task 13</div>
            )}
            {activeTab === 'Text' && (
              <div style={{ padding: 16, color: '#666', fontSize: 12 }}>Text overlays — coming soon</div>
            )}
            {activeTab === 'Filters' && (
              <div style={{ padding: 16, color: '#666', fontSize: 12 }}>Filters — coming soon</div>
            )}
          </div>
        </div>

        {/* Center: preview */}
        <VideoPreview />
      </div>

      {/* Bottom timeline */}
      <Timeline />
    </div>
  )
}
```

- [ ] **Step 3: Verify at http://localhost:3000/editor**

Should see: dark 3-panel layout with tabs (Media/Audio/Text/Filters), empty preview center, empty timeline bar at bottom.

- [ ] **Step 4: Commit**

```bash
git add components/editor/EditorShell.tsx components/editor/Toolbar.tsx components/editor/VideoPreview.tsx components/editor/Timeline/Timeline.tsx components/editor/Panels/MediaPanel.tsx
git commit -m "feat(editor): implement EditorShell 3-panel layout"
```

---

## Task 7: Toolbar — undo/redo, zoom, export

**Files:**
- Modify: `components/editor/Toolbar.tsx`

- [ ] **Step 1: Replace `components/editor/Toolbar.tsx`**

```typescript
'use client'
import { useEditor } from '../../lib/editor/EditorContext'
import { useCallback } from 'react'

interface ToolbarProps {
  onExport: () => void
}

// Exported separately so EditorShell can pass the handler
export default function Toolbar({ onExport }: ToolbarProps) {
  const { state, dispatch } = useEditor()

  const zoomIn = useCallback(() => dispatch({ type: 'SET_ZOOM', zoom: +(state.zoom * 1.25).toFixed(1) }), [state.zoom, dispatch])
  const zoomOut = useCallback(() => dispatch({ type: 'SET_ZOOM', zoom: +(state.zoom * 0.8).toFixed(1) }), [state.zoom, dispatch])
  const undo = useCallback(() => dispatch({ type: 'UNDO' }), [dispatch])

  const btn = (label: string, onClick: () => void, disabled = false) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 28, padding: '0 10px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6,
        background: 'rgba(255,255,255,0.04)', color: disabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)',
        fontSize: 12, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{
      height: 48, background: '#1a1a1a', borderBottom: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8,
    }}>
      {/* Logo/title */}
      <span style={{ fontSize: 13, fontWeight: 700, color: '#c8ed4d', marginRight: 8, letterSpacing: '-0.3px' }}>
        keyo editor
      </span>

      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />

      {/* Undo */}
      {btn('↩ Undo', undo, state.past.length === 0)}

      <div style={{ flex: 1 }} />

      {/* Zoom */}
      {btn('−', zoomOut)}
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', minWidth: 36, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
        {Math.round(state.zoom / 40 * 100)}%
      </span>
      {btn('+', zoomIn)}

      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />

      {/* Export */}
      <button
        onClick={onExport}
        disabled={state.clips.length === 0}
        style={{
          height: 28, padding: '0 14px', borderRadius: 6, border: 'none', cursor: state.clips.length === 0 ? 'not-allowed' : 'pointer',
          background: state.clips.length === 0 ? 'rgba(200,237,77,0.2)' : '#c8ed4d',
          color: state.clips.length === 0 ? 'rgba(200,237,77,0.4)' : '#0e1004',
          fontSize: 12, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s',
        }}
      >
        Export MP4
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Update `components/editor/EditorShell.tsx` to wire up Toolbar + export state**

Add `useState` for showExport, add `onExport` prop to Toolbar, add a placeholder ExportModal:

```typescript
'use client'
import { useState } from 'react'
import Toolbar from './Toolbar'
import VideoPreview from './VideoPreview'
import Timeline from './Timeline/Timeline'
import MediaPanel from './Panels/MediaPanel'

const PANEL_TABS = ['Media', 'Audio', 'Text', 'Filters'] as const
type PanelTab = typeof PANEL_TABS[number]

export default function EditorShell() {
  const [activeTab, setActiveTab] = useState<PanelTab>('Media')
  const [showExport, setShowExport] = useState(false)

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      background: '#141414',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <Toolbar onExport={() => setShowExport(true)} />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ width: 280, display: 'flex', flexDirection: 'column', background: '#181818', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            {PANEL_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1, height: 36, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500,
                  background: activeTab === tab ? 'rgba(200,237,77,0.08)' : 'transparent',
                  color: activeTab === tab ? '#c8ed4d' : 'rgba(255,255,255,0.35)',
                  borderBottom: activeTab === tab ? '1.5px solid #c8ed4d' : '1.5px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {tab}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflow: 'hidden auto' }}>
            {activeTab === 'Media' && <MediaPanel />}
            {activeTab === 'Audio' && <div style={{ padding: 16, color: '#666', fontSize: 12 }}>Audio panel — Task 13</div>}
            {activeTab === 'Text' && <div style={{ padding: 16, color: '#666', fontSize: 12 }}>Text overlays — coming soon</div>}
            {activeTab === 'Filters' && <div style={{ padding: 16, color: '#666', fontSize: 12 }}>Filters — coming soon</div>}
          </div>
        </div>
        <VideoPreview />
      </div>

      <Timeline />

      {showExport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#1e1e1e', borderRadius: 12, padding: 24, border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
            <p style={{ marginBottom: 12 }}>Export modal — Task 14</p>
            <button onClick={() => setShowExport(false)} style={{ padding: '6px 14px', background: '#c8ed4d', color: '#0e1004', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify Export MP4 button appears, is disabled when no clips, Undo button disabled initially**

- [ ] **Step 4: Commit**

```bash
git add components/editor/Toolbar.tsx components/editor/EditorShell.tsx
git commit -m "feat(editor): implement Toolbar with undo/zoom/export"
```

---

## Task 8: Timeline container + ruler + playhead

**Files:**
- Modify: `components/editor/Timeline/Timeline.tsx`
- Create: `components/editor/Timeline/TimelineRuler.tsx`
- Create: `components/editor/Timeline/Playhead.tsx`

- [ ] **Step 1: Create `components/editor/Timeline/TimelineRuler.tsx`**

```typescript
'use client'
import { useEditor } from '../../../lib/editor/EditorContext'
import { secondsToPixels, pixelsToSeconds, formatTimecode } from '../../../lib/editor/timeline-utils'
import { useCallback } from 'react'

const RULER_HEIGHT = 24

export default function TimelineRuler({ totalWidth }: { totalWidth: number }) {
  const { state, dispatch } = useEditor()
  const { zoom, duration } = state

  const ticks: { s: number; major: boolean }[] = []
  const step = zoom >= 80 ? 0.5 : zoom >= 40 ? 1 : 2
  for (let s = 0; s <= duration + step; s += step) {
    ticks.push({ s: parseFloat(s.toFixed(1)), major: s % 2 === 0 })
  }

  const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    dispatch({ type: 'SET_PLAYHEAD', time: pixelsToSeconds(x, zoom) })
  }, [zoom, dispatch])

  return (
    <svg
      width={totalWidth}
      height={RULER_HEIGHT}
      style={{ display: 'block', flexShrink: 0, cursor: 'pointer' }}
      onClick={handleClick}
    >
      <rect width={totalWidth} height={RULER_HEIGHT} fill="#1e1e1e" />
      {ticks.map(({ s, major }) => {
        const x = secondsToPixels(s, zoom)
        return (
          <g key={s}>
            <line x1={x} y1={major ? 10 : 16} x2={x} y2={RULER_HEIGHT} stroke="rgba(255,255,255,0.15)" strokeWidth={major ? 1 : 0.5} />
            {major && (
              <text x={x + 3} y={10} fill="rgba(255,255,255,0.35)" fontSize={9} fontFamily="ui-monospace, monospace">
                {formatTimecode(s)}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
```

- [ ] **Step 2: Create `components/editor/Timeline/Playhead.tsx`**

```typescript
'use client'
import { useEditor } from '../../../lib/editor/EditorContext'
import { secondsToPixels } from '../../../lib/editor/timeline-utils'

export default function Playhead({ height }: { height: number }) {
  const { state } = useEditor()
  const x = secondsToPixels(state.playhead, state.zoom)

  return (
    <div
      style={{
        position: 'absolute', top: 0, left: x, width: 1,
        height, background: '#c8ed4d',
        pointerEvents: 'none', zIndex: 10,
        boxShadow: '0 0 6px rgba(200,237,77,0.5)',
      }}
    >
      {/* Diamond head */}
      <div style={{
        position: 'absolute', top: -1, left: -5,
        width: 10, height: 10,
        background: '#c8ed4d',
        clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
      }} />
    </div>
  )
}
```

- [ ] **Step 3: Replace `components/editor/Timeline/Timeline.tsx` with full implementation**

```typescript
'use client'
import { useRef, useEffect } from 'react'
import { useEditor } from '../../../lib/editor/EditorContext'
import { secondsToPixels } from '../../../lib/editor/timeline-utils'
import TimelineRuler from './TimelineRuler'
import Playhead from './Playhead'

const TRACK_HEIGHT = 40
const RULER_HEIGHT = 24
const LABEL_WIDTH = 40
const TIMELINE_HEIGHT = 180

export default function Timeline() {
  const { state, dispatch } = useEditor()
  const scrollRef = useRef<HTMLDivElement>(null)
  const totalWidth = Math.max(secondsToPixels(state.duration + 4, state.zoom), 800)
  const tracksHeight = TIMELINE_HEIGHT - RULER_HEIGHT

  // Auto-scroll to keep playhead in view
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const playX = secondsToPixels(state.playhead, state.zoom)
    const { scrollLeft, clientWidth } = el
    if (playX < scrollLeft + 20 || playX > scrollLeft + clientWidth - 60) {
      el.scrollTo({ left: Math.max(0, playX - clientWidth * 0.3), behavior: 'smooth' })
    }
  }, [state.playhead, state.zoom])

  // Keyboard: Delete selected, Ctrl+Z undo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedId) {
          const isClip = state.clips.some(c => c.id === state.selectedId)
          if (isClip) dispatch({ type: 'REMOVE_CLIP', id: state.selectedId })
          else dispatch({ type: 'REMOVE_AUDIO', id: state.selectedId })
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        dispatch({ type: 'UNDO' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state.selectedId, state.clips, dispatch])

  return (
    <div style={{ height: TIMELINE_HEIGHT, background: '#161616', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' }}>

      {/* Scroll area */}
      <div ref={scrollRef} style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', position: 'relative' }}
        className="no-scrollbar">

        {/* Fixed ruler + scrollable tracks in same scroll container */}
        <div style={{ width: totalWidth, position: 'relative' }}>

          {/* Ruler */}
          <TimelineRuler totalWidth={totalWidth} />

          {/* Tracks area */}
          <div style={{ position: 'relative', height: tracksHeight }}>
            <Playhead height={tracksHeight + RULER_HEIGHT} />

            {/* Text track label */}
            <div style={{ position: 'absolute', left: 0, top: 0, width: LABEL_WIDTH, height: TRACK_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>TEXT</span>
            </div>

            {/* Video track label */}
            <div style={{ position: 'absolute', left: 0, top: TRACK_HEIGHT, width: LABEL_WIDTH, height: TRACK_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>VIDEO</span>
            </div>

            {/* Audio track label */}
            <div style={{ position: 'absolute', left: 0, top: TRACK_HEIGHT * 2, width: LABEL_WIDTH, height: TRACK_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>AUDIO</span>
            </div>

            {/* Track dividers */}
            {[0, TRACK_HEIGHT, TRACK_HEIGHT * 2].map(top => (
              <div key={top} style={{ position: 'absolute', left: 0, right: 0, top, height: 1, background: 'rgba(255,255,255,0.04)' }} />
            ))}

            {/* Placeholder for VideoTrack (Task 10) */}
            <div style={{ position: 'absolute', left: LABEL_WIDTH, right: 0, top: TRACK_HEIGHT, height: TRACK_HEIGHT, background: 'rgba(255,255,255,0.01)' }} id="video-track-slot" />

            {/* Placeholder for AudioTrack (Task 10) */}
            <div style={{ position: 'absolute', left: LABEL_WIDTH, right: 0, top: TRACK_HEIGHT * 2, height: TRACK_HEIGHT, background: 'rgba(255,255,255,0.01)' }} id="audio-track-slot" />
          </div>
        </div>
      </div>

      {/* Bottom status bar */}
      <div style={{ height: 24, borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', padding: '0 12px', gap: 12 }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontVariantNumeric: 'tabular-nums', fontFamily: 'ui-monospace, monospace' }}>
          {state.clips.length} clip{state.clips.length !== 1 ? 's' : ''}
        </span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)' }}>
          zoom {Math.round(state.zoom / 40 * 100)}%
        </span>
      </div>
    </div>
  )
}
```

Add `no-scrollbar` CSS to `app/globals.css` if not already present:
```css
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
```

- [ ] **Step 4: Verify ruler renders with time ticks, playhead diamond is visible at 0**

- [ ] **Step 5: Commit**

```bash
git add components/editor/Timeline/ app/globals.css
git commit -m "feat(editor): implement Timeline with ruler and playhead"
```

---

## Task 9: ClipBlock — drag, trim, select

**Files:**
- Create: `components/editor/Timeline/ClipBlock.tsx`

- [ ] **Step 1: Create `components/editor/Timeline/ClipBlock.tsx`**

```typescript
'use client'
import { useRef } from 'react'
import { useEditor } from '../../../lib/editor/EditorContext'
import type { VideoClip } from '../../../lib/editor/types'
import { clipEffectiveDuration, secondsToPixels, pixelsToSeconds } from '../../../lib/editor/timeline-utils'

interface ClipBlockProps {
  clip: VideoClip
  offsetTop: number     // px from top of track area
  trackHeight: number
}

const HANDLE_WIDTH = 8

export default function ClipBlock({ clip, offsetTop, trackHeight }: ClipBlockProps) {
  const { state, dispatch } = useEditor()
  const { zoom } = state
  const selected = state.selectedId === clip.id

  const effectiveDuration = clipEffectiveDuration(clip)
  const left = secondsToPixels(clip.startOnTimeline, zoom)
  const width = Math.max(secondsToPixels(effectiveDuration, zoom), HANDLE_WIDTH * 2 + 4)

  // Drag state stored in a ref (not state) to avoid re-renders during drag
  const dragRef = useRef<{
    type: 'move' | 'trimLeft' | 'trimRight'
    startX: number
    startValue: number
  } | null>(null)

  const startDrag = (e: React.MouseEvent, type: 'move' | 'trimLeft' | 'trimRight') => {
    e.preventDefault()
    e.stopPropagation()
    dispatch({ type: 'SELECT', id: clip.id })

    const startValue = type === 'move'
      ? clip.startOnTimeline
      : type === 'trimLeft'
        ? clip.trimStart
        : clip.trimEnd

    dragRef.current = { type, startX: e.clientX, startValue }

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const dx = ev.clientX - dragRef.current.startX
      const ds = pixelsToSeconds(dx, zoom)

      if (dragRef.current.type === 'move') {
        dispatch({ type: 'MOVE_CLIP', id: clip.id, startOnTimeline: dragRef.current.startValue + ds })
      } else if (dragRef.current.type === 'trimLeft') {
        dispatch({ type: 'TRIM_CLIP', id: clip.id, trimStart: dragRef.current.startValue + ds, trimEnd: clip.trimEnd })
      } else {
        dispatch({ type: 'TRIM_CLIP', id: clip.id, trimStart: clip.trimStart, trimEnd: dragRef.current.startValue - ds })
      }
    }

    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top: offsetTop + 3,
        width,
        height: trackHeight - 6,
        background: selected
          ? 'linear-gradient(180deg, rgba(200,237,77,0.25), rgba(200,237,77,0.15))'
          : 'linear-gradient(180deg, rgba(120,80,255,0.5), rgba(83,47,207,0.35))',
        border: selected ? '1.5px solid #c8ed4d' : '1.5px solid rgba(120,80,255,0.6)',
        borderRadius: 5,
        cursor: 'grab',
        userSelect: 'none',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
      onMouseDown={e => startDrag(e, 'move')}
    >
      {/* Left trim handle */}
      <div
        style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: HANDLE_WIDTH,
          cursor: 'ew-resize',
          background: selected ? 'rgba(200,237,77,0.4)' : 'rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        onMouseDown={e => startDrag(e, 'trimLeft')}
      >
        <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.5)', borderRadius: 1 }} />
        <div style={{ width: 1, height: 8, background: 'rgba(255,255,255,0.3)', borderRadius: 1, marginLeft: 2 }} />
      </div>

      {/* Filename label */}
      <div style={{
        position: 'absolute', left: HANDLE_WIDTH + 4, right: HANDLE_WIDTH + 4,
        top: '50%', transform: 'translateY(-50%)',
        fontSize: 10, color: 'rgba(255,255,255,0.7)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        pointerEvents: 'none',
      }}>
        {clip.filename}
      </div>

      {/* Right trim handle */}
      <div
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: HANDLE_WIDTH,
          cursor: 'ew-resize',
          background: selected ? 'rgba(200,237,77,0.4)' : 'rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        onMouseDown={e => startDrag(e, 'trimRight')}
      >
        <div style={{ width: 1, height: 8, background: 'rgba(255,255,255,0.3)', borderRadius: 1, marginRight: 2 }} />
        <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.5)', borderRadius: 1 }} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/editor/Timeline/ClipBlock.tsx
git commit -m "feat(editor): implement ClipBlock with drag-move and trim handles"
```

---

## Task 10: VideoTrack + AudioTrack lanes

**Files:**
- Create: `components/editor/Timeline/VideoTrack.tsx`
- Create: `components/editor/Timeline/AudioTrack.tsx`
- Modify: `components/editor/Timeline/Timeline.tsx`

- [ ] **Step 1: Create `components/editor/Timeline/VideoTrack.tsx`**

```typescript
'use client'
import { useEditor } from '../../../lib/editor/EditorContext'
import ClipBlock from './ClipBlock'

const TRACK_HEIGHT = 40

export default function VideoTrack() {
  const { state } = useEditor()
  return (
    <div style={{ position: 'relative', width: '100%', height: TRACK_HEIGHT }}>
      {state.clips.map(clip => (
        <ClipBlock key={clip.id} clip={clip} offsetTop={0} trackHeight={TRACK_HEIGHT} />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create `components/editor/Timeline/AudioClipBlock.tsx`**

```typescript
'use client'
import { useRef } from 'react'
import { useEditor } from '../../../lib/editor/EditorContext'
import type { AudioTrack as AudioTrackType } from '../../../lib/editor/types'
import { secondsToPixels, pixelsToSeconds } from '../../../lib/editor/timeline-utils'

interface AudioClipBlockProps {
  track: AudioTrackType
  trackHeight: number
}

export default function AudioClipBlock({ track, trackHeight }: AudioClipBlockProps) {
  const { state, dispatch } = useEditor()
  const { zoom } = state
  const selected = state.selectedId === track.id

  const left = secondsToPixels(track.startOnTimeline, zoom)
  const width = Math.max(secondsToPixels(track.duration, zoom), 20)

  const dragRef = useRef<{ startX: number; startValue: number } | null>(null)

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dispatch({ type: 'SELECT', id: track.id })
    dragRef.current = { startX: e.clientX, startValue: track.startOnTimeline }

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const ds = pixelsToSeconds(ev.clientX - dragRef.current.startX, zoom)
      dispatch({ type: 'MOVE_AUDIO', id: track.id, startOnTimeline: dragRef.current.startValue + ds })
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top: 3,
        width,
        height: trackHeight - 6,
        background: selected
          ? 'linear-gradient(180deg, rgba(236,72,153,0.35), rgba(236,72,153,0.2))'
          : 'linear-gradient(180deg, rgba(236,72,153,0.3), rgba(236,72,153,0.15))',
        border: selected ? '1.5px solid #ec4899' : '1.5px solid rgba(236,72,153,0.5)',
        borderRadius: 5,
        cursor: 'grab',
        userSelect: 'none',
        overflow: 'hidden',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 6,
      }}
      onMouseDown={startDrag}
    >
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        ♪ {track.name}
      </span>
    </div>
  )
}
```

- [ ] **Step 3: Create `components/editor/Timeline/AudioTrack.tsx`**

```typescript
'use client'
import { useEditor } from '../../../lib/editor/EditorContext'
import AudioClipBlock from './AudioClipBlock'

const TRACK_HEIGHT = 40

export default function AudioTrack() {
  const { state } = useEditor()
  return (
    <div style={{ position: 'relative', width: '100%', height: TRACK_HEIGHT }}>
      {state.audioTracks.map(track => (
        <AudioClipBlock key={track.id} track={track} trackHeight={TRACK_HEIGHT} />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Update `Timeline.tsx` to render actual tracks inside the placeholder slots**

Replace the two `id="video-track-slot"` and `id="audio-track-slot"` divs with the actual components:

```typescript
import VideoTrack from './VideoTrack'
import AudioTrack from './AudioTrack'
```

Replace:
```typescript
{/* Placeholder for VideoTrack (Task 10) */}
<div style={{ position: 'absolute', left: LABEL_WIDTH, right: 0, top: TRACK_HEIGHT, height: TRACK_HEIGHT, background: 'rgba(255,255,255,0.01)' }} id="video-track-slot" />

{/* Placeholder for AudioTrack (Task 10) */}
<div style={{ position: 'absolute', left: LABEL_WIDTH, right: 0, top: TRACK_HEIGHT * 2, height: TRACK_HEIGHT, background: 'rgba(255,255,255,0.01)' }} id="audio-track-slot" />
```

With:
```typescript
{/* Video track */}
<div style={{ position: 'absolute', left: LABEL_WIDTH, right: 0, top: TRACK_HEIGHT, height: TRACK_HEIGHT }}>
  <VideoTrack />
</div>

{/* Audio track */}
<div style={{ position: 'absolute', left: LABEL_WIDTH, right: 0, top: TRACK_HEIGHT * 2, height: TRACK_HEIGHT }}>
  <AudioTrack />
</div>
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add components/editor/Timeline/VideoTrack.tsx components/editor/Timeline/AudioTrack.tsx components/editor/Timeline/AudioClipBlock.tsx components/editor/Timeline/Timeline.tsx
git commit -m "feat(editor): implement VideoTrack and AudioTrack lanes with clip blocks"
```

---

## Task 11: MediaPanel — video import via drag & drop

**Files:**
- Modify: `components/editor/Panels/MediaPanel.tsx`

Each imported file becomes a `VideoClip` with:
- `src`: `URL.createObjectURL(file)` — blob URL for preview + FFmpeg
- `originalDuration`: read via a hidden `<video>` element's `loadedmetadata` event
- `startOnTimeline`: placed after the last existing clip (no overlap)

- [ ] **Step 1: Replace `components/editor/Panels/MediaPanel.tsx`**

```typescript
'use client'
import { useCallback, useRef, useState } from 'react'
import { useEditor } from '../../../lib/editor/EditorContext'
import type { VideoClip } from '../../../lib/editor/types'
import { clipEndTime } from '../../../lib/editor/timeline-utils'

function readVideoDuration(src: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => resolve(video.duration)
    video.onerror = reject
    video.src = src
  })
}

function nextStartTime(clips: VideoClip[]): number {
  if (clips.length === 0) return 0
  return Math.max(...clips.map(clipEndTime))
}

export default function MediaPanel() {
  const { state, dispatch } = useEditor()
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback(async (files: FileList | File[]) => {
    setLoading(true)
    const fileArr = Array.from(files).filter(f => f.type.startsWith('video/'))
    if (fileArr.length === 0) { setLoading(false); return }

    let latestEnd = nextStartTime(state.clips)

    for (const file of fileArr) {
      const src = URL.createObjectURL(file)
      let duration = 0
      try {
        duration = await readVideoDuration(src)
      } catch {
        duration = 10 // fallback
      }

      const clip: VideoClip = {
        id: crypto.randomUUID(),
        src,
        filename: file.name.replace(/\.[^.]+$/, ''),
        originalDuration: duration,
        trimStart: 0,
        trimEnd: 0,
        startOnTimeline: latestEnd,
        volume: 1,
      }
      dispatch({ type: 'ADD_CLIP', clip })
      latestEnd += duration
    }
    setLoading(false)
  }, [state.clips, dispatch])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }, [addFiles])

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `1.5px dashed ${dragging ? '#c8ed4d' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: 8,
          padding: '20px 12px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? 'rgba(200,237,77,0.05)' : 'rgba(255,255,255,0.02)',
          transition: 'all 0.15s',
        }}
      >
        <div style={{ fontSize: 22, marginBottom: 6 }}>🎬</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
          {loading ? 'Loading...' : <>Drop video files here<br /><span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>or click to browse</span></>}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        multiple
        style={{ display: 'none' }}
        onChange={e => e.target.files && addFiles(e.target.files)}
      />

      {/* Clip list */}
      {state.clips.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
            Project clips
          </div>
          {state.clips.map(clip => (
            <div
              key={clip.id}
              onClick={() => dispatch({ type: 'SELECT', id: clip.id })}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                background: state.selectedId === clip.id ? 'rgba(200,237,77,0.08)' : 'rgba(255,255,255,0.03)',
                border: state.selectedId === clip.id ? '1px solid rgba(200,237,77,0.2)' : '1px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              {/* Thumbnail placeholder */}
              <div style={{ width: 32, height: 24, background: 'rgba(120,80,255,0.3)', borderRadius: 3, flexShrink: 0 }} />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {clip.filename}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontVariantNumeric: 'tabular-nums' }}>
                  {(clip.originalDuration - clip.trimStart - clip.trimEnd).toFixed(1)}s
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); dispatch({ type: 'REMOVE_CLIP', id: clip.id }) }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: 2, fontSize: 14, lineHeight: 1 }}
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Manual test**

Open `/editor`. Drag a `.mp4` file onto the Media panel drop zone. Verify:
- Clip appears in the clip list with filename and duration
- Clip block appears on the video track in the timeline
- Timeline ruler shows the total duration

- [ ] **Step 3: Commit**

```bash
git add components/editor/Panels/MediaPanel.tsx
git commit -m "feat(editor): implement MediaPanel with drag-and-drop video import"
```

---

## Task 12: VideoPreview — canvas playback engine

**Files:**
- Modify: `components/editor/VideoPreview.tsx`

One hidden `<video>` element per clip (rendered off-screen). A `<canvas>` shows the current frame. RAF loop advances playhead when playing.

- [ ] **Step 1: Replace `components/editor/VideoPreview.tsx`**

```typescript
'use client'
import { useRef, useEffect, useCallback } from 'react'
import { useEditor } from '../../lib/editor/EditorContext'
import { findActiveClip, clipEffectiveDuration, formatTimecode } from '../../lib/editor/timeline-utils'

const CANVAS_W = 405  // 9:16 at 405px wide
const CANVAS_H = 720

export default function VideoPreview() {
  const { state, dispatch } = useEditor()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())
  const playheadRef = useRef(state.playhead)
  const durationRef = useRef(state.duration)
  const rafRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number | null>(null)

  // Keep refs in sync
  playheadRef.current = state.playhead
  durationRef.current = state.duration

  // Sync hidden video elements with current clips
  useEffect(() => {
    const existing = new Set(videoRefs.current.keys())
    for (const clip of state.clips) {
      if (!videoRefs.current.has(clip.id)) {
        const vid = document.createElement('video')
        vid.src = clip.src
        vid.preload = 'auto'
        vid.muted = true
        vid.style.display = 'none'
        document.body.appendChild(vid)
        videoRefs.current.set(clip.id, vid)
      }
      existing.delete(clip.id)
    }
    // Remove videos for deleted clips
    for (const id of existing) {
      const vid = videoRefs.current.get(id)
      if (vid) { vid.remove(); URL.revokeObjectURL(vid.src) }
      videoRefs.current.delete(id)
    }
  }, [state.clips])

  // Draw current frame to canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#141414'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    const activeClip = findActiveClip(state.clips, playheadRef.current)
    if (!activeClip) return

    const vid = videoRefs.current.get(activeClip.id)
    if (!vid || vid.readyState < 2) return

    const targetTime = playheadRef.current - activeClip.startOnTimeline + activeClip.trimStart
    if (Math.abs(vid.currentTime - targetTime) > 0.05) {
      vid.currentTime = targetTime
    }

    ctx.drawImage(vid, 0, 0, CANVAS_W, CANVAS_H)
  }, [state.clips])

  // RAF playback loop
  useEffect(() => {
    if (!state.playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastTimeRef.current = null
      draw()
      return
    }

    const tick = (now: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = now
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      const delta = (now - lastTimeRef.current) / 1000
      lastTimeRef.current = now

      const next = Math.min(playheadRef.current + delta, durationRef.current)
      dispatch({ type: 'SET_PLAYHEAD', time: next })

      draw()

      if (next >= durationRef.current) {
        dispatch({ type: 'SET_PLAYING', playing: false })
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [state.playing, draw, dispatch])

  // Redraw on playhead scrub (when not playing)
  useEffect(() => {
    if (!state.playing) draw()
  }, [state.playhead, state.playing, draw])

  const togglePlay = () => {
    if (state.playhead >= state.duration) {
      dispatch({ type: 'SET_PLAYHEAD', time: 0 })
    }
    dispatch({ type: 'SET_PLAYING', playing: !state.playing })
  }

  return (
    <div style={{
      flex: 1, background: '#0e0e0e',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 12,
      padding: 16, overflow: 'hidden',
    }}>
      {/* Canvas */}
      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{
            maxHeight: 'calc(100vh - 48px - 180px - 80px)',
            maxWidth: '100%',
            aspectRatio: '9/16',
            display: 'block',
            background: '#141414',
            borderRadius: 4,
          }}
        />
        {state.clips.length === 0 && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.2)', fontSize: 12, gap: 8,
          }}>
            <div style={{ fontSize: 32 }}>🎬</div>
            <span>Add video clips to get started</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Rewind to start */}
        <button
          onClick={() => { dispatch({ type: 'SET_PLAYING', playing: false }); dispatch({ type: 'SET_PLAYHEAD', time: 0 }) }}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4, fontSize: 16, lineHeight: 1 }}
          title="Rewind"
        >
          ⏮
        </button>

        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          style={{
            width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: '#c8ed4d', color: '#0e1004', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          title={state.playing ? 'Pause' : 'Play'}
        >
          {state.playing ? '⏸' : '▶'}
        </button>

        {/* Timecode */}
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontVariantNumeric: 'tabular-nums', fontFamily: 'ui-monospace, monospace', minWidth: 70 }}>
          {formatTimecode(state.playhead)} / {formatTimecode(state.duration)}
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Manual test**

1. Import a video clip via MediaPanel
2. Click Play — video should play in canvas
3. Click Pause — should freeze
4. Click Rewind — playhead returns to 0
5. Trim clip edges in timeline — effective duration changes, playback stops at trim point

- [ ] **Step 3: Commit**

```bash
git add components/editor/VideoPreview.tsx
git commit -m "feat(editor): implement canvas-based video preview with RAF playback"
```

---

## Task 13: AudioPanel + Waveform

**Files:**
- Create: `components/editor/Panels/AudioPanel.tsx`
- Create: `components/editor/Panels/Waveform.tsx`
- Modify: `components/editor/EditorShell.tsx`

- [ ] **Step 1: Create `components/editor/Panels/Waveform.tsx`**

Generates deterministic bar heights from a seed string (no real audio analysis).

```typescript
'use client'
import { useMemo } from 'react'

interface WaveformProps {
  seed: string
  bars?: number
  height?: number
  color?: string
}

export default function Waveform({ seed, bars = 48, height = 20, color = 'rgba(255,255,255,0.5)' }: WaveformProps) {
  const data = useMemo(() => {
    let s = 0
    for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) | 0
    const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
    return Array.from({ length: bars }, (_, i) => {
      const t = i / bars
      const v = 0.4 + 0.4 * Math.abs(Math.sin(t * 8 + s)) + 0.2 * (rand() - 0.5)
      return Math.max(0.1, Math.min(1, v))
    })
  }, [seed, bars])

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${bars * 3} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      {data.map((v, i) => {
        const h = v * (height - 2)
        return (
          <rect
            key={i}
            x={i * 3 + 0.5}
            y={(height - h) / 2}
            width={1.6}
            height={h}
            rx={0.8}
            fill={color}
          />
        )
      })}
    </svg>
  )
}
```

- [ ] **Step 2: Create `components/editor/Panels/AudioPanel.tsx`**

```typescript
'use client'
import { useCallback, useRef, useState } from 'react'
import { useEditor } from '../../../lib/editor/EditorContext'
import type { AudioTrack } from '../../../lib/editor/types'
import Waveform from './Waveform'

function readAudioDuration(src: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement('audio')
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => resolve(audio.duration)
    audio.onerror = reject
    audio.src = src
  })
}

export default function AudioPanel() {
  const { state, dispatch } = useEditor()
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback(async (files: FileList | File[]) => {
    setLoading(true)
    const fileArr = Array.from(files).filter(f => f.type.startsWith('audio/'))
    if (fileArr.length === 0) { setLoading(false); return }

    for (const file of fileArr) {
      const src = URL.createObjectURL(file)
      let duration = 0
      try {
        duration = await readAudioDuration(src)
      } catch {
        duration = 30
      }

      const track: AudioTrack = {
        id: crypto.randomUUID(),
        src,
        name: file.name.replace(/\.[^.]+$/, ''),
        startOnTimeline: 0,
        duration,
        volume: 1,
      }
      dispatch({ type: 'ADD_AUDIO', track })
    }
    setLoading(false)
  }, [dispatch])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }, [addFiles])

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `1.5px dashed ${dragging ? '#ec4899' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: 8, padding: '20px 12px', textAlign: 'center', cursor: 'pointer',
          background: dragging ? 'rgba(236,72,153,0.05)' : 'rgba(255,255,255,0.02)',
          transition: 'all 0.15s',
        }}
      >
        <div style={{ fontSize: 22, marginBottom: 6 }}>🎵</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
          {loading ? 'Loading...' : <>Drop audio files here<br /><span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>MP3, WAV, M4A</span></>}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        style={{ display: 'none' }}
        onChange={e => e.target.files && addFiles(e.target.files)}
      />

      {/* Track list */}
      {state.audioTracks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
            Audio tracks
          </div>
          {state.audioTracks.map(track => (
            <div
              key={track.id}
              onClick={() => dispatch({ type: 'SELECT', id: track.id })}
              style={{
                padding: '8px', borderRadius: 6, cursor: 'pointer',
                background: state.selectedId === track.id ? 'rgba(236,72,153,0.08)' : 'rgba(255,255,255,0.03)',
                border: state.selectedId === track.id ? '1px solid rgba(236,72,153,0.2)' : '1px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
                  {track.name}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); dispatch({ type: 'REMOVE_AUDIO', id: track.id }) }}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: 2, fontSize: 14, lineHeight: 1 }}
                >×</button>
              </div>
              <Waveform seed={track.id} color="rgba(236,72,153,0.6)" height={18} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Update `EditorShell.tsx` to use AudioPanel**

Import `AudioPanel` and replace the placeholder:
```typescript
import AudioPanel from './Panels/AudioPanel'
```

Replace:
```typescript
{activeTab === 'Audio' && <div style={{ padding: 16, color: '#666', fontSize: 12 }}>Audio panel — Task 13</div>}
```
With:
```typescript
{activeTab === 'Audio' && <AudioPanel />}
```

- [ ] **Step 4: Manual test**

Switch to "Audio" tab, drop an MP3. Verify pink audio block appears on audio track lane in timeline.

- [ ] **Step 5: Commit**

```bash
git add components/editor/Panels/AudioPanel.tsx components/editor/Panels/Waveform.tsx components/editor/EditorShell.tsx
git commit -m "feat(editor): implement AudioPanel with waveform visualization"
```

---

## Task 14: FFmpeg.wasm export pipeline + ExportModal

**Files:**
- Create: `lib/editor/ffmpeg.ts`
- Create: `components/editor/ExportModal.tsx`
- Modify: `components/editor/EditorShell.tsx`

- [ ] **Step 1: Create `lib/editor/ffmpeg.ts`**

```typescript
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import type { VideoClip, AudioTrack } from './types'
import { clipEffectiveDuration } from './timeline-utils'

let instance: FFmpeg | null = null

async function getFFmpeg(): Promise<FFmpeg> {
  if (instance) return instance
  const ffmpeg = new FFmpeg()
  const base = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
  await ffmpeg.load({
    coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
  })
  instance = ffmpeg
  return ffmpeg
}

export async function exportToMp4(
  clips: VideoClip[],
  audioTracks: AudioTrack[],
  onProgress: (pct: number) => void
): Promise<Blob> {
  const ffmpeg = await getFFmpeg()
  onProgress(5)

  // Sort clips by timeline position
  const sorted = [...clips].sort((a, b) => a.startOnTimeline - b.startOnTimeline)

  // Step 1: Trim each clip
  const trimmedNames: string[] = []
  for (let i = 0; i < sorted.length; i++) {
    const clip = sorted[i]
    const inputName = `in_${i}.mp4`
    const outName = `trimmed_${i}.mp4`

    const resp = await fetch(clip.src)
    const blob = await resp.blob()
    await ffmpeg.writeFile(inputName, await fetchFile(blob))

    const dur = clipEffectiveDuration(clip)
    await ffmpeg.exec([
      '-ss', String(clip.trimStart),
      '-i', inputName,
      '-t', String(dur),
      '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23',
      '-c:a', 'aac',
      outName,
    ])
    trimmedNames.push(outName)
    onProgress(5 + (i + 1) / sorted.length * 40)
  }

  // Step 2: Concat
  const concatList = trimmedNames.map(n => `file '${n}'`).join('\n')
  await ffmpeg.writeFile('list.txt', concatList)
  await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', 'merged.mp4'])
  onProgress(55)

  // Step 3: Audio mix
  if (audioTracks.length > 0) {
    const audioNames: string[] = []
    for (let i = 0; i < audioTracks.length; i++) {
      const track = audioTracks[i]
      const aName = `audio_${i}.mp3`
      const resp = await fetch(track.src)
      const blob = await resp.blob()
      await ffmpeg.writeFile(aName, await fetchFile(blob))
      audioNames.push(aName)
    }
    onProgress(70)

    const inputs = ['-i', 'merged.mp4', ...audioNames.flatMap(a => ['-i', a])]
    const n = audioNames.length + 1
    const filterStr = Array.from({ length: n }, (_, i) => `[${i}:a]`).join('') + `amix=inputs=${n}:duration=first`

    await ffmpeg.exec([
      ...inputs,
      '-filter_complex', filterStr,
      '-c:v', 'copy',
      'output.mp4',
    ])
  } else {
    await ffmpeg.exec(['-i', 'merged.mp4', '-c', 'copy', 'output.mp4'])
  }

  onProgress(95)
  const data = await ffmpeg.readFile('output.mp4') as Uint8Array
  onProgress(100)
  return new Blob([data], { type: 'video/mp4' })
}
```

- [ ] **Step 2: Create `components/editor/ExportModal.tsx`**

```typescript
'use client'
import { useState, useCallback } from 'react'
import { useEditor } from '../../lib/editor/EditorContext'
import { exportToMp4 } from '../../lib/editor/ffmpeg'

interface ExportModalProps {
  onClose: () => void
}

type ExportStatus = 'idle' | 'loading' | 'exporting' | 'done' | 'error'

export default function ExportModal({ onClose }: ExportModalProps) {
  const { state } = useEditor()
  const [status, setStatus] = useState<ExportStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const startExport = useCallback(async () => {
    setStatus('loading')
    setProgress(0)
    setError(null)
    setDownloadUrl(null)

    try {
      setStatus('exporting')
      const blob = await exportToMp4(state.clips, state.audioTracks, (pct) => {
        setProgress(Math.round(pct))
      })
      const url = URL.createObjectURL(blob)
      setDownloadUrl(url)
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
      setStatus('error')
    }
  }, [state.clips, state.audioTracks])

  const statusMessages: Record<ExportStatus, string> = {
    idle: 'Ready to export',
    loading: 'Loading FFmpeg (~32MB, first time only)…',
    exporting: `Exporting… ${progress}%`,
    done: 'Export complete!',
    error: 'Export failed',
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#1e1e1e', borderRadius: 12, padding: 24, width: 360,
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ color: 'white', fontSize: 15, fontWeight: 600, margin: 0 }}>Export MP4</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        {/* Project summary */}
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
          {state.clips.length} video clip{state.clips.length !== 1 ? 's' : ''}
          {state.audioTracks.length > 0 && ` · ${state.audioTracks.length} audio track${state.audioTracks.length !== 1 ? 's' : ''}`}
          {' · '}{state.duration.toFixed(1)}s total
        </div>

        {/* Status */}
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>
          {statusMessages[status]}
        </div>

        {/* Progress bar */}
        {(status === 'loading' || status === 'exporting') && (
          <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
            <div style={{
              height: '100%', background: '#c8ed4d', borderRadius: 2,
              width: status === 'loading' ? '30%' : `${progress}%`,
              transition: 'width 0.3s',
              animation: status === 'loading' ? 'pulse 1.5s ease-in-out infinite' : 'none',
            }} />
          </div>
        )}

        {/* Error */}
        {status === 'error' && error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '8px 10px', marginBottom: 12, fontSize: 11, color: 'rgba(239,68,68,0.9)', wordBreak: 'break-all' }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          {status === 'done' && downloadUrl ? (
            <>
              <a
                href={downloadUrl}
                download="keyo-export.mp4"
                style={{
                  flex: 1, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: '#c8ed4d', color: '#0e1004', fontSize: 13, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
                }}
              >
                ⬇ Download MP4
              </a>
              <button
                onClick={() => { setStatus('idle'); setProgress(0) }}
                style={{ height: 36, padding: '0 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer' }}
              >
                Re-export
              </button>
            </>
          ) : (
            <button
              onClick={startExport}
              disabled={status === 'loading' || status === 'exporting'}
              style={{
                flex: 1, height: 36, borderRadius: 8, border: 'none', cursor: (status === 'loading' || status === 'exporting') ? 'not-allowed' : 'pointer',
                background: (status === 'loading' || status === 'exporting') ? 'rgba(200,237,77,0.3)' : '#c8ed4d',
                color: '#0e1004', fontSize: 13, fontWeight: 600,
              }}
            >
              {status === 'idle' || status === 'error' ? 'Start Export' : 'Exporting…'}
            </button>
          )}
        </div>

        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update `EditorShell.tsx` to use ExportModal**

Import and replace the placeholder export modal:
```typescript
import ExportModal from './ExportModal'
```

Replace the placeholder export modal div:
```typescript
{showExport && (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
    <div style={{ background: '#1e1e1e', borderRadius: 12, padding: 24, border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
      <p style={{ marginBottom: 12 }}>Export modal — Task 14</p>
      <button onClick={() => setShowExport(false)} style={{ padding: '6px 14px', background: '#c8ed4d', color: '#0e1004', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Close</button>
    </div>
  </div>
)}
```

With:
```typescript
{showExport && <ExportModal onClose={() => setShowExport(false)} />}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Manual test**

1. Import a short video clip (5-10s)
2. Click "Export MP4" in toolbar
3. Click "Start Export" in modal
4. Wait for FFmpeg to load (~30s first time)
5. Progress bar fills to 100%
6. "Download MP4" button appears — click it
7. Verify downloaded file plays in system media player

- [ ] **Step 6: Commit**

```bash
git add lib/editor/ffmpeg.ts components/editor/ExportModal.tsx components/editor/EditorShell.tsx
git commit -m "feat(editor): implement FFmpeg.wasm export pipeline and ExportModal"
```

---

## Task 15: Add Editor to Navbar

**Files:**
- Modify: `components/layout/Navbar.tsx`

- [ ] **Step 1: Add "Editor" to desktop nav links**

In `Navbar.tsx`, find:
```typescript
const navLinks = [
  { name: 'Explore', href: '/' },
  { name: 'Image', href: '/image' },
  { name: 'Video', href: '/video' },
  { name: 'Audio', href: '/audio' },
]
```

Change to:
```typescript
const navLinks = [
  { name: 'Explore', href: '/' },
  { name: 'Image', href: '/image' },
  { name: 'Video', href: '/video' },
  { name: 'Audio', href: '/audio' },
  { name: 'Editor', href: '/editor' },
]
```

- [ ] **Step 2: Add Editor to mobile bottom nav**

In the mobile nav section, find the Audio link (last item before closing tags). After it, add:

```tsx
{/* Editor */}
<Link href="/editor" className="flex flex-col items-center gap-[3px] flex-1 py-2 transition-colors duration-150"
  style={{ color: pathname === '/editor' ? 'rgba(170,140,255,0.95)' : 'rgba(255,255,255,0.3)' }}>
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="12" rx="2"/>
    <path d="M12 2v4M8 10h8M8 14h5"/>
  </svg>
  <span className="font-dm text-[10px] font-[500]">Edit</span>
</Link>
```

- [ ] **Step 3: Manual test**

1. Open the site — "Editor" link should appear in desktop nav
2. Click it — navigates to `/editor`
3. Active state (purple color) should apply when on `/editor`
4. Mobile: "Edit" icon appears in bottom nav

- [ ] **Step 4: Commit**

```bash
git add components/layout/Navbar.tsx
git commit -m "feat(editor): add Editor link to desktop and mobile navigation"
```

---

## Self-Review Checklist

### Spec coverage
- [x] `/editor` route with tab in menu → Task 5 + Task 15
- [x] Video import (drag & drop + file picker) → Task 11
- [x] Video preview with play/pause → Task 12
- [x] Timeline with ruler, playhead, video track → Tasks 8–10
- [x] Trim clips (drag handles) → Task 9
- [x] Audio import → Task 13
- [x] Audio track lane on timeline → Task 10
- [x] Undo/redo → Task 7 (Toolbar), reducer in Task 2
- [x] Zoom in/out → Task 7 + Task 8
- [x] FFmpeg.wasm export pipeline → Task 14
- [x] Export modal with progress → Task 14
- [x] MP4 download → Task 14
- [x] CSP headers updated for FFmpeg → Task 4
- [x] Dark theme (#141414, lime accent #c8ed4d) → all components
- [x] TypeScript types throughout → Task 1

### Type consistency
- `VideoClip`, `AudioTrack`, `EditorState`, `EditorAction` defined in Task 1, used consistently in Tasks 2–14
- `clipEffectiveDuration()` defined in Task 3, used in Tasks 9 and 14
- `findActiveClip()` defined in Task 3, used in Task 12
- `formatTimecode()` defined in Task 3, used in Tasks 8 and 12
- `useEditor()` defined in Task 2, used in Tasks 7–14
