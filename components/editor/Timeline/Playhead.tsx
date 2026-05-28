'use client'
import { useRef } from 'react'
import { useEditor } from '../../../lib/editor/EditorContext'
import { secondsToPixels, pixelsToSeconds } from '../../../lib/editor/timeline-utils'

const LABEL_WIDTH = 40

export default function Playhead({ height }: { height: number }) {
  const { state, dispatch } = useEditor()
  const x = LABEL_WIDTH + secondsToPixels(state.playhead, state.zoom)
  const zoomRef = useRef(state.zoom)
  const playheadRef = useRef(state.playhead)
  zoomRef.current = state.zoom
  playheadRef.current = state.playhead

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (state.playing) dispatch({ type: 'SET_PLAYING', playing: false })

    const startX = e.clientX
    const startPh = playheadRef.current

    const onMove = (ev: MouseEvent) => {
      const ds = pixelsToSeconds(ev.clientX - startX, zoomRef.current)
      dispatch({ type: 'SET_PLAYHEAD', time: Math.max(0, startPh + ds) })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div
      style={{
        position: 'absolute', top: 0, left: x, width: 1,
        height, background: '#c8ed4d',
        pointerEvents: 'none', zIndex: 10,
        boxShadow: '0 0 6px rgba(200,237,77,0.5)',
      }}
    >
      {/* Diamond head — draggable */}
      <div
        style={{
          position: 'absolute', top: -1, left: -8,
          width: 16, height: 16,
          background: '#c8ed4d',
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
          cursor: 'ew-resize',
          pointerEvents: 'auto',
        }}
        onMouseDown={startDrag}
      />
    </div>
  )
}
