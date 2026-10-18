import { friend } from './art/friends'
import { againIcon, gateIcon, playIcon } from './art/icons'
import { kipper, kipperAsleep } from './art/kipper'
import { picture } from './art/pictures'
import { basketSvg, toy, type ToyId } from './art/props'
import { cloud, farHills, ground, nearHills, spot as spotArt } from './art/scenery'
import { DOG, type Friend } from './content'
import { initFx, jump, settle } from './fx'
import { Hud } from './hud'
import type { Run } from './run'

const COPIES = 3

interface Layer {
  strip: HTMLElement
  speed: number
  width: number
}

export interface Spot {
  el: HTMLElement
  art: HTMLElement
  friendEl: HTMLElement
  bob: HTMLElement
  friend: Friend
}

const easeInOut = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2

function grain() {
  // Paper texture: a small noise tile drawn once, laid over everything at low strength.
  const c = document.createElement('canvas')
  c.width = c.height = 160
  const g = c.getContext('2d')!
  const img = g.createImageData(160, 160)
  // Faint warm specks with their own alpha, so no blend mode is needed (blend modes are slow on iPads).
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = 90
    img.data[i + 1] = 70
    img.data[i + 2] = 50
    img.data[i + 3] = Math.random() < 0.5 ? Math.random() * 22 : 0
  }
  g.putImageData(img, 0, 0)
  return c.toDataURL()
}

export class Stage {
  readonly root: HTMLElement
  readonly actors: HTMLElement
  readonly hud: Hud
  readonly kipperSlot: HTMLElement
  readonly kipperBob: HTMLElement
  readonly home: HTMLElement
  readonly playButton: HTMLButtonElement
  readonly againButton: HTMLButtonElement
  readonly gate: HTMLButtonElement
  readonly caption: HTMLElement
  readonly questionEl: HTMLElement
  private layers: Layer[] = []
  private offset = 0

