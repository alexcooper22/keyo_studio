'use client'
import { useCallback, useRef, useState } from 'react'
import { useEditor } from '../../../lib/editor/EditorContext'
import type { VideoClip } from '../../../lib/editor/types'
import { clipEndTime } from '../../../lib/editor/timeline-utils'

function readVideoDuration(src: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => resolve(video.duration)
    video.onerror = () => reject(new Error(`Failed to read video metadata: ${src}`))
    video.src = src
  })
}

function nextStartTime(clips: VideoClip[]): number {
  if (clips.length === 0) return 0
  return Math.max(...clips.map(clipEndTime))
}

export default function MediaPanel() {
  const { state, dispatch } = useEditor()
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback(async (files: FileList | File[]) => {
    setLoading(true)
    const fileArr = Array.from(files).filter(f => f.type.startsWith('video/'))
    if (fileArr.length === 0) { setLoading(false); return }

    let latestEnd = nextStartTime(state.clips)

    for (const file of fileArr) {
      const src = URL.createObjectURL(file)
      let duration = 0
      try {
        duration = await readVideoDuration(src)
      } catch {
        duration = 10
      }

      const clip: VideoClip = {
        id: crypto.randomUUID(),
        src,
        filename: file.name.replace(/\.[^.]+$/, ''),
        originalDuration: duration,
        trimStart: 0,
        trimEnd: 0,
        startOnTimeline: latestEnd,
        volume: 1,
      }
      dispatch({ type: 'ADD_CLIP', clip })
      latestEnd += duration
    }
    setLoading(false)
  }, [state.clips, dispatch])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }, [addFiles])

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, fontFamily: 'var(--font-dm), DM Sans, sans-serif' }}>
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: dragging ? '1px solid rgba(120,80,255,0.6)' : '0.5px dashed rgba(120,80,255,0.2)',
          borderRadius: 10, padding: '18px 12px', textAlign: 'center', cursor: 'pointer',
          background: dragging ? 'rgba(83,47,207,0.08)' : 'rgba(83,47,207,0.04)',
          transition: 'all 0.15s',
        }}
      >
        {/* Film SVG icon */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke={dragging ? 'rgba(155,126,255,0.8)' : 'rgba(120,80,255,0.45)'}
            strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="15" rx="1.5"/>
            <polyline points="17 2 22 7 2 7 7 2 17 2"/>
            <line x1="7" y1="2" x2="7" y2="7"/>
            <line x1="12" y1="2" x2="12" y2="7"/>
            <line x1="17" y1="2" x2="17" y2="7"/>
          </svg>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
          {loading ? (
            <span style={{ color: 'rgba(155,126,255,0.7)' }}>Loading…</span>
          ) : (
            <>
              Drop video files here<br />
              <span style={{ color: 'rgba(120,80,255,0.5)', fontSize: 10 }}>or click to browse</span>
            </>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        multiple
        style={{ display: 'none' }}
        onChange={e => e.target.files && addFiles(e.target.files)}
      />

      {/* Clip list */}
      {state.clips.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{
            fontSize: 9, color: 'rgba(120,80,255,0.5)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4,
            fontWeight: 600,
          }}>
            ✦ Project clips
          </div>
          {state.clips.map(clip => (
            <div
              key={clip.id}
              onClick={() => dispatch({ type: 'SELECT', id: clip.id })}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 8px', borderRadius: 8, cursor: 'pointer',
                background: state.selectedId === clip.id ? 'rgba(83,47,207,0.1)' : 'rgba(255,255,255,0.025)',
                border: state.selectedId === clip.id
                  ? '0.5px solid rgba(120,80,255,0.35)'
                  : '0.5px solid rgba(255,255,255,0.04)',
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: 30, height: 22, borderRadius: 4, flexShrink: 0,
                background: 'linear-gradient(135deg, rgba(83,47,207,0.5), rgba(60,30,180,0.35))',
                border: '0.5px solid rgba(120,80,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(200,170,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {clip.filename}
                </div>
                <div style={{ fontSize: 9, color: 'rgba(120,80,255,0.5)', fontVariantNumeric: 'tabular-nums', marginTop: 1 }}>
                  {(clip.originalDuration - clip.trimStart - clip.trimEnd).toFixed(1)}s
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); dispatch({ type: 'REMOVE_CLIP', id: clip.id }) }}
                style={{
                  background: 'none', border: 'none',
                  color: 'rgba(255,255,255,0.18)', cursor: 'pointer',
                  padding: '2px 4px', fontSize: 14, lineHeight: 1,
                  transition: 'color 0.15s',
                }}
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
