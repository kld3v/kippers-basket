import type { FriendId } from './art/friends'
import type { ToyId } from './art/props'
import type { SpotKind } from './art/scenery'

/** The dog's name, in one place in case it ever needs changing. */
export const DOG = 'Kipper'

export interface VoiceStyle {
  pitch: number
  rate: number
}

export interface Word {
  word: string
  picture: string
}

export interface LetterInfo {
  /** The letter's sound as the speech engine should attempt it. A grown-up's recording replaces it. */
  sound: string
  /** The letter's name as the speech engine should say it. */
  name: string
  words: Word[]
}

const w = (word: string, picture = word): Word => ({ word, picture })

// x is left out: no simple word a toddler knows starts with its sound.
export const LETTERS: Record<string, LetterInfo> = {
  a: { sound: 'ah', name: 'ay', words: [w('apple')] },
  b: { sound: 'buh', name: 'B', words: [w('banana')] },
  c: { sound: 'kuh', name: 'C', words: [w('cat')] },
  d: { sound: 'duh', name: 'D', words: [w('duck')] },
  e: { sound: 'eh', name: 'ee', words: [w('egg')] },
  f: { sound: 'fuh', name: 'F', words: [w('fish')] },
  g: { sound: 'guh', name: 'G', words: [w('grapes')] },
  h: { sound: 'huh', name: 'H', words: [w('hat')] },
  i: { sound: 'ih', name: 'eye', words: [w('igloo')] },
  j: { sound: 'juh', name: 'J', words: [w('jelly')] },
  k: { sound: 'kuh', name: 'K', words: [w('kite')] },
  l: { sound: 'luh', name: 'L', words: [w('lion')] },
  m: { sound: 'muh', name: 'M', words: [w('moon')] },
  n: { sound: 'nuh', name: 'N', words: [w('nest')] },
  o: { sound: 'aw', name: 'oh', words: [w('octopus')] },
  p: { sound: 'puh', name: 'P', words: [w('pig')] },
  q: { sound: 'kwuh', name: 'Q', words: [w('queen')] },
  r: { sound: 'ruh', name: 'R', words: [w('rainbow')] },
  s: { sound: 'suh', name: 'S', words: [w('sun')] },
  t: { sound: 'tuh', name: 'T', words: [w('tiger')] },
  u: { sound: 'uh', name: 'you', words: [w('umbrella')] },
  v: { sound: 'vuh', name: 'V', words: [w('van')] },
  w: { sound: 'wuh', name: 'W', words: [w('worm')] },
  y: { sound: 'yuh', name: 'Y', words: [w('yo-yo')] },
  z: { sound: 'zuh', name: 'Z', words: [w('zebra')] },
}

export const ALL_LETTERS = Object.keys(LETTERS)

/** Letters and Sounds order: sets 1-2, 3-5, then the rest. */
export const PRESETS = [
  { label: 's a t p i n', letters: [...'satpin'] },
  { label: '+ m d g o c k', letters: [...'satpinmdgock'] },
  { label: '+ e u r h b f l', letters: [...'satpinmdgockeurhbfl'] },
  { label: 'All', letters: ALL_LETTERS },
]

export interface Friend {
  id: FriendId
  name: string
  spot: SpotKind
  voice: VoiceStyle
  /** How they come out of hiding. */
  move: 'hop' | 'fly' | 'scurry'
}

export const FRIENDS: Friend[] = [
  { id: 'rabbit', name: 'Rabbit', spot: 'bush', voice: { pitch: 1.5, rate: 1 }, move: 'hop' },
  { id: 'badger', name: 'Badger', spot: 'burrow', voice: { pitch: 0.75, rate: 0.88 }, move: 'hop' },
  { id: 'weasel', name: 'Weasel', spot: 'log', voice: { pitch: 1.2, rate: 1.05 }, move: 'scurry' },
  { id: 'robin', name: 'Robin', spot: 'bush', voice: { pitch: 1.85, rate: 1.05 }, move: 'fly' },
  { id: 'hedgehog', name: 'Hedgehog', spot: 'bush', voice: { pitch: 1.3, rate: 0.92 }, move: 'scurry' },
  { id: 'mouse', name: 'Mouse', spot: 'log', voice: { pitch: 2, rate: 1.1 }, move: 'scurry' },
]

export const TOYS: { id: ToyId; name: string }[] = [
  { id: 'ball', name: 'ball' },
  { id: 'bone', name: 'bone' },
  { id: 'blanket', name: 'blanket' },
  { id: 'teddy', name: 'teddy' },
  { id: 'slipper', name: 'slipper' },
]

export const NARRATOR: VoiceStyle = { pitch: 1.05, rate: 0.95 }
export const KIPPER_VOICE: VoiceStyle = { pitch: 1.4, rate: 1.05 }

export const pick = <T>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)]

export const LINES = {
  missing: `Oh no! ${DOG}'s toys are missing!`,
  toyList: `His ball, his bone, his blanket, his teddy, and his slipper!`,
  letsGo: [`Let's help ${DOG} find them!`, `Let's go and look for them!`],
  peek: {
    bush: ['Who is in the bush?', 'The bush is wiggling! Who is in there?'],
    log: ['Who is behind the log?', 'Something is behind the log!'],
    burrow: ['Who is in the hole?', 'Who lives in this hole?'],
  } satisfies Record<SpotKind, string[]>,
  tapIt: ['Tap it!', 'Give it a tap!'],
  hello: (f: Friend) => [`Hello ${DOG}! I'm ${f.name}.`, `Hello! It's me, ${f.name}!`],
  found: (toy: string) => [`I found your ${toy}!`, `Look, I've got your ${toy}!`],
  help: ['Can you help me with a letter?', "Let's play a letter game!"],
  question: (word: string) => `${word[0].toUpperCase()}${word.slice(1)}! Which letter does ${word} start with?`,
  again: (word: string) => [`Which letter does ${word} start with?`, `Can you find the letter for ${word}?`],
  yes: ['Yes!', 'Well done!', 'Brilliant!', 'Hooray!', 'Clever you!'],
  tryAgain: ['Try again!', 'Have another go!'],
  giveBack: (toy: string) => `Here's your ${toy}, ${DOG}!`,
  bye: ['Bye bye!', `Bye bye, ${DOG}!`, 'See you soon!'],
  woof: ['Woof!', 'Woof woof!'],
  homeTime: [`${DOG} has found all his toys! Time to go home.`],
  hooray: `Hooray! Thank you for helping ${DOG}.`,
  sleepy: `${DOG} is very sleepy.`,
  night: `Night night, ${DOG}.`,
}
