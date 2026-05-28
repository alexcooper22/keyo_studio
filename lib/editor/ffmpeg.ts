import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import type { VideoClip, AudioTrack } from './types'
import { clipEffectiveDuration } from './timeline-utils'

let instance: FFmpeg | null = null
let loadingPromise: Promise<FFmpeg> | null = null
let exportInFlight = false

async function getFFmpeg(): Promise<FFmpeg> {
  if (instance) return instance
  if (loadingPromise) return loadingPromise
  loadingPromise = (async () => {
    const ffmpeg = new FFmpeg()
    const base = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
    await ffmpeg.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
    })
    instance = ffmpeg
    loadingPromise = null
    return ffmpeg
  })()
  return loadingPromise
}

export async function exportToMp4(
  clips: VideoClip[],
  audioTracks: AudioTrack[],
  onProgress: (pct: number) => void
): Promise<Blob> {
  if (exportInFlight) throw new Error('An export is already in progress. Please wait for it to finish.')
  exportInFlight = true

  try {
    const ffmpeg = await getFFmpeg()
    onProgress(5)

    const sorted = [...clips].sort((a, b) => a.startOnTimeline - b.startOnTimeline)

    const trimmedNames: string[] = []
    for (let i = 0; i < sorted.length; i++) {
      const clip = sorted[i]
      const inputName = `in_${i}.mp4`
      const outName = `trimmed_${i}.mp4`

      const resp = await fetch(clip.src)
      const blob = await resp.blob()
      await ffmpeg.writeFile(inputName, await fetchFile(blob))

      const dur = clipEffectiveDuration(clip)
      const audioFilter = clip.volume !== 1 ? ['-filter:a', `volume=${clip.volume}`] : []
      await ffmpeg.exec([
        '-ss', String(clip.trimStart),
        '-i', inputName,
        '-t', String(dur),
        '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23',
        '-c:a', 'aac',
        ...audioFilter,
        outName,
      ])
      trimmedNames.push(outName)
      onProgress(5 + (i + 1) / sorted.length * 40)
    }

    const concatList = trimmedNames.map(n => `file '${n}'`).join('\n')
    await ffmpeg.writeFile('list.txt', concatList)
    await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', 'merged.mp4'])
    onProgress(55)

    if (audioTracks.length > 0) {
      const audioNames: string[] = []
      for (let i = 0; i < audioTracks.length; i++) {
        const track = audioTracks[i]
        const rawName = `audio_raw_${i}.mp3`
        const aName = `audio_${i}.mp3`
        const resp = await fetch(track.src)
        const blob = await resp.blob()
        await ffmpeg.writeFile(rawName, await fetchFile(blob))

        const trimStart = track.trimStart ?? 0
        const effectiveDur = track.duration - trimStart - (track.trimEnd ?? 0)
        if (trimStart > 0 || (track.trimEnd ?? 0) > 0) {
          await ffmpeg.exec(['-ss', String(trimStart), '-i', rawName, '-t', String(effectiveDur), '-c', 'copy', aName])
        } else {
          await ffmpeg.exec(['-i', rawName, '-c', 'copy', aName])
        }
        audioNames.push(aName)
      }
      onProgress(70)

      const inputs = ['-i', 'merged.mp4', ...audioNames.flatMap(a => ['-i', a])]
      const n = audioNames.length + 1
      // Apply per-track volume to each audio input, then amix with video audio
      const volFilters = audioNames.map((_, i) => `[${i + 1}:a]volume=${audioTracks[i].volume}[a${i}]`).join(';')
      const mixInputs = '[0:a]' + audioNames.map((_, i) => `[a${i}]`).join('')
      const filterStr = `${volFilters};${mixInputs}amix=inputs=${n}:duration=first[aout]`

      await ffmpeg.exec([
        ...inputs,
        '-filter_complex', filterStr,
        '-map', '0:v',
        '-map', '[aout]',
        '-c:v', 'copy',
        'output.mp4',
      ])
    } else {
      await ffmpeg.exec(['-i', 'merged.mp4', '-c', 'copy', 'output.mp4'])
    }

    onProgress(95)
    const data = await ffmpeg.readFile('output.mp4') as Uint8Array
    onProgress(100)
    return new Blob([data.buffer as ArrayBuffer], { type: 'video/mp4' })
  } finally {
    exportInFlight = false
  }
}
