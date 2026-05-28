import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import type { VideoClip, AudioTrack } from './types'
import { clipEffectiveDuration } from './timeline-utils'

let instance: FFmpeg | null = null
let loadingPromise: Promise<FFmpeg> | null = null
let exportInFlight = false

const ffmpegLogs: string[] = []

async function getFFmpeg(): Promise<FFmpeg> {
  if (instance) return instance
  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    const ffmpeg = new FFmpeg()

    ffmpeg.on('log', ({ message }) => {
      ffmpegLogs.push(message)
      if (ffmpegLogs.length > 80) ffmpegLogs.shift()
      if (message.includes('Error') || message.includes('error')) {
        console.warn('[ffmpeg]', message)
      }
    })

    // Load from our own domain — faster, no CDN dependency, no CORS issues
    await ffmpeg.load({
      coreURL: '/ffmpeg/ffmpeg-core.js',
      wasmURL: '/ffmpeg/ffmpeg-core.wasm',
    })

    instance = ffmpeg
    loadingPromise = null
    return ffmpeg
  })()

  return loadingPromise
}

// Run an ffmpeg command. Returns exit code.
// Throws with last FFmpeg log lines on non-zero exit.
async function run(ffmpeg: FFmpeg, args: string[]): Promise<void> {
  const ret = await ffmpeg.exec(args)
  if (ret !== 0) {
    const ctx = ffmpegLogs.slice(-20).join('\n')
    throw new Error(`FFmpeg failed (code ${ret}):\n${ctx}`)
  }
}

// Generate a silent stereo PCM WAV of the given duration.
// Used as a fallback audio source for video-only clips.
function makeSilentWav(durationSeconds: number): Uint8Array {
  const sampleRate = 44100
  const numChannels = 2
  const bitsPerSample = 16
  const numSamples = Math.ceil(durationSeconds * sampleRate)
  const dataSize = numSamples * numChannels * (bitsPerSample / 8)
  const buf = new ArrayBuffer(44 + dataSize)
  const v = new DataView(buf)
  const str = (off: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)) }
  str(0, 'RIFF'); v.setUint32(4, 36 + dataSize, true); str(8, 'WAVE')
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true)
  v.setUint16(22, numChannels, true); v.setUint32(24, sampleRate, true)
  v.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true)
  v.setUint16(32, numChannels * bitsPerSample / 8, true); v.setUint16(34, bitsPerSample, true)
  str(36, 'data'); v.setUint32(40, dataSize, true)
  return new Uint8Array(buf)  // data section is all zeros = silence
}

// Trim one clip to a normalized H.264/AAC file.
// Fast path: stream copy (no re-encoding).
// Slow path: re-encode if copy fails (different codec, HEVC, etc.).
// Audio fallback: if clip has no audio, adds a silent WAV track.
async function trimClip(
  ffmpeg: FFmpeg,
  inputName: string,
  outName: string,
  trimStart: number,
  dur: number,
  volume: number,
): Promise<void> {
  const clampedDur = Math.max(0.1, dur)
  const ss = ['-ss', String(trimStart), '-i', inputName, '-t', String(clampedDur)]

  // ── Fast path: stream copy ───────────────────────────────────────────────
  // Works for most H.264/AAC MP4 files. Nearly instant (no re-encoding).
  const copyCode = await ffmpeg.exec([
    ...ss,
    '-map', '0:v:0', '-map', '0:a:0',
    '-c', 'copy',
    '-avoid_negative_ts', 'make_zero',
    '-y', outName,
  ])

  if (copyCode === 0) {
    // Apply volume if needed (requires audio re-encode, fast because AAC→AAC)
    if (volume !== 1) {
      const tempName = `${outName}_vol.mp4`
      await run(ffmpeg, [
        '-i', outName,
        '-af', `volume=${volume}`,
        '-c:v', 'copy', '-c:a', 'aac',
        '-y', tempName,
      ])
      await ffmpeg.deleteFile(outName)
      await ffmpeg.rename(tempName, outName)
    }
    return
  }

  // ── Slow path: re-encode ──────────────────────────────────────────────────
  // Used when: HEVC input, different codec, AVI, WebM, etc.
  const volFilter = volume !== 1 ? ['-af', `volume=${volume}`] : []

  const encCode = await ffmpeg.exec([
    ...ss,
    '-map', '0:v:0', '-map', '0:a:0',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '26',
    '-c:a', 'aac', '-ac', '2', '-ar', '44100',
    ...volFilter,
    '-y', outName,
  ])

  if (encCode === 0) return

  // ── Fallback: video has no audio stream ───────────────────────────────────
  // Write silent WAV, then mux with video-only stream.
  const silName = `${outName}_sil.wav`
  await ffmpeg.writeFile(silName, makeSilentWav(clampedDur + 1))

  const videoOnly = `${outName}_v.mp4`
  await run(ffmpeg, [
    ...ss,
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '26',
    '-an', '-y', videoOnly,
  ])

  await run(ffmpeg, [
    '-i', videoOnly,
    '-i', silName,
    '-map', '0:v:0', '-map', '1:a:0',
    '-c:v', 'copy', '-c:a', 'aac', '-ac', '2', '-ar', '44100',
    '-shortest',
    '-y', outName,
  ])
}

