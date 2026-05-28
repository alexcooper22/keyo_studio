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
      <div style={{
        position: 'absolute', top: -1, left: -5,
        width: 10, height: 10,
        background: '#c8ed4d',
        clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
      }} />
    </div>
  )
}
