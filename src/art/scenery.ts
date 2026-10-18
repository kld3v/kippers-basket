import { Ink, INK, smoothPath, svg, type Pt } from './ink'
import type { SpotKind } from '../content'
import { P } from './palette'

// Countryside for the walk. The hills and path are seamless tiles: every contour is a
// sum of sines whose periods divide the tile width, sampled a little past both edges.

type Wave = readonly [amp: number, cycles: number, phase: number]

function contour(width: number, base: number, waves: readonly Wave[], step = 40): Pt[] {
  const pts: Pt[] = []
  for (let x = -step * 2; x <= width + step * 2; x += step) {
    const y = waves.reduce((y, [a, c, ph]) => y + a * Math.sin((x / width) * Math.PI * 2 * c + ph), base)
    pts.push([x, y])
  }
  return pts
}

const yAt = (width: number, base: number, waves: readonly Wave[], x: number) =>
  waves.reduce((y, [a, c, ph]) => y + a * Math.sin((x / width) * Math.PI * 2 * c + ph), base)

/** Filled land under a contour, with an ink line along the top only. */
function land(top: Pt[], height: number, fill: string, ink = 2.4) {
  const d = smoothPath(top, false)
  const [first, last] = [top[0], top[top.length - 1]]
  return (
    `<path d="${d}L${last[0]} ${height + 10}L${first[0]} ${height + 10}Z" fill="${fill}"/>` +
    `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${ink}" stroke-linecap="round" stroke-opacity=".75"/>`
  )
}

export function tree(k: Ink, x: number, y: number, s = 1) {
  return (
    k.shape([[x - 5 * s, y + 2], [x - 4 * s, y - 30 * s], [x + 4 * s, y - 30 * s], [x + 5 * s, y + 2]], { fill: P.brown, w: 2 }) +
    k.cluster([[x, y - 52 * s, 24 * s, 22 * s], [x - 18 * s, y - 38 * s, 16 * s, 14 * s], [x + 18 * s, y - 38 * s, 17 * s, 15 * s]], '#8fc06c', 3.6)
  )
}

const flower = (k: Ink, x: number, y: number, c: string) =>
  [0, 1, 2, 3, 4].map((i) => k.dot(x + Math.cos(i * 1.257) * 3.4, y + Math.sin(i * 1.257) * 3.4, 2.6, c)).join('') + k.dot(x, y, 1.8, P.yellow)

const tuft = (k: Ink, x: number, y: number) =>
  k.line([[x - 6, y], [x - 8, y - 9]], { w: 1.6, ink: P.greenDark }) +
  k.line([[x, y], [x, y - 12]], { w: 1.6, ink: P.greenDark }) +
  k.line([[x + 6, y], [x + 9, y - 8]], { w: 1.6, ink: P.greenDark })

export function farHills() {
  const k = new Ink('far-hills')
  const W = 1600
  const waves: Wave[] = [[34, 1, 0.5], [18, 3, 1.3], [8, 5, 0]]
  const trees = [180, 520, 610, 1040, 1380].map((x, i) => tree(k, x, yAt(W, 150, waves, x) + 6, 0.7 + (i % 2) * 0.15)).join('')
  return svg(`0 0 ${W} 300`, land(contour(W, 150, waves), 300, P.greenPale, 2) + trees, 'land far', true)
}

export function nearHills() {
  const k = new Ink('near-hills')
  const W = 1200
  const waves: Wave[] = [[26, 2, 0.3], [12, 3, 2]]
  const deco =
    [140, 760].map((x) => tree(k, x, yAt(W, 116, waves, x) + 8, 1.15)).join('') +
    [420, 980].map((x) => k.cluster([[x, yAt(W, 116, waves, x) - 2, 30, 18], [x + 26, yAt(W, 116, waves, x + 26) + 4, 20, 14]], P.greenDark, 3.4)).join('') +
    Array.from({ length: 14 }, (_, i) => flower(k, 50 + i * 82, yAt(W, 116, waves, 50 + i * 82) + 40 + (i % 3) * 22, i % 2 ? '#fff' : P.pink)).join('')
  return svg(`0 0 ${W} 260`, land(contour(W, 116, waves), 260, P.green) + deco, 'land near', true)
}

export function ground() {
  const k = new Ink('ground')
  const W = 900
  const upper: Pt[] = contour(W, 50, [[4, 3, 0], [2, 7, 1]])
  const lower: Pt[] = contour(W, 128, [[5, 2, 1], [2, 5, 0]])
  const path = `<path d="${smoothPath(upper, false)}L${lower[lower.length - 1][0]} ${lower[lower.length - 1][1]}${smoothPath([...lower].reverse(), false).replace(/^M[^C]*/, '')}Z" fill="${P.sand}"/>`
  const edges = [upper, lower].map((p) => `<path d="${smoothPath(p, false)}" fill="none" stroke="${INK}" stroke-width="2" stroke-opacity=".55"/>`).join('')
  const pebbles = [60, 210, 330, 470, 610, 700, 840]
    .map((x, i) => k.blob(x, 72 + ((i * 37) % 46), 5 + (i % 3), 3.5 + (i % 2), { fill: '#d9c8a6', w: 1.4, gap: 0 }))
    .join('')
  const deco =
    Array.from({ length: 9 }, (_, i) => tuft(k, 40 + i * 100, 30 + (i % 2) * 8)).join('') +
    Array.from({ length: 9 }, (_, i) => tuft(k, 80 + i * 100, 156 - (i % 2) * 6)).join('') +
    Array.from({ length: 6 }, (_, i) => flower(k, 120 + i * 150, 16 + (i % 2) * 14, i % 2 ? P.pink : '#fff')).join('') +
    Array.from({ length: 6 }, (_, i) => flower(k, 30 + i * 150, 146 - (i % 2) * 10, i % 2 ? '#fff' : P.yellow)).join('')
  return svg(`0 0 ${W} 170`, `<rect x="-2" y="-2" width="${W + 4}" height="174" fill="${P.greenDark}"/>` + path + edges + pebbles + deco, 'land ground', true)
}