export async function exportToMp4(
  clips: VideoClip[],
  audioTracks: AudioTrack[],
  onProgress: (pct: number) => void
): Promise<Blob> {
  if (exportInFlight) throw new Error('An export is already in progress.')
  exportInFlight = true
  ffmpegLogs.length = 0

  try {
    onProgress(2)
    const ffmpeg = await getFFmpeg()
    onProgress(8)

    const sorted = [...clips].sort((a, b) => a.startOnTimeline - b.startOnTimeline)
    if (sorted.length === 0) throw new Error('No clips to export.')

    // ── Step 1: Trim + normalize each clip ──────────────────────────────────
    const trimmedNames: string[] = []

    for (let i = 0; i < sorted.length; i++) {
      const clip = sorted[i]
      const dur = clipEffectiveDuration(clip)
      if (dur <= 0) continue

      const inputName = `in_${i}.mp4`
      const outName = `trimmed_${i}.mp4`

      const resp = await fetch(clip.src)
      if (!resp.ok) throw new Error(`Could not read clip "${clip.filename}" from memory.`)
      await ffmpeg.writeFile(inputName, await fetchFile(await resp.blob()))

      await trimClip(ffmpeg, inputName, outName, clip.trimStart, dur, clip.volume)
      trimmedNames.push(outName)
      onProgress(8 + (i + 1) / sorted.length * 40)
    }

    if (trimmedNames.length === 0) throw new Error('All clips have zero duration after trimming.')

    // ── Step 2: Concatenate clips ────────────────────────────────────────────
    let mergedFile = 'merged.mp4'

    if (trimmedNames.length === 1) {
      // Single clip — skip concat
      mergedFile = trimmedNames[0]
    } else {
      const listContent = trimmedNames.map(n => `file '${n}'`).join('\n')
      await ffmpeg.writeFile('list.txt', listContent)

      // Try fast path: stream copy (works when all clips have same codec params)
      const concatCopyCode = await ffmpeg.exec([
        '-f', 'concat', '-safe', '0', '-i', 'list.txt',
        '-c', 'copy',
        '-y', mergedFile,
      ])

      if (concatCopyCode !== 0) {
        // Slow path: re-encode concat (handles different resolutions/framerates)
        await run(ffmpeg, [
          '-f', 'concat', '-safe', '0', '-i', 'list.txt',
          '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '26',
          '-c:a', 'aac', '-ac', '2', '-ar', '44100',
          '-y', mergedFile,
        ])
      }
    }
    onProgress(60)

    // ── Step 3: Mix music tracks ─────────────────────────────────────────────
    const outFile = 'output.mp4'

    if (audioTracks.length === 0) {
      if (mergedFile !== outFile) {
        await run(ffmpeg, ['-i', mergedFile, '-c', 'copy', '-y', outFile])
      } else {
        await ffmpeg.rename(mergedFile, outFile)
      }
    } else {
      // Write + trim each music track
      const audioFileNames: string[] = []
      for (let i = 0; i < audioTracks.length; i++) {
        const track = audioTracks[i]
        const rawName = `mus_raw_${i}.mp3`
        const aName = `mus_${i}.mp3`

        const resp = await fetch(track.src)
        if (!resp.ok) throw new Error(`Could not read audio track "${track.name}".`)
        await ffmpeg.writeFile(rawName, await fetchFile(await resp.blob()))

        const ts = track.trimStart ?? 0
        const ed = track.duration - ts - (track.trimEnd ?? 0)

        if (ts > 0 || (track.trimEnd ?? 0) > 0) {
          await run(ffmpeg, ['-ss', String(ts), '-i', rawName, '-t', String(ed), '-c', 'copy', '-y', aName])
        } else {
          await run(ffmpeg, ['-i', rawName, '-c', 'copy', '-y', aName])
        }
        audioFileNames.push(aName)
      }
      onProgress(78)

      // Build amix filter: per-track volume + mix with original video audio
      const n = audioFileNames.length + 1
      const volFilters = audioFileNames
        .map((_, i) => `[${i + 1}:a]volume=${audioTracks[i].volume}[ma${i}]`)
        .join(';')
      const mixInputs = '[0:a]' + audioFileNames.map((_, i) => `[ma${i}]`).join('')
      const filterStr = `${volFilters};${mixInputs}amix=inputs=${n}:duration=first:normalize=0[aout]`

      await run(ffmpeg, [
        '-i', mergedFile,
        ...audioFileNames.flatMap(a => ['-i', a]),
        '-filter_complex', filterStr,
        '-map', '0:v',
        '-map', '[aout]',
        '-c:v', 'copy',
        '-c:a', 'aac', '-ac', '2', '-ar', '44100',
        '-y', outFile,
      ])
    }

    // ── Step 4: Read result ──────────────────────────────────────────────────
    onProgress(96)
    const data = await ffmpeg.readFile(outFile) as Uint8Array
    if (!data || data.length < 100) {
      throw new Error(`Export produced an invalid file. Check browser console (F12) for FFmpeg errors.`)
    }
    onProgress(100)
    return new Blob([data.buffer as ArrayBuffer], { type: 'video/mp4' })

  } finally {
    exportInFlight = false
  }
}
