import { toy } from './art/props'
import { sfx } from './audio/sfx'
import { speech, type Part } from './audio/speech'
import { FRIENDS, LINES, NARRATOR, TOYS, pick, type VoiceStyle } from './content'
import { burst, centre, flyTo, jump } from './fx'
import { AUTOPLAY, ask } from './question'
import { makeQuestion, shuffle } from './questions'
import type { Run } from './run'
import { loadStats, recordAnswer, type Settings } from './settings'
import type { Spot, Stage } from './stage'

// The story: Kipper's toys are missing, friends along the path have them,
// and each one gives a toy back for a letter.

const say = (run: Run, parts: Part[], voice: VoiceStyle = NARRATOR) => run.guard(speech.say(parts, voice))

async function friendSay(run: Run, s: Spot, parts: Part[]) {
  s.bob.classList.add('talking')
  try {
    await say(run, parts, s.friend.voice)
  } finally {
    s.bob.classList.remove('talking')
  }
}

/** Resolves when the element is tapped or the time runs out. */
function tapOrWait(run: Run, el: HTMLElement, ms: number) {
  let tapped = false
  let off = () => {}
  const p = new Promise<void>((resolve) => {
    const onTap = () => {
      tapped = true
      resolve()
    }
    el.addEventListener('pointerdown', onTap, { once: true })
    const t = setTimeout(resolve, AUTOPLAY ? 700 : ms)
    off = () => {
      el.removeEventListener('pointerdown', onTap)
      clearTimeout(t)
    }
  })
  return run.guard(p).then(
    () => (off(), tapped),
    (e) => {
      off()
      throw e
    },
  )
}

/** The hiding place rustles until she taps it (or it gives up waiting and peeks out anyway). */
async function peekaboo(run: Run, stage: Stage, s: Spot) {
  s.art.classList.add('wiggle')
  sfx.rustle()
  const rustle = setInterval(() => sfx.rustle(), 1500)
  const stop = run.onCancel(() => clearInterval(rustle))
  try {
    void speech.say([pick(LINES.peek[s.friend.spot])], NARRATOR)
    if (!(await tapOrWait(run, s.el, 6500))) {
      void speech.say([pick(LINES.tapIt)], NARRATOR)
      await tapOrWait(run, s.el, 6000)
    }
  } finally {
    clearInterval(rustle)
    stop()
  }
  speech.stop()
  s.art.classList.remove('wiggle')
  sfx.pop()
  await stage.reveal(run, s)
}

async function handOver(run: Run, stage: Stage, s: Spot, t: (typeof TOYS)[number]) {
  await friendSay(run, s, [LINES.giveBack(t.name)])
  const held = s.friendEl.querySelector<SVGElement>('.held')!
  const from = held.getBoundingClientRect()
  held.style.visibility = 'hidden'
  sfx.whoosh()
  const slot = stage.hud.slot(t.id)
  await run.guard(flyTo(toy(t.id), from, slot.getBoundingClientRect()))
  stage.hud.found(t.id)
  sfx.sparkle()
  const [x, y] = centre(slot.getBoundingClientRect())
  burst(x, y, 8, 60)
  stage.mood('happy')
  void stage.kipperJump()
  await friendSay(run, s, [pick(LINES.bye)])
  await stage.leave(run, s)
  stage.mood('')
}

async function ending(run: Run, stage: Stage, settings: Settings) {
  stage.mood('happy')
  await stage.tuckIn(run)
  sfx.pop()
  const cheer = say(run, [LINES.hooray])
  for (const t of TOYS) {
    const slot = stage.hud.slot(t.id)
    sfx.whoosh()
    await run.guard(flyTo(toy(t.id), slot.getBoundingClientRect(), stage.restingPlace(t.id), 800))
    stage.placeToy(t.id)
    stage.hud.found(t.id, false)
    sfx.sparkle()
  }
  stage.hud.show(false)
  await cheer
  // A phonics bonus: three of the toys share a sound.
  await say(run, ['Ball, bone, and blanket all start with', settings.say === 'names' ? { name: 'b' } : { sound: 'b' }, '!'])
  stage.night(true)
  await run.wait(1800)
  await say(run, [LINES.sleepy])
  stage.home.classList.add('snoring')
  await run.wait(600)
  await say(run, [LINES.night])
}

/** One whole game: intro, five friends, home to bed. */
export async function game(run: Run, stage: Stage, settings: Settings) {
  const friends = shuffle(FRIENDS).slice(0, TOYS.length)
  const recent: string[] = []

  stage.hud.show(true)
  stage.mood('sad')
  await run.wait(500)
  await say(run, [LINES.missing])
  const listing = say(run, [LINES.toyList])
  for (const t of TOYS) {
    await run.wait(560)
    stage.hud.pulse(t.id)
    sfx.pop()
  }
  await listing
  await say(run, [pick(LINES.letsGo)])
  stage.mood('happy')
  void jump(stage.kipperBob, stage.kipperSlot.offsetHeight * 0.15)
  await run.wait(400)

  let prev: HTMLElement = stage.home
  for (const [i, t] of TOYS.entries()) {
    const s = stage.addSpot(friends[i], t.id)
    await stage.walk(run, prev, s.el)
    prev = s.el
    stage.mood('')
    await peekaboo(run, stage, s)
    stage.mood('happy')
    await friendSay(run, s, [pick(LINES.hello(s.friend))])
    await friendSay(run, s, [pick(LINES.found(t.name))])
    await friendSay(run, s, [pick(LINES.help)])
    stage.mood('')
    const q = makeQuestion(settings.letters, settings.choices, loadStats(), recent)
    recent.unshift(q.letter)
    recent.length = Math.min(recent.length, 2)
    const firstTry = await ask(run, stage.questionEl, q, settings, s.friend.voice, (on) => s.bob.classList.toggle('talking', on))
    recordAnswer(q.letter, firstTry)
    await handOver(run, stage, s, t)
  }

  void say(run, [pick(LINES.homeTime)])
  await stage.walk(run, prev, stage.home, 3200)
  await ending(run, stage, settings)
}

/** ?scene=question: skip the story and ask question after question with one friend (for testing). */
export async function questionLoop(run: Run, stage: Stage, settings: Settings) {
  const f = FRIENDS[0]
  const s = stage.addSpot(f, 'ball')
  stage.hud.show(true)
  await stage.walk(run, stage.home, s.el, 300)
  await stage.reveal(run, s)
  const recent: string[] = []
  for (;;) {
    const q = makeQuestion(settings.letters, settings.choices, loadStats(), recent)
    recent.unshift(q.letter)
    recent.length = Math.min(recent.length, 2)
    await ask(run, stage.questionEl, q, settings, f.voice, (on) => s.bob.classList.toggle('talking', on))
    await run.wait(600)
  }
}

/** ?scene=ending: all toys found, straight to bedtime. */
export async function endingOnly(run: Run, stage: Stage, settings: Settings) {
  stage.hud.show(true)
  for (const t of TOYS) stage.hud.found(t.id)
  await ending(run, stage, settings)
}
