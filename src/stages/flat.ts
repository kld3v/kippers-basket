import { friend } from '../art/friends'
import { dog, dogAsleep, kipperAsleep, KIPPER, TIGER } from '../art/kipper'
import { basketSvg, toy } from '../art/props'
import { farHills, ground, nearHills, spot as spotArt } from '../art/scenery'
import { sfx } from '../audio/sfx'
import { speech } from '../audio/speech'
import { LINES, type Friend, type ToyId } from '../content'
import { jump, settle } from '../fx'
import { AUTOPLAY } from '../question'
import type { Run } from '../run'
import type { Mood, Round, Stage, StageHost } from './types'

// The storybook: a side-on walk along a path that scrolls past, as in the first version.

const COPIES = 3

interface Layer {
  strip: HTMLElement
  speed: number
  width: number
}

interface Spot {
  el: HTMLElement
  art: HTMLElement
  friendEl: HTMLElement
  bob: HTMLElement
  friend: Friend
}

const easeInOut = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2

/** Resolves true when the element is tapped, false when the time runs out. */
function tapOrWait(run: Run, el: HTMLElement, ms: number) {
  let off = () => {}
  const p = new Promise<boolean>((resolve) => {
    const onTap = () => resolve(true)
    el.addEventListener('pointerdown', onTap, { once: true })
    const t = setTimeout(() => resolve(false), AUTOPLAY ? 700 : ms)
    off = () => {
      el.removeEventListener('pointerdown', onTap)
      clearTimeout(t)
    }
  })
  return run.guard(p).finally(() => off())
}

export class FlatStage implements Stage {
  private root: HTMLElement
  private actors: HTMLElement
  private layers: Layer[] = []
  private offset = 0
  private kipperSlot: HTMLElement
  private kipperBob: HTMLElement
  private tigerSlot: HTMLElement
  private tigerBob: HTMLElement
  private home: HTMLElement
  private tigerBed: HTMLElement
  private spots = new Map<number, Spot>()
  private here: HTMLElement
  private onResize = () => this.measure()

  constructor(host: StageHost) {
    this.root = host.root
    this.root.innerHTML = `
      <div class="flat">
        <div class="layer far"><div class="strip"></div></div>
        <div class="layer near"><div class="strip"></div></div>
        <div class="layer ground"><div class="strip"></div></div>
        <div class="actors"></div>
      </div>`
    for (const [sel, art, speed] of [
      ['.far', farHills(), 0.18],
      ['.near', nearHills(), 0.45],
      ['.ground', ground(), 1],
    ] as const) {
      const strip = this.root.querySelector<HTMLElement>(`${sel} .strip`)!
      strip.innerHTML = art.repeat(COPIES)
      this.layers.push({ strip, speed, width: 0 })
    }
    this.actors = this.root.querySelector('.actors')!

    const dogSlot = (cls: string, art: string) => {
      const el = document.createElement('div')
      el.className = cls
      el.innerHTML = `<div class="bob">${art}</div>`
      return el
    }
    this.tigerSlot = dogSlot('dog-slot tiger-slot', dog(TIGER))
    this.kipperSlot = dogSlot('dog-slot kipper-slot', dog(KIPPER))
    this.kipperBob = this.kipperSlot.querySelector('.bob')!
    this.tigerBob = this.tigerSlot.querySelector('.bob')!

    const asleep = kipperAsleep()
    this.home = document.createElement('div')
    this.home.className = 'home'
    this.home.innerHTML = basketSvg(`<g class="sleeper">${asleep.inside}</g>`, `<g class="sleeper">${asleep.over}</g>`, 'asleep')
    const tiger = dogAsleep(TIGER)
    this.tigerBed = document.createElement('div')
    this.tigerBed.className = 'tiger-bed asleep'
    this.tigerBed.innerHTML = `<svg viewBox="0 0 260 150" overflow="visible">${tiger.inside}${tiger.over}</svg>`
    this.actors.append(this.home, this.tigerBed, this.tigerSlot, this.kipperSlot)
    this.here = this.home

    this.kipperSlot.addEventListener('pointerdown', () => {
      void jump(this.kipperBob, this.kipperSlot.offsetHeight * 0.22)
      host.onDogTap('kipper')
    })
    this.tigerSlot.addEventListener('pointerdown', () => {
      void jump(this.tigerBob, this.tigerSlot.offsetHeight * 0.22)
      host.onDogTap('tiger')
    })
    this.actors.addEventListener('pointerdown', (e) => {
      if ((e.target as Element).closest('.friend .bob')) host.onFriendTap()
    })
    addEventListener('resize', this.onResize)
    this.measure()
  }

  private measure() {
    for (const l of this.layers) l.width = (l.strip.firstElementChild as SVGElement).getBoundingClientRect().width
    this.setOffset(this.offset)
  }

  private setOffset(x: number) {
    this.offset = x
    for (const l of this.layers) if (l.width) l.strip.style.transform = `translate3d(${-((x * l.speed) % l.width)}px,0,0)`
  }

