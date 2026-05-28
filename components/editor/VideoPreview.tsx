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
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())

  // Refs for values used inside RAF/effects to avoid stale closures
  const clipsRef = useRef(state.clips)
  const audioTracksRef = useRef(state.audioTracks)
  const playheadRef = useRef(state.playhead)
  const durationRef = useRef(state.duration)
  const activeClipIdRef = useRef<string | null>(null)
  const rafRef = useRef<number | null>(null)

  clipsRef.current = state.clips
  audioTracksRef.current = state.audioTracks
  playheadRef.current = state.playhead
  durationRef.current = state.duration

  // Manage hidden video elements (one per clip)
  useEffect(() => {
    const existing = new Set(videoRefs.current.keys())
    for (const clip of state.clips) {
      if (!videoRefs.current.has(clip.id)) {
        const vid = document.createElement('video')
        vid.src = clip.src
        vid.preload = 'auto'
        vid.muted = true
        vid.playsInline = true
        vid.style.cssText = 'display:none;position:fixed;top:-9999px'
        document.body.appendChild(vid)
        videoRefs.current.set(clip.id, vid)
      }
      existing.delete(clip.id)
    }
    existing.forEach(id => {
      const vid = videoRefs.current.get(id)
      if (vid) { vid.pause(); vid.remove() }
      videoRefs.current.delete(id)
    })
  }, [state.clips])

  // Manage hidden audio elements (one per audio track)
  useEffect(() => {
    const existing = new Set(audioRefs.current.keys())
    for (const track of state.audioTracks) {
      if (!audioRefs.current.has(track.id)) {
        const aud = document.createElement('audio')
        aud.src = track.src
        aud.preload = 'auto'
        aud.style.display = 'none'
        document.body.appendChild(aud)
        audioRefs.current.set(track.id, aud)
      }
      existing.delete(track.id)
    }
    existing.forEach(id => {
      const aud = audioRefs.current.get(id)
      if (aud) { aud.pause(); aud.remove() }
      audioRefs.current.delete(id)
    })
  }, [state.audioTracks])

  // Draw canvas from active video's current frame (no seeking — avoids flicker)
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const active = findActiveClip(clipsRef.current, playheadRef.current)
    if (!active) {
      ctx.fillStyle = '#141414'
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      return
    }
    const vid = videoRefs.current.get(active.id)
    if (!vid || vid.readyState < 2) return
    ctx.drawImage(vid, 0, 0, CANVAS_W, CANVAS_H)
  }, [])

  // Playback engine: use native video.play() — no per-frame seeking, no flicker
  useEffect(() => {
    if (!state.playing) {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
      videoRefs.current.forEach(v => { if (!v.paused) v.pause() })
      audioRefs.current.forEach(a => { if (!a.paused) a.pause() })
      activeClipIdRef.current = null
      return
    }

    const ph = playheadRef.current
    const clips = clipsRef.current
    const audioTracks = audioTracksRef.current

    // Start active video clip at correct source position
    const active = findActiveClip(clips, ph)
    if (active) {
      const vid = videoRefs.current.get(active.id)
      if (vid) {
        vid.currentTime = ph - active.startOnTimeline + active.trimStart
        vid.play().catch(() => {})
        activeClipIdRef.current = active.id
      }
    }

    // Start audio tracks that overlap with current playhead
    audioTracks.forEach(track => {
      const aud = audioRefs.current.get(track.id)
      if (!aud) return
      if (ph >= track.startOnTimeline && ph < track.startOnTimeline + track.duration) {
        aud.currentTime = ph - track.startOnTimeline
        aud.volume = Math.max(0, Math.min(1, track.volume))
        aud.play().catch(() => {})
      }
    })

    // RAF: draw frames and drive playhead from video position (no manual seeking)
    const tick = () => {
      const currentPh = playheadRef.current
      const dur = durationRef.current
      const currentClips = clipsRef.current

      if (currentPh >= dur) {
        videoRefs.current.forEach(v => v.pause())
        audioRefs.current.forEach(a => a.pause())
        dispatch({ type: 'SET_PLAYING', playing: false })
        dispatch({ type: 'SET_PLAYHEAD', time: 0 })
        return
      }

      const currentActive = findActiveClip(currentClips, currentPh)

      if (currentActive) {
        const vid = videoRefs.current.get(currentActive.id)

        // Clip transition: pause old, seek+play new
        if (activeClipIdRef.current !== currentActive.id) {
          if (activeClipIdRef.current) {
            const old = videoRefs.current.get(activeClipIdRef.current)
            if (old && !old.paused) old.pause()
          }
          if (vid) {
            vid.currentTime = currentPh - currentActive.startOnTimeline + currentActive.trimStart
            vid.play().catch(() => {})
          }
          activeClipIdRef.current = currentActive.id
        }

        // Derive playhead from video's actual currentTime (smooth, no jitter)
        if (vid && !vid.paused) {
          const newPh = currentActive.startOnTimeline + vid.currentTime - currentActive.trimStart
          dispatch({ type: 'SET_PLAYHEAD', time: Math.min(newPh, dur) })
          drawFrame()
        }
      } else {
        // Gap between clips — draw empty frame
        drawFrame()
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null } }
  }, [state.playing, drawFrame, dispatch])

  // When paused, seek video to playhead and draw after seek completes (avoids flicker on scrub)
  useEffect(() => {
    if (state.playing) return
    const active = findActiveClip(state.clips, state.playhead)
    if (!active) { drawFrame(); return }
    const vid = videoRefs.current.get(active.id)
    if (!vid) { drawFrame(); return }
    const target = state.playhead - active.startOnTimeline + active.trimStart
    if (Math.abs(vid.currentTime - target) < 0.02) { drawFrame(); return }
    const onSeeked = () => drawFrame()
    vid.addEventListener('seeked', onSeeked, { once: true })
    vid.currentTime = target
  }, [state.playhead, state.playing, state.clips, drawFrame])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      videoRefs.current.forEach(v => v.remove())
      audioRefs.current.forEach(a => a.remove())
      videoRefs.current.clear()
      audioRefs.current.clear()
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
      flex: 1,
      background: '#080808',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 14,
      padding: 20, overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Dot grid background */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(rgba(120,80,255,0.1) 1px, transparent 1px)',
        backgroundSize: '36px 36px',
        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)',
      }} />

      {/* Ambient purple glow */}
      <div aria-hidden="true" style={{
        position: 'absolute', top: '10%', left: '50%',
        width: '500px', height: '400px',
        transform: 'translateX(-50%)',
        background: 'radial-gradient(ellipse at center, rgba(83,47,207,0.12) 0%, rgba(60,30,180,0.06) 40%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
      }} />

      {/* Canvas */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{
            maxHeight: 'calc(100vh - 60px - 180px - 80px)',
            maxWidth: '100%',
            aspectRatio: '9/16',
            display: 'block',
            background: '#0f0f0f',
            borderRadius: 10,
            border: '0.5px solid rgba(120,80,255,0.2)',
            boxShadow: '0 0 40px rgba(83,47,207,0.15), 0 8px 32px rgba(0,0,0,0.6)',
          }}
        />
        {state.clips.length === 0 && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            {/* Film icon */}
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(120,80,255,0.4)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="15" rx="1.5"/>
              <polyline points="17 2 22 7 2 7 7 2 17 2"/>
              <line x1="7" y1="2" x2="7" y2="7"/>
              <line x1="12" y1="2" x2="12" y2="7"/>
              <line x1="17" y1="2" x2="17" y2="7"/>
            </svg>
            <span style={{
              fontSize: 11, color: 'rgba(255,255,255,0.25)',
              fontFamily: 'var(--font-dm), DM Sans, sans-serif',
            }}>
              Add video clips to get started
            </span>
          </div>
        )}
      </div>

      {/* Playback controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, zIndex: 1 }}>
        <button
          onClick={() => { dispatch({ type: 'SET_PLAYING', playing: false }); dispatch({ type: 'SET_PLAYHEAD', time: 0 }) }}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(255,255,255,0.08)',
            borderRadius: 6, color: 'rgba(255,255,255,0.4)',
            cursor: 'pointer', width: 28, height: 28, fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
          title="Rewind"
        >⏮</button>

        <button
          onClick={togglePlay}
          style={{
            width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #532fcf 0%, #7b5ef8 100%)',
            color: '#fff', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 18px rgba(83,47,207,0.5)',
            transition: 'all 0.15s',
          }}
          title={state.playing ? 'Pause' : 'Play'}
        >
          {state.playing ? '⏸' : '▶'}
        </button>

        <span style={{
          fontSize: 10, color: 'rgba(255,255,255,0.35)',
          fontVariantNumeric: 'tabular-nums', fontFamily: 'ui-monospace, monospace', minWidth: 72,
          letterSpacing: '0.03em',
        }}>
          {formatTimecode(state.playhead)} / {formatTimecode(state.duration)}
        </span>
      </div>
    </div>
  )
}
