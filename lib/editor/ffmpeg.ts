import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import type { VideoClip, AudioTrack } from './types'
import { clipEffectiveDuration } from './timeline-utils'

let instance: FFmpeg | null = null
let loadingPromise: Promise<FFmpeg> | null = null
let exportInFlight = false

const recentLogs: string[] = []

async function getFFmpeg(onProgress?: (pct: number) => void): Promise<FFmpeg> {
  if (instance) return instance
  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    const ffmpeg = new FFmpeg()

    ffmpeg.on('log', ({ message }) => {
      recentLogs.push(message)
      if (recentLogs.length > 60) recentLogs.shift()
    })

    if (onProgress) {
      ffmpeg.on('progress', ({ progress }) => {
        if (progress > 0) onProgress(Math.round(progress * 100))
      })
    }

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

// Run an ffmpeg command and throw a readable error if it fails.
async function run(ffmpeg: FFmpeg, args: string[]): Promise<void> {
  const ret = await ffmpeg.exec(args)
  if (ret !== 0) {
    const context = recentLogs.slice(-15).join('\n')
    throw new Error(`FFmpeg error (code ${ret}):\n${context}`)
  }
}

// Trim one clip to a normalized H.264/AAC file.
// If the source has no audio stream, adds a silent audio track so all
// trimmed clips have identical stream layout (required for concat).
async function trimClip(
  ffmpeg: FFmpeg,
  inputName: string,
  outName: string,
  trimStart: number,
  dur: number,
  volume: number,
): Promise<void> {
  const vf = 'scale=trunc(iw/2)*2:trunc(ih/2)*2'  // Ensure even dimensions for H.264
  const volumeFilter = volume !== 1 ? ['-af', `volume=${volume}`] : []

  // First attempt: encode with audio (most videos have audio)
  const withAudio = await ffmpeg.exec([
    '-ss', String(trimStart),
    '-i', inputName,
    '-t', String(Math.max(0.1, dur)),
    '-vf', vf,
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23',
    '-map', '0:v:0',
    '-map', '0:a:0',
    '-c:a', 'aac', '-ac', '2', '-ar', '44100',
    ...volumeFilter,
    '-avoid_negative_ts', 'make_zero',
    '-y',
    outName,
  ])

  if (withAudio === 0) return

  // Second attempt: video has no audio stream — add silent audio track
  const videoOnly = `${outName}_v.mp4`

  await run(ffmpeg, [
    '-ss', String(trimStart),
    '-i', inputName,
    '-t', String(Math.max(0.1, dur)),
    '-vf', vf,
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23',
    '-an',
    '-avoid_negative_ts', 'make_zero',
    '-y',
    videoOnly,
  ])

  // Add silent audio track matching the video duration
  await run(ffmpeg, [
    '-i', videoOnly,
    '-f', 'lavfi', '-i', `anullsrc=r=44100:cl=stereo`,
    '-c:v', 'copy',
    '-c:a', 'aac', '-ac', '2', '-ar', '44100',
    '-shortest',
    '-y',
    outName,
  ])
}

export async function exportToMp4(
  clips: VideoClip[],
  audioTracks: AudioTrack[],
  onProgress: (pct: number) => void
): Promise<Blob> {
  if (exportInFlight) throw new Error('An export is already in progress. Please wait for it to finish.')
  exportInFlight = true
  recentLogs.length = 0

  try {
    const ffmpeg = await getFFmpeg()
    onProgress(5)

    const sorted = [...clips].sort((a, b) => a.startOnTimeline - b.startOnTimeline)
    if (sorted.length === 0) throw new Error('No clips to export.')

    // ── Step 1: Trim + normalize each clip ──────────────────────────────────
    const trimmedNames: string[] = []
    for (let i = 0; i < sorted.length; i++) {
      const clip = sorted[i]
      const inputName = `in_${i}.mp4`
      const outName = `trimmed_${i}.mp4`

      const resp = await fetch(clip.src)
      if (!resp.ok) throw new Error(`Failed to read clip "${clip.filename}".`)
      await ffmpeg.writeFile(inputName, await fetchFile(await resp.blob()))

      const dur = clipEffectiveDuration(clip)
      if (dur <= 0) continue  // Skip zero-duration clips

      await trimClip(ffmpeg, inputName, outName, clip.trimStart, dur, clip.volume)
      trimmedNames.push(outName)
      onProgress(5 + (i + 1) / sorted.length * 35)
    }

    if (trimmedNames.length === 0) throw new Error('All clips have zero duration after trimming.')

    // ── Step 2: Concatenate clips ────────────────────────────────────────────
    // Re-encode during concat to handle any remaining parameter differences.
    const concatList = trimmedNames.map(n => `file '${n}'`).join('\n')
    await ffmpeg.writeFile('list.txt', concatList)

    await run(ffmpeg, [
      '-f', 'concat', '-safe', '0', '-i', 'list.txt',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23',
      '-c:a', 'aac', '-ac', '2', '-ar', '44100',
      '-y', 'merged.mp4',
    ])
    onProgress(55)

    // ── Step 3: Mix audio tracks ─────────────────────────────────────────────
    if (audioTracks.length === 0) {
      // No music — just copy merged as output
      await run(ffmpeg, ['-i', 'merged.mp4', '-c', 'copy', '-y', 'output.mp4'])
    } else {
      // Write + trim each audio track
      const audioNames: string[] = []
      for (let i = 0; i < audioTracks.length; i++) {
        const track = audioTracks[i]
        const rawName = `audio_raw_${i}.mp3`
        const aName = `audio_${i}.mp3`

        const resp = await fetch(track.src)
        if (!resp.ok) throw new Error(`Failed to read audio track "${track.name}".`)
        await ffmpeg.writeFile(rawName, await fetchFile(await resp.blob()))

        const trimStart = track.trimStart ?? 0
        const effectiveDur = track.duration - trimStart - (track.trimEnd ?? 0)

        if (trimStart > 0 || (track.trimEnd ?? 0) > 0) {
          await run(ffmpeg, ['-ss', String(trimStart), '-i', rawName, '-t', String(effectiveDur), '-c', 'copy', '-y', aName])
        } else {
          await run(ffmpeg, ['-i', rawName, '-c', 'copy', '-y', aName])
        }
        audioNames.push(aName)
      }
      onProgress(72)

      // Build amix filter: apply per-track volume then mix with video audio
      const inputs = ['-i', 'merged.mp4', ...audioNames.flatMap(a => ['-i', a])]
      const n = audioNames.length + 1
      const volFilters = audioNames
        .map((_, i) => `[${i + 1}:a]volume=${audioTracks[i].volume}[a${i}]`)
        .join(';')
      const mixInputs = '[0:a]' + audioNames.map((_, i) => `[a${i}]`).join('')
      const filterStr = `${volFilters};${mixInputs}amix=inputs=${n}:duration=first[aout]`

      await run(ffmpeg, [
        ...inputs,
        '-filter_complex', filterStr,
        '-map', '0:v',
        '-map', '[aout]',
        '-c:v', 'copy',
        '-c:a', 'aac', '-ac', '2', '-ar', '44100',
        '-y', 'output.mp4',
      ])
    }

    // ── Step 4: Read + return ────────────────────────────────────────────────
    onProgress(95)
    const data = await ffmpeg.readFile('output.mp4') as Uint8Array
    if (!data || data.length === 0) throw new Error('Export produced an empty file. Check browser console for FFmpeg logs.')
    onProgress(100)
    return new Blob([data.buffer as ArrayBuffer], { type: 'video/mp4' })

  } finally {
    exportInFlight = false
  }
}
