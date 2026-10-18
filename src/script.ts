import { toy } from './art/props'
import { sfx } from './audio/sfx'
import { speech, type Part } from './audio/speech'
import { ALWAYS, FRIENDS, LINES, ROUNDS, TOYS, pick, type Speaker } from './content'
import { burst, centre, flyTo } from './fx'
import { ask, questionLines } from './question'
import { planQuestions, shuffle, type Question } from './questions'
import type { Run } from './run'
import { loadStats, recordAnswer, type Settings } from './settings'
import type { Shell } from './shell'
import type { Round, Stage } from './stages/types'

// The story, the same in 2D and 3D: Kipper's toys are missing, friends along the way have
// found them, and each one gives a toy back for a letter. Then home to bed.

const say = (run: Run, who: Speaker, parts: Part[]) => run.guard(speech.say(who, parts))
const toyName = (r: Round) => TOYS.find((t) => t.id === r.toy)!.name

/** Seven friends (Neddy always among them), seven toys, in a new order every game. */
export function planRounds(): Round[] {
  const always = FRIENDS.filter((f) => ALWAYS.includes(f.id))
  const rest = shuffle(FRIENDS.filter((f) => !ALWAYS.includes(f.id))).slice(0, ROUNDS - always.length)
  const friends = shuffle([...always, ...rest])
  return TOYS.slice(0, ROUNDS).map((t, index) => ({ index, friend: friends[index], toy: t.id }))
}

function prefetch(r: Round, q: Question) {
  const L = LINES.friend
  speech.prefetch(r.friend.id, [L.hello(r.friend), L.found(toyName(r)), L.help, L.giveBack(toyName(r)), L.bye])
  speech.prefetch('narrator', questionLines(q))
}

async function round(run: Run, shell: Shell, stage: Stage, settings: Settings, r: Round, q: Question) {
  await stage.find(run, r)
  const friendSay = async (line: string) => {
    stage.talking(r, true)
    try {
      await say(run, r.friend.id, [line])
    } finally {
      stage.talking(r, false)
    }
  }
  stage.mood('happy')
  await friendSay(LINES.friend.hello(r.friend))
  await friendSay(LINES.friend.found(toyName(r)))
  await friendSay(LINES.friend.help)
  stage.mood('')

  const firstTry = await ask(run, shell.questionEl, q, settings)
  recordAnswer(q.letter, firstTry)

  await friendSay(LINES.friend.giveBack(toyName(r)))
  const from = stage.takeToy(r)
  sfx.whoosh()
  const slot = shell.hud.slot(r.toy)
  await run.guard(flyTo(toy(r.toy), from, slot.getBoundingClientRect()))
  shell.hud.found(r.toy)
  sfx.sparkle()
  const [x, y] = centre(slot.getBoundingClientRect())
  burst(x, y, 8, 60)
  stage.mood('happy')
  stage.cheer()
  if (r.index % 2) await say(run, 'tiger', [pick(LINES.tiger.cheer)])
  await friendSay(LINES.friend.bye)
  await stage.farewell(run, r)
  stage.mood('')
}

/** Into the basket, every toy home, and night falls. */
export async function ending(run: Run, shell: Shell, stage: Stage, settings: Settings) {
  stage.mood('happy')
  await stage.tuckIn(run)
  sfx.pop()
  const cheer = say(run, 'narrator', [LINES.narrator.hooray])
  for (const t of TOYS) {
    sfx.whoosh()
    await run.guard(flyTo(toy(t.id), shell.hud.slot(t.id).getBoundingClientRect(), stage.restingPlace(t.id), 700))
    stage.placeToy(t.id)
    shell.hud.found(t.id, false)
    sfx.sparkle()
  }
  shell.hud.show(false)
  await cheer
  // A phonics bonus: three of the toys share a sound.
  await say(run, 'narrator', settings.say === 'names' ? ['Ball, bone, blanket! They all start with', { name: 'b' }, '!'] : [LINES.narrator.bBonus])
  shell.night(true)
  stage.night(true)
  await run.wait(1800)
  await say(run, 'narrator', [LINES.narrator.sleepy])
  stage.snore()
  await run.wait(600)
  await say(run, 'narrator', [LINES.narrator.night])
}

/** One whole game. */
export async function game(run: Run, shell: Shell, stage: Stage, settings: Settings) {
  const rounds = planRounds()
  const questions = planQuestions(settings.letters, settings.choices, loadStats(), rounds.length)
  prefetch(rounds[0], questions[0])

  shell.hud.show(true)
  stage.mood('sad')
  await run.wait(500)
  await say(run, 'narrator', [LINES.narrator.missing])
  const listing = say(run, 'narrator', [LINES.narrator.toyList])
  for (const t of TOYS) {
    await run.wait(430)
    shell.hud.pulse(t.id)
    sfx.pop()
  }
  await listing
  await say(run, 'narrator', [LINES.narrator.letsGo])
  stage.mood('happy')
  stage.cheer()
  await say(run, 'tiger', [pick(LINES.tiger.start)])

  for (const [i, r] of rounds.entries()) {
    if (rounds[i + 1]) prefetch(rounds[i + 1], questions[i + 1])
    await round(run, shell, stage, settings, r, questions[i])
  }

  void say(run, 'narrator', [LINES.narrator.homeTime])
  await stage.goHome(run)
  await ending(run, shell, stage, settings)
}

/** ?scene=question: one friend, then question after question (for testing). */
export async function questionLoop(run: Run, shell: Shell, stage: Stage, settings: Settings) {
  const [r] = planRounds()
  shell.hud.show(true)
  await stage.find(run, r)
  for (;;) {
    const [q] = planQuestions(settings.letters, settings.choices, loadStats(), 1)
    await ask(run, shell.questionEl, q, settings)
    await run.wait(600)
  }
}

/** ?scene=ending: all toys found, straight to bedtime. */
export async function endingOnly(run: Run, shell: Shell, stage: Stage, settings: Settings) {
  shell.hud.show(true)
  for (const t of TOYS) shell.hud.found(t.id)
  await ending(run, shell, stage, settings)
}
