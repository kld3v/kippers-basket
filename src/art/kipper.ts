import { Ink, pivot, svg, type Pt } from './ink'
import { P } from './palette'

// Kipper and Tiger stand and walk on their back legs, as on TV: drawn side-on facing right
// in a 220×260 frame with feet on y≈252. A coat changes the colours (Tiger is ginger with stripes).
// In 2D, CSS moves the parts by class: .leg-near/.leg-far stride, .arm-near/.arm-far swing,
// .tail wags, .ear flops, .head nods.

export interface Coat {
  seed: string
  body: string
  shade: string
  ear: string
  /** Tiger's stripes. */
  stripes?: string
}

export const KIPPER: Coat = { seed: 'kipper', body: P.white, shade: P.shadow, ear: P.tan }
export const TIGER: Coat = { seed: 'tiger', body: '#f7d6a0', shade: '#e8bf84', ear: '#b9773f', stripes: '#cf8743' }

/** Where the legs hang from (near, far) and the arms swing from (near, far). */
export const HIPS = [[100, 204], [120, 202]] as const
export const SHOULDERS = [[106, 140], [124, 138]] as const

const leg = (hx: number, hy: number): Pt[] => [
  [hx - 12, hy - 10],
  [hx + 12, hy - 10],
  [hx + 11, hy + 34],
  [hx + 23, hy + 41],
  [hx + 21, hy + 50],
  [hx - 9, hy + 50],
  [hx - 12, hy + 40],
]

const arm = (sx: number, sy: number): Pt[] => [
  [sx - 9, sy - 6],
  [sx + 9, sy - 7],
  [sx + 12, sy + 26],
  [sx + 18, sy + 36],
  [sx + 10, sy + 44],
  [sx - 2, sy + 40],
  [sx - 7, sy + 26],
]

export interface DogParts {
  legs: string[]
  arms: string[]
  tail: string
  body: string
  skull: string
  ear: string
  face: string
}

function stripe(k: Ink, c: Coat, pts: Pt[], w = 6.5) {
  return c.stripes ? k.line(pts, { ink: c.stripes, w, op: 0.85 }) : ''
}

/** Every piece of a dog, always drawn in the same order so the wobble never changes. */
export function dogParts(c: Coat): DogParts {
  const k = new Ink(`${c.seed}-upright`)
  const s = new Ink(`${c.seed}-stripes`)
  const arms = [arm(...SHOULDERS[0]), arm(...SHOULDERS[1])].map((pts, i) => k.shape(pts, { fill: i ? c.shade : c.body }))
  const legs = [leg(...HIPS[0]), leg(...HIPS[1])].map((pts, i) => k.shape(pts, { fill: i ? c.shade : c.body }))
  const tail =
    k.shape([[80, 196], [63, 190], [51, 175], [45, 155], [48, 142], [55, 147], [57, 163], [65, 179], [84, 186]], { fill: c.body }) +
    stripe(s, c, [[48, 160], [56, 158]], 4) +
    stripe(s, c, [[53, 176], [61, 172]], 4)
  const body =
    k.shape(
      [[86, 128], [104, 118], [126, 120], [140, 134], [146, 160], [144, 190], [136, 208], [116, 216], [94, 214], [78, 200], [72, 176], [74, 150]],
      { fill: c.body, gap: 0.06 },
    ) +
    k.shape([[118, 150], [138, 156], [142, 186], [132, 206], [114, 210], [112, 180]], { fill: c.shade, ink: false, op: 0.7, edge: false }) +
    [150, 168, 186].map((y) => stripe(s, c, [[76, y], [86, y + 3], [94, y + 1]])).join('')
  const skull =
    k.shape(
      [
        [86, 78], [92, 54], [110, 38], [134, 34], [156, 40], [168, 54], [176, 66], [187, 70],
        [195, 82], [191, 96], [177, 102], [161, 106], [149, 118], [128, 124], [106, 120], [92, 106],
      ],
      { fill: c.body },
    ) +
    stripe(s, c, [[130, 38], [132, 48]], 4.5) +
    stripe(s, c, [[141, 40], [141, 49]], 4.5)
  const ear =
    k.shape([[106, 42], [120, 40], [124, 56], [126, 80], [124, 104], [118, 124], [106, 132], [96, 126], [94, 104], [98, 76], [101, 56]], { fill: c.ear }) +
    k.line([[112, 52], [114, 80], [110, 108]], { w: 1.4, op: 0.55 })
  const face =
    k.cheek(161, 92, 6.5) +
    `<g class="eye-open">${k.eye(150, 66, 4.8)}</g>` +
    k.line([[143, 67], [150, 71], [157, 67]], { cls: 'eye-shut', w: 2.4 }) +
    k.line([[142, 55], [149, 52], [157, 54]], { cls: 'brow-sad', w: 2 }) +
    k.blob(190, 81, 6.5, 5.2, { fill: P.black, ink: false, off: 0 }) +
    `<circle cx="188" cy="79" r="1.6" fill="#fff" opacity=".7"/>` +
    k.line([[185, 96], [176, 101.5], [167, 99]], { cls: 'mouth-happy', w: 2.2 }) +
    k.line([[185, 101], [176, 97.5], [168, 100.5]], { cls: 'mouth-sad', w: 2.2 })
  return { legs, arms, tail, body, skull, ear, face }
}

