import { ALL_LETTERS, PRESETS } from './content'

// Grown-up settings and per-letter progress, kept in this browser only.

export interface Settings {
  letters: string[]
  choices: 2 | 3 | 4
  letterCase: 'lower' | 'upper'
  /** Say letter sounds (phonics) or letter names. */
  say: 'sounds' | 'names'
  /** voiceURI of the chosen speech voice; empty picks the best English one. */
  voice: string
  captions: boolean
}

export const DEFAULTS: Settings = {
  letters: PRESETS[0].letters,
  choices: 2,
  letterCase: 'lower',
  say: 'sounds',
  voice: '',
  captions: false,
}

/** Right first time, out of times asked. */
export type Stats = Record<string, { seen: number; right: number }>

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Private mode or storage full: the game still plays, it just won't remember.
  }
}

export function loadSettings(): Settings {
  const s = read('kb.settings', DEFAULTS)
  const letters = s.letters.filter((l) => ALL_LETTERS.includes(l))
  return {
    ...s,
    letters: letters.length ? letters : DEFAULTS.letters,
    choices: [2, 3, 4].includes(s.choices) ? s.choices : 2,
  }
}

export const saveSettings = (s: Settings) => write('kb.settings', s)

export const loadStats = (): Stats => read<Stats>('kb.stats', {})

export function recordAnswer(letter: string, firstTry: boolean) {
  const stats = loadStats()
  const s = (stats[letter] ??= { seen: 0, right: 0 })
  s.seen++
  if (firstTry) s.right++
  write('kb.stats', stats)
}

export const clearStats = () => write('kb.stats', {})
