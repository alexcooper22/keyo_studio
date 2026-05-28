'use client'
import { useRef, useEffect, useCallback } from 'react'
import { useEditor } from '../../lib/editor/EditorContext'
import { findActiveClip, formatTimecode } from '../../lib/editor/timeline-utils'

const CANVAS_W = 405
const CANVAS_H = 720

export default function VideoPreview() {
  const { state, dispatch } = useEditor()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())
  const playheadRef = useRef(state.playhead)
  const durationRef = useRef(state.duration)
  const rafRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number | null>(null)

  playheadRef.current = state.playhead
  durationRef.current = state.duration

  // Sync hidden video elements for each clip
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
    existing.forEach(id => {
      const vid = videoRefs.current.get(id)
      if (vid) { vid.remove() }
      videoRefs.current.delete(id)
    })
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

  // Redraw on scrub when paused
  useEffect(() => {
    if (!state.playing) draw()
  }, [state.playhead, state.playing, draw])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      videoRefs.current.forEach(vid => vid.remove())
      videoRefs.current.clear()
    }
  }, [])

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

      {/* Playback controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => { dispatch({ type: 'SET_PLAYING', playing: false }); dispatch({ type: 'SET_PLAYHEAD', time: 0 }) }}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4, fontSize: 16, lineHeight: 1 }}
          title="Rewind to start"
        >
          ⏮
        </button>

        <button
          onClick={togglePlay}
          style={{
            width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: '#c8ed4d', color: '#0e1004', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          title={state.playing ? 'Pause' : 'Play'}
        >
          {state.playing ? '⏸' : '▶'}
        </button>

        <span style={{
          fontSize: 11, color: 'rgba(255,255,255,0.4)',
          fontVariantNumeric: 'tabular-nums', fontFamily: 'ui-monospace, monospace', minWidth: 70,
        }}>
          {formatTimecode(state.playhead)} / {formatTimecode(state.duration)}
        </span>
      </div>
    </div>
  )
}
