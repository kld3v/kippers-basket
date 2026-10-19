// Everything the game says and shows, in one place. No runtime imports, so the
// voice generator (scripts/make-voices.ts) can load this file straight into Node.

/** The dog's name, in one place in case it ever needs changing. */
export const DOG = 'Kipper'
/** His best friend, who comes along for the walk. */
export const BUDDY = 'Tiger'

export type FriendId = 'rabbit' | 'badger' | 'weasel' | 'robin' | 'hedgehog' | 'mouse' | 'owl' | 'neddy'
export type ToyId = 'ball' | 'bone' | 'blanket' | 'teddy' | 'slipper' | 'sock' | 'bowl'
export type SpotKind = 'bush' | 'log' | 'burrow'

/** Who is speaking. Each has an ElevenLabs voice (see scripts/make-voices.ts) and a browser-speech fallback. */
export type Speaker = 'narrator' | 'kipper' | 'tiger' | FriendId

export interface VoiceStyle {
  pitch: number
  rate: number
}

export interface Word {
  word: string
  picture: string
  /** How the word's first sound is stretched out loud: "s" gives "s-s-sun", "ig" gives "ig-ig-igloo". */
  onset: string
}

export interface LetterInfo {
  /** The letter's sound as browser speech should attempt it, when no better voice is available. */
  sound: string
  /** The letter's name as speech should say it. */
  name: string
  words: Word[]
}

const w = (word: string, onset: string, picture = word): Word => ({ word, picture, onset })

// x is left out: no simple word a toddler knows starts with its sound.
// Vowels stretch their first syllable ("ig-ig-igloo") so the voice keeps the short vowel.
export const LETTERS: Record<string, LetterInfo> = {
  a: { sound: 'ah', name: 'ay', words: [w('apple', 'ap'), w('ant', 'an')] },
  b: { sound: 'buh', name: 'B', words: [w('banana', 'b'), w('bus', 'b')] },
  c: { sound: 'kuh', name: 'C', words: [w('cat', 'k'), w('car', 'k')] },
  d: { sound: 'duh', name: 'D', words: [w('duck', 'd'), w('drum', 'd')] },
  e: { sound: 'eh', name: 'ee', words: [w('egg', 'eg'), w('elephant', 'el')] },
  f: { sound: 'fuh', name: 'F', words: [w('fish', 'f'), w('frog', 'f')] },
  g: { sound: 'guh', name: 'G', words: [w('grapes', 'g'), w('guitar', 'g')] },
  h: { sound: 'huh', name: 'H', words: [w('hat', 'h'), w('house', 'h')] },
  i: { sound: 'ih', name: 'eye', words: [w('igloo', 'ig')] },
  j: { sound: 'juh', name: 'J', words: [w('jelly', 'j'), w('jam', 'j')] },
  k: { sound: 'kuh', name: 'K', words: [w('kite', 'k'), w('key', 'k')] },
  l: { sound: 'luh', name: 'L', words: [w('lion', 'l'), w('leaf', 'l')] },
  m: { sound: 'muh', name: 'M', words: [w('moon', 'm'), w('monkey', 'm')] },
  n: { sound: 'nuh', name: 'N', words: [w('nest', 'n'), w('net', 'n')] },
  o: { sound: 'aw', name: 'oh', words: [w('octopus', 'oc')] },
  p: { sound: 'puh', name: 'P', words: [w('pig', 'p'), w('penguin', 'p')] },
  q: { sound: 'kwuh', name: 'Q', words: [w('queen', 'qu')] },
  r: { sound: 'ruh', name: 'R', words: [w('rainbow', 'r'), w('rocket', 'r')] },
  s: { sound: 'suh', name: 'S', words: [w('sun', 's'), w('snake', 's')] },
  t: { sound: 'tuh', name: 'T', words: [w('teapot', 't'), w('tiger', 't')] },
  u: { sound: 'uh', name: 'you', words: [w('umbrella', 'um')] },
  v: { sound: 'vuh', name: 'V', words: [w('van', 'v'), w('vase', 'v')] },
  w: { sound: 'wuh', name: 'W', words: [w('worm', 'w'), w('whale', 'w')] },
  y: { sound: 'yuh', name: 'Y', words: [w('yo-yo', 'y')] },
  z: { sound: 'zuh', name: 'Z', words: [w('zebra', 'z')] },
}

export const ALL_LETTERS = Object.keys(LETTERS)
export const ALL_WORDS = Object.values(LETTERS).flatMap((l) => l.words)

