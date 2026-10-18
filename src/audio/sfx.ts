// Little synthesised sounds, so there are no audio files to load.

let ctx: AudioContext | null = null
let master: GainNode | null = null

export function audio() {
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = 0.5
    master.connect(ctx.destination)
  }
  return ctx
}

/** Call from a tap: wakes audio up (iOS starts it suspended) and ignores the silent switch where Safari allows. */
export function unlockAudio() {
  const nav = navigator as Navigator & { audioSession?: { type: string } }
  if (nav.audioSession) nav.audioSession.type = 'playback'
  const c = audio()
  if (c.state !== 'running') void c.resume()
}

export const output = () => (audio(), master!)

function tone(freq: number, at: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, slideTo?: number) {
  const c = audio()
  const t = c.currentTime + at
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(output())
  o.start(t)
  o.stop(t + dur + 0.05)
}

function noise(at: number, dur: number, freq: number, vol = 0.25, q = 1.2) {
  const c = audio()
  const t = c.currentTime + at
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
  const src = c.createBufferSource()
  src.buffer = buf
  const f = c.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = freq
  f.Q.value = q
  const g = c.createGain()
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f).connect(g).connect(output())
  src.start(t)
}

const safe = (fn: () => void) => () => {
  try {
    fn()
  } catch {
    // No audio on this device: the game carries on silently.
  }
}

export const sfx = {
  pop: safe(() => tone(520, 0, 0.14, 'sine', 0.35, 980)),
  hop: safe(() => tone(300, 0, 0.18, 'triangle', 0.25, 620)),
  boop: safe(() => tone(330, 0, 0.22, 'sine', 0.25, 220)),
  rustle: safe(() => {
    noise(0, 0.22, 2400, 0.22, 0.8)
    noise(0.16, 0.2, 3000, 0.16, 0.8)
  }),
  chime: safe(() => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.5, 'triangle', 0.22))),
  sparkle: safe(() => [1568, 2093, 2637].forEach((f, i) => tone(f, i * 0.06, 0.3, 'sine', 0.12))),
  whoosh: safe(() => noise(0, 0.45, 900, 0.2, 0.6)),
  giggle: safe(() => [880, 1040, 920, 1100].forEach((f, i) => tone(f, i * 0.07, 0.09, 'sine', 0.14))),
  tada: safe(() => [392, 523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.42, 'triangle', 0.2))),
  /** A note from a pentatonic scale, so tapping flowers always sounds nice together. */
  note: (i: number) => safe(() => tone([523, 587, 659, 784, 880, 1047, 1175, 1319][((i % 8) + 8) % 8], 0, 0.6, 'sine', 0.22))(),
  plop: safe(() => {
    tone(700, 0, 0.16, 'sine', 0.3, 180)
    noise(0.02, 0.18, 1400, 0.08, 1)
  }),
}
