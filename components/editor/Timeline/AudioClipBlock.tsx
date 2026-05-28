'use client'
import { useRef } from 'react'
import { useEditor } from '../../../lib/editor/EditorContext'
import type { AudioTrack } from '../../../lib/editor/types'
import { audioEffectiveDuration, secondsToPixels, pixelsToSeconds } from '../../../lib/editor/timeline-utils'

interface AudioClipBlockProps {
  track: AudioTrack
  trackHeight: number
}

const HANDLE_WIDTH = 8
const SNAP_PX = 8

export default function AudioClipBlock({ track, trackHeight }: AudioClipBlockProps) {
  const { state, dispatch } = useEditor()
  const { zoom } = state
  const selected = state.selectedId === track.id

  const effectiveDur = audioEffectiveDuration(track)
  const left = secondsToPixels(track.startOnTimeline, zoom)
  const width = Math.max(secondsToPixels(effectiveDur, zoom), HANDLE_WIDTH * 2 + 20)

  const dragRef = useRef<{
    type: 'move' | 'trimLeft' | 'trimRight'
    startX: number
    startValue: number
    startOnTimeline: number
  } | null>(null)

  const startDrag = (e: React.MouseEvent, type: 'move' | 'trimLeft' | 'trimRight') => {
    e.preventDefault()
    e.stopPropagation()
    dispatch({ type: 'SELECT', id: track.id })

    dragRef.current = {
      type,
      startX: e.clientX,
      startValue: type === 'move' ? track.startOnTimeline : type === 'trimLeft' ? (track.trimStart ?? 0) : (track.trimEnd ?? 0),
      startOnTimeline: track.startOnTimeline,
    }

    const zoomAtDrag = zoom

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const dx = ev.clientX - dragRef.current.startX
      const ds = pixelsToSeconds(dx, zoomAtDrag)

      if (dragRef.current.type === 'move') {
        let newStart = Math.max(0, dragRef.current.startValue + ds)
        const snapThreshold = pixelsToSeconds(SNAP_PX, zoomAtDrag)
        const dur = audioEffectiveDuration(track)
        const newEnd = newStart + dur

        if (newStart < snapThreshold) newStart = 0
        else {
          for (const c of state.clips) {
            const cEnd = c.startOnTimeline + (c.originalDuration - c.trimStart - c.trimEnd)
            if (Math.abs(newStart - cEnd) < snapThreshold) { newStart = cEnd; break }
            if (Math.abs(newStart - c.startOnTimeline) < snapThreshold) { newStart = c.startOnTimeline; break }
            if (Math.abs(newEnd - c.startOnTimeline) < snapThreshold) { newStart = c.startOnTimeline - dur; break }
            if (Math.abs(newEnd - cEnd) < snapThreshold) { newStart = cEnd - dur; break }
          }
        }

        dispatch({ type: 'MOVE_AUDIO', id: track.id, startOnTimeline: Math.max(0, newStart) })

      } else if (dragRef.current.type === 'trimLeft') {
        // CapCut style: left trim moves both trimStart and startOnTimeline
        dispatch({
          type: 'TRIM_AUDIO',
          id: track.id,
          trimStart: Math.max(0, dragRef.current.startValue + ds),
          trimEnd: track.trimEnd ?? 0,
          startOnTimeline: Math.max(0, dragRef.current.startOnTimeline + ds),
        })
      } else {
        dispatch({
          type: 'TRIM_AUDIO',
          id: track.id,
          trimStart: track.trimStart ?? 0,
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
          ? 'linear-gradient(180deg, rgba(236,72,153,0.4), rgba(236,72,153,0.25))'
          : 'linear-gradient(180deg, rgba(236,72,153,0.3), rgba(236,72,153,0.15))',
        border: selected ? '1.5px solid #ec4899' : '1.5px solid rgba(236,72,153,0.5)',
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
          background: selected ? 'rgba(236,72,153,0.6)' : 'rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
          zIndex: 2, flexShrink: 0,
        }}
        onMouseDown={e => startDrag(e, 'trimLeft')}
      >
        <div style={{ width: 1.5, height: 12, background: 'rgba(255,255,255,0.7)', borderRadius: 1 }} />
        <div style={{ width: 1.5, height: 8, background: 'rgba(255,255,255,0.4)', borderRadius: 1 }} />
      </div>

      {/* Track name */}
      <div style={{
        position: 'absolute', left: HANDLE_WIDTH + 4, right: HANDLE_WIDTH + 4,
        top: '50%', transform: 'translateY(-50%)',
        fontSize: 10, color: 'rgba(255,255,255,0.75)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        pointerEvents: 'none',
        fontFamily: 'ui-monospace, monospace',
      }}>
        ♪ {track.name}
      </div>

      {/* Right trim handle */}
      <div
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: HANDLE_WIDTH,
          cursor: 'ew-resize',
          background: selected ? 'rgba(236,72,153,0.6)' : 'rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
          zIndex: 2, flexShrink: 0,
        }}
        onMouseDown={e => startDrag(e, 'trimRight')}
      >
        <div style={{ width: 1.5, height: 8, background: 'rgba(255,255,255,0.4)', borderRadius: 1 }} />
        <div style={{ width: 1.5, height: 12, background: 'rgba(255,255,255,0.7)', borderRadius: 1 }} />
      </div>
    </div>
  )
}
