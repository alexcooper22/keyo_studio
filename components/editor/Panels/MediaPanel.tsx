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
    video.onerror = reject
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
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `1.5px dashed ${dragging ? '#c8ed4d' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: 8, padding: '20px 12px', textAlign: 'center', cursor: 'pointer',
          background: dragging ? 'rgba(200,237,77,0.05)' : 'rgba(255,255,255,0.02)',
          transition: 'all 0.15s',
        }}
      >
        <div style={{ fontSize: 22, marginBottom: 6 }}>🎬</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
          {loading ? 'Loading...' : (
            <>
              Drop video files here<br />
              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>or click to browse</span>
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
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
            Project clips
          </div>
          {state.clips.map(clip => (
            <div
              key={clip.id}
              onClick={() => dispatch({ type: 'SELECT', id: clip.id })}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                background: state.selectedId === clip.id ? 'rgba(200,237,77,0.08)' : 'rgba(255,255,255,0.03)',
                border: state.selectedId === clip.id ? '1px solid rgba(200,237,77,0.2)' : '1px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ width: 32, height: 24, background: 'rgba(120,80,255,0.3)', borderRadius: 3, flexShrink: 0 }} />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {clip.filename}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontVariantNumeric: 'tabular-nums' }}>
                  {(clip.originalDuration - clip.trimStart - clip.trimEnd).toFixed(1)}s
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); dispatch({ type: 'REMOVE_CLIP', id: clip.id }) }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: 2, fontSize: 14, lineHeight: 1 }}
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
