// Records every line in src/content.ts with ElevenLabs into public/voice/, once.
//   npm run voices        (reads ELEVENLABS_API_KEY from .env.local, or the environment)
//   npm run voices -- --dry   (just counts what's left to record)
// Lines already recorded are skipped, so re-running after adding lines only pays for the new ones.
// The key never reaches the browser: the game ships plain MP3s plus src/voice-manifest.json.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { catalogue, type Speaker } from '../src/content.ts'

/** Who voices whom: an ElevenLabs premade voice, shifted into a cartoon character with ffmpeg. */
const CAST: Record<Speaker, { voice: string; semitones: number; tempo: number }> = {
  narrator: { voice: 'JBFqnCBsd6RMkjVDRZzb', semitones: 0, tempo: 1 }, // George, warm British storyteller
  kipper: { voice: 'JBFqnCBsd6RMkjVDRZzb', semitones: 4, tempo: 1.05 }, // the narrator voices Kipper too, as on TV
  tiger: { voice: 'IKne3meq5aSn9XLyUdCD', semitones: 2, tempo: 1.05 }, // Charlie
  rabbit: { voice: 'pFZP5JQG7iQjIQuC4Bku', semitones: 3, tempo: 1 }, // Lily
  badger: { voice: 'onwK4e9ZLuTAKqWW03F9', semitones: -3, tempo: 0.92 }, // Daniel
  weasel: { voice: 'TX3LPaxmHKxFdv7VOQHJ', semitones: 2, tempo: 1.08 }, // Liam
  robin: { voice: 'Xb7hH8MSUJpSbSDYk0k2', semitones: 5, tempo: 1.03 }, // Alice
  hedgehog: { voice: 'cgSgspJ2msm6clMCkdW9', semitones: 1, tempo: 0.95 }, // Jessica
  mouse: { voice: 'Xb7hH8MSUJpSbSDYk0k2', semitones: 8, tempo: 1.05 }, // Alice, tiny
  owl: { voice: 'pqHfZKP75CvOlQylNhV4', semitones: 0, tempo: 0.9 }, // Bill
  neddy: { voice: 'bIHbv24MWmeRgasZH58o', semitones: 2, tempo: 0.95 }, // Will, a laid-back puppy
}

const MODEL = 'eleven_multilingual_v2'
const OUT = new URL('../public/voice/', import.meta.url)
const MANIFEST = new URL('../src/voice-manifest.json', import.meta.url)
const TMP = new URL('../node_modules/.tmp/voice/', import.meta.url)
const envFile = new URL('../.env.local', import.meta.url)
const fromFile = existsSync(envFile) ? /^ELEVENLABS_API_KEY=["']?([^"'\s]+)/m.exec(readFileSync(envFile, 'utf8'))?.[1] : undefined
const key = process.env.ELEVENLABS_API_KEY || fromFile
const dry = process.argv.includes('--dry')

mkdirSync(OUT, { recursive: true })
mkdirSync(TMP, { recursive: true })

const manifest: Record<string, string> = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {}
const id = (speaker: Speaker, text: string) =>
  createHash('sha1').update(JSON.stringify([speaker, text, CAST[speaker], MODEL])).digest('hex').slice(0, 12)

const lines = catalogue()
const todo = lines.filter(([s, t]) => !existsSync(new URL(`${id(s, t)}.mp3`, OUT)))
const chars = todo.reduce((n, [, t]) => n + t.length, 0)
console.log(`${lines.length} lines, ${todo.length} to record, ${chars} characters`)
if (dry || !todo.length) finish()
else if (!key) throw new Error('Set ELEVENLABS_API_KEY')
else await run()

async function record(speaker: Speaker, text: string) {
  const { voice, semitones, tempo } = CAST[speaker]
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_64`, {
      method: 'POST',
      headers: { 'xi-api-key': key!, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true },
      }),
    })
    if (res.ok) {
      const raw = new URL(`${id(speaker, text)}.raw.mp3`, TMP)
      writeFileSync(raw, Buffer.from(await res.arrayBuffer()))
      // Trim the silence at both ends, shift pitch without changing speed, then even out loudness across voices.
      const r = 2 ** (semitones / 12)
      const pitch = semitones ? `asetrate=44100*${r},aresample=44100,atempo=${(tempo / r).toFixed(4)},` : tempo !== 1 ? `atempo=${tempo},` : ''
      const trim = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.04'
      execFileSync('ffmpeg', [
        '-v', 'error', '-y', '-i', raw.pathname,
        '-af', `${trim},areverse,${trim},areverse,${pitch}loudnorm=I=-16:TP=-1.5:LRA=11`,
        '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '64k',
        new URL(`${id(speaker, text)}.mp3`, OUT).pathname,
      ])
      unlinkSync(raw)
      return
    }
    const body = await res.text()
    if (res.status === 429 && attempt < 6) {
      await new Promise((r) => setTimeout(r, 1500 * 2 ** attempt))
      continue
    }
    throw new Error(`${res.status} for ${speaker} "${text}": ${body.slice(0, 300)}`)
  }
}

async function run() {
  let done = 0
  let failed: unknown = null
  const queue = [...todo]
  // A few at a time: ElevenLabs limits concurrent requests per plan.
  await Promise.all(
    Array.from({ length: 3 }, async () => {
      for (let job = queue.shift(); job && !failed; job = queue.shift()) {
        try {
          await record(...job)
          if (++done % 20 === 0) console.log(`${done}/${todo.length}`)
        } catch (e) {
          failed = e
        }
      }
    }),
  )
  finish()
  if (failed) throw failed
}

/** Only lines with a recording go in the manifest; the game falls back to browser speech for the rest. */
function finish() {
  for (const [s, t] of lines) {
    const k = id(s, t)
    if (existsSync(new URL(`${k}.mp3`, OUT))) manifest[`${s}|${t}`] = k
  }
  const live = new Set(lines.map(([s, t]) => `${s}|${t}`))
  for (const k of Object.keys(manifest)) if (!live.has(k)) delete manifest[k]
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n')
  console.log(`manifest: ${Object.keys(manifest).length} recorded lines`)
}
