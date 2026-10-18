import { canRecord, deleteClip, hasClip, playClip, record } from './audio/clips'
import { unlockAudio } from './audio/sfx'
import { speech } from './audio/speech'
import { ALL_LETTERS, LETTERS, PRESETS } from './content'
import { clearStats, loadStats, type Settings } from './settings'

const h = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = '') => {
  const el = document.createElement(tag)
  if (cls) el.className = cls
  if (text) el.textContent = text
  return el
}

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

  // Recordings
  const recs = h('div', 'recs')
  if (!canRecord()) {
    recs.append(h('p', 'note', 'Recording needs the game opened over https (for example the Netlify link), not a plain http address.'))
  } else {
    for (const l of ALL_LETTERS) {
      const row = h('div', 'rec')
      const rec = h('button', 'small rec-btn', 'Record')
      const play = h('button', 'small', 'Play')
      const del = h('button', 'small quiet', 'Clear')
      ;[rec, play, del].forEach((b) => (b.type = 'button'))
      const sync = () => {
        play.disabled = del.disabled = !hasClip(l)
        row.classList.toggle('has', hasClip(l))
      }
      let stop: (() => void) | null = null
      rec.addEventListener('click', async () => {
        if (stop) return stop()
        unlockAudio()
        try {
          const r = await record(l)
          stop = r.stop
          rec.textContent = 'Stop'
          rec.classList.add('live')
          await r.done
          await playClip(l)
        } catch {
          rec.textContent = 'No mic'
        } finally {
          stop = null
          rec.classList.remove('live')
          if (rec.textContent === 'Stop') rec.textContent = 'Record'
          sync()
        }
      })
      play.addEventListener('click', () => {
        unlockAudio()
        void playClip(l)
      })
      del.addEventListener('click', async () => {
        await deleteClip(l)
        sync()
      })
      sync()
      row.append(h('b', '', l), h('span', '', LETTERS[l].words[0].word), rec, play, del)
      recs.append(row)
    }
  }

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
      h('p', 'note', 'No voice can say a pure "sss" on its own, so the narrator stretches the word instead ("s-s-sun"). Record your own sounds below and the game uses yours.'),
    ),
    section('Back-up voice', h('p', 'note', 'Used for any line without a recorded voice.'), voiceRow, captions),
    section('Your voice for each sound', h('p', 'note', 'Tap Record and say the sound once, like "sss" or "ih". It stops by itself.'), recs),
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
  btn.addEventListener('keydown', (e) => e.key === 'Enter' && open())
}
