import { FRIENDS, LETTERS, STYLES, type Speaker, type VoiceStyle } from '../content'
import manifest from '../voice-manifest.json'
import { SPEED } from '../run'
import { hasClip, playClip, stopClip } from './clips'
import { audio } from './sfx'

/** A piece of a line: a sentence, a letter's sound or name, or a pause. */
export type Part = string | { sound: string } | { name: string } | { pause: number }

type Segment = { text: string } | { voice: string; text: string } | { rec: string } | { pause: number }

const recorded = manifest as Record<string, string>
const synth = 'speechSynthesis' in window ? window.speechSynthesis : null

// Browser voices, best first, for anything without a recording. Anything en-GB beats anything else.
const FAVOURITES = ['Sonia', 'Libby', 'Serena', 'Kate', 'Martha', 'Stephanie', 'Google UK English Female', 'Daniel', 'Arthur', 'Google UK English Male']

function score(v: SpeechSynthesisVoice) {
  const fav = FAVOURITES.findIndex((n) => v.name.includes(n))
  return (
    (/en[-_]GB/i.test(v.lang) ? 100 : /en[-_](AU|IE|NZ)/i.test(v.lang) ? 40 : 20) +
    (/natural|enhanced|premium|neural/i.test(v.name) ? 30 : 0) +
    (fav >= 0 ? 20 - fav : 0) +
    (/novelty|whisper|bells|bubbles|cellos|zarvox|trinoids|albert|bad news|good news|jester|organ|superstar|wobble/i.test(v.name) ? -200 : 0)
  )
}

const styleOf = (s: Speaker): VoiceStyle => (s in STYLES ? STYLES[s as keyof typeof STYLES] : FRIENDS.find((f) => f.id === s)!.voice)

class Speech {
  mode: 'sounds' | 'names' = 'sounds'
  preferred = ''
  voice: SpeechSynthesisVoice | null = null
  onCaption: (text: string) => void = () => {}
  private token = 0
  // Chrome garbage-collects utterances mid-sentence and then never fires their end event, so hold them.
  private live = new Set<SpeechSynthesisUtterance>()
  private finishers = new Set<() => void>()
  private buffers = new Map<string, Promise<AudioBuffer | null>>()
  private source: AudioBufferSourceNode | null = null
  private bus: GainNode | null = null

  /** True when there is some way to be heard: recordings, or a browser voice. */
  get available() {
    return Object.keys(recorded).length > 0 || (!!synth && !!this.voice)
  }

  voices() {
    return (synth?.getVoices() ?? []).filter((v) => /^en([-_]|$)/i.test(v.lang)).sort((a, b) => score(b) - score(a))
  }

  /** Browser voices load late (and Safari never says when), so keep asking for a few seconds. */
  async init() {
    if (!synth) return
    for (let i = 0; i < 30 && !this.voices().length; i++) await new Promise((r) => setTimeout(r, 100))
    this.pickVoice()
    synth.addEventListener?.('voiceschanged', () => this.pickVoice())
  }

  pickVoice() {
    const all = this.voices()
    this.voice = all.find((v) => v.voiceURI === this.preferred) ?? all[0] ?? null
  }

  /** Must run inside a tap: iOS only lets speech start from a user gesture. */
  unlock() {
    if (!synth) return
    const u = new SpeechSynthesisUtterance(' ')
    u.volume = 0
    synth.speak(u)
  }

  has(speaker: Speaker, text: string) {
    return `${speaker}|${text}` in recorded
  }

  /** Start downloading lines that are about to be needed, so they play without a gap. */
  prefetch(speaker: Speaker, texts: string[]) {
    for (const t of texts) {
      const id = recorded[`${speaker}|${t}`]
      if (id) void this.load(id)
    }
  }

  private load(id: string) {
    let p = this.buffers.get(id)
    if (!p) {
      p = fetch(`/voice/${id}.mp3`)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
        .then((b) => audio().decodeAudioData(b))
        .catch(() => {
          this.buffers.delete(id)
          return null
        })
      this.buffers.set(id, p)
    }
    return p
  }

