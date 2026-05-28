'use client'
import { useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEditor } from '../../lib/editor/EditorContext'
import Logo from '../ui/Logo'

interface ToolbarProps {
  onExport: () => void
}

const navLinks = [
  { name: 'Explore', href: '/' },
  { name: 'Image',   href: '/image' },
  { name: 'Video',   href: '/video' },
  { name: 'Audio',   href: '/audio' },
  { name: 'Editor',  href: '/editor' },
]

export default function Toolbar({ onExport }: ToolbarProps) {
  const { state, dispatch } = useEditor()
  const pathname = usePathname()

  const zoomIn  = useCallback(() => dispatch({ type: 'SET_ZOOM', zoom: +(state.zoom * 1.25).toFixed(1) }), [state.zoom, dispatch])
  const zoomOut = useCallback(() => dispatch({ type: 'SET_ZOOM', zoom: +(state.zoom * 0.8).toFixed(1) }),  [state.zoom, dispatch])
  const undo    = useCallback(() => dispatch({ type: 'UNDO' }), [dispatch])

  const canExport = state.clips.length > 0

  return (
    <>
      <style>{`
        .editor-nav-active {
          color: rgba(170,140,255,0.95) !important;
          background: rgba(120,80,255,0.1);
          border: 0.5px solid rgba(120,80,255,0.22);
          border-radius: 20px;
        }
        .editor-toolbar-btn:hover { color: rgba(255,255,255,0.8) !important; }
      `}</style>

      <div style={{
        height: 60,
        background: 'rgba(6,6,6,0.88)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderBottom: 'none',
        display: 'flex', alignItems: 'center',
        padding: '0 16px',
        gap: 8,
        boxShadow: '0 0 0 1px rgba(83,47,207,0.06), 0 8px 40px rgba(0,0,0,0.5)',
        zIndex: 10,
        flexShrink: 0,
      }}>

        {/* Logo */}
        <Logo size={17} />

        {/* Center nav links */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          {navLinks.map(link => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.name}
                href={link.href}
                className={isActive ? 'editor-nav-active' : 'editor-toolbar-btn'}
                style={{
                  padding: '6px 14px',
                  fontFamily: 'var(--font-dm), DM Sans, sans-serif',
                  fontWeight: 500,
                  fontSize: 13,
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                  color: isActive ? 'rgba(170,140,255,0.95)' : 'rgba(255,255,255,0.38)',
                }}
              >
                {link.name}
              </Link>
            )
          })}
        </div>

        {/* Right: editor controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>

          {/* Undo */}
          <button
            onClick={undo}
            disabled={state.past.length === 0}
            style={{
              height: 28, padding: '0 10px',
              border: '0.5px solid rgba(255,255,255,0.08)',
              borderRadius: 20,
              background: 'rgba(255,255,255,0.03)',
              color: state.past.length === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)',
              fontSize: 11, cursor: state.past.length === 0 ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-dm), DM Sans, sans-serif',
              transition: 'all 0.15s',
            }}
          >
            ↩ Undo
          </button>

          {/* Divider */}
          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.07)' }} />

          {/* Zoom controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <button
              onClick={zoomOut}
              style={{
                width: 26, height: 26,
                border: '0.5px solid rgba(255,255,255,0.08)',
                borderRadius: 6, background: 'rgba(255,255,255,0.03)',
                color: 'rgba(255,255,255,0.5)', fontSize: 14,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >−</button>
            <span style={{
              fontSize: 10, color: 'rgba(255,255,255,0.25)', minWidth: 38, textAlign: 'center',
              fontVariantNumeric: 'tabular-nums', fontFamily: 'ui-monospace, monospace',
            }}>
              {Math.round(state.zoom / 40 * 100)}%
            </span>
            <button
              onClick={zoomIn}
              style={{
                width: 26, height: 26,
                border: '0.5px solid rgba(255,255,255,0.08)',
                borderRadius: 6, background: 'rgba(255,255,255,0.03)',
                color: 'rgba(255,255,255,0.5)', fontSize: 14,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >+</button>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.07)' }} />

          {/* Export button */}
          <button
            onClick={onExport}
            disabled={!canExport}
            style={{
              height: 30, padding: '0 14px', borderRadius: 20,
              border: canExport ? 'none' : '0.5px solid rgba(83,47,207,0.2)',
              cursor: canExport ? 'pointer' : 'not-allowed',
              background: canExport
                ? 'linear-gradient(135deg, #532fcf 0%, #6b4ef5 100%)'
                : 'rgba(83,47,207,0.06)',
              color: canExport ? '#fff' : 'rgba(120,80,255,0.3)',
              fontSize: 12, fontWeight: 600,
              fontFamily: 'var(--font-dm), DM Sans, sans-serif',
              letterSpacing: '0.02em',
              transition: 'all 0.15s',
              boxShadow: canExport ? '0 0 16px rgba(83,47,207,0.4)' : 'none',
            }}
          >
            Export MP4
          </button>
        </div>
      </div>
    </>
  )
}