/** Letters and Sounds order, for grown-ups who want to narrow things down. */
export const PRESETS = [
  { label: 'All', letters: ALL_LETTERS },
  { label: 's a t p i n', letters: [...'satpin'] },
  { label: '+ m d g o c k', letters: [...'satpinmdgock'] },
  { label: '+ e u r h b f l', letters: [...'satpinmdgockeurhbfl'] },
]

/** Letters asked in one game: one friend, one toy, one letter each. */
export const ROUNDS = 7

export interface Friend {
  id: FriendId
  name: string
  spot: SpotKind
  voice: VoiceStyle
  move: 'hop' | 'fly' | 'scurry'
}

export const FRIENDS: Friend[] = [
  { id: 'rabbit', name: 'Rabbit', spot: 'bush', voice: { pitch: 1.5, rate: 1 }, move: 'hop' },
  { id: 'badger', name: 'Badger', spot: 'burrow', voice: { pitch: 0.75, rate: 0.88 }, move: 'hop' },
  { id: 'weasel', name: 'Weasel', spot: 'log', voice: { pitch: 1.2, rate: 1.05 }, move: 'scurry' },
  { id: 'robin', name: 'Robin', spot: 'bush', voice: { pitch: 1.85, rate: 1.05 }, move: 'fly' },
  { id: 'hedgehog', name: 'Hedgehog', spot: 'bush', voice: { pitch: 1.3, rate: 0.92 }, move: 'scurry' },
  { id: 'mouse', name: 'Mouse', spot: 'log', voice: { pitch: 2, rate: 1.1 }, move: 'scurry' },
  { id: 'owl', name: 'Owl', spot: 'bush', voice: { pitch: 0.9, rate: 0.85 }, move: 'fly' },
  // A real basset hound puppy the family knows: he turns up in every game.
  { id: 'neddy', name: 'Neddy Dog', spot: 'log', voice: { pitch: 1.15, rate: 0.95 }, move: 'hop' },
]

/** Friends who always come: everyone else is picked at random to fill the rounds. */
export const ALWAYS: FriendId[] = ['neddy']

export const TOYS: { id: ToyId; name: string }[] = [
  { id: 'ball', name: 'ball' },
  { id: 'bone', name: 'bone' },
  { id: 'blanket', name: 'blanket' },
  { id: 'teddy', name: 'teddy' },
  { id: 'slipper', name: 'slipper' },
  { id: 'sock', name: 'sock' },
  { id: 'bowl', name: 'bowl' },
]

/** Browser-speech fallbacks for the speakers who aren't friends. */
export const STYLES: Record<'narrator' | 'kipper' | 'tiger', VoiceStyle> = {
  narrator: { pitch: 1.05, rate: 0.95 },
  kipper: { pitch: 1.4, rate: 1.05 },
  tiger: { pitch: 1.2, rate: 1.05 },
}

export const pick = <T>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)]
const cap = (s: string) => s[0].toUpperCase() + s.slice(1)
const stretch = (w: Word) => `${w.onset}-${w.onset}-${w.word}`

// Short pieces the narrator's question lines are built from, so a recording of each can be stitched back in.
const YES = 'Yes!'
const WELL_DONE = 'Well done!'
const LISTEN = 'Listen.'
const WHICH_SOUND = 'Which letter makes that sound?'
const THAT_ONE_SAYS = 'That one says'
const TRY_AGAIN = 'Try again!'

/**
 * Every line, by who says it. Each function returns the exact sentence, which is also
 * the key its recorded voice is filed under, so a line here and its MP3 always match.
 */