  stop() {
    this.token++
    synth?.cancel()
    stopClip()
    try {
      this.source?.stop()
    } catch {
      // already finished
    }
    this.source = null
    for (const finish of [...this.finishers]) finish()
    this.onCaption('')
  }

  private segments(speaker: Speaker, parts: Part[]): Segment[] {
    const out: Segment[] = []
    const text = (t: string) => {
      const last = out[out.length - 1]
      if (last && 'text' in last && !('voice' in last)) last.text += ' ' + t
      else out.push({ text: t })
    }
    for (const p of parts) {
      if (typeof p === 'string') {
        const id = recorded[`${speaker}|${p}`]
        if (id) out.push({ voice: id, text: p })
        else text(p)
      } else if ('pause' in p) out.push({ pause: p.pause })
      else if ('name' in p) text(LETTERS[p.name].name)
      else if (this.mode === 'names') text(LETTERS[p.sound].name)
      else if (hasClip(p.sound)) out.push({ rec: p.sound })
      else text(LETTERS[p.sound].sound)
    }
    return out
  }

  /** Speak the parts in order. Resolves true when finished, false if something else cut in. */
  async say(speaker: Speaker, parts: Part[]): Promise<boolean> {
    const my = ++this.token
    if (synth && (synth.speaking || synth.pending)) {
      synth.cancel()
      await new Promise((r) => setTimeout(r, 60)) // Chrome drops an utterance queued in the same tick as cancel()
    }
    stopClip()
    for (const seg of this.segments(speaker, parts)) {
      if (my !== this.token) return false
      if ('voice' in seg) await this.play(seg.voice, seg.text, speaker)
      else if ('text' in seg) await this.utter(seg.text, styleOf(speaker))
      else if ('rec' in seg) await playClip(seg.rec)
      else await new Promise((r) => setTimeout(r, seg.pause * SPEED))
    }
    if (my === this.token) this.onCaption('')
    return my === this.token
  }

  private async play(id: string, text: string, speaker: Speaker) {
    const my = this.token
    this.onCaption(text)
    const buffer = await this.load(id)
    if (my !== this.token) return
    if (!buffer || SPEED < 1) return buffer ? undefined : this.utter(text, styleOf(speaker))
    const c = audio()
    if (c.state !== 'running') void c.resume()
    if (!this.bus) {
      this.bus = c.createGain()
      this.bus.connect(c.destination)
    }
    await new Promise<void>((resolve) => {
      const src = c.createBufferSource()
      src.buffer = buffer
      src.connect(this.bus!)
      // If iOS has suspended audio (after switching apps) the clip never ends, so don't wait for it forever.
      const timer = setTimeout(() => finish(), buffer.duration * 1000 + 1200)
      const finish = () => {
        clearTimeout(timer)
        this.finishers.delete(finish)
        resolve()
      }
      src.onended = finish
      this.finishers.add(finish)
      this.source = src
      src.start()
    })
  }

  private utter(text: string, style: VoiceStyle) {
    this.onCaption(text.replace(/\s+([,.!?])/g, '$1'))
    // Without speech (or under ?fast) fall back to roughly how long the line would take to say.
    const estimate = (text.length * 62) / style.rate + 350
    if (!synth || !this.voice || SPEED < 1) return new Promise<void>((r) => setTimeout(r, estimate * SPEED))
    return new Promise<void>((resolve) => {
      const u = new SpeechSynthesisUtterance(text)
      u.voice = this.voice
      u.lang = this.voice!.lang
      u.pitch = style.pitch
      u.rate = style.rate * 0.95
      this.live.add(u)
      const finish = () => {
        this.live.delete(u)
        this.finishers.delete(finish)
        clearTimeout(timer)
        resolve()
      }
      // Some engines never fire end at all; don't let the game hang on them.
      const timer = setTimeout(finish, estimate * 2.5 + 2500)
      this.finishers.add(finish)
      u.onend = finish
      u.onerror = finish
      synth.resume()
      synth.speak(u)
    })
  }
}

export const speech = new Speech()
