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
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `1.5px dashed ${dragging ? '#ec4899' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: 8, padding: '20px 12px', textAlign: 'center', cursor: 'pointer',
          background: dragging ? 'rgba(236,72,153,0.05)' : 'rgba(255,255,255,0.02)',
          transition: 'all 0.15s',
        }}
      >
        <div style={{ fontSize: 22, marginBottom: 6 }}>🎵</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
          {loading ? 'Loading...' : (
            <>
              Drop audio files here<br />
              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>MP3, WAV, M4A</span>
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
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
            Audio tracks
          </div>
          {state.audioTracks.map(track => (
            <div
              key={track.id}
              onClick={() => dispatch({ type: 'SELECT', id: track.id })}
              style={{
                padding: '8px', borderRadius: 6, cursor: 'pointer',
                background: state.selectedId === track.id ? 'rgba(236,72,153,0.08)' : 'rgba(255,255,255,0.03)',
                border: state.selectedId === track.id ? '1px solid rgba(236,72,153,0.2)' : '1px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
                  {track.name}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); dispatch({ type: 'REMOVE_AUDIO', id: track.id }) }}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: 2, fontSize: 14, lineHeight: 1 }}
                >×</button>
              </div>
              <Waveform seed={track.id} color="rgba(236,72,153,0.6)" height={18} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
