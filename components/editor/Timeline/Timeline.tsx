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

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const playX = secondsToPixels(state.playhead, state.zoom)
    const { scrollLeft, clientWidth } = el
    if (playX < scrollLeft + 20 || playX > scrollLeft + clientWidth - 60) {
      el.scrollTo({ left: Math.max(0, playX - clientWidth * 0.3), behavior: 'smooth' })
    }
  }, [state.playhead, state.zoom])

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
      <div ref={scrollRef} style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', position: 'relative' }}
        className="no-scrollbar">
        <div style={{ width: totalWidth, position: 'relative' }}>
          <TimelineRuler totalWidth={totalWidth} />
          <div style={{ position: 'relative', height: tracksHeight }}>
            <div style={{ position: 'absolute', top: -RULER_HEIGHT, left: 0, right: 0, pointerEvents: 'none' }}>
              <Playhead height={tracksHeight + RULER_HEIGHT} />
            </div>

            {[0, TRACK_HEIGHT, TRACK_HEIGHT * 2].map(top => (
              <div key={top} style={{ position: 'absolute', left: 0, right: 0, top, height: 1, background: 'rgba(255,255,255,0.04)' }} />
            ))}

            {(['TEXT', 'VIDEO', 'AUDIO'] as const).map((label, i) => (
              <div key={label} style={{ position: 'absolute', left: 0, top: TRACK_HEIGHT * i, width: LABEL_WIDTH, height: TRACK_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{label}</span>
              </div>
            ))}

            <div style={{ position: 'absolute', left: LABEL_WIDTH, right: 0, top: TRACK_HEIGHT, height: TRACK_HEIGHT }} id="video-track-slot" />
            <div style={{ position: 'absolute', left: LABEL_WIDTH, right: 0, top: TRACK_HEIGHT * 2, height: TRACK_HEIGHT }} id="audio-track-slot" />
          </div>
        </div>
      </div>

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