export const LINES = {
  narrator: {
    missing: `Oh no! ${DOG}'s toys are missing!`,
    toyList: `His ball, his bone, his blanket, his teddy, his slipper, his sock, and his bowl!`,
    letsGo: `${DOG} and ${BUDDY} are going to find them!`,
    peek: {
      bush: ['Who is hiding in the bush? Tap the bush!', 'The bush is wiggling! Tap it!'],
      log: ['Who is hiding behind the log? Tap the log!', 'Something is behind the log! Tap it!'],
      burrow: ['Who is down that hole? Tap the hole!', 'Who lives in this hole? Tap it!'],
    } satisfies Record<SpotKind, string[]>,
    // The 3D game, where she steers Kipper herself.
    find: {
      bush: ['Who is hiding in that bush? Run over and see!', 'The bush is wiggling! Run over to it!'],
      log: ['Who is hiding behind that log? Run over and see!', 'Something is behind the log! Run over to it!'],
      burrow: ['Who is down that hole? Run over and see!', 'Who lives in that hole? Run over to it!'],
    } satisfies Record<SpotKind, string[]>,
    thisWay: `This way, ${DOG}! Let's go and look.`,
    runHome: `${DOG} has found all his toys! Run back to his basket.`,
    question: (w: Word) => `${cap(w.word)}! Which letter does ${w.word} start with?`,
    again: (w: Word) => `Which letter does ${w.word} start with?`,
    hint: (w: Word) => `${LISTEN} ${cap(stretch(w))}! ${WHICH_SOUND}`,
    right: (w: Word) => [`${YES} ${cap(stretch(w))}!`, `${WELL_DONE} ${cap(stretch(w))}!`],
    wrong: (letter: string) => `${THAT_ONE_SAYS} ${stretch(LETTERS[letter].words[0])}. ${TRY_AGAIN}`,
    // Short pieces, for stitching a grown-up's own recorded letter sounds into a line.
    word: (w: Word) => `${cap(w.word)}!`,
    yes: YES,
    listen: LISTEN,
    whichSound: WHICH_SOUND,
    thatOneSays: THAT_ONE_SAYS,
    tryAgain: TRY_AGAIN,
    homeTime: `${DOG} has found all his toys! Let's go home.`,
    hooray: `Hooray! Thank you for helping ${DOG}.`,
    bBonus: 'Ball, bone, blanket! They all start with b-b-b!',
    sleepy: `${DOG} and ${BUDDY} are very sleepy.`,
    night: `Night night, ${DOG}. Night night, ${BUDDY}.`,
  },
  kipper: {
    woof: ['Woof!', 'Woof woof!'],
  },
  tiger: {
    start: [`Come on, ${DOG}! Let's find your toys!`],
    cheer: ['Hooray!', 'Woof! Well done!', 'Yay!'],
    woof: ['Woof!', 'Woof woof!'],
  },
  friend: {
    hello: (f: Friend) => `Hello ${DOG}! Hello ${BUDDY}! I'm ${f.name}.`,
    found: (toy: string) => `I found your ${toy}!`,
    help: 'Can you help me with a letter?',
    giveBack: (toy: string) => `Here's your ${toy}, ${DOG}!`,
    bye: 'Bye bye!',
  },
}

/** Every [speaker, sentence] the game can say: the voice generator records exactly these. */
export function catalogue(): [Speaker, string][] {
  const n = LINES.narrator
  const out: [Speaker, string][] = []
  const add = (s: Speaker, ...lines: string[]) => lines.forEach((l) => out.push([s, l]))
  add('narrator', n.missing, n.toyList, n.letsGo, ...Object.values(n.peek).flat(), ...Object.values(n.find).flat(), n.thisWay, n.runHome)
  for (const w of ALL_WORDS) add('narrator', n.question(w), n.again(w), n.hint(w), ...n.right(w), n.word(w))
  for (const l of ALL_LETTERS) add('narrator', n.wrong(l))
  add('narrator', n.yes, n.listen, n.whichSound, n.thatOneSays, n.tryAgain, n.homeTime, n.hooray, n.bBonus, n.sleepy, n.night)
  add('kipper', ...LINES.kipper.woof)
  add('tiger', ...LINES.tiger.start, ...LINES.tiger.cheer, ...LINES.tiger.woof)
  for (const f of FRIENDS) {
    const L = LINES.friend
    add(f.id, L.hello(f), L.help, L.bye, ...TOYS.flatMap((t) => [L.found(t.name), L.giveBack(t.name)]))
  }
  return out
}

/** One thing for a grown-up to record. Lines are stitched from these, so each only needs saying once. */
export interface Piece {
  /** Where the recording is filed: the letter, for a letter sound, otherwise voice|text. */
  id: string
  text: string
  /** A word of help under the line, like which word a letter sound comes from. */
  note?: string
  /** The picture to show while a word is being recorded. */
  picture?: string
}

export interface ScriptGroup {
  title: string
  who: string
  tip: string
  pieces: Piece[]
}

/**
 * The game as a script to read out in your own voice, and how every line is made from it.
 * About 130 pieces rather than 450 lines: the friends share their lines, and each word is said
 * once with its first sound stretched ("a-a-apple!"), then stitched into its question, hint and well done.
 */
