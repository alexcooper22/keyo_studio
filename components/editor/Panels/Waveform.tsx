'use client'
import { useMemo } from 'react'

interface WaveformProps {
  seed: string
  bars?: number
  height?: number
  color?: string
}

export default function Waveform({ seed, bars = 48, height = 20, color = 'rgba(255,255,255,0.5)' }: WaveformProps) {
  const data = useMemo(() => {
    let s = 0
    for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) | 0
    const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
    return Array.from({ length: bars }, (_, i) => {
      const t = i / bars
      const v = 0.4 + 0.4 * Math.abs(Math.sin(t * 8 + s)) + 0.2 * (rand() - 0.5)
      return Math.max(0.1, Math.min(1, v))
    })
  }, [seed, bars])

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${bars * 3} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      {data.map((v, i) => {
        const h = v * (height - 2)
        return (
          <rect
            key={i}
            x={i * 3 + 0.5}
            y={(height - h) / 2}
            width={1.6}
            height={h}
            rx={0.8}
            fill={color}
          />
        )
      })}
    </svg>
  )
}
