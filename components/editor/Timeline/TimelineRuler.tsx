'use client'
import { useCallback } from 'react'
import { useEditor } from '../../../lib/editor/EditorContext'
import { secondsToPixels, pixelsToSeconds, formatTimecode } from '../../../lib/editor/timeline-utils'

const RULER_HEIGHT = 24
const LABEL_WIDTH = 40

export default function TimelineRuler({ totalWidth }: { totalWidth: number }) {
  const { state, dispatch } = useEditor()
  const { zoom, duration } = state

  const step = zoom >= 80 ? 0.5 : zoom >= 40 ? 1 : 2
  const ticks: { s: number; major: boolean }[] = []
  for (let s = 0; s <= duration + step; s += step) {
    ticks.push({ s: parseFloat(s.toFixed(1)), major: s % 2 === 0 })
  }

  const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const time = pixelsToSeconds(Math.max(0, x - LABEL_WIDTH), zoom)
    dispatch({ type: 'SET_PLAYHEAD', time })
  }, [zoom, dispatch])

  return (
    <svg
      width={totalWidth}
      height={RULER_HEIGHT}
      style={{ display: 'block', flexShrink: 0, cursor: 'pointer' }}
      onClick={handleClick}
    >
      <rect width={totalWidth} height={RULER_HEIGHT} fill="#1e1e1e" />
      {/* Label gutter background */}
      <rect width={LABEL_WIDTH} height={RULER_HEIGHT} fill="#1a1a1a" />
      {ticks.map(({ s, major }) => {
        const x = LABEL_WIDTH + secondsToPixels(s, zoom)
        return (
          <g key={s}>
            <line x1={x} y1={major ? 10 : 16} x2={x} y2={RULER_HEIGHT} stroke="rgba(255,255,255,0.15)" strokeWidth={major ? 1 : 0.5} />
            {major && (
              <text x={x + 3} y={10} fill="rgba(255,255,255,0.35)" fontSize={9} fontFamily="ui-monospace, monospace">
                {formatTimecode(s)}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
