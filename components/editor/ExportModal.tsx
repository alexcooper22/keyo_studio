'use client'
import { useState, useCallback, useEffect } from 'react'
import { useEditor } from '../../lib/editor/EditorContext'
import { exportToMp4 } from '../../lib/editor/ffmpeg'

interface ExportModalProps {
  onClose: () => void
}

type ExportStatus = 'idle' | 'loading' | 'exporting' | 'done' | 'error'

export default function ExportModal({ onClose }: ExportModalProps) {
  const { state } = useEditor()
  const [status, setStatus] = useState<ExportStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Revoke the blob URL when it changes or the component unmounts
  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    }
  }, [downloadUrl])

  const startExport = useCallback(async () => {
    setStatus('loading')
    setProgress(0)
    setError(null)
    setDownloadUrl(null)

    try {
      const blob = await exportToMp4(state.clips, state.audioTracks, (pct) => {
        setStatus('exporting')
        setProgress(Math.round(pct))
      })
      const url = URL.createObjectURL(blob)
      setDownloadUrl(url)
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
      setStatus('error')
    }
  }, [state.clips, state.audioTracks])

  const statusMessages: Record<ExportStatus, string> = {
    idle: 'Ready to export',
    loading: 'Loading FFmpeg (~32MB, first time only)…',
    exporting: `Exporting… ${progress}%`,
    done: 'Export complete!',
    error: 'Export failed',
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#0f0f0f',
        borderRadius: 14,
        padding: 24,
        width: 360,
        border: '0.5px solid rgba(120,80,255,0.2)',
        boxShadow: '0 0 60px rgba(83,47,207,0.2), 0 24px 60px rgba(0,0,0,0.7)',
        fontFamily: 'var(--font-dm), DM Sans, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle top shimmer */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(120,80,255,0.4), transparent)',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'rgba(83,47,207,0.1)', border: '0.5px solid rgba(83,47,207,0.3)',
              borderRadius: 20, padding: '3px 10px',
            }}>
              <span style={{ color: 'rgba(120,80,255,0.8)', fontSize: 8 }}>✦</span>
              <span style={{
                fontFamily: 'var(--font-clash), Clash Display, sans-serif',
                fontSize: 11, fontWeight: 600, letterSpacing: '0.5px',
                background: 'linear-gradient(135deg, #c4b0ff 0%, #9b7eff 50%, #7b5ef8 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                Export MP4
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)',
              borderRadius: 6, color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
              width: 24, height: 24, fontSize: 14, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >×</button>
        </div>

        <div style={{
          background: 'rgba(83,47,207,0.06)',
          border: '0.5px solid rgba(120,80,255,0.15)',
          borderRadius: 8, padding: '10px 12px', marginBottom: 16,
          fontSize: 11, color: 'rgba(255,255,255,0.45)',
        }}>
          {state.clips.length} video clip{state.clips.length !== 1 ? 's' : ''}
          {state.audioTracks.length > 0 && ` · ${state.audioTracks.length} audio track${state.audioTracks.length !== 1 ? 's' : ''}`}
          {' · '}{state.duration.toFixed(1)}s total
        </div>

        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 14, letterSpacing: '0.01em' }}>
          {statusMessages[status]}
        </div>

        {(status === 'loading' || status === 'exporting') && (
          <div style={{ height: 3, background: 'rgba(120,80,255,0.12)', borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg, #532fcf, #9b7eff)',
              borderRadius: 2,
              width: status === 'loading' ? '30%' : `${progress}%`,
              transition: 'width 0.3s',
              animation: status === 'loading' ? 'kpulse 1.5s ease-in-out infinite' : 'none',
              boxShadow: '0 0 8px rgba(120,80,255,0.6)',
            }} />
          </div>
        )}

        {status === 'error' && error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '0.5px solid rgba(239,68,68,0.25)',
            borderRadius: 8, padding: '8px 10px', marginBottom: 14,
            fontSize: 10, color: 'rgba(239,68,68,0.85)', wordBreak: 'break-all',
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          {status === 'done' && downloadUrl ? (
            <>
              <a
                href={downloadUrl}
                download="keyo-export.mp4"
                style={{
                  flex: 1, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #532fcf 0%, #7b5ef8 100%)',
                  color: '#fff', fontSize: 12, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
                  gap: 6, letterSpacing: '0.02em',
                  boxShadow: '0 0 20px rgba(83,47,207,0.4)',
                  fontFamily: 'var(--font-dm), DM Sans, sans-serif',
                }}
              >
                ⬇ Download MP4
              </a>
              <button
                onClick={() => { if (downloadUrl) URL.revokeObjectURL(downloadUrl); setDownloadUrl(null); setStatus('idle'); setProgress(0) }}
                style={{
                  height: 36, padding: '0 14px', borderRadius: 8,
                  border: '0.5px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)',
                  color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer',
                  fontFamily: 'var(--font-dm), DM Sans, sans-serif',
                }}
              >
                Re-export
              </button>
            </>
          ) : (
            <button
              onClick={startExport}
              disabled={status === 'loading' || status === 'exporting'}
              style={{
                flex: 1, height: 36, borderRadius: 8, border: 'none',
                cursor: (status === 'loading' || status === 'exporting') ? 'not-allowed' : 'pointer',
                background: (status === 'loading' || status === 'exporting')
                  ? 'rgba(83,47,207,0.2)'
                  : 'linear-gradient(135deg, #532fcf 0%, #7b5ef8 100%)',
                color: (status === 'loading' || status === 'exporting') ? 'rgba(155,126,255,0.4)' : '#fff',
                fontSize: 12, fontWeight: 600,
                letterSpacing: '0.02em',
                fontFamily: 'var(--font-dm), DM Sans, sans-serif',
                boxShadow: (status === 'loading' || status === 'exporting') ? 'none' : '0 0 20px rgba(83,47,207,0.4)',
                transition: 'all 0.15s',
              }}
            >
              {status === 'idle' || status === 'error' ? 'Start Export' : 'Exporting…'}
            </button>
          )}
        </div>

        <style>{`@keyframes kpulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      </div>
    </div>
  )
}
