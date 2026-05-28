# Keyo Video Editor — Design Spec
Date: 2026-05-28

## Overview

A browser-based video editor built as a Next.js page (`/editor`) within the keyo-studio project. Users can import video clips, trim them, arrange on a timeline, add music, and export to MP4.

## Architecture Approach

**Hybrid: HTMLVideoElement preview + FFmpeg.wasm export**

- Preview uses native `<video>` elements + Canvas for overlays — simple, works in all browsers
- FFmpeg.wasm handles all processing at export time (trim, concat, audio mix, MP4 encode)
- Clear separation: React UI layer drives state, FFmpeg executes on export only
- No WebCodecs dependency — avoids Safari incompatibility

## File Structure

```
app/editor/
  page.tsx                    # route /editor, dark layout

components/editor/
  EditorShell.tsx             # root layout: left panels + center canvas + bottom timeline
  VideoPreview.tsx            # canvas preview + play/pause/scrub controls
  Toolbar.tsx                 # undo/redo, zoom in/out, Export button

  Timeline/
    Timeline.tsx              # horizontally scrollable timeline container
    TimelineRuler.tsx         # time ruler with major/minor ticks
    VideoTrack.tsx            # video clips lane
    AudioTrack.tsx            # audio clips lane
    ClipBlock.tsx             # single clip: drag to move, drag edges to trim, click to select
    Playhead.tsx              # red vertical line at current time

  Panels/
    MediaPanel.tsx            # left panel: import video files (click or drag & drop)
    AudioPanel.tsx            # left panel: add music tracks
    TextPanel.tsx             # left panel: text overlays (future)
    FiltersPanel.tsx          # left panel: visual filters (future)

  ExportModal.tsx             # FFmpeg progress dialog + download link when done

lib/editor/
  EditorContext.tsx           # global state via useReducer + React Context
  ffmpeg.ts                   # lazy-loaded FFmpeg.wasm wrapper with progress callback
  timeline-utils.ts           # clip math: collision detection, duration calc, trim clamping
  types.ts                    # all TypeScript interfaces
```

## Data Model

```typescript
// lib/editor/types.ts

interface VideoClip {
  id: string
  src: string               // blob URL created from File
  filename: string
  originalDuration: number  // full source duration in seconds
  trimStart: number         // seconds cut from beginning of source
  trimEnd: number           // seconds cut from end of source
  startOnTimeline: number   // position on timeline in seconds
  volume: number            // 0–1
}

interface AudioTrack {
  id: string
  src: string               // blob URL or external URL
  name: string
  startOnTimeline: number   // position on timeline in seconds
  duration: number          // track duration in seconds
  volume: number            // 0–1
}

interface EditorState {
  clips: VideoClip[]
  audioTracks: AudioTrack[]
  playhead: number          // current playback position in seconds
  duration: number          // max(clip.startOnTimeline + clip effectiveDuration) across all clips
  zoom: number              // pixels per second (default: 40, range: 10–200)
  selectedId: string | null // id of selected clip or audio track
  playing: boolean
  past: EditorAction[]      // action history for undo (max 50)
}

type EditorAction =
  | { type: 'ADD_CLIP'; clip: VideoClip }
  | { type: 'REMOVE_CLIP'; id: string }
  | { type: 'MOVE_CLIP'; id: string; startOnTimeline: number }
  | { type: 'TRIM_CLIP'; id: string; trimStart: number; trimEnd: number }
  | { type: 'ADD_AUDIO'; track: AudioTrack }
  | { type: 'REMOVE_AUDIO'; id: string }
  | { type: 'SET_PLAYHEAD'; time: number }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'SELECT'; id: string | null }
  | { type: 'SET_PLAYING'; playing: boolean }
  | { type: 'UNDO' }
```

## Timeline Interactions

| Interaction | Effect |
|---|---|
| Drag clip body | Move `startOnTimeline` |
| Drag left edge | Increase `trimStart` (shorten from beginning) |
| Drag right edge | Increase `trimEnd` (shorten from end) |
| Click clip | Set `selectedId` |
| Click empty area | Deselect + set playhead |
| Delete key | Remove selected clip |
| Ctrl+Z | Undo last action |
| Ctrl+Scroll or buttons | Zoom in/out |

Clips cannot overlap on the video track — collision detection snaps to nearest free slot.

## Preview System

- One hidden `<video>` element per loaded clip (src = blob URL)
- One `<canvas>` element for visible output
- `requestAnimationFrame` loop when `playing === true`:
  1. Find active clip at `playhead` (where `clip.startOnTimeline <= playhead < clip.startOnTimeline + effectiveDuration`)
  2. Seek hidden video: `video.currentTime = playhead - clip.startOnTimeline + clip.trimStart`
  3. Draw frame: `ctx.drawImage(video, 0, 0, canvas.width, canvas.height)`
  4. Draw text overlays on top
- Click on canvas/timeline scrubs to that time position

## Export Pipeline (FFmpeg.wasm)

Library: `@ffmpeg/ffmpeg` + `@ffmpeg/util` (loaded lazily on first export)

```
Step 1 — Trim each clip:
  ffmpeg -ss {trimStart} -i clip_N -t {effectiveDuration} -c:v libx264 -c:a aac trimmed_N.mp4

Step 2 — Generate concat list:
  file 'trimmed_0.mp4'
  file 'trimmed_1.mp4'
  ...

Step 3 — Concatenate:
  ffmpeg -f concat -safe 0 -i list.txt -c copy merged.mp4

Step 4 — Mix audio (if audio tracks present):
  ffmpeg -i merged.mp4 -i audio_0.mp3 ... -filter_complex "[0:a][1:a]amix=inputs=2:duration=first" -c:v copy output.mp4

Step 5 — Download:
  const url = URL.createObjectURL(new Blob([data], { type: 'video/mp4' }))
  trigger <a href={url} download="keyo-export.mp4">
```

Progress: FFmpeg logs parsed for percentage → shown in ExportModal progress bar.

## UI Design

- Dark theme: background `#141414`, surface `#1e1e1e`, accent `#c8ed4d` (lime, matches ve.html)
- Font: system-ui / -apple-system
- Layout:
  - Top: Toolbar (undo/redo, zoom, export)
  - Left: Panel tabs (Media, Audio, Text, Filters) — 280px fixed
  - Center: VideoPreview canvas (16:9, max height)
  - Bottom: Timeline (fixed height 180px, scrollable horizontally)
- Minimum viewport: 1024px wide (editor is desktop-only, no mobile layout)
- Tailwind CSS for all styles

## Menu Integration

Add "Editor" link to the existing site navigation. Route: `/editor`.

## Build Phases

| Phase | Scope |
|---|---|
| 1 | UI shell, layout, empty timeline, menu tab |
| 2 | Video import (drag & drop + file picker), preview, play/pause, trim |
| 3 | Audio tracks, waveform visualization, volume control |
| 4 | FFmpeg.wasm export pipeline, progress modal, MP4 download |

## Out of Scope (v1)

- Text overlays and captions (UI placeholder only)
- Visual filters/LUT (UI placeholder only)
- Cloud storage / project save
- Collaboration
- Mobile layout
