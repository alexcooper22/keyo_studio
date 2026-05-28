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
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#1e1e1e', borderRadius: 12, padding: 24, width: 360,
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ color: 'white', fontSize: 15, fontWeight: 600, margin: 0 }}>Export MP4</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
          {state.clips.length} video clip{state.clips.length !== 1 ? 's' : ''}
          {state.audioTracks.length > 0 && ` · ${state.audioTracks.length} audio track${state.audioTracks.length !== 1 ? 's' : ''}`}
          {' · '}{state.duration.toFixed(1)}s total
        </div>

        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>
          {statusMessages[status]}
        </div>

        {(status === 'loading' || status === 'exporting') && (
          <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
            <div style={{
              height: '100%', background: '#c8ed4d', borderRadius: 2,
              width: status === 'loading' ? '30%' : `${progress}%`,
              transition: 'width 0.3s',
              animation: status === 'loading' ? 'pulse 1.5s ease-in-out infinite' : 'none',
            }} />
          </div>
        )}

        {status === 'error' && error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '8px 10px', marginBottom: 12, fontSize: 11, color: 'rgba(239,68,68,0.9)', wordBreak: 'break-all' }}>
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
                  background: '#c8ed4d', color: '#0e1004', fontSize: 13, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
                }}
              >
                ⬇ Download MP4
              </a>
              <button
                onClick={() => { if (downloadUrl) URL.revokeObjectURL(downloadUrl); setDownloadUrl(null); setStatus('idle'); setProgress(0) }}
                style={{ height: 36, padding: '0 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer' }}
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
                background: (status === 'loading' || status === 'exporting') ? 'rgba(200,237,77,0.3)' : '#c8ed4d',
                color: '#0e1004', fontSize: 13, fontWeight: 600,
              }}
            >
              {status === 'idle' || status === 'error' ? 'Start Export' : 'Exporting…'}
            </button>
          )}
        </div>

        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      </div>
    </div>
  )
}
