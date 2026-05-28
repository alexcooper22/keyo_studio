'use client'
import { useEditor } from '../../../lib/editor/EditorContext'
import AudioClipBlock from './AudioClipBlock'

const TRACK_HEIGHT = 40

export default function AudioTrack() {
  const { state } = useEditor()
  return (
    <div style={{ position: 'relative', width: '100%', height: TRACK_HEIGHT }}>
      {state.audioTracks.map(track => (
        <AudioClipBlock key={track.id} track={track} trackHeight={TRACK_HEIGHT} />
      ))}
    </div>
  )
}
