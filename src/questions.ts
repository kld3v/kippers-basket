import { ALL_LETTERS, LETTERS, type Word } from './content'
import type { Stats } from './settings'

export interface Question {
  letter: string
  word: Word
  choices: string[]
}

// Never offer these side by side: same sound (c/k/q) or mirror images a toddler can't yet tell apart.
const CLASHES = new Set(['bd', 'bp', 'bq', 'dp', 'dq', 'pq', 'mw', 'nu', 'hn', 'il', 'ck', 'cq', 'kq'])
const clash = (a: string, b: string) => CLASHES.has(a + b) || CLASHES.has(b + a)

export function shuffle<T>(xs: readonly T[], rand = Math.random): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Letters she gets wrong come up more; the last couple asked are held back. */
function pickLetter(pool: string[], stats: Stats, recent: string[], rand: () => number) {
  const weights = pool.map((l) => {
    const s = stats[l]
    let w = s?.seen ? 1 + (2 * (s.seen - s.right)) / s.seen : 1.5
    if (recent.includes(l)) w *= 0.08
    return w
  })
  let r = rand() * weights.reduce((a, b) => a + b, 0)
  for (let i = 0; i < pool.length; i++) if ((r -= weights[i]) <= 0) return pool[i]
  return pool[pool.length - 1]
}

/**
 * One question. The answer comes from `targets` (default: the whole pool); wrong choices
 * come from the pool first, then the rest of the alphabet.
 */
export function makeQuestion(pool: string[], choices: number, stats: Stats, recent: string[], rand = Math.random, targets = pool): Question {
  const letters = pool.length ? pool : ALL_LETTERS
  const letter = pickLetter(targets.length ? targets : letters, stats, recent, rand)
  const { words } = LETTERS[letter]
  const ok = (l: string) => l !== letter && !clash(l, letter)
  // Distractors come from the letters she's practising first, then the rest of the alphabet.
  const candidates = [...shuffle(letters.filter(ok), rand), ...shuffle(ALL_LETTERS.filter((l) => ok(l) && !letters.includes(l)), rand)]
  const distractors: string[] = []
  for (const l of candidates) {
    if (distractors.length >= choices - 1) break
    if (!distractors.some((d) => clash(d, l))) distractors.push(l)
  }
  return { letter, word: words[Math.floor(rand() * words.length)], choices: shuffle([letter, ...distractors], rand) }
}

/** A whole game's questions: different letters each time (while the pool lasts), letters she finds hard more often. */
export function planQuestions(pool: string[], choices: number, stats: Stats, n: number, rand = Math.random): Question[] {
  const used: string[] = []
  return Array.from({ length: n }, () => {
    const fresh = pool.filter((l) => !used.includes(l))
    const q = makeQuestion(pool, choices, stats, used.slice(-2), rand, fresh.length ? fresh : pool)
    used.push(q.letter)
    return q
  })
}
