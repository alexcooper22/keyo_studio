'use client'
import { useCallback } from 'react'
import { useEditor } from '../../lib/editor/EditorContext'

interface ToolbarProps {
  onExport: () => void
}

export default function Toolbar({ onExport }: ToolbarProps) {
  const { state, dispatch } = useEditor()

  const zoomIn = useCallback(
    () => dispatch({ type: 'SET_ZOOM', zoom: +(state.zoom * 1.25).toFixed(1) }),
    [state.zoom, dispatch]
  )
  const zoomOut = useCallback(
    () => dispatch({ type: 'SET_ZOOM', zoom: +(state.zoom * 0.8).toFixed(1) }),
    [state.zoom, dispatch]
  )
  const undo = useCallback(() => dispatch({ type: 'UNDO' }), [dispatch])

  const btn = (label: string, onClick: () => void, disabled = false) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 28, padding: '0 10px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6,
        background: 'rgba(255,255,255,0.04)', color: disabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)',
        fontSize: 12, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{
      height: 48, background: '#1a1a1a', borderBottom: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8,
    }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#c8ed4d', marginRight: 8, letterSpacing: '-0.3px' }}>
        keyo editor
      </span>

      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />

      {btn('↩ Undo', undo, state.past.length === 0)}

      <div style={{ flex: 1 }} />

      {btn('−', zoomOut)}
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', minWidth: 36, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
        {Math.round(state.zoom / 40 * 100)}%
      </span>
      {btn('+', zoomIn)}

      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />

      <button
        onClick={onExport}
        disabled={state.clips.length === 0}
        style={{
          height: 28, padding: '0 14px', borderRadius: 6, border: 'none',
          cursor: state.clips.length === 0 ? 'not-allowed' : 'pointer',
          background: state.clips.length === 0 ? 'rgba(200,237,77,0.2)' : '#c8ed4d',
          color: state.clips.length === 0 ? 'rgba(200,237,77,0.4)' : '#0e1004',
          fontSize: 12, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s',
        }}
      >
        Export MP4
      </button>
    </div>
  )
}
