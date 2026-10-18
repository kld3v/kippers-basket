import { Ink, INK, svg, type Pt } from './ink'
import { P } from './palette'

export type ToyId = 'ball' | 'bone' | 'blanket' | 'teddy' | 'slipper'

/** Toy drawings, viewBox 0 0 100 100. */
const TOYS: Record<ToyId, () => string> = {
  ball() {
    const k = new Ink('ball')
    return (
      k.blob(50, 52, 38, 38, { fill: P.red, n: 16 }) +
      k.shape(
        [[13, 45], [31, 37], [50, 35], [69, 37], [87, 45], [87, 58], [69, 51], [50, 49], [31, 51], [13, 58]],
        { fill: P.yellow, w: 1.8, gap: 0 },
      ) +
      k.blob(35, 30, 8, 4.5, { fill: '#fff', ink: false, op: 0.8, rot: -0.6, edge: false })
    )
  },

  bone() {
    const k = new Ink('bone')
    return k.shape(
      [
        [30, 42], [70, 42], [73, 31], [85, 27], [94, 37], [87, 50, 1], [94, 63], [85, 73], [73, 69],
        [70, 58], [30, 58], [27, 69], [15, 73], [6, 63], [13, 50, 1], [6, 37], [15, 27], [27, 31],
      ],
      { fill: P.cream, w: 2.4 },
    ) + k.line([[34, 47], [62, 46]], { w: 1.4, op: 0.4 })
  },

  blanket() {
    const k = new Ink('blanket')
    const cells: Pt[][] = []
    for (let r = 0; r < 2; r++)
      for (let c = 0; c < 3; c++)
        if ((r + c) % 2 === 0) {
          const [x, y] = [14 + c * 25, 44 + r * 19]
          cells.push([[x, y], [x + 22, y], [x + 22, y + 17], [x, y + 17]])
        }
    return (
      k.shape([[10, 36], [50, 32], [90, 36], [93, 60], [89, 82], [70, 86], [50, 82], [30, 86], [11, 82], [7, 60]], { fill: P.blue, w: 2.3 }) +
      cells.map((c, i) => k.shape(c, { fill: i % 2 ? P.pink : P.yellow, ink: false, smooth: false, wob: 0.8, off: 0.6 })).join('') +
      `<path d="M16 46 L84 46 M16 76 L84 76" stroke="#fff" stroke-width="1.6" stroke-dasharray="4 4" stroke-linecap="round" opacity=".8"/>` +
      k.shape([[10, 36], [50, 30], [90, 36], [90, 44], [50, 40], [10, 44]], { fill: '#a9cbe8', w: 2 })
    )
  },

  teddy() {
    const k = new Ink('teddy')
    const fur = '#c69164'
    return (
      k.blob(30, 23, 10, 10, { fill: fur }) +
      k.blob(70, 23, 10, 10, { fill: fur }) +
      k.blob(30, 23, 5, 5, { fill: P.cream, ink: false, edge: false }) +
      k.blob(70, 23, 5, 5, { fill: P.cream, ink: false, edge: false }) +
      k.blob(35, 87, 12, 9, { fill: fur }) +
      k.blob(65, 87, 12, 9, { fill: fur }) +
      k.blob(50, 68, 22, 21, { fill: fur }) +
      k.blob(50, 71, 12, 12, { fill: P.cream, ink: false, edge: false }) +
      k.blob(28, 63, 8, 13, { fill: fur, rot: 0.5 }) +
      k.blob(72, 63, 8, 13, { fill: fur, rot: -0.5 }) +
      k.blob(50, 38, 23, 20, { fill: fur }) +
      k.blob(50, 45, 10, 7, { fill: P.cream, w: 1.6 }) +
      k.blob(50, 42, 3.6, 2.6, { fill: INK, ink: false, off: 0 }) +
      k.line([[46, 48.5], [50, 50.5], [54, 48.5]], { w: 1.4 }) +
      k.eye(42, 34, 2.6, '') +
      k.eye(58, 34, 2.6, '') +
      k.shape([[50, 58, 1], [40, 53], [40, 63]], { fill: P.red, w: 1.6, gap: 0 }) +
      k.shape([[50, 58, 1], [60, 53], [60, 63]], { fill: P.red, w: 1.6, gap: 0 })
    )
  },

  slipper() {
    const k = new Ink('slipper')
    return (
      k.shape([[6, 70], [40, 72], [90, 68], [96, 76], [90, 84], [40, 84], [8, 80]], { fill: '#b07a5c', w: 2.2 }) +
      k.shape([[8, 70], [14, 60], [36, 58], [54, 52], [68, 40], [86, 42], [96, 58], [92, 70], [50, 72]], { fill: '#f0a1b2', w: 2.3 }) +
      k.line([[12, 62], [24, 56], [40, 56], [52, 52]], { w: 1.6, op: 0.5 }) +
      k.blob(70, 37, 10, 9, { fill: '#fff', n: 12 })
    )
  },
}

export const TOY_IDS = Object.keys(TOYS) as ToyId[]

export const toy = (id: ToyId, cls = '') => svg('0 0 100 100', TOYS[id](), `toy ${cls}`.trim())

/** Toy artwork without its <svg> wrapper, for nesting inside other drawings. */
export const toyBody = (id: ToyId) => TOYS[id]()

/**
 * Kipper's wicker basket, viewBox 0 0 260 190, rim at y≈94.
 * `inside` is drawn between the back and the front, so whatever sits in it is half hidden.
 */
export function basket(inside = '', over = '') {
  const k = new Ink('basket')
  const rim: Pt[] = [[8, 94], [40, 110], [90, 120], [130, 122], [170, 120], [220, 110], [252, 94]]
  const front: Pt[] = [...rim, [246, 140], [222, 166], [130, 176], [38, 166], [14, 140]]
  // Weave: bands that follow the curve of the front, with staggered uprights between them.
  const rimY = (x: number) => 122 - ((x - 130) / 122) ** 2 * 28
  const baseY = (x: number) => 176 - ((x - 130) / 118) ** 2 * 36
  const at = (x0: number, t: number): Pt => {
    const x = 130 + (x0 - 130) * (1 - t * 0.1)
    return [x, rimY(x) + t * (baseY(x) - rimY(x))]
  }
  const bands = [0, 0.34, 0.6, 0.84, 1]
  const weave = bands
    .slice(1, -1)
    .map((t) => k.line([16, 50, 90, 130, 170, 210, 244].map((x) => at(x, t)), { w: 1.5, op: 0.55 }))
    .join('')
  let ticks = ''
  for (let b = 0; b < 4; b++)
    for (let x0 = 30 + (b % 2) * 11; x0 < 236; x0 += 22) {
      const [[x1, y1], [x2, y2]] = [at(x0, bands[b]), at(x0, bands[b + 1])]
      ticks += k.line([[x1, y1 + 3], [x2, y2 - 3]], { w: 1.3, op: 0.45 })
    }
  return (
    k.blob(130, 92, 122, 30, { fill: P.wicker, n: 18 }) +
    k.blob(130, 96, 107, 21, { fill: P.wickerDark, ink: false, edge: false, n: 16 }) +
    k.blob(130, 101, 98, 16, { fill: '#e99383', n: 16, w: 2 }) +
    inside +
    k.shape(front, { fill: P.wicker, gap: 0.03 }) +
    weave +
    ticks +
    k.line(rim, { w: 7, ink: P.wickerDark }) +
    k.line(rim, { w: 2.2 }) +
    over
  )
}

export const basketSvg = (inside = '', over = '', cls = '') => svg('0 0 260 190', basket(inside, over), `basket ${cls}`.trim())
