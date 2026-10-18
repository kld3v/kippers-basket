// Hand-drawn ink-and-watercolour kit. Each drawing seeds its own RNG from a name,
// so the wobble is identical on every load instead of shimmering between renders.

/** A point; a third value of 1 keeps that point a sharp corner. */
export type Pt = readonly [x: number, y: number, corner?: 1]

export const INK = '#3d3431'

const f = (n: number) => String(Math.round(n * 10) / 10)

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

export function mix(a: string, b: string, t: number) {
  const pb = rgb(b)
  return '#' + rgb(a).map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('')
}

/** Darken towards a warm brown, the way pigment pools. */
export const shade = (c: string, t: number) => mix(c, '#3a2618', t)

/** Catmull-Rom through the points as cubic Béziers; corner points stay sharp. */
export function smoothPath(p: readonly Pt[], closed: boolean) {
  const n = p.length
  const at = (i: number) => (closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))])
  let d = `M${f(p[0][0])} ${f(p[0][1])}`
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
    const c1 = p1[2] ? p1 : [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = p2[2] ? p2 : [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`
  }
  return closed ? d + 'Z' : d
}

export function polyPath(p: readonly Pt[], closed: boolean) {
  return 'M' + p.map(([x, y]) => `${f(x)} ${f(y)}`).join('L') + (closed ? 'Z' : '')
}

export function ellipse(cx: number, cy: number, rx: number, ry: number, n = 12, rot = 0): Pt[] {
  const [c, s] = [Math.cos(rot), Math.sin(rot)]
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    const [x, y] = [Math.cos(a) * rx, Math.sin(a) * ry]
    return [cx + x * c - y * s, cy + x * s + y * c] as Pt
  })
}

/** Mirror points across a vertical line, keeping the winding order. */
export const mirror = (p: readonly Pt[], cx = 100): Pt[] => p.map(([x, y, c]) => [2 * cx - x, y, c] as Pt).reverse()

export const move = (p: readonly Pt[], dx: number, dy: number): Pt[] => p.map(([x, y, c]) => [x + dx, y + dy, c] as Pt)

export interface Paint {
  /** Wash colour; leave out for an outline-only shape. */
  fill?: string
  /** Outline colour, or false for a wash with no line. */
  ink?: string | false
  w?: number
  /** How far each point may wander. */
  wob?: number
  /** How far the wash slips off the line. */
  off?: number
  /** Fraction of the outline left undrawn, like a pen lifting. */
  gap?: number
  /** Pigment pooling at the edge of the wash. */
  edge?: boolean
  smooth?: boolean
  op?: number
  cls?: string
  /** Raw attributes for the wrapping group, e.g. a transform-origin style. */
  attrs?: string
}

export interface Stroke {
  ink?: string
  w?: number
  wob?: number
  smooth?: boolean
  op?: number
  cls?: string
}

export class Ink {
  private r: () => number

  constructor(seed: string) {
    this.r = mulberry32(hash(seed))
  }

  rnd(a = -1, b = 1) {
    return a + (b - a) * this.r()
  }

  private jit(p: readonly Pt[], amt: number): Pt[] {
    return p.map(([x, y, c]) => [x + this.rnd(-amt, amt), y + this.rnd(-amt, amt), c] as Pt)
  }

  shape(p: readonly Pt[], o: Paint = {}) {
    const { fill, ink = INK, w = 2.2, wob = 0.9, off = 1.4, gap = 0.04, edge = true, smooth = true, op = 1 } = o
    const path = (q: readonly Pt[]) => (smooth ? smoothPath(q, true) : polyPath(q, true))
    let s = ''
    if (fill) {
      const a = this.rnd(0, Math.PI * 2)
      const q = this.jit(p, wob).map(([x, y, c]) => [x + Math.cos(a) * off, y + Math.sin(a) * off, c] as Pt)
      const e = edge ? ` stroke="${shade(fill, 0.14)}" stroke-width="${f(w * 1.2)}" stroke-opacity=".5" stroke-linejoin="round"` : ''
      s += `<path d="${path(q)}" fill="${fill}"${op < 1 ? ` fill-opacity="${op}"` : ''}${e}/>`
    }
    if (ink) {
      const g = gap > 0 ? ` pathLength="100" stroke-dasharray="${f(100 - gap * 100)} ${f(gap * 100)}" stroke-dashoffset="${f(this.rnd(0, 100))}"` : ''
      s += `<path d="${path(this.jit(p, wob))}" fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${g}/>`
    }
    return group(s, o.cls, o.attrs)
  }

  blob(cx: number, cy: number, rx: number, ry: number, o: Paint & { rot?: number; n?: number } = {}) {
    const n = o.n ?? Math.max(8, Math.min(18, Math.round((rx + ry) / 4)))
    return this.shape(ellipse(cx, cy, rx, ry, n, o.rot ?? 0), { wob: Math.min(rx, ry) > 12 ? 0.9 : 0.4, ...o })
  }

  line(p: readonly Pt[], o: Stroke = {}) {
    const { ink = INK, w = 2.2, wob = 0.6, smooth = true, op = 1 } = o
    const q = this.jit(p, wob)
    const d = smooth ? smoothPath(q, false) : polyPath(q, false)
    const s = `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${op < 1 ? ` stroke-opacity="${op}"` : ''}/>`
    return group(s, o.cls)
  }

  /**
   * Overlapping blobs with one outline round the lot (clouds, bushes): every outline
   * is drawn first and every fill on top, so the inner lines disappear.
   */
  cluster(blobs: readonly (readonly [cx: number, cy: number, rx: number, ry: number])[], fill: string, w = 4.4) {
    const shapes = blobs.map(([cx, cy, rx, ry]) => smoothPath(this.jit(ellipse(cx, cy, rx, ry, Math.max(9, Math.round((rx + ry) / 5))), 1), true))
    const a = this.rnd(0, Math.PI * 2)
    const wash = `<g transform="translate(${f(Math.cos(a) * 2)} ${f(Math.sin(a) * 2)})" fill="${shade(fill, 0.12)}" opacity=".5">${shapes.map((d) => `<path d="${d}"/>`).join('')}</g>`
    const lines = shapes.map((d) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>`).join('')
    const fills = shapes.map((d) => `<path d="${d}" fill="${fill}"/>`).join('')
    return wash + lines + fills
  }

  /** A shiny dot eye; `cls` lets CSS blink it. */
  eye(cx: number, cy: number, r = 4.4, cls = 'blink') {
    const s =
      `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(r * 0.9)}" ry="${f(r)}" fill="${INK}"/>` +
      `<circle cx="${f(cx + r * 0.32)}" cy="${f(cy - r * 0.38)}" r="${f(r * 0.32)}" fill="#fff"/>`
    return group(s, cls, `style="transform-origin:${f(cx)}px ${f(cy)}px"`)
  }

  cheek(cx: number, cy: number, r = 6) {
    return `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(r)}" ry="${f(r * 0.75)}" fill="#f19c94" fill-opacity=".45"/>`
  }

  dot(cx: number, cy: number, r: number, fill = INK) {
    return `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"/>`
  }
}

export function group(body: string, cls?: string, attrs?: string) {
  if (!cls && !attrs) return body
  return `<g${cls ? ` class="${cls}"` : ''}${attrs ? ' ' + attrs : ''}>${body}</g>`
}

/** Origin for CSS rotations of a part, in the drawing's own units. */
export const pivot = (x: number, y: number) => `style="transform-origin:${f(x)}px ${f(y)}px"`

/** Drawings may spill past their box (a wagging tail); `clip` keeps a tile inside its edges. */
export function svg(viewBox: string, body: string, cls = '', clip = false) {
  // Clipped tiles also carry their size, which gives them an aspect ratio to lay out by (height:100%, width:auto).
  const [, , w, h] = viewBox.split(' ')
  const size = clip ? ` width="${w}" height="${h}"` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"${size}${cls ? ` class="${cls}"` : ''} aria-hidden="true" overflow="${clip ? 'hidden' : 'visible'}">${body}</svg>`
}