  constructor(root: HTMLElement) {
    this.root = root
    const clouds = [
      ['c1', 6, 34, 95, -10],
      ['c2', 16, 24, 140, -70],
      ['c3', 3, 20, 120, -40],
    ]
      .map(([seed, top, w, dur, delay]) => `<div class="cloud-wrap" style="--top:${top};--w:${w};--dur:${dur}s;--delay:${delay}s">${cloud(String(seed))}</div>`)
      .join('')
    const stars = Array.from({ length: 22 }, () => `<i style="left:${Math.random() * 100}%;top:${Math.random() * 42}%;--d:${(Math.random() * 3).toFixed(2)}s"></i>`).join('')
    root.innerHTML = `
      <div class="sky"><div class="dusk"></div><div class="stars">${stars}</div><div class="moon">${picture('moon')}</div>${clouds}</div>
      <div class="layer far"><div class="strip"></div></div>
      <div class="layer near"><div class="strip"></div></div>
      <div class="layer ground"><div class="strip"></div></div>
      <div class="actors"></div>
      <div class="question"></div>
      <div class="title-ui"><h1 class="title"></h1><button class="play" aria-label="Play">${playIcon()}</button></div>
      <button class="again" aria-label="Play again">${againIcon()}</button>
      <button class="gate" aria-label="Grown-ups: press and hold">${gateIcon()}<svg class="ring" viewBox="0 0 40 40"><circle cx="20" cy="20" r="17"/></svg></button>
      <div class="caption" aria-live="polite"></div>
      <div class="fx"></div>
      <div class="grain" style="background-image:url(${grain()})"></div>`
    const $ = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!

    const title = $('.title')
    title.append(
      ...[...`${DOG}'s Basket`].map((ch, i) => {
        const s = document.createElement('span')
        s.textContent = ch
        s.style.setProperty('--r', `${(((i * 7919) % 11) - 5) * 1.1}deg`)
        return s
      }),
    )

    for (const [sel, art, speed] of [
      ['.far', farHills(), 0.18],
      ['.near', nearHills(), 0.45],
      ['.ground', ground(), 1],
    ] as const) {
      const strip = $(`${sel} .strip`)
      strip.innerHTML = art.repeat(COPIES)
      this.layers.push({ strip, speed, width: 0 })
    }

    this.actors = $('.actors')
    this.hud = new Hud(root)
    this.questionEl = $('.question')
    this.playButton = $('.play')
    this.againButton = $('.again')
    this.gate = $('.gate')
    this.caption = $('.caption')
    initFx($('.fx'))

    this.kipperSlot = document.createElement('div')
    this.kipperSlot.className = 'kipper-slot'
    this.kipperSlot.innerHTML = `<div class="bob">${kipper()}</div>`
    this.kipperBob = this.kipperSlot.querySelector('.bob')!

    const asleep = kipperAsleep()
    this.home = document.createElement('div')
    this.home.className = 'home'
    this.home.innerHTML = basketSvg(`<g class="sleeper">${asleep.inside}</g>`, `<g class="sleeper">${asleep.over}</g>`, 'asleep')
    this.actors.append(this.home, this.kipperSlot)

    addEventListener('resize', () => this.measure())
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

  get kipperSvg() {
    return this.kipperSlot.querySelector('svg')!
  }

  mood(m: 'happy' | 'sad' | '') {
    const s = this.kipperSvg.classList
    s.toggle('happy', m === 'happy')
    s.toggle('sad', m === 'sad')
  }

  /** Scroll the world: Kipper trots on the spot while `outgoing` slides away and `incoming` arrives. */
  async walk(run: Run, outgoing: HTMLElement | null, incoming: HTMLElement, ms = 2700) {
    incoming.style.transform = ''
    incoming.hidden = false
    const dist = this.root.clientWidth - incoming.getBoundingClientRect().left + 30
    incoming.style.transform = `translateX(${dist}px)`
    this.kipperSvg.classList.add('walking')
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
    this.kipperSvg.classList.remove('walking')
    if (outgoing && outgoing !== this.home) outgoing.remove()
    else if (outgoing) outgoing.hidden = true
  }

  addSpot(f: Friend, toyId: ToyId): Spot {
    const el = document.createElement('div')
    el.className = `spot spot-${f.spot}`
    el.hidden = true
    el.innerHTML = `<div class="friend"><div class="bob">${friend(f.id, toyId)}</div></div><div class="spot-art">${spotArt(f.spot, `${f.spot}-${f.id}`)}</div>`
    this.actors.insertBefore(el, this.kipperSlot)
    const friendEl = el.querySelector<HTMLElement>('.friend')!
    return { el, art: el.querySelector('.spot-art')!, friendEl, bob: friendEl.querySelector('.bob')!, friend: f }
  }

  /** Friend peeks up from behind the hiding place, then hops out in front of it. */
  async reveal(run: Run, s: Spot) {
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

  async leave(run: Run, s: Spot) {
    const f = s.friendEl
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

  kipperJump(h = 0.18) {
    return jump(this.kipperBob, this.kipperSlot.offsetHeight * h)
  }

  /** Kipper hops into his basket and curls up. */
  async tuckIn(run: Run) {
    const k = this.kipperSlot.getBoundingClientRect()
    const b = this.home.getBoundingClientRect()
    const [dx, dy] = [b.left + b.width * 0.55 - (k.left + k.width / 2), b.top + b.height * 0.25 - (k.top + k.height * 0.6)]
    const a = this.kipperSlot.animate(
      [
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${dx * 0.5}px,${dy - k.height * 0.5}px) scale(.95)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx}px,${dy}px) scale(.7)`, opacity: 0 },
      ],
      { duration: 900, easing: 'ease-in-out', fill: 'forwards' },
    )
    setTimeout(() => this.home.classList.add('occupied'), 700)
    await run.guard(a.finished)
    // Commit the end pose to inline style: a finished fill-forwards animation isn't always
    // returned by getAnimations(), so reset() couldn't cancel it and Kipper stayed invisible.
    settle(a)
  }

  /** Where a toy comes to rest around the basket, as fractions of the basket's box. */
  restingPlace(id: ToyId) {
    const spots: Record<ToyId, [number, number, number]> = {
      ball: [-0.12, 0.62, 0.22],
      bone: [0.84, 0.74, 0.24],
      blanket: [0.22, 0.12, 0.3],
      teddy: [0.04, 0.12, 0.2],
      slipper: [1.0, 0.56, 0.22],
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

  night(on: boolean) {
    this.root.classList.toggle('night', on)
  }

  /** Back to the opening scene: Kipper beside his empty basket on a sunny day. */
  reset() {
    for (const el of this.actors.querySelectorAll('.spot')) el.remove()
    for (const el of this.home.querySelectorAll('.resting')) el.remove()
    this.home.querySelector('.drape')!.classList.remove('on')
    this.home.classList.remove('occupied', 'snoring')
    this.home.hidden = false
    this.home.style.transform = ''
    for (const a of this.kipperSlot.getAnimations()) a.cancel()
    this.kipperSlot.style.transform = ''
    this.kipperSlot.style.opacity = ''
    this.mood('')
    this.night(false)
    this.hud.reset()
    this.hud.show(false)
  }
}
