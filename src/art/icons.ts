import { Ink, svg, type Pt } from './ink'
import { P } from './palette'

/** A hand-drawn rounded rectangle filling a w×h box, for cards and tiles. */
export function card(w: number, h: number, fill: string, seed: string, r = 14) {
  const k = new Ink(seed)
  const m = 4
  const pts: Pt[] = [
    [m + r, m], [w / 2, m - 1], [w - m - r, m], [w - m, m + r], [w - m + 1, h / 2], [w - m, h - m - r],
    [w - m - r, h - m], [w / 2, h - m + 1], [m + r, h - m], [m, h - m - r], [m - 1, h / 2], [m, m + r],
  ]
  return svg(`0 0 ${w} ${h}`, k.shape(pts, { fill, w: 3, wob: 1.2, off: 1.6 }), 'card-bg')
}

export function playIcon(fill: string = P.green) {
  const k = new Ink('play' + fill)
  return svg(
    '0 0 120 120',
    k.blob(60, 60, 52, 52, { fill, w: 3.4, n: 16 }) + k.shape([[46, 34, 1], [88, 60, 1], [46, 86, 1]], { fill: '#fff', w: 3.4, smooth: false, gap: 0 }),
  )
}

export function homeIcon() {
  const k = new Ink('home')
  return svg(
    '0 0 120 120',
    k.blob(60, 60, 52, 52, { fill: P.bluePale, w: 3.4, n: 16 }) +
      k.shape([[36, 60], [36, 88], [84, 88], [84, 60]], { fill: '#fff', w: 3.2, smooth: false, gap: 0 }) +
      k.shape([[28, 62, 1], [60, 32, 1], [92, 62, 1]], { fill: P.red, w: 3.2, smooth: false, gap: 0 }) +
      k.shape([[54, 88], [54, 72], [66, 72], [66, 88]], { fill: P.tan, w: 2.6, smooth: false, gap: 0 }),
  )
}

export function againIcon() {
  const k = new Ink('again')
  return svg(
    '0 0 120 120',
    k.blob(60, 60, 52, 52, { fill: P.yellow, w: 3.4, n: 16 }) +
      k.line([[84, 46], [74, 34], [58, 31], [42, 38], [34, 54], [36, 72], [48, 86], [64, 90], [80, 82], [87, 70]], { w: 7 }) +
      k.shape([[90, 30, 1], [92, 54, 1], [70, 48, 1]], { fill: '#3d3431', w: 2, smooth: false, gap: 0 }),
  )
}

export function speakerIcon() {
  const k = new Ink('speaker')
  return svg(
    '0 0 60 60',
    k.shape([[10, 24, 1], [20, 24, 1], [32, 12, 1], [32, 48, 1], [20, 36, 1], [10, 36, 1]], { fill: '#fff', w: 2.6, smooth: false, gap: 0 }) +
      k.line([[39, 22], [43, 30], [39, 38]], { w: 2.6 }) +
      k.line([[45, 15], [52, 30], [45, 45]], { w: 2.6 }),
  )
}

/** The grown-ups button: a little key, so it doesn't invite toddler taps. */
export function gateIcon() {
  const k = new Ink('gate')
  return svg('0 0 60 60', k.blob(20, 30, 11, 11, { fill: P.yellow, w: 2.6 }) + k.blob(20, 30, 4, 4, { fill: P.paper, w: 2 }) + k.line([[31, 30], [52, 30], [52, 38], [45, 30]], { w: 3, smooth: false }))
}

export function starIcon(fill: string) {
  const k = new Ink('star' + fill)
  const pts: Pt[] = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2
    const r = i % 2 ? 19 : 44
    return [50 + Math.cos(a) * r, 52 + Math.sin(a) * r, 1] as Pt
  })
  return svg('0 0 100 100', k.shape(pts, { fill, w: 4, smooth: false, gap: 0 }))
}