export function script() {
  const n = LINES.narrator
  const f = LINES.friend
  const groups: ScriptGroup[] = []
  /** speaker|line, as the game says it, to the pieces that say it, in order. */
  const plan = new Map<string, string[]>()
  const seen = new Set<string>()
  const group = (title: string, who: string, tip: string) => groups.push({ title, who, tip, pieces: [] })
  const piece = (voice: string, text: string, more: Partial<Piece> = {}) => {
    const id = more.id ?? `${voice}|${text}`
    if (!seen.has(id)) groups[groups.length - 1].pieces.push({ id, text, ...more })
    seen.add(id)
    return id
  }
  const says = (speaker: Speaker, line: string, ids: string[]) => plan.set(`${speaker}|${line}`, ids)
  /** Lines recorded just as the game says them. */
  const whole = (speaker: Speaker, ...lines: string[]) => lines.forEach((l) => says(speaker, l, [piece(speaker, l)]))
  /** A line every friend says, recorded once for all of them. */
  const everyFriend = (line: string) => FRIENDS.forEach((fr) => says(fr.id, line, [piece('friend', line)]))

  group('The story', 'Narrator', 'You are the storyteller: warm and slow. Every game starts and ends with these.')
  whole('narrator', n.missing, n.toyList, n.letsGo, n.homeTime, n.hooray, n.bBonus, n.sleepy, n.night)

  group('Hiding places', 'Narrator', 'Said as Kipper finds each friend in the storybook game.')
  whole('narrator', ...Object.values(n.peek).flat())

  group('Friends', 'Every friend', 'All the friends share these, so pick one friendly voice for them.')
  for (const fr of FRIENDS) says(fr.id, f.hello(fr), [piece('friend', f.hello(fr))])
  for (const t of TOYS) everyFriend(f.found(t.name))
  everyFriend(f.help)
  for (const t of TOYS) everyFriend(f.giveBack(t.name))
  everyFriend(f.bye)

  group('Questions', 'Narrator', 'Short and clear. The game joins these onto the words that come next.')
  const start = piece('narrator', 'Which letter does it start with?')
  const [yes, wellDone, listen, which, that, again] = [YES, WELL_DONE, LISTEN, WHICH_SOUND, THAT_ONE_SAYS, TRY_AGAIN].map((t) => piece('narrator', t))
  says('narrator', n.yes, [yes])
  says('narrator', n.listen, [listen])
  says('narrator', n.whichSound, [which])
  says('narrator', n.thatOneSays, [that])
  says('narrator', n.tryAgain, [again])

  group('Words', 'Narrator', 'The first sound twice, then the word: "a-a-apple!" The sound, not the letter\'s name.')
  const words = new Map<string, string>()
  for (const [letter, info] of Object.entries(LETTERS))
    for (const w of info.words) {
      // Vowels and "qu" are spelled out for a person to read; the speech engine needs its own spellings.
      const s = 'aeiou'.includes(letter) ? letter : w.onset.length > 1 ? w.onset : letter
      const id = piece('narrator', `${cap(s)}-${s}-${w.word}!`, { picture: w.picture })
      words.set(w.word, id)
      says('narrator', n.question(w), [id, start])
      says('narrator', n.again(w), [id, start])
      says('narrator', n.hint(w), [listen, id, which])
      const [right, done] = n.right(w)
      says('narrator', right, [yes, id])
      says('narrator', done, [wellDone, id])
      says('narrator', n.word(w), [id])
    }
  for (const l of ALL_LETTERS) says('narrator', n.wrong(l), [that, words.get(LETTERS[l].words[0].word)!, again])

  group('Letter sounds', 'Narrator', 'Just the sound, short and clean: "sss", not "suh" or "ess". She hears these when she gets one right.')
  for (const l of ALL_LETTERS) piece('', l, { id: l, note: `as in ${LETTERS[l].words[0].word}` })

  group('Kipper', 'Kipper', 'Have fun with it.')
  whole('kipper', ...LINES.kipper.woof)

  group('Tiger', 'Tiger', "Kipper's best friend: bouncy and keen.")
  whole('tiger', ...LINES.tiger.start, ...LINES.tiger.cheer, ...LINES.tiger.woof)

  group('3D game', 'Narrator', 'Only needed for the 3D game.')
  whole('narrator', ...Object.values(n.find).flat(), n.thisWay, n.runHome)

  return { groups, plan }
}