  private dogs() {
    return [this.kipperSlot, this.tigerSlot].map((s) => s.querySelector('svg')!)
  }

  mood(m: Mood) {
    for (const svg of this.dogs()) {
      svg.classList.toggle('happy', m === 'happy')
      svg.classList.toggle('sad', m === 'sad')
    }
  }

  cheer() {
    void jump(this.kipperBob, this.kipperSlot.offsetHeight * 0.18)
    setTimeout(() => void jump(this.tigerBob, this.tigerSlot.offsetHeight * 0.18), 140)
  }

  /** Scroll the world: Kipper and Tiger trot on the spot while `outgoing` slides away and `incoming` arrives. */
  private async walk(run: Run, outgoing: HTMLElement | null, incoming: HTMLElement, ms = 2700) {
    incoming.style.transform = ''
    incoming.hidden = false
    const dist = this.root.clientWidth - incoming.getBoundingClientRect().left + 30
    incoming.style.transform = `translateX(${dist}px)`
    for (const svg of this.dogs()) svg.classList.add('walking')
    const base = this.offset
    const t0 = performance.now()
    await run.guard(
      new Promise<void>((resolve) => {
        const step = (now: number) => {
          const t = Math.min(1, (now - t0) / ms)
          const s = dist * easeInOut(t)
          this.setOffset(base + s)
          incoming.style.transform = `translateX(${dist - s}px)`
          if (outgoing) outgoing.style.transform = `translateX(${-s}px)`
          if (t < 1 && !run.cancelled) requestAnimationFrame(step)
          else resolve()
        }
        requestAnimationFrame(step)
      }),
    )
    for (const svg of this.dogs()) svg.classList.remove('walking')
    if (outgoing && outgoing !== this.home) outgoing.remove()
    else if (outgoing) outgoing.hidden = true
    this.here = incoming
  }

  private addSpot(f: Friend, toyId: ToyId): Spot {
    const el = document.createElement('div')
    el.className = `spot spot-${f.spot}`
    el.hidden = true
    el.innerHTML = `<div class="friend"><div class="bob">${friend(f.id, toyId)}</div></div><div class="spot-art">${spotArt(f.spot, `${f.spot}-${f.id}`)}</div>`
    this.actors.insertBefore(el, this.tigerSlot)
    const friendEl = el.querySelector<HTMLElement>('.friend')!
    return { el, art: el.querySelector('.spot-art')!, friendEl, bob: friendEl.querySelector('.bob')!, friend: f }
  }

  async find(run: Run, r: Round) {
    const s = this.addSpot(r.friend, r.toy)
    this.spots.set(r.index, s)
    await this.walk(run, this.here, s.el)
    this.mood('')
    // The hiding place rustles until she taps it (or it gives up waiting and peeks out anyway).
    s.art.classList.add('wiggle')
    sfx.rustle()
    const rustle = setInterval(() => sfx.rustle(), 1500)
    const stop = run.onCancel(() => clearInterval(rustle))
    try {
      const lines = LINES.narrator.peek[r.friend.spot]
      void speech.say('narrator', [lines[0]])
      if (!(await tapOrWait(run, s.el, 7500))) {
        void speech.say('narrator', [lines[1]])
        await tapOrWait(run, s.el, 6000)
      }
    } finally {
      clearInterval(rustle)
      stop()
    }
    speech.stop()
    s.art.classList.remove('wiggle')
    sfx.pop()
    await this.reveal(run, s)
  }

  /** Friend peeks up from behind the hiding place, then hops out in front of it. */
  private async reveal(run: Run, s: Spot) {
    const f = s.friendEl
    const H = f.offsetHeight
    const u = H / 32
    const x = 14 * u
    const peek = f.animate(
      [
        { transform: `translate(${x}px,${H}px)`, clipPath: 'inset(-60% -60% 100% -60%)' },
        { transform: `translate(${x}px,${H * 0.42}px)`, clipPath: 'inset(-60% -60% 42% -60%)' },
      ],
      { duration: 480, easing: 'cubic-bezier(.3,1.45,.6,1)', fill: 'forwards' },
    )
    await run.guard(peek.finished)
    await run.wait(650)
    const high = s.friend.move === 'fly' ? 0.9 : s.friend.move === 'scurry' ? 0.3 : 0.6
    const ms = s.friend.move === 'fly' ? 1100 : 700
    const hop = f.animate(
      [
        { transform: `translate(${x}px,${H * 0.42}px)`, clipPath: 'inset(-60% -60% 42% -60%)' },
        { transform: `translate(${x * 0.5}px,${-H * high}px)`, clipPath: 'inset(-60% -60% -60% -60%)', offset: 0.5 },
        { transform: `translate(0px,${1.2 * u}px)`, clipPath: 'inset(-60% -60% -60% -60%)' },
      ],
      { duration: ms, easing: 'ease-in-out', fill: 'forwards' },
    )
    settle(peek)
    setTimeout(() => (f.style.zIndex = '3'), ms * 0.4)
    await run.guard(hop.finished)
    settle(hop)
  }

