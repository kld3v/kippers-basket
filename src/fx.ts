import { starIcon } from './art/icons'
import { P } from './art/palette'

// Things that fly about over the scene: star bursts, toys going home, little jumps.

const STARS = [P.yellow, P.pink, P.bluePale, '#fff', P.orange].map(starIcon)

let layer: HTMLElement

export function initFx(el: HTMLElement) {
  layer = el
}

/** Settle a finished animation into the element's own style, so fill-forwards animations don't pile up. */
export function settle(anim: Animation) {
  try {
    anim.commitStyles()
  } catch {
    // element left the page
  }
  anim.cancel()
}

export function burst(x: number, y: number, n = 14, spread = 170) {
  for (let i = 0; i < n; i++) {
    const s = document.createElement('div')
    const size = 16 + Math.random() * 20
    s.className = 'spark'
    s.innerHTML = STARS[i % STARS.length]
    s.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;margin:${-size / 2}px 0 0 ${-size / 2}px`
    layer.append(s)
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.4
    const d = spread * (0.55 + Math.random() * 0.6)
    const spin = (Math.random() - 0.5) * 540
    s.animate(
      [
        { transform: 'translate(0,0) scale(.2) rotate(0deg)', opacity: 1 },
        { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d}px) scale(1) rotate(${spin * 0.7}deg)`, opacity: 1, offset: 0.65 },
        { transform: `translate(${Math.cos(a) * d * 1.1}px,${Math.sin(a) * d * 1.1 + 40}px) scale(.7) rotate(${spin}deg)`, opacity: 0 },
      ],
      { duration: 900 + Math.random() * 400, easing: 'cubic-bezier(.2,.7,.3,1)' },
    ).finished.then(() => s.remove())
  }
}

export const centre = (r: DOMRect) => [r.left + r.width / 2, r.top + r.height / 2] as const

/** Fly a copy of some artwork from one box to another along an arc. */
export function flyTo(markup: string, from: DOMRect, to: DOMRect, ms = 950) {
  const el = document.createElement('div')
  el.className = 'flyer'
  el.innerHTML = markup
  el.style.cssText = `left:${from.left}px;top:${from.top}px;width:${from.width}px;height:${from.height}px`
  layer.append(el)
  const [[fx, fy], [tx, ty]] = [centre(from), centre(to)]
  const [dx, dy] = [tx - fx, ty - fy]
  const k = to.width / from.width
  const lift = -Math.max(90, Math.abs(dx) * 0.3)
  return el
    .animate(
      [
        { transform: 'translate(0,0) scale(1) rotate(0deg)' },
        { transform: `translate(${dx * 0.5}px,${dy * 0.5 + lift}px) scale(${((1 + k) / 2) * 1.2}) rotate(-14deg)`, offset: 0.5 },
        { transform: `translate(${dx}px,${dy}px) scale(${k}) rotate(0deg)` },
      ],
      { duration: ms, easing: 'cubic-bezier(.45,0,.35,1)', fill: 'forwards' },
    )
    .finished.then(() => el.remove())
}

/** A quick jump on an element whose own transform is otherwise unused. */
export function jump(el: Element, height: number, ms = 440) {
  return el.animate(
    [
      { transform: 'translateY(0) scale(1,1)' },
      { transform: 'translateY(0) scale(1.06,.92)', offset: 0.12 },
      { transform: `translateY(${-height}px) scale(.96,1.05)`, offset: 0.5 },
      { transform: 'translateY(0) scale(1.05,.95)', offset: 0.88 },
      { transform: 'translateY(0) scale(1,1)' },
    ],
    { duration: ms, easing: 'ease-in-out' },
  ).finished
}

export function wiggle(el: Element, ms = 500) {
  return el.animate(
    [{ transform: 'rotate(0)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(5deg)' }, { transform: 'rotate(-3deg)' }, { transform: 'rotate(0)' }],
    { duration: ms, easing: 'ease-in-out' },
  ).finished
}
