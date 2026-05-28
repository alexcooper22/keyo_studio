'use client'
import { useCallback, useRef, useState } from 'react'
import { useEditor } from '../../../lib/editor/EditorContext'
import type { AudioTrack } from '../../../lib/editor/types'
import Waveform from './Waveform'

function readAudioDuration(src: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement('audio')
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => resolve(audio.duration)
    audio.onerror = () => reject(new Error(`Failed to read audio metadata: ${src}`))
    audio.src = src
  })
}

export default function AudioPanel() {
  const { state, dispatch } = useEditor()
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback(async (files: FileList | File[]) => {
    setLoading(true)
    const fileArr = Array.from(files).filter(f => f.type.startsWith('audio/'))
    if (fileArr.length === 0) { setLoading(false); return }

    for (const file of fileArr) {
      const src = URL.createObjectURL(file)
      let duration = 0
      try {
        duration = await readAudioDuration(src)
      } catch {
        duration = 30
      }

      const track: AudioTrack = {
        id: crypto.randomUUID(),
        src,
        name: file.name.replace(/\.[^.]+$/, ''),
        startOnTimeline: 0,
        duration,
        trimStart: 0,
        trimEnd: 0,
        volume: 1,
      }
      dispatch({ type: 'ADD_AUDIO', track })
    }
    setLoading(false)
  }, [dispatch])

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
          border: dragging ? '1px solid rgba(99,102,241,0.6)' : '0.5px dashed rgba(99,102,241,0.22)',
          borderRadius: 10, padding: '18px 12px', textAlign: 'center', cursor: 'pointer',
          background: dragging ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.04)',
          transition: 'all 0.15s',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke={dragging ? 'rgba(129,140,248,0.8)' : 'rgba(99,102,241,0.5)'}
            strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
          {loading ? (
            <span style={{ color: 'rgba(129,140,248,0.7)' }}>Loading…</span>
          ) : (
            <>
              Drop audio files here<br />
              <span style={{ color: 'rgba(99,102,241,0.5)', fontSize: 10 }}>MP3, WAV, M4A</span>
            </>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        style={{ display: 'none' }}
        onChange={e => e.target.files && addFiles(e.target.files)}
      />

      {/* Track list */}
      {state.audioTracks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{
            fontSize: 9, color: 'rgba(99,102,241,0.55)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4,
            fontWeight: 600,
          }}>
            ✦ Audio tracks
          </div>
          {state.audioTracks.map(track => (
            <div
              key={track.id}
              onClick={() => dispatch({ type: 'SELECT', id: track.id })}
              style={{
                padding: '8px', borderRadius: 8, cursor: 'pointer',
                background: state.selectedId === track.id ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.025)',
                border: state.selectedId === track.id
                  ? '0.5px solid rgba(129,140,248,0.35)'
                  : '0.5px solid rgba(255,255,255,0.04)',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 170 }}>
                  {track.name}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); dispatch({ type: 'REMOVE_AUDIO', id: track.id }) }}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.18)', cursor: 'pointer', padding: '2px 4px', fontSize: 14, lineHeight: 1 }}
                >×</button>
              </div>
              <Waveform seed={track.id} color="rgba(129,140,248,0.65)" height={18} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