  talking(r: Round, on: boolean) {
    this.spots.get(r.index)?.bob.classList.toggle('talking', on)
  }

  takeToy(r: Round) {
    const held = this.spots.get(r.index)!.friendEl.querySelector<SVGElement>('.held')!
    const box = held.getBoundingClientRect()
    held.style.visibility = 'hidden'
    return box
  }

  async farewell(run: Run, r: Round) {
    const f = this.spots.get(r.index)!.friendEl
    const u = f.offsetHeight / 32
    const a = f.animate(
      [
        { transform: `translate(0px,${1.2 * u}px)`, opacity: 1 },
        { transform: `translate(${22 * u}px,${-f.offsetHeight * 0.45}px)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${64 * u}px,${1.2 * u}px)`, opacity: 0 },
      ],
      { duration: 1000, easing: 'ease-in-out', fill: 'forwards' },
    )
    await run.guard(a.finished)
  }

  goHome(run: Run) {
    return this.walk(run, this.here, this.home, 3200)
  }

  /** Kipper hops into his basket and curls up; Tiger flops down beside it. */
  async tuckIn(run: Run) {
    const hopInto = (slot: HTMLElement, target: DOMRect, fx: number, fy: number) => {
      const k = slot.getBoundingClientRect()
      const [dx, dy] = [target.left + target.width * fx - (k.left + k.width / 2), target.top + target.height * fy - (k.top + k.height * 0.6)]
      return slot.animate(
        [
          { transform: 'translate(0,0) scale(1)', opacity: 1 },
          { transform: `translate(${dx * 0.5}px,${dy - k.height * 0.5}px) scale(.95)`, opacity: 1, offset: 0.55 },
          { transform: `translate(${dx}px,${dy}px) scale(.7)`, opacity: 0 },
        ],
        { duration: 900, easing: 'ease-in-out', fill: 'forwards' },
      )
    }
    const kipperHop = hopInto(this.kipperSlot, this.home.getBoundingClientRect(), 0.55, 0.25)
    setTimeout(() => this.home.classList.add('occupied'), 700)
    await run.guard(kipperHop.finished)
    // Commit the end pose to inline style: a finished fill-forwards animation isn't always
    // returned by getAnimations(), so reset() couldn't cancel it and the dog stayed invisible.
    settle(kipperHop)
    const tigerHop = hopInto(this.tigerSlot, this.tigerBed.getBoundingClientRect(), 0.5, 0.5)
    setTimeout(() => this.tigerBed.classList.add('on'), 700)
    await run.guard(tigerHop.finished)
    settle(tigerHop)
  }

  restingPlace(id: ToyId) {
    const spots: Record<ToyId, [number, number, number]> = {
      ball: [-0.12, 0.62, 0.22],
      bone: [0.84, 0.74, 0.24],
      blanket: [0.22, 0.12, 0.3],
      teddy: [0.04, 0.12, 0.2],
      slipper: [1.0, 0.56, 0.22],
      sock: [0.52, 0.86, 0.2],
      bowl: [1.18, 0.7, 0.24],
    }
    const [x, y, w] = spots[id]
    const b = this.home.getBoundingClientRect()
    return new DOMRect(b.left + b.width * x, b.top + b.height * y, b.width * w, b.width * w)
  }

  placeToy(id: ToyId) {
    if (id === 'blanket') {
      this.home.querySelector('.drape')!.classList.add('on')
      return
    }
    const r = this.restingPlace(id)
    const b = this.home.getBoundingClientRect()
    const el = document.createElement('div')
    el.className = `resting resting-${id}`
    el.innerHTML = toy(id)
    el.style.cssText = `left:${((r.left - b.left) / b.width) * 100}%;top:${((r.top - b.top) / b.height) * 100}%;width:${(r.width / b.width) * 100}%`
    this.home.append(el)
  }

  night() {
    // The sky and the darker land come from #game.night in the stylesheet.
  }

  snore() {
    this.home.classList.add('snoring')
  }

  reset() {
    for (const s of this.spots.values()) s.el.remove()
    this.spots.clear()
    for (const el of this.home.querySelectorAll('.resting')) el.remove()
    this.home.querySelector('.drape')!.classList.remove('on')
    this.home.classList.remove('occupied', 'snoring')
    this.home.hidden = false
    this.home.style.transform = ''
    this.tigerBed.classList.remove('on')
    this.here = this.home
    for (const slot of [this.kipperSlot, this.tigerSlot]) {
      for (const a of slot.getAnimations()) a.cancel()
      slot.style.transform = ''
      slot.style.opacity = ''
    }
    this.mood('')
  }

  dispose() {
    removeEventListener('resize', this.onResize)
    this.root.replaceChildren()
  }
}
