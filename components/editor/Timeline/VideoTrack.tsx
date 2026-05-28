'use client'
import { useEditor } from '../../../lib/editor/EditorContext'
import ClipBlock from './ClipBlock'

const TRACK_HEIGHT = 40

export default function VideoTrack() {
  const { state } = useEditor()
  return (
    <div style={{ position: 'relative', width: '100%', height: TRACK_HEIGHT }}>
      {state.clips.map(clip => (
        <ClipBlock key={clip.id} clip={clip} trackHeight={TRACK_HEIGHT} />
      ))}
    </div>
  )
}
