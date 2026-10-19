import { picture } from './art/pictures'
import { canRecord, deleteClip, exportClips, hasClip, importClips, record, type Take } from './audio/clips'
import { unlockAudio } from './audio/sfx'
import { speech } from './audio/speech'
import { script, type Piece } from './content'
import { button, h, keepWhole } from './dom'

// The game as a script, to read out in your own voice. One piece at a time: tap, read it out,
// and it stops when you do, plays it back and moves on to the next. The whole script is listed
// alongside, to jump about and redo any of it.

type State = 'idle' | 'starting' | 'recording' | 'playing'

/** Long enough for a slow read of the piece, and a breath. */
const maxMs = (p: Piece) => Math.min(15000, 3000 + p.text.length * 90)

const STATUS: Record<State, string> = {
  idle: 'Tap Record and read it out. It stops when you do.',
  starting: 'Opening the mic...',
  recording: 'Go ahead. It stops a second after you do.',
  playing: 'Playing it back.',
}

/** `onChange` runs whenever recordings are added or removed. */
export function openStudio(onChange: () => void) {
  const { groups } = script()
  const all = groups.flatMap((g) => g.pieces.map((p) => ({ p, g })))
  /** The first piece not yet recorded, starting from `from` and wrapping round. */
  const todo = (from = 0) => {
    for (let k = 0; k < all.length; k++) {
      const i = (from + k) % all.length
      if (!hasClip(all[i].p.id)) return i
    }
    return -1
  }
  let at = Math.max(0, todo())
  let state: State = 'idle'
  let take: Take | null = null
  let message = ''
  let open = true
  const wide = () => matchMedia('(min-width: 820px)').matches

  const d = h('dialog', 'grownups studio')
  const count = h('span', 'count')
  const head = h('header')
  head.append(h('h2', '', 'The script'), count, button('close', 'Done', () => d.close()))

  // The piece being recorded.
  const where = h('p', 'where')
  const tip = h('p', 'note')
  const pic = h('div', 'pic')
  const line = h('p', 'line')
  const note = h('p', 'line-note')
  const mic = button('mic', 'Record', () => void toggle())
  const status = h('p', 'status')
  const listen = () => state === 'idle' && hasClip(all[at].p.id) && void speech.clip(all[at].p.id)
  const back = button('small', 'Back', () => go(at - 1))
  const play = button('small', 'Play', listen)
  const clear = button('small quiet', 'Clear', async () => {
    await deleteClip(all[at].p.id)
    onChange()
    paint()
  })
  const skip = button('small', 'Skip', () => go(at + 1))
  const nav = h('div', 'inline nav')
  nav.append(back, play, clear, skip)
  const now = h('section', 'now')
  now.append(where, tip, pic, line, note, mic, status, nav)

  // The whole script, in order.
  const list = h('div', 'script')
  const rows: HTMLButtonElement[] = []
  const tallies: [HTMLElement, Piece[]][] = []
  for (const g of groups) {
    const tally = h('span')
    const title = h('h3', '', `${g.title} `)
    title.append(tally)
    tallies.push([tally, g.pieces])
    list.append(title)
    for (const p of g.pieces) {
      const i = rows.length
      const row = button('row', '', () => go(i, true))
      const text = h('span')
      text.append(...keepWhole(p.text))
      row.append(text)
      if (p.note) row.append(h('small', '', p.note))
      rows.push(row)
      list.append(row)
    }
  }

  // Backing up.
  const saveNote = h('p', 'note', 'Recordings are kept on this device only. Save a copy to back them up, or to move them to another tablet.')
  let ready: File | null = null
  const save = button('small', 'Save a copy', async () => {
    const file = ready ?? new File([await exportClips()], `kippers-basket-voice-${new Date().toISOString().slice(0, 10)}.json`, { type: 'application/json' })
    ready = null
    save.textContent = 'Save a copy'
    try {
      if (navigator.canShare?.({ files: [file] })) return await navigator.share({ files: [file] })
    } catch (e) {
      const why = (e as DOMException).name
      if (why === 'AbortError') return
      // Safari only shares straight from a tap, and making the file took too long: one more tap.
      if (why === 'NotAllowedError') {
        ready = file
        save.textContent = 'Tap again to save'
        return
      }
    }
    const a = h('a')
    a.href = URL.createObjectURL(file)
    a.download = file.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 30000)
  })
  const picker = h('input')
  picker.type = 'file'
  picker.accept = '.json,application/json'
  picker.hidden = true
  picker.addEventListener('change', async () => {
    const file = picker.files?.[0]
    picker.value = ''
    if (!file) return
    try {
      saveNote.textContent = `Loaded ${await importClips(file)} recordings.`
      onChange()
    } catch {
      saveNote.textContent = "That file isn't a saved copy of the recordings."
    }
    paint()
  })
  const load = button('small', 'Load a copy', () => picker.click())
  const backup = h('section', 'backup')
  const buttons = h('div', 'inline')
  buttons.append(save, load, picker)
  backup.append(h('h3', '', 'Keep them safe'), saveNote, buttons)
  if (matchMedia('(hover: hover)').matches) backup.append(h('p', 'note', 'On a keyboard: Space records, the arrows move, P plays it back.'))

  const desk = h('div', 'desk')
  desk.append(now, list)
  d.append(head, desk, backup)

  function paint() {
    const { p, g } = all[at]
    const has = hasClip(p.id)
    const busy = state === 'starting' || state === 'recording'
    const done = all.filter((x) => hasClip(x.p.id)).length
    count.textContent = `${done} of ${all.length}`
    where.textContent = `${g.title} · ${g.who} · ${g.pieces.indexOf(p) + 1} of ${g.pieces.length}`
    tip.replaceChildren(...keepWhole(g.tip))
    pic.innerHTML = p.picture ? picture(p.picture) : ''
    line.replaceChildren(...keepWhole(p.text))
    line.classList.toggle('letter', p.id.length === 1)
    note.textContent = p.note ?? ''
    mic.textContent = state === 'idle' && has ? 'Again' : { idle: 'Record', starting: 'Wait', recording: 'Stop', playing: 'Next' }[state]
    mic.className = `mic ${state}`
    mic.disabled = !canRecord() || state === 'starting'
    status.textContent = !canRecord()
      ? isSecureContext
        ? "This browser can't record sound. Safari or Chrome can."
        : 'Recording needs the game opened over https, like the Netlify link.'
      : message || (state === 'idle' && has ? 'Recorded. Play it back, or tap Again to redo it.' : STATUS[state])
    back.disabled = skip.disabled = busy
    play.disabled = clear.disabled = busy || !has
    save.disabled = !done
    rows.forEach((r, i) => {
      r.classList.toggle('has', hasClip(all[i].p.id))
      r.classList.toggle('at', i === at)
      r.disabled = busy
    })
    for (const [t, ps] of tallies) t.textContent = `${ps.filter((x) => hasClip(x.id)).length}/${ps.length}`
  }

  const set = (s: State) => {
    state = s
    paint()
  }

  function go(i: number, fromList = false) {
    if (state === 'starting' || state === 'recording') return
    if (state === 'playing') speech.stop()
    message = ''
    at = (i + all.length) % all.length
    set('idle')
    // Side by side the list scrolls to keep up; stacked on a phone, the piece is back up top.
    if (wide()) rows[at].scrollIntoView({ block: 'nearest' })
    else if (fromList) now.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  const meter = () => {
    if (state !== 'recording' || !take) return mic.style.setProperty('--lvl', '0')
    mic.style.setProperty('--lvl', Math.min(1, Math.sqrt(take.level() / 0.15)).toFixed(3))
    requestAnimationFrame(meter)
  }

  async function toggle() {
    if (state === 'recording') return take?.stop()
    if (state === 'playing') return speech.stop()
    if (state !== 'idle' || !canRecord()) return
    const { p } = all[at]
    message = ''
    unlockAudio()
    speech.stop()
    set('starting')
    try {
      take = await record(p.id, maxMs(p))
      await Promise.race([take.started, new Promise((r) => setTimeout(r, 1500))])
    } catch {
      take = null
      message = 'No microphone. Allow the mic for this site in the browser settings, then try again.'
      return set('idle')
    }
    if (!open) return take.stop()
    set('recording')
    meter()
    const saved = await take.done.catch(() => false)
    take = null
    unlockAudio()
    if (saved) onChange()
    if (!open) return
    if (!saved) {
      message = "Didn't catch that. Try again, a little closer to the mic."
      return set('idle')
    }
    state = 'playing'
    paint()
    await speech.clip(p.id)
    if (!open || state !== 'playing' || all[at].p !== p) return
    const next = todo(at + 1)
    if (next < 0) message = "That's the whole script. Thank you!"
    else at = next
    set('idle')
    if (wide()) rows[at].scrollIntoView({ block: 'nearest' })
  }

  // On the window, not the dialog: when a focused button is disabled (Clear, say) focus drops to the page.
  const keys = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return
    if (e.key === ' ') void toggle()
    else if (e.key === 'ArrowRight') go(at + 1)
    else if (e.key === 'ArrowLeft') go(at - 1)
    else if (e.key.toLowerCase() === 'p') listen()
    else return
    e.preventDefault()
  }
  // A focused button would click again on Space's keyup.
  const spaceUp = (e: KeyboardEvent) => e.key === ' ' && e.preventDefault()
  addEventListener('keydown', keys)
  addEventListener('keyup', spaceUp)
  d.addEventListener('close', () => {
    open = false
    removeEventListener('keydown', keys)
    removeEventListener('keyup', spaceUp)
    take?.stop()
    speech.stop()
    d.remove()
    onChange()
  })

  paint()
  document.body.append(d)
  d.showModal()
  mic.focus()
}
