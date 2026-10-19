import { hasClip } from './audio/clips'
import { unlockAudio } from './audio/sfx'
import { speech } from './audio/speech'
import { ALL_LETTERS, LETTERS, PRESETS, script } from './content'
import { h, keepWhole } from './dom'
import { clearStats, loadStats, type Settings } from './settings'
import { openStudio } from './studio'

function segmented<T extends string | number>(options: [T, string][], value: T, onPick: (v: T) => void) {
  const wrap = h('div', 'seg')
  for (const [v, label] of options) {
    const b = h('button', v === value ? 'on' : '', label)
    b.type = 'button'
    b.addEventListener('click', () => {
      wrap.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b))
      onPick(v)
    })
    wrap.append(b)
  }
  return wrap
}

function note(text: string) {
  const p = h('p', 'note')
  p.append(...keepWhole(text))
  return p
}

function section(title: string, ...children: (Node | string)[]) {
  const s = h('section')
  s.append(h('h3', '', title), ...children)
  return s
}

/** Settings for the grown-up holding the tablet. `apply` saves and takes effect from the next game. */
export function openGrownups(settings: Settings, apply: (s: Settings) => void) {
  const s = { ...settings, letters: [...settings.letters] }
  const commit = () => apply({ ...s, letters: ALL_LETTERS.filter((l) => s.letters.includes(l)) })

  const d = h('dialog', 'grownups')
  const head = h('header')
  const close = h('button', 'close', 'Done')
  close.type = 'button'
  close.addEventListener('click', () => d.close())
  head.append(h('h2', '', 'Grown-ups'), close)

  // Letters
  const grid = h('div', 'letters')
  const paint = () => grid.querySelectorAll<HTMLButtonElement>('button').forEach((b) => b.classList.toggle('on', s.letters.includes(b.dataset.l!)))
  for (const l of ALL_LETTERS) {
    const b = h('button', '', l)
    b.type = 'button'
    b.dataset.l = l
    b.title = LETTERS[l].words[0].word
    b.addEventListener('click', () => {
      s.letters = s.letters.includes(l) ? s.letters.filter((x) => x !== l) : [...s.letters, l]
      if (!s.letters.length) s.letters = [l]
      paint()
      commit()
    })
    grid.append(b)
  }
  const presets = h('div', 'presets')
  for (const p of PRESETS) {
    const b = h('button', '', p.label)
    b.type = 'button'
    b.addEventListener('click', () => {
      s.letters = [...p.letters]
      paint()
      commit()
    })
    presets.append(b)
  }
  paint()

  // Voice
  const voice = h('select')
  const auto = h('option', '', 'Best available')
  auto.value = ''
  voice.append(auto)
  for (const v of speech.voices()) {
    const o = h('option', '', `${v.name} (${v.lang})`)
    o.value = v.voiceURI
    voice.append(o)
  }
  voice.value = s.voice
  voice.addEventListener('change', () => {
    s.voice = voice.value
    commit()
  })
  const test = h('button', 'small', 'Test')
  test.type = 'button'
  test.addEventListener('click', () => {
    unlockAudio()
    speech.unlock()
    void speech.say('narrator', ['Hello! Which letter does igloo start with?'])
  })
  const voiceRow = h('div', 'inline')
  voiceRow.append(voice, test)

  // Your voice
  const pieces = script().groups.flatMap((g) => g.pieces)
  const mine = h('p', 'note')
  const tally = () => {
    const n = pieces.filter((p) => hasClip(p.id)).length
    mine.textContent = n
      ? `${n} of ${pieces.length} recorded. Anything you haven't done yet uses the game's own voices.`
      : `Read the game's script out loud, ${pieces.length} short lines, and it speaks in your voice instead.`
  }
  tally()
  const openScript = h('button', '', 'Open the script')
  openScript.type = 'button'
  openScript.addEventListener('click', () => openStudio(tally))

  // Progress
  const stats = loadStats()
  const prog = h('div', 'progress')
  const seen = ALL_LETTERS.filter((l) => stats[l]?.seen)
  if (!seen.length) prog.append(h('p', 'note', 'Nothing yet. Play a game and the letters she has tried show up here.'))
  for (const l of seen) {
    const { seen: n, right } = stats[l]
    const cell = h('div', right / n >= 0.8 ? 'cell good' : right / n < 0.5 ? 'cell work' : 'cell')
    cell.append(h('b', '', l), h('span', '', `${right}/${n}`))
    prog.append(cell)
  }
  const resetStats = h('button', 'small quiet', 'Reset progress')
  resetStats.type = 'button'
  resetStats.addEventListener('click', () => {
    clearStats()
    prog.replaceChildren(h('p', 'note', 'Progress cleared.'))
  })

  const captions = h('label', 'check')
  const box = h('input')
  box.type = 'checkbox'
  box.checked = s.captions
  box.addEventListener('change', () => {
    s.captions = box.checked
    commit()
  })
  captions.append(box, ' Show what is being said')

  d.append(
    head,
    section('Letters to practise', h('p', 'note', 'Each game asks seven different letters from these. Narrow it down while she is learning.'), presets, grid),
    section('Choices', segmented([[2, '2'], [3, '3'], [4, '4']], s.choices, (v) => ((s.choices = v as 2 | 3 | 4), commit()))),
    section('Letters look like', segmented([['lower', 'a b c'], ['upper', 'A B C']], s.letterCase, (v) => ((s.letterCase = v), commit()))),
    section(
      'Say the letter',
      segmented([['sounds', 'Sounds (phonics)'], ['names', 'Names']], s.say, (v) => ((s.say = v), commit())),
      note('No speech engine can say a pure "sss" on its own, so the narrator stretches the word instead ("s-s-sun"). Record the script below and the game uses your sounds.'),
    ),
    section('Your voice', mine, openScript),
    section('Back-up voice', h('p', 'note', 'Used for any line without a recorded voice.'), voiceRow, captions),
    section('Right first time', prog, resetStats),
  )
  document.body.append(d)
  d.addEventListener('close', () => d.remove())
  d.showModal()
}

/** A button that only opens after being held, so little fingers don't wander in. */
export function holdToOpen(btn: HTMLElement, open: () => void, ms = 1200) {
  let timer = 0
  const cancel = () => {
    clearTimeout(timer)
    btn.classList.remove('holding')
  }
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault()
    btn.classList.add('holding')
    timer = window.setTimeout(() => {
      cancel()
      open()
    }, ms)
  })
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) btn.addEventListener(ev, cancel)
  btn.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return
    // Otherwise the same key press goes on to click whatever the new dialog focuses: its Done button.
    e.preventDefault()
    open()
  })
}
