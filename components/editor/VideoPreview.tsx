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

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => { dispatch({ type: 'SET_PLAYING', playing: false }); dispatch({ type: 'SET_PLAYHEAD', time: 0 }) }}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4, fontSize: 16, lineHeight: 1 }}
          title="Rewind"
        >⏮</button>

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
