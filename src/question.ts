import { card, speakerIcon } from './art/icons'
import { picture } from './art/pictures'
import { sfx } from './audio/sfx'
import { speech, type Part } from './audio/speech'
import { LINES, pick, type VoiceStyle } from './content'
import { burst, centre, wiggle } from './fx'
import type { Question } from './questions'
import { sleep, type Run } from './run'
import type { Settings } from './settings'

const TILE_FILLS = ['#fff3cf', '#dcedf8', '#fbe0e5', '#e2f2d6']
export const AUTOPLAY = new URLSearchParams(location.search).has('autoplay')

const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

/**
 * Show the picture and letter tiles and wait for the right tap.
 * Nothing is ever marked "wrong" out loud: a wrong tile fades away, so she always ends on a win.
 * Resolves true if she got it first time.
 */
export function ask(run: Run, root: HTMLElement, q: Question, settings: Settings, voice: VoiceStyle, talking: (on: boolean) => void) {
  const word = q.word.word
  root.replaceChildren()
  root.dataset.n = String(q.choices.length)

  const cardEl = document.createElement('button')
  cardEl.className = 'card'
  cardEl.setAttribute('aria-label', `${word}, say it again`)
  cardEl.innerHTML = card(200, 200, '#fffaf0', `card-${word}`, 18) + `<div class="pic">${picture(q.word.picture)}</div><div class="speaker">${speakerIcon()}</div>`

  const tilesEl = document.createElement('div')
  tilesEl.className = 'tiles'
  const tiles = q.choices.map((letter, i) => {
    const b = document.createElement('button')
    b.className = 'tile'
    b.dataset.letter = letter
    b.setAttribute('aria-label', letter)
    b.style.setProperty('--tilt', `${(i % 2 ? 1 : -1) * (1 + ((i * 37) % 3))}deg`)
    b.style.setProperty('--i', String(i))
    b.innerHTML = card(100, 100, TILE_FILLS[i % TILE_FILLS.length], `tile-${i}`, 14)
    const glyph = document.createElement('span')
    glyph.textContent = settings.letterCase === 'upper' ? letter.toUpperCase() : letter
    b.append(glyph)
    tilesEl.append(b)
    return b
  })
  root.append(cardEl, tilesEl)
  requestAnimationFrame(() => root.classList.add('on'))

  const sound: Part = { sound: q.letter }
  const talk = async (parts: Part[]) => {
    talking(true)
    const finished = await speech.say(parts, voice)
    if (finished) talking(false)
    return finished
  }

  return run.guard(
    new Promise<boolean>((resolve) => {
      let firstTry = true
      let done = false
      let prompts = 0
      let idle = 0
      const timers: number[] = []

      const hint = () => tiles.find((t) => t.dataset.letter === q.letter)!.classList.add('hint')

      // If she wanders off, ask again; the second time, give the sound and nudge the right tile.
      const arm = () => {
        clearTimeout(idle)
        idle = window.setTimeout(() => {
          if (done) return
          prompts++
          if (prompts >= 2) hint()
          if (prompts <= 3)
            void talk(
              prompts >= 2 && settings.say === 'sounds'
                ? [pick(LINES.again(word)), { pause: 200 }, sound, { pause: 150 }, sound, { pause: 150 }, `${word}.`]
                : [pick(LINES.again(word))],
            )
          arm()
        }, 9000)
      }

      const finish = () => {
        done = true
        clearTimeout(idle)
        timers.forEach(clearTimeout)
      }

      const choose = async (tile: HTMLButtonElement) => {
        if (done || tile.classList.contains('wrong')) return
        const letter = tile.dataset.letter!
        arm()
        if (letter === q.letter) {
          finish()
          tile.classList.add('right')
          root.classList.add('answered')
          sfx.chime()
          const [x, y] = centre(tile.getBoundingClientRect())
          burst(x, y)
          await talk(
            settings.say === 'names'
              ? [pick(LINES.yes), `${cap(word)} starts with`, { name: letter }, '!']
              : [pick(LINES.yes), sound, { pause: 150 }, sound, { pause: 150 }, `${word}!`],
          )
          await sleep(250)
          root.classList.remove('on', 'answered')
          resolve(firstTry)
        } else {
          firstTry = false
          tile.classList.add('wrong')
          sfx.boop()
          if (tiles.filter((t) => !t.classList.contains('wrong')).length === 1) hint()
          void talk(
            settings.say === 'names'
              ? [`That's`, { name: letter }, '.', pick(LINES.tryAgain)]
              : ['That one says', { sound: letter }, '.', pick(LINES.tryAgain)],
          )
        }
      }

      for (const t of tiles)
        t.addEventListener('pointerdown', (e) => {
          e.preventDefault()
          void choose(t)
        })
      cardEl.addEventListener('pointerdown', () => {
        if (done) return
        void wiggle(cardEl.querySelector('.pic')!)
        void talk([`${cap(word)}!`])
        arm()
      })
      run.onCancel(() => {
        finish()
        root.classList.remove('on', 'answered')
      })

      void talk([LINES.question(word)])
      arm()

      if (AUTOPLAY) {
        const wrong = tiles.find((t) => t.dataset.letter !== q.letter)
        if (wrong) timers.push(window.setTimeout(() => void choose(wrong), 1400))
        timers.push(window.setTimeout(() => void choose(tiles.find((t) => t.dataset.letter === q.letter)!), 2600))
      }
    }),
  )
}
