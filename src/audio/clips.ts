import { audio } from './sfx'

// A grown-up's own voice, kept in IndexedDB on this device: each letter's sound, filed under the
// letter, and the pieces of the script, filed under their id (see script() in content.ts).
// A real voice beats any speech engine, so the game uses these wherever they cover a line.

const DB = 'kippers-basket'
const STORE = 'sounds'

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db()
  return new Promise((resolve, reject) => {
    const req = fn(d.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export interface Clip {
  buffer: AudioBuffer
  start: number
  end: number
  /** Brings every recording to the same loudness, however near the mic it was said. */
  gain: number
}

// Recordings stay as compressed blobs until they're needed: a whole script decoded is tens of megabytes.
const blobs = new Map<string, Blob>()
const decoded = new Map<string, Promise<Clip | null>>()

/** Loudness while speaking. The limiter in speech.ts lifts this level with the recorded voices. */
const TARGET = 0.1

/**
 * Find where the speaking starts and stops, and how much to lift it. Works on 10ms frames,
 * skips the taps that started and stopped the recording, and keeps quiet word endings ("leaf").
 * Null when there's nothing but silence.
 */
function shape(buffer: AudioBuffer): Clip | null {
  const d = buffer.getChannelData(0)
  const rate = buffer.sampleRate
  const hop = Math.round(rate / 100)
  const frames: number[] = []
  for (let i = 0; i + hop <= d.length; i += hop) {
    let sum = 0
    for (let j = i; j < i + hop; j++) sum += d[j] * d[j]
    frames.push(Math.sqrt(sum / hop))
  }
  const from = Math.min(8, frames.length)
  const to = Math.max(from, frames.length - 15)
  const body = frames.slice(from, to)
  const loud = body.reduce((m, f) => Math.max(m, f), 0)
  const floor = [...body].sort((a, b) => a - b)[Math.floor(body.length * 0.1)] ?? 0
  const level = Math.max(loud * 0.03, floor * 2.5, 0.0005)
  const a = body.findIndex((f) => f > level)
  if (a < 0 || loud < floor * 4) return null
  const b = body.findLastIndex((f) => f > level)
  // Loudness over the frames with speech in them, so pauses between words don't count.
  const voiced = body.slice(a, b + 1).filter((f) => f > loud * 0.1)
  const rms = Math.sqrt(voiced.reduce((s, f) => s + f * f, 0) / voiced.length)
  return {
    buffer,
    start: Math.max(0, ((from + a) * hop) / rate - 0.08),
    end: Math.min(buffer.duration, ((from + b + 1) * hop) / rate + 0.12),
    gain: Math.min(10, Math.max(0.25, TARGET / rms)),
  }
}

export const canRecord = () => window.isSecureContext && 'mediaDevices' in navigator && 'MediaRecorder' in window

export async function loadClips() {
  try {
    const d = await db()
    await new Promise<void>((resolve, reject) => {
      const req = d.transaction(STORE).objectStore(STORE).openCursor()
      req.onsuccess = () => {
        const c = req.result
        if (!c) return resolve()
        blobs.set(String(c.key), c.value as Blob)
        c.continue()
      }
      req.onerror = () => reject(req.error)
    })
  } catch {
    // No IndexedDB (private mode): speech only.
  }
}

export const hasClip = (key: string) => blobs.has(key)

/** A recording, ready to play. Decoded the first time it's asked for. */
export function getClip(key: string): Promise<Clip | null> {
  let p = decoded.get(key)
  if (!p) {
    const blob = blobs.get(key)
    if (!blob) return Promise.resolve(null)
    p = blob
      .arrayBuffer()
      .then((b) => audio().decodeAudioData(b))
      .then(shape)
      .catch(() => {
        // Recorded in a format this browser can't play (on another device): leave it to speech.
        blobs.delete(key)
        return null
      })
    decoded.set(key, p)
  }
  return p
}

export async function deleteClip(key: string) {
  blobs.delete(key)
  decoded.delete(key)
  await tx('readwrite', (s) => s.delete(key))
}

async function keep(key: string, blob: Blob) {
  await tx('readwrite', (s) => s.put(blob, key))
  blobs.set(key, blob)
  decoded.delete(key)
}

export interface Take {
  /** Resolves once the mic is really recording, so the grown-up knows to start. */
  started: Promise<void>
  /** How loud the mic is right now, for a level meter. */
  level(): number
  /** Stop now. It also stops by itself a second after the speaking does. */
  stop(): void
  /** Resolves true once saved, or false if it heard nothing worth keeping. */
  done: Promise<boolean>
}

/** Record one piece of the script, or a letter sound, under `key`. */
export async function record(key: string, maxMs: number): Promise<Take> {
  const nav = navigator as Navigator & { audioSession?: { type: string } }
  if (nav.audioSession) nav.audioSession.type = 'play-and-record'
  // A quiet room and a level set afterwards sound more like a person than the phone-call processing does.
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: false } })
  const type = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported(t))
  const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined)
  const chunks: Blob[] = []
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)

  // Listen along, for the meter and to hear when the speaking has stopped.
  let now = 0
  let watching = 0
  const begun = performance.now()
  try {
    const mic = audio().createMediaStreamSource(stream)
    const ear = audio().createAnalyser()
    ear.fftSize = 1024
    mic.connect(ear)
    const buf = new Float32Array(ear.fftSize)
    let floor = 1
    let peak = 0
    let quietSince = 0
    watching = window.setInterval(() => {
      ear.getFloatTimeDomainData(buf)
      let sum = 0
      for (const v of buf) sum += v * v
      now = Math.sqrt(sum / buf.length)
      const t = performance.now()
      if (t - begun > 200) floor = Math.min(floor, Math.max(now, 0.001))
      if (now > Math.max(floor * 5, 0.004)) peak = Math.max(peak, now)
      if (!peak || now > Math.max(floor * 2.5, peak * 0.06, 0.002)) quietSince = 0
      else if (!quietSince) quietSince = t
      else if (t - quietSince > 1100) stop()
    }, 40)
  } catch {
    // Firefox won't mix a mic at another sample rate into the game's audio: no meter, tap to stop.
  }

  const started = new Promise<void>((resolve) => (rec.onstart = () => resolve()))
  const done = new Promise<boolean>((resolve, reject) => {
    rec.onstop = async () => {
      clearInterval(watching)
      stream.getTracks().forEach((t) => t.stop())
      try {
        const blob = new Blob(chunks, { type: rec.mimeType || type || 'audio/webm' })
        const clip = shape(await audio().decodeAudioData(await blob.arrayBuffer()))
        if (!clip) return resolve(false)
        await keep(key, blob)
        decoded.set(key, Promise.resolve(clip))
        // Ask the browser not to clear these when it tidies up storage.
        void navigator.storage?.persist?.()
        resolve(true)
      } catch (e) {
        reject(e)
      }
    }
  })
  const timer = setTimeout(() => stop(), maxMs)
  function stop() {
    clearTimeout(timer)
    clearInterval(watching)
    if (rec.state === 'recording') rec.stop()
  }
  rec.start()
  return { started, level: () => now, stop, done }
}

interface Saved {
  app: string
  version: number
  clips: { key: string; type: string; data: string }[]
}

const base64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).slice(String(r.result).indexOf(',') + 1))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })

/** Every recording on this device in one file, to back up or to move to another device. */
export async function exportClips(): Promise<Blob> {
  const clips = await Promise.all([...blobs].map(async ([key, blob]) => ({ key, type: blob.type, data: await base64(blob) })))
  const saved: Saved = { app: 'kippers-basket', version: 1, clips }
  return new Blob([JSON.stringify(saved)], { type: 'application/json' })
}

/** Load a saved file back in, over anything with the same name. Returns how many it held. */
export async function importClips(file: Blob): Promise<number> {
  const saved = JSON.parse(await file.text()) as Partial<Saved>
  if (saved.app !== 'kippers-basket' || !Array.isArray(saved.clips)) throw new Error('not a saved copy')
  for (const c of saved.clips) await keep(c.key, new Blob([Uint8Array.from(atob(c.data), (ch) => ch.charCodeAt(0))], { type: c.type }))
  return saved.clips.length
}