export function cloud(seed: string) {
  const k = new Ink(seed)
  const n = 3 + Math.round(k.rnd(0, 1.4))
  const blobs = Array.from({ length: n }, (_, i) => [40 + i * 36 + k.rnd(-6, 6), 58 + k.rnd(-10, 4) - (i === 1 ? 14 : 0), 26 + k.rnd(0, 10), 20 + k.rnd(0, 6)] as const)
  return svg('0 0 200 100', k.cluster(blobs, '#fff', 4), 'cloud')
}


/** Hiding places, viewBox 0 0 220 150 with their base on y≈146. */
export function spot(kind: SpotKind, seed: string = kind) {
  const k = new Ink(seed)
  let body = ''
  if (kind === 'bush') {
    body =
      k.cluster(
        [[60, 104, 44, 38], [110, 82, 50, 46], [160, 104, 44, 38], [86, 122, 50, 26], [138, 122, 50, 26]],
        P.greenDark,
      ) +
      [[70, 96], [120, 66], [150, 110], [96, 120], [168, 92]].map(([x, y]) => k.dot(x, y, 4.2, P.red) + k.dot(x - 1.3, y - 1.4, 1.2, '#fff')).join('') +
      k.line([[84, 92], [94, 86]], { w: 1.6, op: 0.4 }) +
      k.line([[132, 104], [142, 98]], { w: 1.6, op: 0.4 })
  } else if (kind === 'log') {
    body =
      k.shape([[18, 92], [24, 74], [180, 70], [196, 86], [194, 132], [178, 146], [24, 146], [14, 130]], { fill: P.brown, w: 2.6 }) +
      k.blob(186, 108, 20, 38, { fill: '#e2bf8f', w: 2.4 }) +
      k.blob(186, 108, 12, 24, { fill: 'none', w: 1.6 }) +
      k.blob(186, 108, 5, 10, { fill: 'none', w: 1.4 }) +
      k.line([[40, 92], [90, 96], [140, 90]], { w: 1.6, op: 0.5 }) +
      k.line([[30, 120], [80, 124], [150, 118]], { w: 1.6, op: 0.5 }) +
      k.shape([[60, 74], [58, 60], [74, 54], [86, 62], [80, 72]], { fill: P.red, w: 2 }) +
      k.dot(68, 62, 2.4, '#fff') +
      k.dot(78, 64, 1.8, '#fff') +
      k.shape([[66, 74], [66, 70], [74, 70], [74, 75]], { fill: P.cream, w: 1.6, smooth: false }) +
      tuft(k, 30, 148) +
      tuft(k, 170, 148)
  } else {
    body =
      k.shape([[10, 146], [26, 104], [70, 72], [110, 64], [150, 72], [194, 104], [210, 146]], { fill: '#c49a6c', w: 2.6 }) +
      k.blob(110, 120, 46, 26, { fill: '#5a4334', w: 2.4 }) +
      k.blob(110, 128, 34, 14, { fill: '#3e2e25', ink: false, edge: false }) +
      k.line([[40, 120], [52, 112]], { w: 1.6, op: 0.5 }) +
      k.line([[168, 112], [180, 120]], { w: 1.6, op: 0.5 }) +
      tuft(k, 24, 148) +
      tuft(k, 196, 148)
  }
  return svg('0 0 220 150', body, `hiding hiding-${kind}`)
}

// Small things for the 3D meadow, each drawn in its own little box.

/** A standalone tree: trunk base at (60,120), crown up to y≈46. Box [14, 38, 92, 86]. */
export const treeArt = (seed: string, s = 1) => tree(new Ink(seed), 60, 120, s)

/** A flower on a short stem, box [0, 0, 24, 30]. */
export function flowerArt(seed: string, petal: string) {
  const k = new Ink(seed)
  return k.line([[12, 29], [12, 14]], { w: 1.8, ink: P.greenDark }) + flower(k, 12, 10, petal)
}

/** A tuft of grass, box [0, 0, 24, 16]. */
export const tuftArt = (seed: string) => tuft(new Ink(seed), 12, 15)

/** A butterfly seen from above, box [0, 0, 40, 30]. */
export function butterflyArt(seed: string, wing: string) {
  const k = new Ink(seed)
  return (
    k.blob(11, 10, 9, 8, { fill: wing, w: 1.6 }) +
    k.blob(29, 10, 9, 8, { fill: wing, w: 1.6 }) +
    k.blob(13, 21, 6, 6, { fill: wing, w: 1.6 }) +
    k.blob(27, 21, 6, 6, { fill: wing, w: 1.6 }) +
    k.blob(20, 15, 2.4, 9, { fill: INK, ink: false, off: 0 }) +
    k.line([[19, 7], [16, 2]], { w: 1.2 }) +
    k.line([[21, 7], [24, 2]], { w: 1.2 })
  )
}

/** A floating "z" for snoring, box [0, 0, 30, 30]. */
export const zzzArt = () => new Ink('zzz').line([[6, 8, 1], [24, 8, 1], [6, 24, 1], [24, 24, 1]], { w: 4, ink: '#fff', smooth: false })

/** A lily pad, box [0, 0, 40, 26]. */
export const lilyArt = (seed: string) => new Ink(seed).shape([[20, 13, 1], [36, 6], [38, 14], [30, 22], [12, 23], [3, 15], [6, 6], [16, 3]], { fill: '#8fc87a', w: 1.8 })
