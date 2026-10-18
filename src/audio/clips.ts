import { audio, output } from './sfx'

// A grown-up's own recordings of each letter sound, kept in IndexedDB on this device.
// Speech engines can't say a pure "sss" or "ih", so a real voice always wins when there is one.

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

interface Clip {
  buffer: AudioBuffer
  start: number
  end: number
}

const clips = new Map<string, Clip>()

/** Find where the speaking starts and stops, so a clip plays without the silence around it. */
function trim(buffer: AudioBuffer): Clip {
  const d = buffer.getChannelData(0)
  let peak = 0
  for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]))
  const level = peak * 0.12
  let a = 0
  let b = d.length - 1
  while (a < b && Math.abs(d[a]) < level) a++
  while (b > a && Math.abs(d[b]) < level) b--
  const pad = buffer.sampleRate * 0.06
  return { buffer, start: Math.max(0, a - pad) / buffer.sampleRate, end: Math.min(d.length, b + pad) / buffer.sampleRate }
}

async function decode(blob: Blob) {
  return trim(await audio().decodeAudioData(await blob.arrayBuffer()))
}

export const canRecord = () => window.isSecureContext && 'mediaDevices' in navigator && 'MediaRecorder' in window

export async function loadClips() {
  try {
    const d = await db()
    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const req = d.transaction(STORE).objectStore(STORE).getAllKeys()
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    for (const key of keys) {
      const blob = await tx<Blob>('readonly', (s) => s.get(key))
      try {
        clips.set(String(key), await decode(blob))
      } catch {
        // A clip this browser can't decode (recorded on another device): fall back to speech.
      }
    }
  } catch {
    // No IndexedDB (private mode): speech only.
  }
}

export const hasClip = (letter: string) => clips.has(letter)

export function playClip(letter: string): Promise<void> {
  const clip = clips.get(letter)
  if (!clip) return Promise.resolve()
  return new Promise((resolve) => {
    const src = audio().createBufferSource()
    src.buffer = clip.buffer
    const gain = audio().createGain()
    gain.gain.value = 2 // speech through the effects bus is quieter than the speech engine
    src.connect(gain).connect(output())
    src.onended = () => resolve()
    src.start(0, clip.start, clip.end - clip.start)
    current = src
  })
}

let current: AudioBufferSourceNode | null = null

export function stopClip() {
  try {
    current?.stop()
  } catch {
    // already stopped
  }
  current = null
}

export async function deleteClip(letter: string) {
  clips.delete(letter)
  await tx('readwrite', (s) => s.delete(letter))
}

/** Record one letter sound. Stops itself after `maxMs`, or call stop() sooner. */
export async function record(letter: string, maxMs = 2500) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
  const type = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported(t))
  const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined)
  const chunks: Blob[] = []
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
  const done = new Promise<void>((resolve, reject) => {
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop())
      try {
        const blob = new Blob(chunks, { type: rec.mimeType })
        clips.set(letter, await decode(blob))
        await tx('readwrite', (s) => s.put(blob, letter))
        resolve()
      } catch (e) {
        reject(e)
      }
    }
  })
  rec.start()
  const timer = setTimeout(() => rec.state === 'recording' && rec.stop(), maxMs)
  return {
    stop() {
      clearTimeout(timer)
      if (rec.state === 'recording') rec.stop()
    },
    done,
  }
}
