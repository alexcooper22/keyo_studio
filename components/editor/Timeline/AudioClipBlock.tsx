'use client'
import { useRef } from 'react'
import { useEditor } from '../../../lib/editor/EditorContext'
import type { AudioTrack } from '../../../lib/editor/types'
import { secondsToPixels, pixelsToSeconds } from '../../../lib/editor/timeline-utils'

interface AudioClipBlockProps {
  track: AudioTrack
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
