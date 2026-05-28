export interface VideoClip {
  id: string
  src: string               // blob URL from File
  filename: string
  originalDuration: number  // full source duration in seconds
  trimStart: number         // seconds cut from start of source
  trimEnd: number           // seconds cut from end of source
  startOnTimeline: number   // position on timeline in seconds
  volume: number            // 0–1
}

export interface AudioTrack {
  id: string
  src: string               // blob URL from File
  name: string
  startOnTimeline: number
  duration: number          // full source file duration in seconds (no trim for audio in v1)
  volume: number            // 0–1
}

export type EditorAction =
  | { type: 'ADD_CLIP'; clip: VideoClip }
  | { type: 'REMOVE_CLIP'; id: string }
  | { type: 'MOVE_CLIP'; id: string; startOnTimeline: number }
  | { type: 'TRIM_CLIP'; id: string; trimStart: number; trimEnd: number; startOnTimeline?: number }
  | { type: 'ADD_AUDIO'; track: AudioTrack }
  | { type: 'REMOVE_AUDIO'; id: string }
  | { type: 'MOVE_AUDIO'; id: string; startOnTimeline: number }
  | { type: 'SET_PLAYHEAD'; time: number }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'SELECT'; id: string | null }
  | { type: 'SET_PLAYING'; playing: boolean }
  | { type: 'UNDO' }
  | { type: 'SET_CLIP_VOLUME'; id: string; volume: number }
  | { type: 'SET_AUDIO_VOLUME'; id: string; volume: number }

export interface HistorySnapshot {
  clips: VideoClip[]
  audioTracks: AudioTrack[]
}

export interface EditorState {
  clips: VideoClip[]
  audioTracks: AudioTrack[]
  playhead: number
  duration: number          // derived: max end time across all clips
  zoom: number              // pixels per second (default 40)
  selectedId: string | null
  playing: boolean
  past: HistorySnapshot[]   // undo history (max 50)
}
