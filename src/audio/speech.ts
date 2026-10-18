import { LETTERS, type VoiceStyle } from '../content'
import { SPEED } from '../run'
import { hasClip, playClip, stopClip } from './clips'

/** A line to speak: plain text, a letter's sound or name, or a pause. */
export type Part = string | { sound: string } | { name: string } | { pause: number }

type Segment = { text: string } | { clip: string } | { pause: number }

const synth = 'speechSynthesis' in window ? window.speechSynthesis : null

// Pleasant English voices, best first. Anything en-GB beats anything else.
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

class Speech {
  mode: 'sounds' | 'names' = 'sounds'
  preferred = ''
  voice: SpeechSynthesisVoice | null = null
  onCaption: (text: string) => void = () => {}
  private token = 0
  // Chrome garbage-collects utterances mid-sentence and then never fires their end event, so hold them.
  private live = new Set<SpeechSynthesisUtterance>()
  private finishers = new Set<() => void>()

  get available() {
    return !!synth && !!this.voice
  }

  voices() {
    return (synth?.getVoices() ?? []).filter((v) => /^en([-_]|$)/i.test(v.lang)).sort((a, b) => score(b) - score(a))
  }

  /** Voices load late (and Safari never says when), so keep asking for a few seconds. */
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

  stop() {
    this.token++
    synth?.cancel()
    stopClip()
    for (const finish of [...this.finishers]) finish()
    this.onCaption('')
  }

  private segments(parts: Part[]): Segment[] {
    const out: Segment[] = []
    const text = (t: string) => {
      const last = out[out.length - 1]
      if (last && 'text' in last) last.text += ' ' + t
      else out.push({ text: t })
    }
    for (const p of parts) {
      if (typeof p === 'string') text(p)
      else if ('pause' in p) out.push({ pause: p.pause })
      else if ('name' in p) text(LETTERS[p.name].name)
      else if (this.mode === 'names') text(LETTERS[p.sound].name)
      else if (hasClip(p.sound)) out.push({ clip: p.sound })
      else text(LETTERS[p.sound].sound)
    }
    return out
  }

  /** Speak the parts in order. Resolves true when finished, false if something else cut in. */
  async say(parts: Part[], style: VoiceStyle): Promise<boolean> {
    const my = ++this.token
    if (synth && (synth.speaking || synth.pending)) {
      synth.cancel()
      await new Promise((r) => setTimeout(r, 60)) // Chrome drops an utterance queued in the same tick as cancel()
    }
    stopClip()
    for (const seg of this.segments(parts)) {
      if (my !== this.token) return false
      if ('text' in seg) await this.utter(seg.text, style)
      else if ('clip' in seg) await playClip(seg.clip)
      else await new Promise((r) => setTimeout(r, seg.pause * SPEED))
    }
    if (my === this.token) this.onCaption('')
    return my === this.token
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
