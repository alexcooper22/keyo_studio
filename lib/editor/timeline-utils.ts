import type { VideoClip, AudioTrack } from './types'

export function audioEffectiveDuration(track: AudioTrack): number {
  return Math.max(0, track.duration - (track.trimStart ?? 0) - (track.trimEnd ?? 0))
}

export function clipEffectiveDuration(clip: VideoClip): number {
  return Math.max(0, clip.originalDuration - clip.trimStart - clip.trimEnd)
}

export function clipEndTime(clip: VideoClip): number {
  return clip.startOnTimeline + clipEffectiveDuration(clip)
}

export function findActiveClip(clips: VideoClip[], playhead: number): VideoClip | null {
  return clips.find(c => {
    const end = clipEndTime(c)
    return c.startOnTimeline <= playhead && playhead < end
  }) ?? null
}

export function secondsToPixels(seconds: number, zoom: number): number {
  return seconds * zoom
}

export function pixelsToSeconds(pixels: number, zoom: number): number {
  return pixels / zoom
}

export function formatTimecode(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60).toString().padStart(2, '0')
  const f = Math.floor((seconds - Math.floor(seconds)) * 10)
  return `${m.toString().padStart(2, '0')}:${s}.${f}`
}
