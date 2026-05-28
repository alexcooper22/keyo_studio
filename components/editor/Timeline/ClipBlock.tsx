'use client'
import { useRef } from 'react'
import { useEditor } from '../../../lib/editor/EditorContext'
import type { VideoClip } from '../../../lib/editor/types'
import { clipEffectiveDuration, secondsToPixels, pixelsToSeconds } from '../../../lib/editor/timeline-utils'

interface ClipBlockProps {
  clip: VideoClip
  trackHeight: number
}

const HANDLE_WIDTH = 8
const SNAP_PX = 8  // pixels — snaps within this distance

export default function ClipBlock({ clip, trackHeight }: ClipBlockProps) {
  const { state, dispatch } = useEditor()
  const { zoom } = state
  const selected = state.selectedId === clip.id

  const effectiveDuration = clipEffectiveDuration(clip)
  const left = secondsToPixels(clip.startOnTimeline, zoom)
  const width = Math.max(secondsToPixels(effectiveDuration, zoom), HANDLE_WIDTH * 2 + 4)

  const dragRef = useRef<{
    type: 'move' | 'trimLeft' | 'trimRight'
    startX: number
    startValue: number        // startOnTimeline (move) | trimStart (trimLeft) | trimEnd (trimRight)
    startOnTimeline: number   // clip.startOnTimeline at drag start
    snapPoints: number[]      // other clips' start/end times (captured at drag start)
  } | null>(null)

  const startDrag = (e: React.MouseEvent, type: 'move' | 'trimLeft' | 'trimRight') => {
    e.preventDefault()
    e.stopPropagation()
    dispatch({ type: 'SELECT', id: clip.id })

    // Capture snap points from other clips at drag start
    const snapPoints = state.clips
      .filter(c => c.id !== clip.id)
      .flatMap(c => [c.startOnTimeline, c.startOnTimeline + clipEffectiveDuration(c)])

    dragRef.current = {
      type,
      startX: e.clientX,
      startValue: type === 'move' ? clip.startOnTimeline : type === 'trimLeft' ? clip.trimStart : clip.trimEnd,
      startOnTimeline: clip.startOnTimeline,
      snapPoints,
    }

    const zoomAtDrag = zoom

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const dx = ev.clientX - dragRef.current.startX
      const ds = pixelsToSeconds(dx, zoomAtDrag)
      const snapThreshold = pixelsToSeconds(SNAP_PX, zoomAtDrag)

      if (dragRef.current.type === 'move') {
        let newStart = Math.max(0, dragRef.current.startValue + ds)
        const dur = clipEffectiveDuration(clip)
        const newEnd = newStart + dur

        // Magnetic snapping to other clips and to 0
        let snapped = false
        if (newStart < snapThreshold) { newStart = 0; snapped = true }

        if (!snapped) {
          for (const pt of dragRef.current.snapPoints) {
            if (Math.abs(newStart - pt) < snapThreshold) { newStart = pt; snapped = true; break }
            if (Math.abs(newEnd - pt) < snapThreshold) { newStart = pt - dur; snapped = true; break }
          }
        }

        dispatch({ type: 'MOVE_CLIP', id: clip.id, startOnTimeline: Math.max(0, newStart) })

      } else if (dragRef.current.type === 'trimLeft') {
        // CapCut style: left trim moves clip start on timeline AND trims content
        // Dragging right → trimStart increases, startOnTimeline increases (clip shrinks from left)
        // Dragging left → trimStart decreases, startOnTimeline decreases (clip grows from left)
        const newTrimStart = Math.max(0, dragRef.current.startValue + ds)
        const newStartOnTimeline = Math.max(0, dragRef.current.startOnTimeline + ds)
        dispatch({
          type: 'TRIM_CLIP',
          id: clip.id,
          trimStart: newTrimStart,
          trimEnd: clip.trimEnd,
          startOnTimeline: newStartOnTimeline,
        })

      } else {
        // Right trim: only trimEnd changes, startOnTimeline stays
        dispatch({
          type: 'TRIM_CLIP',
          id: clip.id,
          trimStart: clip.trimStart,
          trimEnd: Math.max(0, dragRef.current.startValue - ds),
        })
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
        top: 3,
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
          background: selected ? 'rgba(200,237,77,0.5)' : 'rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
          zIndex: 2,
        }}
        onMouseDown={e => startDrag(e, 'trimLeft')}
      >
        <div style={{ width: 1.5, height: 12, background: 'rgba(255,255,255,0.7)', borderRadius: 1 }} />
        <div style={{ width: 1.5, height: 8, background: 'rgba(255,255,255,0.4)', borderRadius: 1 }} />
      </div>

      {/* Filename label */}
      <div style={{
        position: 'absolute', left: HANDLE_WIDTH + 4, right: HANDLE_WIDTH + 4,
        top: '50%', transform: 'translateY(-50%)',
        fontSize: 10, color: 'rgba(255,255,255,0.8)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        pointerEvents: 'none',
        fontFamily: 'ui-monospace, monospace',
      }}>
        {clip.filename}
      </div>

      {/* Right trim handle */}
      <div
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: HANDLE_WIDTH,
          cursor: 'ew-resize',
          background: selected ? 'rgba(200,237,77,0.5)' : 'rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
          zIndex: 2,
        }}
        onMouseDown={e => startDrag(e, 'trimRight')}
      >
        <div style={{ width: 1.5, height: 8, background: 'rgba(255,255,255,0.4)', borderRadius: 1 }} />
        <div style={{ width: 1.5, height: 12, background: 'rgba(255,255,255,0.7)', borderRadius: 1 }} />
      </div>
    </div>
  )
}