const head = (p: DogParts) => `<g class="head" ${pivot(118, 120)}>${p.skull}<g class="ear" ${pivot(112, 44)}>${p.ear}</g>${p.face}</g>`

/** A whole standing dog for 2D, with classes CSS can walk, wag and blink. */
export function dogBody(c: Coat) {
  const p = dogParts(c)
  const limb = (cls: string, at: readonly [number, number], art: string) => `<g class="${cls}" ${pivot(at[0], at[1])}>${art}</g>`
  return (
    limb('arm arm-far', SHOULDERS[1], p.arms[1]) +
    limb('leg leg-far', HIPS[1], p.legs[1]) +
    `<g class="tail" ${pivot(82, 192)}>${p.tail}</g>` +
    `<g class="torso">${p.body}</g>` +
    limb('leg leg-near', HIPS[0], p.legs[0]) +
    limb('arm arm-near', SHOULDERS[0], p.arms[0]) +
    head(p)
  )
}

export const kipperBody = () => dogBody(KIPPER)
export const dog = (c: Coat, cls = '') => svg('0 0 220 260', dogBody(c), `kipper ${cls}`.trim())
export const kipper = (cls = '') => dog(KIPPER, cls)

/**
 * A dog asleep, in the basket's coordinates (see props.basket): `inside` lies on the cushion,
 * `over` is the chin resting on the front rim. The blanket drape stays hidden until .drape.on.
 */
export function dogAsleep(c: Coat = KIPPER) {
  const k = new Ink(`${c.seed}-asleep`)
  const p = dogParts(c)
  const checks = [[62, 86], [96, 76], [80, 102], [116, 96], [128, 76]]
    .map(([x, y]) => k.shape([[x, y], [x + 14, y], [x + 14, y + 12], [x, y + 12]], { fill: P.yellow, ink: false, smooth: false, off: 0.5 }))
    .join('')
  const drape =
    k.shape([[44, 104], [58, 80], [96, 68], [134, 66], [152, 72], [156, 96], [150, 120], [90, 122], [46, 116]], { fill: P.blue }) +
    checks +
    k.line([[136, 70], [146, 94], [142, 118]], { w: 1.6, op: 0.6 })
  const inside =
    k.shape([[54, 106], [33, 101], [24, 89], [28, 79], [35, 85], [39, 95], [56, 98]], { fill: c.body, cls: 'tail-sleep', attrs: pivot(55, 102) }) +
    k.shape([[40, 106], [56, 82], [92, 70], [140, 67], [180, 73], [204, 92], [206, 114], [150, 120], [90, 120], [44, 116]], { fill: c.body, gap: 0.06 }) +
    (c.stripes ? [86, 110, 134].map((x) => k.line([[x, 74], [x + 3, 86], [x + 1, 96]], { ink: c.stripes, w: 6, op: 0.85 })).join('') : '') +
    `<g class="drape">${drape}</g>`
  // The upright head, tipped over to rest on the rim.
  const over = `<g transform="translate(46 -2) rotate(14 150 84)">${head(p)}</g>`
  return { inside, over }
}

/** Kipper asleep in his basket (the 2D ending uses this). */
export const kipperAsleep = () => dogAsleep(KIPPER)
